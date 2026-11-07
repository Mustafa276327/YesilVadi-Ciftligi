#!/usr/bin/env python3
"""Yeşil Vadi Çiftliği — web ve tek dosya derleyicisi.

Kaynak parçaları src/ altında durur. Bu betik:
  index.html, styles.css, app.js  → normal web sürümü
  GreenValleyFarm.html            → CSS/JS/yazı tipi gömülü tek dosya
üretir. APK derlemesi ayrıdır; GreenValleyFarm.html dosyasını Android
projesinin assets klasörüne kopyalayıp Gradle ile derleyin.
"""
from pathlib import Path
import base64
import sys

ROOT = Path(__file__).resolve().parent
SRC = ROOT / 'src'
HTML_PARTS = [
    '01_head_home.html', '02_farm.html', '03_icons.html', '04_art_chars.html',
    '05_art_hero.html', '06_map_base.html', '07_map_zones_top.html',
    '08_map_zones_bottom.html', '09_map_labels.html',
]
CSS_PARTS = ['10_css_base_home.css', '11_css_farm_live.css', '12_css_nav_simple.css', '15_game.css']
JS_PARTS = ['13_app_data.js', '14_app_logic.js']


def read_parts(names):
    out = []
    for name in names:
        out.append((SRC / name).read_text(encoding='utf-8'))
    return ''.join(out)


def main():
    index = read_parts(HTML_PARTS) + '\n<script src="app.js"></script>\n</body>\n</html>\n'
    css = read_parts(CSS_PARTS)
    js = read_parts(JS_PARTS)
    if '</script' in js.lower():
        sys.exit('app.js içinde </script> var; tek dosyaya gömülemez.')

    (ROOT / 'index.html').write_text(index, encoding='utf-8')
    (ROOT / 'styles.css').write_text(css, encoding='utf-8')
    (ROOT / 'app.js').write_text(js, encoding='utf-8')

    font_path = ROOT / 'assets' / 'jakarta-variable.woff2'
    font_b64 = base64.b64encode(font_path.read_bytes()).decode('ascii')
    font_url = "url('assets/jakarta-variable.woff2')"
    font_data = 'url(data:font/woff2;base64,' + font_b64 + ')'
    if font_url not in css:
        sys.exit('styles.css içinde gömülecek yazı tipi yolu bulunamadı.')
    css_inline = css.replace(font_url, font_data)

    standalone = index
    for line in (
        '<link rel="manifest" href="manifest.webmanifest">\n',
        '<link rel="icon" href="assets/icon.svg" type="image/svg+xml">\n',
        '<link rel="apple-touch-icon" href="assets/icon-180.png">\n',
    ):
        standalone = standalone.replace(line, '')
    standalone = standalone.replace(
        '<link rel="stylesheet" href="styles.css">',
        '<style>\n' + css_inline + '\n</style>',
    )
    standalone = standalone.replace(
        '<script src="app.js"></script>',
        '<script>\n' + js + '\n</script>',
    )
    (ROOT / 'GreenValleyFarm.html').write_text(standalone, encoding='utf-8')

    for name in ('index.html', 'styles.css', 'app.js', 'GreenValleyFarm.html'):
        print(f'{name:24} { (ROOT / name).stat().st_size / 1024:8.1f} KB')
    print('Hazır. APK için GreenValleyFarm.html dosyasını assets klasörüne kopyala.')


if __name__ == '__main__':
    main()
