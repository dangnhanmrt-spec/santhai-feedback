"""One explicit import using the scoped backup/restore credential; no service-role key."""
import datetime,json,pathlib,re,urllib.request,urllib.error
root=pathlib.Path(__file__).resolve().parents[1]
p=json.loads((root.parent/'audit_history_payload.json').read_text())
stamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
def metadata(row,fields):return dict(row,**{k:(None if k=='created_by' else stamp) for k in fields if k not in row})
inspections=[];issues=[]
for original in p['inspections']:
 r=dict(original);issues.extend(metadata(x,['created_at']) for x in r.pop('issues'));inspections.append(metadata(r,['created_at']))
tables={'feedbacks':[],'audit_stores':p['historical_stores'],'audit_error_types':[metadata(r,['created_by','created_at']) for r in p['types']],
 'audit_import_batches':[metadata(p['batch'],['created_at'])],'audit_inspections':inspections,'audit_violations':issues,
 'audit_hygiene':[metadata(r,['updated_at']) for r in p['hygiene']], 'audit_import_cells':[metadata(r,['created_at']) for r in p['source_cells']]}
s=(root/'src/supabaseConfig.js').read_text();url=re.search(r'SUPABASE_URL = "([^"]+)"',s)[1];key=re.search(r'SUPABASE_ANON_KEY = "([^"]+)"',s)[1]
env=dict(line.split('=',1) for line in (root/'.env.local').read_text().splitlines() if '=' in line)
for table,records in tables.items():
 if table=='feedbacks':continue
 for offset in range(0,len(records),300):
  body={'p_token':env['BACKUP_DB_TOKEN'],'p_snapshot':{'project_ref':'stxymyjwxdtfxkvmsgmz','format_version':2,'snapshot_at':stamp,'tables':{'feedbacks':[],table:records[offset:offset+300]}},'p_actor':'history-import'}
  request=urllib.request.Request(url+'/rest/v1/rpc/feedback_restore_snapshot',data=json.dumps(body,ensure_ascii=False).encode(),headers={'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+key},method='POST')
  try:
   with urllib.request.urlopen(request,timeout=60) as r:result=json.loads(r.read())
  except urllib.error.HTTPError as e:print('IMPORT ERROR',table,offset,e.code,e.read().decode());raise
 print(table,len(records),'imported',flush=True)
