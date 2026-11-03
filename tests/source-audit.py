#!/usr/bin/env python3
"""Query the public YouTube oEmbed metadata endpoint for unique configured sources.
A metadata result is NOT a guarantee that a video will play inside an embedded iframe.
"""
import concurrent.futures, json, pathlib, urllib.request, urllib.parse, urllib.error, time
source=json.loads(pathlib.Path('/tmp/kiroshi-video-sources.json').read_text())
ids=source['unique_ids']
def check(vid):
    url='https://www.youtube.com/oembed?'+urllib.parse.urlencode({
        'url':'https://www.youtube.com/watch?v='+vid, 'format':'json'})
    req=urllib.request.Request(url,headers={'User-Agent':'KiroshiAudioDeckSourceAudit/1.0','Accept':'application/json'})
    try:
        with urllib.request.urlopen(req,timeout=9) as response:
            obj=json.loads(response.read(8192))
            if obj.get('title'):
                return {'id':vid,'status':'metadata_visible','title':obj.get('title','')[:140],'author':obj.get('author_name','')[:90]}
            return {'id':vid,'status':'unknown','note':'No title in metadata'}
    except urllib.error.HTTPError as e:
        status='suspect_not_embeddable' if e.code in (401,404) else 'unverified'
        return {'id':vid,'status':status,'http_status':e.code}
    except Exception as e:
        return {'id':vid,'status':'unverified','reason':str(e)[:160]}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    rows=list(pool.map(check,ids))
report={'checked':len(rows),
        'metadata_visible':sum(x['status']=='metadata_visible' for x in rows),
        'suspect':sum(x['status']=='suspect_not_embeddable' for x in rows),
        'unverified':sum(x['status']=='unverified' for x in rows),
        'results':rows}
pathlib.Path('video-source-audit.json').write_text(json.dumps(report,indent=2))
print('SOURCE AUDIT: '+str(report['metadata_visible'])+' metadata visible / '+str(report['suspect'])+' suspect / '+str(report['unverified'])+' unverified')
for row in rows:
    print(row['status'].upper(),row['id'],row.get('http_status',''),row.get('title',''))
with open(__import__('os').environ['GITHUB_STEP_SUMMARY'],'a') as f:
    f.write('### YouTube source metadata checks (not live audio playback)\n')
    f.write(f"- Configured unique videos: {len(rows)}\n- oEmbed metadata visible: {report['metadata_visible']}\n")
    f.write(f"- Suspect/unavailable: {report['suspect']}\n- Unable to verify: {report['unverified']}\n")
    f.write('These results cannot guarantee actual browser audio, duration, or YouTube embed permissions.\n')
