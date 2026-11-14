"""Static checks: translation keys and the service worker asset list.  Usage: python tools/check.py"""
import glob
import json
import os
import re

d = json.load(open('data/i18n.json', encoding='utf-8'))
en, tr = set(d['en']), set(d['tr'])
print('only in en:', sorted(en - tr))
print('only in tr:', sorted(tr - en))

used, dynamic = set(), set()
for path in glob.glob('js/*.js') + ['index.html']:
    s = open(path, encoding='utf-8').read()
    used |= set(re.findall(r"\bt\(\s*'([a-zA-Z0-9_.]+)'\s*[,)]", s))
    used |= set(re.findall(r'data-i18n="([^"]+)"', s))
    dynamic |= set(re.findall(r"\bt\(\s*'([a-zA-Z0-9_.]+\.)'\s*\+", s))
print('used but missing:', sorted(k for k in used if k not in en))
print('unused:', sorted(k for k in en if k not in used and not any(k.startswith(p) for p in dynamic)))

sw = open('sw.js', encoding='utf-8').read()
assets = set(re.findall(r"'([\w./-]+\.(?:js|json|css|html|png|svg|webmanifest|glb))'", sw))
files = set()
for pattern in ('js/*.js', 'data/*.json', 'css/*.css', 'vendor/*.js', 'vendor/*/*.js'):
    files |= set(f.replace(os.sep, '/') for f in glob.glob(pattern))
print('files not in the offline cache list:', sorted(files - assets))
print('cache list entries without a file:', sorted(a for a in assets if not os.path.exists(a)))
