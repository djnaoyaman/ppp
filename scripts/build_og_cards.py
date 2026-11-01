#!/usr/bin/env python3
"""Build vector sharing cards from the approved wordmark and existing page metadata.

Run this script, then render og/source/*.svg to same-name 1200x630 PNGs.
No medical assertions are authored here: all card copy is recorded source metadata.
"""
from pathlib import Path
import json,html,textwrap,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
SVG='http://www.w3.org/2000/svg'
ET.register_namespace('',SVG)
master=ET.parse(ROOT/'assets/brand/ppp-wordmark-teal.svg').getroot()
logo=''.join(ET.tostring(child,encoding='unicode') for child in master)
source=json.loads((ROOT/'scripts/og-card-source.json').read_text())
output=ROOT/'og/source';output.mkdir(parents=True,exist_ok=True)
for png,card in source.items():
 title=html.escape(card['title']);description=textwrap.wrap(card['description'],width=44,break_long_words=True,break_on_hyphens=False)
 assert len(description)<=5,(png,len(description))
 rows=''.join(f'<text x="72" y="{412+i*34}" font-size="24" fill="#555d5d">{html.escape(line)}</text>' for i,line in enumerate(description))
 svg=f'''<svg xmlns="{SVG}" width="1200" height="630" viewBox="0 0 1200 630">
<title>{title}｜掌蹠膿疱症.com</title>
<desc>{html.escape(card['description'])}</desc>
<rect width="1200" height="630" fill="#ffffff"/>
<rect width="14" height="630" fill="#52A3A3"/>
<svg x="72" y="32" width="748" height="214" viewBox="{master.attrib['viewBox']}">{logo}</svg>
<path d="M72 278H1128" stroke="#d7e9e9" stroke-width="2"/>
<g font-family="Noto Sans CJK JP, sans-serif">
<text x="72" y="345" font-size="42" font-weight="700" fill="#182323">{title}</text>
{rows}
</g>
</svg>'''
 (output/(Path(png).stem+'.svg')).write_text(svg)
print(f'Generated {len(source)} source-linked SVG cards')
