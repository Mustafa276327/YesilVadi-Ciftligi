#!/usr/bin/env python3
"""APK'yi yeniden paketler: resources.arsc sıkıştırmasız + 4 bayt hizalı."""
import os, sys, zlib, struct, time

SRC = sys.argv[1] if len(sys.argv) > 1 else 'orig'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'gvf_rebuilt.apk'

files = []
for root, _dirs, names in os.walk(SRC):
    for n in names:
        full = os.path.join(root, n)
        rel = os.path.relpath(full, SRC).replace(os.sep, '/')
        files.append((rel, full))
files.sort()

# AndroidManifest ilk, resources.arsc sonda olacak şekilde sırala (hizalama kolaylığı)
def key(item):
    rel = item[0]
    if rel == 'AndroidManifest.xml':
        return (0, rel)
    if rel == 'resources.arsc':
        return (2, rel)
    return (1, rel)

files.sort(key=key)

def dosya_tarihi():
    return (0, 0x21)  # 1980-01-01 sabit

out = open(OUT, 'wb')
central = []
offset = 0
ZIP64 = False

for rel, full in files:
    with open(full, 'rb') as f:
        data = f.read()
    crc = zlib.crc32(data) & 0xFFFFFFFF
    store = (rel == 'resources.arsc')
    if store:
        comp = data
        method = 0
    else:
        co = zlib.compressobj(9, zlib.DEFLATED, -15)
        comp = co.compress(data) + co.flush()
        method = 8
        if len(comp) >= len(data):
            comp = data
            method = 0
    name = rel.encode('utf-8')
    flags = 0x0800  # UTF-8 isim
    mtime, mdate = dosya_tarihi()

    extra = b''
    if rel == 'resources.arsc':
        base = offset + 30 + len(name)
        pad = (4 - (base % 4)) % 4
        if pad == 0:
            extra = b''
        elif pad < 4:
            extra = b'\x00' * pad
        else:
            extra = struct.pack('<HH', 0xD935, pad - 4) + b'\x00' * (pad - 4)

    lh = struct.pack('<IHHHHHIIIHH', 0x04034B50, 20, flags, method, mtime, mdate,
                     crc, len(comp), len(data), len(name), len(extra))
    out.write(lh); out.write(name); out.write(extra); out.write(comp)

    central.append((name, flags, method, mtime, mdate, crc, len(comp), len(data), offset, extra))
    offset += len(lh) + len(name) + len(extra) + len(comp)

cd_start = offset
for (name, flags, method, mtime, mdate, crc, csize, usize, lho, extra) in central:
    ch = struct.pack('<IHHHHHHIIIHHHHHII', 0x02014B50, 0x031E, 20, flags, method,
                     mtime, mdate, crc, csize, usize, len(name), len(extra), 0, 0, 0, 0, lho)
    out.write(ch); out.write(name); out.write(extra)
    offset += len(ch) + len(name) + len(extra)

cd_size = offset - cd_start
eocd = struct.pack('<IHHHHIIH', 0x06054B50, 0, 0, len(central), len(central),
                   cd_size, cd_start, 0)
out.write(eocd)
out.close()
print(f'{len(central)} dosya -> {OUT} ({os.path.getsize(OUT)} bayt)')
