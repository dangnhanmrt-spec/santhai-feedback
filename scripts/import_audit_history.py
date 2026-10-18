"""Read-only extraction. Writes deterministic import payload; never changes the workbook."""
import csv,collections,datetime,hashlib,json,pathlib,re,sys,unicodedata,uuid
ROOT=pathlib.Path(__file__).resolve().parents[1]
SOURCE=ROOT.parent/'upload/01-SanThai-Audit-Online-Th-ng-10.2026-.xlsx'
import openpyxl
def norm(s):
 s=unicodedata.normalize('NFD',str(s)).replace('đ','d').replace('Đ','D')
 return re.sub('[^a-z0-9]','', ''.join(c for c in s if unicodedata.category(c)!='Mn').lower())
def uid(s):return str(uuid.uuid5(uuid.NAMESPACE_URL,'santhai-audit-v1/'+s))
snapshot=json.loads((ROOT.parent/'feedback_backup_snapshot.json').read_text())
stores=snapshot['tables']['stores']; aliases={norm(s['name']):s['id'] for s in stores}
aliases.update({norm(k):v for k,v in {
 'NVC1':'nvcnd1','NVC2':'nvcnd2','NVC 2':'nvcnd2','Ba Tháng Hai':'d32','3.2':'d32','THĐ1':'thd1328','THĐ2':'thd2243',
 'Phú Hoà':'phuahoa','An Châu, Châu Thành':'anchau','Trà Ôn, Vĩnh Long':'traon','Trưng Nữ Vương.':'tpvl',
 '30 Tháng Tư':'socttrang','Ngã Năm':'nga5','Cao Lãnh':'caolanh1','Trần Phú':'baclieu',
 'Lê Đại Hành MT1':'mytho1','Ấp Bắc MT2':'mytho2','Cà Mau':'tpcamau','Tiểu Cần':'tieucantv',
 'Tân Hiệp, Châu Thành':'tanhiep','Châu Thành - CTH':'cth_legacy','Châu Thành':'cth_legacy',
 'An Hội, Bến Tre':'anhoi_legacy','Tri Tôn, An Giang':'triton_legacy','Phú Lộc, Cần Thơ':'phu_loc_mt5sg9yd',
 'Phú Lộc- Cần Thơ':'phu_loc_mt5sg9yd','Mỹ Xuyên - Cần Thơ':'my_xuyen_mt5sfzg3','Long Mỹ':'long_my_mt5sg53i',
 'Sa Đéc':'sadec_legacy'}.items()})
# Do not invent current stores for historical-only names. Keep them in the import review queue.
historical=[{'id':sid,'name':name,'region_id':region,'active':False,'current_store_id':None,'historical_only':True} for sid,name,region in [
 ('sadec_legacy','Sa Đéc 1 (lịch sử)','dongthap'),('cth_legacy','Châu Thành - CTH (lịch sử)','dongthap'),
 ('anhoi_legacy','An Hội - Bến Tre (lịch sử)','vinhlong'),('triton_legacy','Tri Tôn (lịch sử)','angiang'),
 ('caitau_legacy','Cái Tàu (tên trong file cũ)','dongthap'),('hongngu_legacy','Hồng Ngự (lịch sử)','dongthap'),
 ('duchoa1_legacy','Đức Hòa 1 (tên trong file cũ)','tayninh')]]
aliases.update({norm(k):v for k,v in {'SA ĐÉC':'sadec_legacy','SA ĐÉC 1':'sadec_legacy','SAC ĐÉC 2':'sadec2','CÁI TÀU':'caitau_legacy','HỒNG NGỰ':'hongngu_legacy','ĐỨC HÒA 1':'duchoa1_legacy'}.items()})
valid_ids={s['id'] for s in stores+historical}
def store_id(label):
 if isinstance(label,datetime.datetime):return None
 text=re.sub(r'^santhai\s*-\s*','',str(label),flags=re.I)
 text=re.sub(r'^[A-ZĐ]+\d+\s*-\s*','',text)
 found=aliases.get(norm(text))
 return found if found in valid_ids else None
digest=hashlib.sha256(SOURCE.read_bytes()).hexdigest();batch=uid(digest)
w=openpyxl.load_workbook(SOURCE,read_only=True,data_only=True)
source_cells=[];inspection_groups={};hygiene_groups=collections.defaultdict(list);categories={};stats=collections.Counter()
for sheet in w:
 title=sheet.title;low=title.lower();kind='hygiene' if 'vệ sinh' in low or title in ('Trang tính9','Trang tính10') else 'audit' if 'audit' in low or 'tổng hợp' in low else None
 if not kind:continue
 rows=list(sheet.values);header=None
 for idx,row in enumerate(rows[:4]):
  dates=[(c,v) for c,v in enumerate(row[2:],2) if isinstance(v,datetime.datetime)]
  if dates:header=(idx,dates[0][0],dates[0][1]);break
 if not header:continue
 stats['sheets_scanned']+=1;headrow,start_col,firstdate=header
 # A known anomalous January header is preserved for review; no inferred year correction.
 suspect_year=firstdate.year==2025 and firstdate.month==1
 for ri,row in enumerate(rows[headrow+1:],headrow+2):
  if len(row)<3 or row[1] is None:continue
  label=row[1];sid=store_id(label);note=str(row[-1] or '') if len(row)>=10 else ''
  for ci in range(start_col,min(start_col+7,len(row))):
   raw=row[ci]
   if raw is None or str(raw).strip()=='':continue
   if not isinstance(raw,str):continue
   day=(firstdate+datetime.timedelta(days=ci-start_col)).date().isoformat();cell=f'{openpyxl.utils.get_column_letter(ci+1)}{ri}'
   key=uid(digest+'|'+title+'|'+cell);entry={'source_key':key,'batch_id':batch,'sheet':title,'cell':cell,'store_label':str(label),'raw_value':raw,'note':note,'status':'imported','detail':''}
   source_cells.append(entry);stats['nonblank_cells']+=1
   if not sid:entry.update(status='review_store',detail='Tên cửa hàng chưa ánh xạ chắc chắn; giữ dữ liệu nguồn, chưa cộng thống kê.');stats['review_store']+=1;continue
   if suspect_year:entry.update(status='review_date',detail='Năm trong tiêu đề ngày bất thường so với chuỗi tuần; chưa tự sửa.');stats['review_date']+=1;continue
   if kind=='audit':
    parts=[p.strip().strip('"').strip() for p in next(csv.reader([raw],skipinitialspace=True)) if p.strip()]
    # Corrections only normalize evident labels, not business outcomes.
    clean={'Sử dụng điên thoại':'Sử dụng điện thoại','Không đưa dù khách':'Không đưa dù cho khách','Không báo cáo mỗi ngày':'Không báo cáo audit mỗi ngày'}
    parts=[clean.get(p,p) for p in parts]
    if not parts:entry.update(status='review_content',detail='Không tách được nội dung lỗi.');continue
    signature=(sid,day,tuple(sorted(parts)),note.strip())
    if signature in inspection_groups:
     old=inspection_groups[signature];old['source_keys'].append(key);entry.update(status='duplicate',detail='Cùng cửa hàng/ngày/nội dung/ghi chú với bản đã nhập.');stats['duplicate_cells']+=1;continue
    iid=uid('|'.join([sid,day,','.join(sorted(parts)),note.strip()]));issues=[]
    for n,name in enumerate(parts):
     tid=uid('type|'+name);categories[tid]={'id':tid,'name':name,'active':True}
     issues.append({'id':uid(iid+'|'+str(n)),'inspection_id':iid,'error_type_id':tid,'description':''})
    inspection_groups[signature]={'id':iid,'store_id':sid,'occurred_at':day+'T12:00:00+07:00','audit_date':day,'note':('Ghi chú gốc theo cửa hàng/tuần: '+note if note else ''),'source':'legacy','counted_for_rate':False,'source_keys':[key],'created_by':None,'issues':issues}
   else:
    matches=re.findall(r'Vệ sinh ca\s*([123])\s*-\s*([^,]+)',raw,re.I)
    if not matches:entry.update(status='review_content',detail='Không nhận diện được ca/kết quả.');stats['review_content']+=1;continue
    for shift,result in matches:
     value=norm(result);status='fail' if value.startswith('khongda') else 'pass' if value=='dat' else None
     if status is None:entry.update(status='review_content',detail='Trạng thái ca không nhận diện được.');stats['review_content']+=1;continue
     hygiene_groups[(sid,day,int(shift))].append({'status':status,'source_key':key,'entry':entry,'note':note})
hygiene=[]
for (sid,day,shift),values in hygiene_groups.items():
 statuses={x['status'] for x in values}
 if len(statuses)>1:
  for x in values:x['entry'].update(status='review_conflict',detail='Cùng cửa hàng/ngày/ca có kết quả Đạt và Không đạt. Chưa cộng tỷ lệ vệ sinh.')
  stats['conflicting_shifts']+=1;continue
 keys=list(dict.fromkeys(x['source_key'] for x in values));status=values[0]['status']
 hygiene.append({'id':uid('hygiene|'+sid+'|'+day+'|'+str(shift)),'store_id':sid,'audit_date':day,'shift':shift,'status':status,'note':'\n'.join(dict.fromkeys(x['note'] for x in values if x['note'])),'reason':'','source':'legacy','source_keys':keys,'created_by':None})
stats['historical_inspections']=len(inspection_groups);stats['historical_violations']=sum(len(i['issues']) for i in inspection_groups.values());stats['hygiene_shifts']=len(hygiene);stats['types']=len(categories)
stats['review_cells']=sum(e['status'].startswith('review') for e in source_cells)
payload={'batch':{'id':batch,'file_name':SOURCE.name,'file_sha256':digest,'stats':dict(stats)},'historical_stores':historical,'types':list(categories.values()),'inspections':list(inspection_groups.values()),'hygiene':hygiene,'source_cells':source_cells}
target=ROOT.parent/'audit_history_payload.json';target.write_text(json.dumps(payload,ensure_ascii=False),encoding='utf8')
print(json.dumps({'stats':stats,'review_stores':sorted(set(c['store_label'] for c in source_cells if c['status']=='review_store')),'dates':[min([i['audit_date'] for i in payload['inspections']],default=''),max([i['audit_date'] for i in payload['inspections']],default='')]},ensure_ascii=False))
