from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse
import json,hashlib,re,struct,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
contract=json.loads((ROOT/'tests/brand-contract.json').read_text())
class Page(HTMLParser):
 def __init__(self,s):super().__init__();self.meta={};self.ids=[];self.links=[];self.logos=[];self.canonical=[];self.feed(s)
 def handle_starttag(self,t,a):
  d=dict(a)
  if 'id' in d:self.ids.append(d['id'])
  if t=='a':self.links.append(d.get('href'))
  if t=='img' and 'brand-logo' in d.get('class',''):self.logos.append(d)
  if t=='link' and d.get('rel')=='canonical':self.canonical.append(d.get('href'))
  if t=='meta':self.meta[d.get('property',d.get('name'))]=d.get('content','')
paths=sorted(p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*.html') if 'node_modules' not in p.parts and 'test-artifacts' not in p.parts)
assert len(paths)==47 and set(paths)==set(contract['pages'])
assert hashlib.sha256((ROOT/'assets/brand/ppp-wordmark-teal.svg').read_bytes()).hexdigest()==contract['logo_sha256']
master=(ROOT/'assets/brand/ppp-wordmark-teal.svg').read_text();assert '[しょうせきのうほうしょう.com]' in master
for rel in paths:
 p=ROOT/rel;s=p.read_text();page=Page(s);old=contract['pages'][rel]
 assert page.canonical==old['canonical'],rel
 assert page.links==old['links'],rel
 assert page.ids==old['ids'],rel
 body=s.split('</head>',1)[1]
 body=re.sub(r'<img class="brand-logo"[^>]+>','<span class="dot"></span>掌蹠膿疱症.com',body)
 body=body.replace('最終更新：2026-11-01（サイトロゴ更新・日本時間）',old['footer_update'])
 assert hashlib.sha256(body.encode()).hexdigest()==old['body_sha256'],rel+' body content changed beyond logo/date'
 assert len(page.logos)==1 and page.logos[0]['alt']=='掌蹠膿疱症.com',rel
 assert (p.parent/page.logos[0]['src']).resolve()==(ROOT/'assets/brand/ppp-wordmark-teal.svg').resolve(),rel
 assert '2026-11-01（サイトロゴ更新・日本時間）' in s,rel
 assert page.meta['og:image:type']=='image/png'
 assert page.meta['og:image:alt']==page.meta['twitter:image:alt']
 assert page.meta['og:image']==page.meta['twitter:image']
 assert page.meta['og:image:width']=='1200' and page.meta['og:image:height']=='630'
 for schema in re.findall(r'<script type="application/ld\+json">(.*?)</script>',s,re.S):assert json.loads(schema).get('dateModified')=='2026-11-01',rel
 if 'article:modified_time' in page.meta:assert page.meta['article:modified_time']=='2026-11-01'
 if rel=='404.html':assert page.meta['robots']=='noindex, follow'
 for tag in re.findall(r'<link\b[^>]+>',s):
  if re.search(r'rel="(?:icon|apple-touch-icon)"',tag):assert tag in old['icons'],rel
for card in json.loads((ROOT/'scripts/og-card-source.json').read_text()):
 data=(ROOT/card).read_bytes();assert data[:8]==bytes([137,80,78,71,13,10,26,10]);assert struct.unpack('>II',data[16:24])==(1200,630)
ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
for url in ET.parse(ROOT/'sitemap.xml').getroot().findall('s:url',ns):
 rel=url.find('s:loc',ns).text.split('/ppp/')[1] or 'index.html'
 assert rel!='404.html'
 if rel in paths:assert url.find('s:lastmod',ns).text=='2026-11-01',rel
print('PASS: all 47 pages preserve links, IDs, canonical, existing icon tags; approved logo, metadata, JST dates and 41 PNG cards validated')
