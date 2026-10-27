import re, html, sys, os
def to_text(f):
    t = open(f, encoding='utf-8', errors='ignore').read()
    t = re.sub(r'<script[^>]*>.*?</script>', ' ', t, flags=re.S)
    t = re.sub(r'<style[^>]*>.*?</style>', ' ', t, flags=re.S)
    t = re.sub(r'<[^>]+>', ' ', t)
    t = html.unescape(re.sub(r'\s+', ' ', t))
    # find article body start
    m = re.search(r'(Skip to main content|Last updated|Written by)', t)
    return t
for f in sys.argv[1:]:
    out = f.replace('.html', '.txt')
    txt = to_text(f)
    open(out, 'w').write(txt)
    print(out, len(txt))
