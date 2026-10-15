"""GitHub Pages 仅保留新站跳转入口，不再发布旧云端客户端。"""
from pathlib import Path
import html
import json

source = Path('dist')
output = Path('_pages_redirect')
base = 'https://114.132.201.227/'
for relative in [p.relative_to(source) for p in source.rglob('*.html')] + [Path('404.html')]:
    target = base + ('' if relative == Path('404.html') else str(relative))
    if target.endswith('index.html'):
        target = target[:-10]
    page = output / relative
    page.parent.mkdir(parents=True, exist_ok=True)
    page.write_text(f'''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer"><meta http-equiv="refresh" content="0;url={html.escape(target, quote=True)}">
<title>Very Three · 小屋搬新家了</title><script>location.replace({json.dumps(target)});</script>
</head><body><p>小屋搬新家了，正在为你开门。</p><a href="{html.escape(target, quote=True)}" rel="noreferrer">进入我们的小家</a></body></html>''', encoding='utf-8')
(output / '.nojekyll').touch()
print('GitHub Pages 跳转页面已生成。')
