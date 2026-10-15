"""本机隔离验证：目录切换、回退、配置保留及不可信压缩包处理。"""
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('deploy', Path(__file__).with_name('deploy.py'))
d = importlib.util.module_from_spec(spec)
spec.loader.exec_module(d)


class DeployTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.live = self.root / 'site' / 'dist'
        self.live.mkdir(parents=True)
        self.releases = self.root / 'releases'
        self.releases.mkdir()
        self.state = self.root / 'state'
        self.state.mkdir()
        self.patches = patch.multiple(d, LIVE=self.live, RELEASES=self.releases, STATE=self.state)
        self.patches.start()
        (self.live / 'cloud-config.js').write_text('server-only-public-config')
        (self.live / 'index.html').write_text('original')

    def tearDown(self):
        self.patches.stop()
        self.temp.cleanup()

    def release(self, suffix):
        folder = self.releases / ('release-' + suffix)
        folder.mkdir()
        (folder / 'index.html').write_text(suffix)
        (folder / d.MARKER).write_text(json.dumps({'commit': suffix}))
        return folder

    def good_probe(self, path):
        return (self.live / d.MARKER).read_bytes() if d.MARKER in path else b'OK'

    def test_first_and_subsequent_switch_keep_previous(self):
        first = self.release('first')
        with patch.object(d, 'probe', self.good_probe):
            previous = d.switch(first)
            self.assertEqual((Path(previous) / 'index.html').read_text(), 'original')
            second = self.release('second')
            d.switch(second)
        self.assertEqual(self.live.resolve(), second)
        state = json.loads((self.state / 'state.json').read_text())
        self.assertEqual(state['previous'], str(first))
        self.assertFalse((self.state / 'pending.json').exists())

    def test_http_failure_restores_original_directory(self):
        release = self.release('bad')
        with patch.object(d, 'probe', side_effect=RuntimeError('HTTP failure')):
            with self.assertRaises(RuntimeError):
                d.switch(release)
        self.assertFalse(self.live.is_symlink())
        self.assertEqual((self.live / 'index.html').read_text(), 'original')
        self.assertFalse((self.state / 'pending.json').exists())

    def test_http_failure_restores_previous_symlink(self):
        first, bad = self.release('first'), self.release('bad')
        with patch.object(d, 'probe', self.good_probe):
            d.switch(first)
        with patch.object(d, 'probe', return_value=b'wrong-site'):
            with self.assertRaises(RuntimeError):
                d.switch(bad)
        self.assertEqual(self.live.resolve(), first)
        self.assertEqual(json.loads((self.state / 'state.json').read_text())['commit'], 'first')

    def test_manual_rollback_pauses_auto_updates(self):
        first = self.release('first')
        with patch.object(d, 'probe', self.good_probe):
            d.switch(first)
            d.rollback()
        self.assertEqual((self.live / 'index.html').read_text(), 'original')
        self.assertTrue((self.state / 'PAUSED').exists())
        with patch.object(d, 'request') as request:
            d.update()
            request.assert_not_called()

    def write_archive(self, path, entries):
        with tarfile.open(path, 'w:gz') as bundle:
            for name, text in entries.items():
                item = tarfile.TarInfo('source/dist/' + name)
                item.size = len(text.encode())
                bundle.addfile(item, io.BytesIO(text.encode()))

    def test_update_preserves_config_and_pins_download_commit(self):
        sha = 'a' * 40
        entries = {'index.html': '<script src="./app.js?v=1"></script>', 'app.js': '// fine',
                   'admin/index.html': '<html>admin</html>', 'admin/models.html': '<html>models</html>',
                   'scene.js': '// scene', 'cloud-config.js': 'old-cloud-config'}
        urls = []
        def request(url, output=None):
            urls.append(url)
            if output is not None:
                self.write_archive(output, entries)
            elif '/commits/' in url:
                return {'sha': sha, 'commit': {'tree': {'sha': 'tree'}}}
            else:
                return {'tree': [{'path': 'dist', 'type': 'tree', 'sha': 'dist-tree'}]}
        def probe(path):
            if 'cloud-config.js' in path:
                return (self.live / 'cloud-config.js').read_bytes()
            return self.good_probe(path)
        with patch.object(d, 'request', request), patch.object(d, 'probe', probe):
            d.update()
        self.assertEqual((self.live / 'cloud-config.js').read_text(), 'server-only-public-config')
        self.assertTrue(any(url.endswith('/' + sha) for url in urls))
        # 无网页变化时只更新检查记录，不切换目录。
        original = self.live.resolve()
        state = json.loads((self.state / 'state.json').read_text())
        state['checked_commit'] = 'older'
        d.save_json(self.state / 'state.json', state)
        with patch.object(d, 'request', request), patch.object(d, 'probe', side_effect=AssertionError('must not probe')):
            d.update()
        self.assertEqual(self.live.resolve(), original)

    def test_download_failure_does_not_touch_site(self):
        with patch.object(d, 'request', side_effect=RuntimeError('network unavailable')):
            with self.assertRaises(RuntimeError):
                d.update()
        self.assertEqual((self.live / 'index.html').read_text(), 'original')

    def test_traversal_and_symlink_are_rejected(self):
        archive = self.root / 'bad.tar.gz'
        self.write_archive(archive, {'../../escape': 'bad'})
        with self.assertRaises(RuntimeError):
            d.extract_dist(archive, self.root / 'output')
        with tarfile.open(archive, 'w:gz') as bundle:
            item = tarfile.TarInfo('source/dist/evil')
            item.type = tarfile.SYMTYPE
            item.linkname = '/etc/passwd'
            bundle.addfile(item)
        with self.assertRaises(RuntimeError):
            d.extract_dist(archive, self.root / 'output')
        self.assertFalse((self.root / 'escape').exists())

    def test_missing_static_asset_rejected(self):
        for name in ['index.html', 'admin/index.html', 'admin/models.html', 'scene.js', 'cloud-config.js']:
            p = self.live / name
            p.parent.mkdir(exist_ok=True)
            p.write_text('<script src="missing.js"></script>' if name == 'index.html' else 'ok')
        with self.assertRaises(RuntimeError):
            d.validate(self.live)

    def test_interrupted_transaction_pauses(self):
        d.save_json(self.state / 'pending.json', {'holder': '/some/holder'})
        with self.assertRaises(RuntimeError):
            d.recover_pending()
        self.assertTrue((self.state / 'PAUSED').exists())

    def test_backup_tar_contains_files_behind_dist_link(self):
        release = self.release('first')
        with patch.object(d, 'probe', self.good_probe):
            d.switch(release)
        archive = self.root / 'website.tar.gz'
        subprocess.run(['tar', '-h', '-czf', str(archive), '-C', str(self.live.parent), 'dist'], check=True)
        with tarfile.open(archive) as bundle:
            self.assertEqual(bundle.extractfile('dist/index.html').read(), b'first')


if __name__ == '__main__':
    unittest.main()
