#!/usr/bin/env python3
"""只发布固定仓库的 dist；不执行仓库代码，保留服务器 cloud-config。"""
import ctypes
import datetime
import fcntl
from html.parser import HTMLParser
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import urllib.parse
import urllib.request
import uuid

LIVE = Path('/www/wwwroot/very-three/dist')
RELEASES = Path('/www/wwwroot/very-three-releases')
STATE = Path('/www/server/very-three-autodeploy')
BACKUP_LOCK = Path('/www/backup/very-three-auto/.lock')
ORIGIN = 'https://verythree.online'
REPO = 'Kuma0595/Very-Three'
API = 'https://api.github.com/repos/' + REPO
MARKER = 'very-three-release.json'


def save_json(path, value):
    tmp = path.with_name(path.name + '.tmp')
    tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    os.replace(tmp, path)


def request(url, output=None, limit=128 * 1024 * 1024):
    # urllib 默认验证 HTTPS 证书，固定官方源，不使用不明镜像。
    headers = {'User-Agent': 'Very-Three-server-autodeploy', 'Accept': 'application/vnd.github+json'}
    last = None
    for attempt in range(2):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=35) as response:
                if output is None:
                    data = response.read(min(limit, 4 * 1024 * 1024) + 1)
                    if len(data) > min(limit, 4 * 1024 * 1024):
                        raise RuntimeError('GitHub API 响应过大。')
                    return json.loads(data)
                with output.open('wb') as stream:
                    size = 0
                    while True:
                        chunk = response.read(1024 * 1024)
                        if not chunk:
                            break
                        size += len(chunk)
                        if size > limit:
                            raise RuntimeError('下载包过大，停止部署。')
                        stream.write(chunk)
            return
        except Exception as error:
            last = error
    raise RuntimeError('无法从 GitHub 获取版本，本次不更新（' + type(last).__name__ + '）。')


def extract_dist(archive, destination):
    total = 0
    count = 0
    with tarfile.open(archive, 'r:gz') as bundle:
        for item in bundle:
            parts = PurePosixPath(item.name).parts
            if len(parts) < 2 or parts[1] != 'dist':
                continue
            if item.name.startswith('/') or '..' in parts:
                raise RuntimeError('下载包路径异常。')
            if len(parts) == 2:
                continue
            target = destination.joinpath(*parts[2:])
            if item.isdir():
                target.mkdir(parents=True, exist_ok=True)
                continue
            if not item.isfile():
                raise RuntimeError('dist 中有链接或特殊文件，停止部署。')
            total += item.size
            count += 1
            if total > 256 * 1024 * 1024 or count > 20000:
                raise RuntimeError('解压内容超过限制。')
            target.parent.mkdir(parents=True, exist_ok=True)
            with bundle.extractfile(item) as source, target.open('wb') as out:
                shutil.copyfileobj(source, out)
            target.chmod(0o644)
    if not count:
        raise RuntimeError('下载包不含网页文件。')
    for folder in destination.rglob('*'):
        if folder.is_dir():
            folder.chmod(0o755)


class Assets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'script' and attrs.get('src'):
            self.paths.append(attrs['src'])
        if tag == 'link' and attrs.get('rel') == 'stylesheet' and attrs.get('href'):
            self.paths.append(attrs['href'])


def validate(root):
    for name in ('index.html', 'admin/index.html', 'admin/models.html', 'cloud-config.js', 'scene.js'):
        if not (root / name).is_file() or not (root / name).stat().st_size:
            raise RuntimeError('版本缺少必要文件：' + name)
    for page in root.rglob('*.html'):
        parser = Assets()
        parser.feed(page.read_text())
        for reference in parser.paths:
            url = urllib.parse.urlsplit(reference)
            if url.scheme or url.netloc:
                continue
            path = urllib.parse.unquote(url.path)
            target = (root / path.lstrip('/') if path.startswith('/') else page.parent / path).resolve()
            if not target.is_relative_to(root.resolve()) or not target.is_file():
                raise RuntimeError('页面引用的静态文件缺失：' + reference)


def exchange(first, second):
    # Linux renameat2 一次切换两个目录项；首次 dist 是目录也不会出现空窗。
    libc = ctypes.CDLL(None, use_errno=True)
    rename = getattr(libc, 'renameat2', None)
    if rename is None:
        raise RuntimeError('系统不支持原子目录交换，未修改当前站点。')
    rename.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_uint]
    rename.restype = ctypes.c_int
    if rename(-100, os.fsencode(first), -100, os.fsencode(second), 2):
        err = ctypes.get_errno()
        raise OSError(err, os.strerror(err))


def probe(path):
    host = urllib.parse.urlsplit(ORIGIN).hostname
    result = subprocess.run(['curl', '--fail', '--silent', '--show-error', '--noproxy', '*',
                             '--max-time', '20', '--resolve', host + ':443:127.0.0.1',
                             ORIGIN + path], capture_output=True)
    if result.returncode:
        raise RuntimeError('本机 HTTPS 检查失败：' + path.split('?')[0])
    return result.stdout


def recover_pending():
    pending = STATE / 'pending.json'
    if not pending.exists():
        return
    info = json.loads(pending.read_text())
    holder = Path(info['holder'])
    # 有上次未结束的事务时，宁可暂停供人工检查，不能猜测当前目录状态。
    (STATE / 'PAUSED').touch()
    raise RuntimeError('上次切换未正常结束，已暂停自动部署。请检查 pending.json 和切换暂存目录：' + str(holder))


def switch(target):
    holder = LIVE.parent / ('.deploy-swap-' + uuid.uuid4().hex)
    holder.symlink_to(target)
    save_json(STATE / 'pending.json', {'holder': str(holder), 'target': str(target)})
    swapped = False
    try:
        exchange(LIVE, holder)
        swapped = True
        expected = (target / MARKER).read_bytes()
        if probe('/' + MARKER + '?deploy=' + uuid.uuid4().hex) != expected:
            raise RuntimeError('域名没有读取到新版本，已触发回退。')
        for path in ('/', '/admin/', '/admin/models.html'):
            probe(path)
    except BaseException:
        if swapped:
            exchange(LIVE, holder)
        holder.unlink()
        (STATE / 'pending.json').unlink()
        raise
    # 保存旧版本目录；正常情况下旧版已经是指向 release 的链接。
    if holder.is_symlink():
        previous = str(holder.resolve())
        holder.unlink()
    else:
        baseline = RELEASES / ('baseline-' + uuid.uuid4().hex)
        holder.rename(baseline)
        previous = str(baseline)
    current = json.loads((target / MARKER).read_text())
    save_json(STATE / 'state.json', {**current, 'active': str(target), 'previous': previous})
    (STATE / 'pending.json').unlink()
    return previous


def cleanup():
    state = json.loads((STATE / 'state.json').read_text())
    protected = {state['active'], state.get('previous', '')}
    # 仅删除本工具带标记的发布目录；初始原站目录另外保留。
    releases = sorted((p for p in RELEASES.glob('release-*')
                       if p.is_dir() and not p.is_symlink() and (p / MARKER).is_file()),
                      key=lambda p: p.stat().st_mtime, reverse=True)
    for folder in releases[3:]:
        if str(folder) not in protected:
            shutil.rmtree(folder)


def update():
    if (STATE / 'PAUSED').exists():
        print('自动部署已暂停，当前网站保持不变。')
        return
    state_file = STATE / 'state.json'
    old = json.loads(state_file.read_text()) if state_file.exists() else {}
    latest = request(API + '/commits/main')
    sha = latest['sha']
    if not re.fullmatch(r'[0-9a-f]{40}', sha):
        raise RuntimeError('GitHub 提交编号异常。')
    if old.get('checked_commit') == sha:
        print('已是最新版本：' + sha[:12])
        return
    tree = request(API + '/git/trees/' + latest['commit']['tree']['sha'])
    dist = next((v['sha'] for v in tree['tree'] if v['path'] == 'dist' and v['type'] == 'tree'), None)
    if not dist:
        raise RuntimeError('仓库没有 dist 目录。')
    if old.get('dist_tree') == dist:
        save_json(state_file, {**old, 'checked_commit': sha})
        print('网页文件没有变化，无需发布。')
        return
    # 先确认域名确实读取当前部署目录，防止发布到错误的站点。
    config = (LIVE / 'cloud-config.js').read_bytes()
    if probe('/cloud-config.js?deploy=' + uuid.uuid4().hex) != config:
        raise RuntimeError('域名与部署目录不一致，未修改站点。')
    with tempfile.TemporaryDirectory(prefix='download-', dir=STATE) as temp:
        archive = Path(temp) / 'source.tar.gz'
        request('https://codeload.github.com/' + REPO + '/tar.gz/' + sha, archive)
        release = RELEASES / ('release-' + sha[:12] + '-' + uuid.uuid4().hex[:8])
        release.mkdir(mode=0o755)
        try:
            extract_dist(archive, release)
            (release / 'cloud-config.js').write_bytes(config)
            validate(release)
            stamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
            save_json(release / MARKER, {'commit': sha, 'checked_commit': sha, 'dist_tree': dist, 'created_at': stamp})
            (release / MARKER).chmod(0o644)
            switch(release)
        except BaseException:
            if LIVE.resolve() != release.resolve():
                shutil.rmtree(release)
            raise
    cleanup()
    print('自动部署成功：' + sha[:12] + '；已保留上一版。', flush=True)


def rollback():
    state = json.loads((STATE / 'state.json').read_text())
    previous = Path(state['previous'])
    if not previous.is_dir() or previous.parent != RELEASES:
        raise RuntimeError('没有可用的上一版。')
    if not (previous / MARKER).is_file():
        save_json(previous / MARKER, {'commit': 'original-server', 'created_at': 'before-autodeploy'})
        (previous / MARKER).chmod(0o644)
    (STATE / 'PAUSED').touch()
    switch(previous)
    print('已回退上一版，并暂停自动部署；resume 后恢复检查。')


def main():
    if os.geteuid() != 0:
        raise RuntimeError('请使用 root 执行。')
    os.umask(0o022)
    STATE.mkdir(parents=True, exist_ok=True, mode=0o700)
    STATE.chmod(0o700)
    RELEASES.mkdir(parents=True, exist_ok=True, mode=0o755)
    BACKUP_LOCK.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    with (STATE / '.lock').open('a') as local, BACKUP_LOCK.open('a') as backup:
        try:
            fcntl.flock(local, fcntl.LOCK_EX | fcntl.LOCK_NB)
            fcntl.flock(backup, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            print('部署或备份正在运行，本次稍后再试。')
            return
        recover_pending()
        action = sys.argv[1] if len(sys.argv) > 1 else 'check'
        if action == 'check':
            update()
        elif action == 'rollback':
            rollback()
        elif action == 'resume':
            (STATE / 'PAUSED').unlink(missing_ok=True)
            print('已恢复自动部署，下次定时检查时更新。')
        elif action == 'pause':
            (STATE / 'PAUSED').touch()
            print('自动部署已暂停。')
        else:
            raise RuntimeError('可用命令：check / rollback / pause / resume')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('部署未完成：' + str(error), file=sys.stderr)
        sys.exit(1)
