"""PDF 텍스트 추출 — 폰트별 ToUnicode CMap 을 각각 적용한다.

CMap 을 하나로 합치면 폰트마다 같은 CID 가 다른 글자를 가리켜 글자가 깨진다
(제일 PDF 에서 '원산지'가 '원사지'로 나온 원인). 그래서 /Fx Tf 로 현재 폰트를
추적하며 해당 폰트의 CMap 만 쓴다. 매핑 없는 CID 는 � 로 남긴다.
"""
import re, sys, zlib, json

def _objs(d):
    return {int(m.group(1)): m.group(2)
            for m in re.finditer(rb'(\d+)\s+0\s+obj(.*?)endobj', d, re.S)}

def _stream(objs, num):
    b = objs.get(num, b'')
    sm = re.search(rb'stream\r?\n(.*?)endstream', b, re.S)
    if not sm: return None
    try: return zlib.decompress(sm.group(1).strip(b'\r\n'))
    except Exception: return sm.group(1)

def _parse_cmap(raw):
    cm = {}
    if not raw: return cm
    txt = raw.decode('latin-1')
    for blk in re.findall(r'beginbfchar(.*?)endbfchar', txt, re.S):
        for a, b in re.findall(r'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>', blk):
            cm[int(a, 16)] = ''.join(chr(int(b[i:i+4], 16)) for i in range(0, len(b), 4))
    for blk in re.findall(r'beginbfrange(.*?)endbfrange', txt, re.S):
        for a, b, c in re.findall(r'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>', blk):
            lo, hi, st = int(a, 16), int(b, 16), int(c, 16)
            for i in range(lo, hi + 1): cm[i] = chr(st + i - lo)
    return cm

def extract(path):
    d = open(path, 'rb').read()
    objs = _objs(d)
    fontcmap = {n: _parse_cmap(_stream(objs, int(tu.group(1))))
                for n, b in objs.items()
                if b'/Font' in b and (tu := re.search(rb'/ToUnicode\s+(\d+)\s+0\s+R', b))}
    name2font = {}
    for n, b in objs.items():
        for fm in re.finditer(rb'/([A-Za-z][A-Za-z0-9_]*)\s+(\d+)\s+0\s+R', b):
            fo = int(fm.group(2))
            if fo in fontcmap: name2font[fm.group(1).decode()] = fo

    lines = []
    for n in objs:
        raw = _stream(objs, n)
        if not raw or (b'Tj' not in raw and b'TJ' not in raw): continue
        txt = raw.decode('latin-1')
        cur, cm = '', {}
        for tok in re.finditer(
                r'/([A-Za-z][A-Za-z0-9_]*)\s+[\d.]+\s+Tf|<([0-9A-Fa-f]+)>'
                r'|\(((?:[^()\\]|\\.)*)\)|(T[dDm*])|(TJ|Tj)', txt):
            if tok.group(1):
                cm = fontcmap.get(name2font.get(tok.group(1), -1), {})
            elif tok.group(2):
                h = tok.group(2)
                cur += ''.join(cm.get(int(h[i:i+4], 16), '�') for i in range(0, len(h), 4))
            elif tok.group(3) is not None:
                s = tok.group(3)
                if s != 'x-none': cur += s
            elif tok.group(4):
                if cur.strip(): lines.append(cur.strip()); cur = ''
        if cur.strip(): lines.append(cur.strip())
    return [l for l in lines if l and l != 'x-none']

if __name__ == '__main__':
    for l in extract(sys.argv[1]): print(l)
