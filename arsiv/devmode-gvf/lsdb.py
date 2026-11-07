#!/usr/bin/env python3
"""WebView LocalStorage leveldb -> anahtar/deger dokumu (basit)."""
import struct, sys, glob, os

def read_log(path):
    data = open(path, 'rb').read()
    out = []
    off = 0
    # leveldb log: 32KB blok
    while off < len(data):
        block_left = 32768 - (off % 32768)
        if block_left < 7:
            off += block_left
            continue
        if off + 7 > len(data):
            break
        crc, ln, typ = struct.unpack('<IHB', data[off:off+7])
        if typ == 0 or ln == 0 or off + 7 + ln > len(data):
            # bozuk/boş kayıt -> sonraki bloğa geç
            off += block_left
            continue
        rec = data[off+7:off+7+ln]
        out.append((typ, rec))
        off += 7 + ln
    # parçaları birleştir
    result, buf = [], b''
    for typ, rec in out:
        if typ == 1:
            result.append(rec)
        elif typ == 2:
            buf = rec
        elif typ == 3:
            buf += rec
        elif typ == 4:
            buf += rec
            result.append(buf); buf = b''
    return result

def parse_batch(b):
    """WriteBatch: seq(8) count(4) sonra (type:1 keylen:varint key vallen:varint value)*"""
    if len(b) < 12:
        return []
    i = 12
    items = []
    def varint(b, i):
        r = s = 0
        while True:
            c = b[i]; i += 1
            r |= (c & 0x7f) << s
            if not c & 0x80: return r, i
            s += 7
    while i < len(b):
        t = b[i]; i += 1
        kl, i = varint(b, i)
        k = b[i:i+kl]; i += kl
        if t == 1:
            vl, i = varint(b, i)
            v = b[i:i+vl]; i += vl
            items.append((k, v))
        else:
            items.append((k, None))
    return items

def show(k, v):
    try:
        key = k.decode('utf-16-le', 'replace').strip('\x00')
        if key.startswith('_' ):
            key = key[1:]
        key = key.strip('\x00')
    except Exception:
        key = repr(k)
    if v is None:
        print(f'[SİL] {key!r}')
        return
    # WebView değerleri: başta 1 bayt (0=utf16,1=latin1) olabilir
    txt = None
    for enc, off in (('utf-16-le', 1), ('utf-16-le', 0), ('utf-8', 0)):
        try:
            t = v[off:].decode(enc)
            if t.isprintable() or '{' in t:
                txt = t
                break
        except Exception:
            pass
    if txt is None:
        txt = repr(v[:200])
    print(f'--- {key} --- ({len(v)} bayt)')
    print(txt[:1500])
    print()

for p in sorted(glob.glob(os.path.join(sys.argv[1], '*.log'))):
    print(f'### {os.path.basename(p)}')
    for rec in read_log(p):
        for k, v in parse_batch(rec):
            show(k, v)
