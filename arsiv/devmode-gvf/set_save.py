#!/usr/bin/env python3
"""WebView LocalStorage leveldb kaydina yeni deger yazar (log append yontemi).

Kullanim:  python3 set_save.py <leveldb_dizini> <yeni_json_dosyasi>
"""
import os, sys, struct

BLOCK = 32768
MASK_DELTA = 0xa282ead8

_crc_table = []
for _i in range(256):
    _c = _i
    for _ in range(8):
        _c = (_c >> 1) ^ (0x82F63B78 if _c & 1 else 0)
    _crc_table.append(_c)


def crc32c(data):
    crc = 0xFFFFFFFF
    for b in data:
        crc = _crc_table[(crc ^ b) & 0xFF] ^ (crc >> 8)
    return crc ^ 0xFFFFFFFF


def mask(crc):
    return ((((crc >> 15) | (crc << 17)) & 0xFFFFFFFF) + MASK_DELTA) & 0xFFFFFFFF


def varint(n):
    out = b''
    while True:
        b = n & 0x7F
        n >>= 7
        out += bytes([b | 0x80]) if n else bytes([b])
        if not n:
            return out


def read_varint(b, i):
    r = s = 0
    while True:
        c = b[i]; i += 1
        r |= (c & 0x7F) << s
        if not c & 0x80:
            return r, i
        s += 7


def read_log(path):
    """Fiziksel kayitlari birlestirip mantiksal kayitlari dondurur + son gecerli offset."""
    data = open(path, 'rb').read()
    off, last_end, phys = 0, 0, []
    while off < len(data):
        left = BLOCK - (off % BLOCK)
        if left < 7:
            off += left
            continue
        if off + 7 > len(data):
            break
        crc, ln, typ = struct.unpack('<IHB', data[off:off + 7])
        if typ == 0 or ln == 0 or off + 7 + ln > len(data):
            off += left
            continue
        phys.append((typ, data[off + 7:off + 7 + ln]))
        off += 7 + ln
        last_end = off

    recs, buf = [], b''
    for typ, rec in phys:
        if typ == 1:
            recs.append(rec)
        elif typ == 2:
            buf = rec
        elif typ == 3:
            buf += rec
        elif typ == 4:
            buf += rec
            recs.append(buf); buf = b''
    return data, recs, last_end


def parse_batch(b):
    if len(b) < 8:
        return None
    hdr = struct.unpack('<Q', b[:8])[0]
    seq, cnt = hdr >> 8, hdr & 0xFF
    i, items = 8, []
    while i < len(b):
        t = b[i]; i += 1
        kl, i = read_varint(b, i)
        k = b[i:i + kl]; i += kl
        if t == 1:
            vl, i = read_varint(b, i)
            v = b[i:i + vl]; i += vl
            items.append((k, v))
        else:
            items.append((k, None))
    return seq, cnt, items


def main():
    d, newjson_path = sys.argv[1], sys.argv[2]
    logs = sorted(f for f in os.listdir(d) if f.endswith('.log'))
    active = os.path.join(d, logs[-1])
    data, recs, last_end = read_log(active)

    max_seq, target_key = 0, None
    for r in recs:
        pb = parse_batch(r)
        if not pb:
            continue
        seq, cnt, items = pb
        max_seq = max(max_seq, seq + max(cnt, 1) - 1)
        for k, _v in items:
            if b'yesilvadi_tycoon_v2' in k:
                target_key = k
    if target_key is None:
        print('HATA: anahtar bulunamadi'); sys.exit(1)

    text = open(newjson_path, 'r', encoding='utf-8').read().strip()
    val = b'\x00' + text.encode('utf-16-le')          # WebView: 0x00 = UTF-16

    seq = max_seq + 1000
    if len(sys.argv) > 3:
        seq = max(seq, int(sys.argv[3]))
    batch = struct.pack('<Q', (seq << 8) | 1)          # (sequence<<8)|count
    batch += b'\x01' + varint(len(target_key)) + target_key + varint(len(val)) + val
    rec = struct.pack('<IHB', mask(crc32c(b'\x01' + batch)), len(batch), 1) + batch

    pad = (BLOCK - (last_end % BLOCK)) % BLOCK
    if pad < 7:
        pad += BLOCK
    out = data[:last_end] + b'\x00' * pad + rec
    open(active, 'wb').write(out)
    print(f'{os.path.basename(active)}: max_seq={max_seq} yeni_seq={seq} '
          f'deger={len(val)}B dosya={len(out)}B')


if __name__ == '__main__':
    main()
