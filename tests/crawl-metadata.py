"""The missing-page response must not be indexed; preserve its recovery links."""
from html.parser import HTMLParser
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1]
class Head(HTMLParser):
 def __init__(self):
  super().__init__();self.meta={};self.canonical=[];self.links=[]
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if t=='meta':
   k=a.get('name',a.get('property'))
   if k:self.meta.setdefault(k,[]).append(a.get('content',''))
  if t=='link' and a.get('rel')=='canonical':self.canonical.append(a['href'])
  if t=='a':self.links.append(a.get('href'))
s=(ROOT/'404.html').read_text();p=Head();p.feed(s)
assert p.meta['robots']==['noindex, follow']
assert p.canonical==['https://djnaoyaman.github.io/ppp/404.html']
assert 'index.html' in p.links and 'quiz.html' in p.links
assert '/404.html' not in (ROOT/'sitemap.xml').read_text()
visible=re.search(r'最終更新：(\d{4}-\d{2}-\d{2})',s)[1]
assert p.meta['article:modified_time']==[visible]
schemas=[json.loads(x) for x in re.findall(r'<script type="application/ld\+json">(.*?)</script>',s,re.S)]
assert schemas and all(x.get('dateModified')==visible for x in schemas)
print('PASS: 404 noindex, recovery links, canonical, schema and real update date')
