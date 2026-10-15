#!/usr/bin/env python3
"""生成一致的本机恢复材料，仅轮换本工具生成的成功备份。"""
import datetime
import fcntl
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
import tempfile

BACKEND = Path('/www/server/very-three-backend')
DEST = Path('/www/backup/very-three-auto')
SERVICES = ['api-gw', 'auth', 'rest', 'realtime', 'storage']


def command(args, output=None, input_file=None):
    result = subprocess.run(args, cwd=BACKEND, stdout=output or subprocess.PIPE,
                            stdin=input_file, stderr=subprocess.PIPE)
    if result.returncode:
        raise RuntimeError('命令执行失败：' + args[0] + '（完整输出未写入终端）')
    return result.stdout


def compose(*args, output=None, input_file=None):
    return command(['docker', 'compose', *args], output, input_file)


def digest(path):
    value = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            value.update(chunk)
    return value.hexdigest()


def retain(root, count=7):
    # 不处理手工备份、迁移备份、符号链接或无完成标记的目录。
    owned = sorted((p for p in root.glob('snapshot-*')
                    if p.is_dir() and not p.is_symlink()
                    and (p / 'COMPLETE').is_file() and (p / 'manifest.json').is_file()),
                   key=lambda p: p.name, reverse=True)
    owned = [p for p in owned if json.loads((p / 'manifest.json').read_text()).get('owner') == 'very-three-auto-backup-v1']
    for folder in owned[count:]:
        if folder.parent.resolve() != root.resolve():
            raise RuntimeError('备份目录异常，停止轮换。')
        manifest = json.loads((folder / 'manifest.json').read_text())
        if manifest.get('owner') != 'very-three-auto-backup-v1':
            continue
        shutil.rmtree(folder)


def snapshot(folder):
    paused = False
    try:
        paused = True
        compose('stop', *SERVICES)
        print('API 已暂停，正在备份数据库与照片。', flush=True)
        with (folder / 'database.dump').open('wb') as stream:
            compose('exec', '-T', 'db', 'pg_dump', '-U', 'supabase_admin', '-d', 'postgres', '-Fc', output=stream)
        with (folder / 'globals.sql').open('wb') as stream:
            compose('exec', '-T', 'db', 'pg_dumpall', '-U', 'supabase_admin', '--globals-only', output=stream)
        query = "SELECT jsonb_build_object('postgres_version',current_setting('server_version'),'accounts',(SELECT count(*) FROM auth.users),'members',(SELECT count(*) FROM public.vt_members),'photos',(SELECT count(*) FROM storage.objects));"
        counts = json.loads(compose('exec', '-T', 'db', 'psql', '-X', '-U', 'supabase_admin', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1', '-c', query))
        (folder / 'counts.json').write_text(json.dumps(counts, indent=2) + '\n')
        command(['tar', '-czf', str(folder / 'photos.tar.gz'), '-C', str(BACKEND / 'volumes/storage'), '.'])
        command(['tar', '--exclude=./volumes/db/data', '--exclude=./volumes/storage',
                 '--exclude=./bootstrap-private.log', '--exclude=./.env.old', '--exclude=./.git',
                 '-czf', str(folder / 'backend-config.tar.gz'), '-C', str(BACKEND), '.'])
        with (folder / 'db-config-volume.tar.gz').open('wb') as stream:
            compose('exec', '-T', 'db', 'tar', '-czf', '-', '-C', '/etc', 'postgresql-custom', output=stream)
        command(['tar', '-h', '-czf', str(folder / 'website.tar.gz'), '-C', '/www/wwwroot/very-three', 'dist'])
        command(['tar', '-czf', str(folder / 'web-config-certificates.tar.gz'), '-C', '/',
                 'www/server/panel/vhost/nginx/very-three.conf',
                 'www/server/panel/vhost/cert/very-three', 'root/.acme.sh'])
        # 验证自定义格式数据库目录可读；不把 SQL 数据输出到日志。
        with (folder / 'database.dump').open('rb') as stream:
            toc = compose('exec', '-T', 'db', 'pg_restore', '--list', input_file=stream)
        for marker in (b'auth users', b'public vt_members', b'storage objects'):
            if marker not in toc:
                raise RuntimeError('数据库备份缺少关键表。')
        for archive in folder.glob('*.tar.gz'):
            with tarfile.open(archive, 'r:gz') as tar:
                if not tar.getmembers():
                    raise RuntimeError('文件备份为空。')
        files = sorted(p for p in folder.iterdir() if p.is_file())
        manifest = {'owner': 'very-three-auto-backup-v1',
                    'created_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    'files': {p.name: {'bytes': p.stat().st_size, 'sha256': digest(p)} for p in files}}
        (folder / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    finally:
        if paused:
            print('正在恢复 API 服务……', flush=True)
            compose('up', '-d', '--wait', '--wait-timeout', '300')


def main():
    os.umask(0o077)
    DEST.mkdir(parents=True, exist_ok=True, mode=0o700)
    DEST.chmod(0o700)
    with (DEST / '.lock').open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RuntimeError('已有备份正在执行，本次未重复运行。')
        stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        folder = Path(tempfile.mkdtemp(prefix='.partial-' + stamp + '-', dir=DEST))
        try:
            snapshot(folder)
            (folder / 'COMPLETE').touch()
            completed = folder.with_name(folder.name.replace('.partial-', 'snapshot-', 1))
            folder.rename(completed)
            retain(DEST, 7)
            print('备份成功并通过完整性检查：' + str(completed), flush=True)
            print('保留最近 7 份成功备份，迁移备份保持保留。', flush=True)
        except Exception:
            if folder.exists():
                folder.rename(folder.with_name(folder.name.replace('.partial-', 'failed-', 1)))
            raise


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('备份失败：' + str(error), file=sys.stderr)
        sys.exit(1)
