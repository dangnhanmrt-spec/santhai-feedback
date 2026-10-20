import {useEffect,useMemo,useRef,useState} from 'react';
import {allRows,saveBulkAudit} from './api.js';
import {vietnamDate} from './metrics.js';
import {buildBulkRows,bulkPayload,HYGIENE_STATUS as STATUS} from './bulk.js';
const dateLabel=d=>d.split('-').reverse().join('/');
const nowTime=()=>new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit'}).format(new Date());
export default function BulkEntry({stores,categories,onSaved,actorEmail}){
 const pendingKey='santhai.audit.bulk.pending:'+actorEmail;
 const [pending]=useState(()=>{try{const p=JSON.parse(sessionStorage.getItem(pendingKey));return p?.id&&['inspection','hygiene'].includes(p.kind)&&Array.isArray(p.rows)?p:null;}catch{return null;}});
 const [kind,setKind]=useState(pending?.kind||'inspection'),[step,setStep]=useState(pending?'recover':'setup'),[date,setDate]=useState(vietnamDate()),[time,setTime]=useState(nowTime);
 const [setupPane,setSetupPane]=useState('stores'),[storePage,setStorePage]=useState(0);
 const panel=useRef(null),previousStep=useRef(null);
 useEffect(()=>{if(previousStep.current!==null)panel.current?.scrollIntoView({block:'start'});previousStep.current=step+setupPane;},[step,setupPane]);
 const [selected,setSelected]=useState([]),[region,setRegion]=useState(''),[search,setSearch]=useState(''),[shifts,setShifts]=useState([]),[status,setStatus]=useState('pending');
 const [clear,setClear]=useState(false),[issues,setIssues]=useState([]),[note,setNote]=useState(''),[reason,setReason]=useState('');
 const [rows,setRows]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[result,setResult]=useState(null),[uncertain,setUncertain]=useState(false);
 const request=useRef(pending),inFlight=useRef(false);
 useEffect(()=>{if(error)panel.current?.querySelector('[role=alert]')?.scrollIntoView({block:'nearest'});},[error]);
 const activeStores=useMemo(()=>stores.filter(s=>s.active!==false),[stores]);
 const activeTypes=categories.filter(c=>c.active);
 const regions=[...new Set(activeStores.map(s=>s.regionName||s.region_id))].sort();
 const visible=activeStores.filter(s=>(!region||(s.regionName||s.region_id)===region)&&s.name.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
 const storePages=Math.max(1,Math.ceil(visible.length/12));
 const currentStorePage=Math.min(storePage,storePages-1);
 const pageStores=visible.slice(currentStorePage*12,currentStorePage*12+12);
 const chosen=activeStores.filter(s=>selected.includes(s.id));
 const included=rows.filter(r=>r.include),updates=included.filter(r=>r.existing).length;
 function toggle(id){setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);}
 function patch(key,change){setRows(rs=>rs.map(r=>r.key===key?{...r,...change}:r));setError('');}
 function toggleIssue(id){setIssues(xs=>xs.some(i=>i.error_type_id===id)?xs.filter(i=>i.error_type_id!==id):[...xs,{error_type_id:id,description:''}]);}
 async function preview(e){
  e.preventDefault();setError('');
  if(!chosen.length){setError('Chọn ít nhất một cửa hàng.');return;}
  if(kind==='inspection'&&!clear&&!issues.length){setError('Chọn ít nhất một lỗi hoặc xác nhận không vi phạm.');return;}
  if(kind==='hygiene'&&!shifts.length){setError('Chọn ít nhất một ca.');return;}
  setBusy(true);
  try{
   const existing=kind==='hygiene'?await allRows('audit_hygiene','*',q=>q.eq('audit_date',date).in('store_id',chosen.map(s=>s.id))):[];
   setRows(buildBulkRows({kind,stores:chosen,date,time,shifts:[...shifts].sort(),status,note,reason,issues,clear,existing}));
   request.current=null;setUncertain(false);setStep('review');
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 async function save(e){
  e.preventDefault();if(inFlight.current)return;setError('');
  let payload;try{if(step!=='recover')payload=bulkPayload(kind,rows);}catch(e){setError(e.message);return;}
  if(!request.current)request.current={id:crypto.randomUUID(),kind,rows:payload};
  try{sessionStorage.setItem(pendingKey,JSON.stringify(request.current));}catch{setError('Trình duyệt chưa cho lưu trạng thái đợt nhập. Vui lòng cho phép lưu trữ rồi thử lại.');return;}
  inFlight.current=true;setBusy(true);
  try{
   const result=await saveBulkAudit(request.current);sessionStorage.removeItem(pendingKey);setResult(result);setStep('done');setUncertain(false);try{await onSaved(result);}catch{setError('Đợt nhập đã lưu thành công. Khi mở báo cáo, bấm Làm mới để tải kết quả.');}
  }catch(e){
   // A database error rolls back the transaction. A lost HTTP response may have committed;
   // preserve the exact request and permit only its idempotent retry until resolved.
   const unknown=!e.code||String(e.code).startsWith('PGRST');
   setUncertain(unknown);if(!unknown){request.current=null;sessionStorage.removeItem(pendingKey);if(step==='recover')setStep('setup');}
   setError(unknown?'Chưa nhận được xác nhận lưu. Bấm “Kiểm tra / thử lại” để xác nhận cùng đợt, không tạo bản ghi trùng. '+e.message:e.message);
  }finally{inFlight.current=false;setBusy(false);}
 }
 function newBatch(){setStep('setup');setSetupPane('stores');setRows([]);setSelected([]);setResult(null);setError('');setIssues([]);setClear(false);setNote('');setReason('');request.current=null;}
 return <section className="audit-bulk" ref={panel}>
  <ol className="audit-bulk-steps" aria-label="Các bước nhập hàng loạt">{['Chọn cửa hàng','Nhập nội dung','Xem lại & lưu'].map((label,i)=><li key={label} aria-current={(step==='setup'?(setupPane==='stores'?0:1):2)===i?'step':undefined}><span>{i+1}</span>{label}</li>)}</ol>
  {error&&<div className="audit-message error" role="alert">{error}</div>}
  {step==='recover'?<form className="audit-panel" onSubmit={save}><h2>Đợt nhập đang chờ xác nhận</h2><p>Có {pending.rows.length} dòng {kind==='inspection'?'Audit':'vệ sinh'} từ lần lưu trước. Xác nhận đợt này trước khi nhập tiếp để tránh tạo trùng.</p><button type="submit" className="audit-btn primary" disabled={busy}>{busy?'Đang xác nhận…':'Kiểm tra / thử lại'}</button></form>:step==='done'?<section className="audit-panel audit-bulk-done"><span className="audit-pill good">✓ Đã lưu thành công</span><h2>{result?.saved} {kind==='inspection'?'lượt Audit':'kết quả ca vệ sinh'}</h2><p>Mỗi cửa hàng và ca có bản ghi riêng trong bảng tuần, thống kê và nhật ký thao tác.</p><button className="audit-btn primary" onClick={newBatch}>Nhập đợt tiếp theo</button></section>:step==='setup'?<form onSubmit={e=>{if(setupPane==='stores'){e.preventDefault();if(!chosen.length){setError('Chọn ít nhất một cửa hàng.');return;}setError('');setSetupPane('content');}else preview(e);}}>
   <fieldset disabled={busy} className="audit-bulk-fieldset">
   {setupPane==='stores'&&<div className="audit-bulk-kind" role="group" aria-label="Nghiệp vụ nhập hàng loạt"><button type="button" aria-pressed={kind==='inspection'} onClick={()=>setKind('inspection')}>📋 Audit vận hành</button><button type="button" aria-pressed={kind==='hygiene'} onClick={()=>setKind('hygiene')}>✓ Vệ sinh theo ca</button></div>}
   <div className="audit-bulk-layout">
    {setupPane==='stores'&&<section className="audit-panel"><div className="audit-split"><h2>Chọn cửa hàng cần ghi nhận</h2><span className="audit-pill">Đã chọn {chosen.length}/{activeStores.length}</span></div>
     <div className="audit-form"><label>Khu vực<select value={region} onChange={e=>{setRegion(e.target.value);setStorePage(0);}}><option value="">Tất cả khu vực</option>{regions.map(r=><option key={r}>{r}</option>)}</select></label><label>Tìm cửa hàng<input type="search" value={search} onChange={e=>{setSearch(e.target.value);setStorePage(0);}} placeholder="Nhập tên cửa hàng…"/></label></div>
     <div className="audit-bulk-select-actions"><button className="audit-link" type="button" disabled={!visible.length} onClick={()=>setSelected(s=>[...new Set([...s,...visible.map(x=>x.id)])])}>Chọn tất cả đang lọc ({visible.length})</button><button className="audit-link" type="button" disabled={!selected.length} onClick={()=>setSelected([])}>Bỏ chọn tất cả</button></div>
     <div className="audit-bulk-stores">{pageStores.map(s=><label key={s.id} className={'audit-bulk-store '+(selected.includes(s.id)?'selected':'')}><input type="checkbox" checked={selected.includes(s.id)} onChange={()=>toggle(s.id)}/><span><strong>{s.name}</strong><span className="audit-muted">{s.regionName||s.region_id}</span></span></label>)}{!visible.length&&<div className="audit-empty">Không có cửa hàng phù hợp.</div>}</div>
     {visible.length>12&&<div className="audit-bulk-pagination"><span>{currentStorePage*12+1}–{Math.min((currentStorePage+1)*12,visible.length)} / {visible.length} cửa hàng</span><div className="audit-inline"><button type="button" className="audit-btn" disabled={currentStorePage===0} onClick={()=>setStorePage(currentStorePage-1)}>← Trước</button><span>{currentStorePage+1}/{storePages}</span><button type="button" className="audit-btn" disabled={currentStorePage+1===storePages} onClick={()=>setStorePage(currentStorePage+1)}>Sau →</button></div></div>}
     {chosen.length>0&&<details className="audit-bulk-selection"><summary>Xem {chosen.length} cửa hàng đã chọn</summary><div className="audit-bulk-chips">{chosen.map(s=><button type="button" key={s.id} onClick={()=>toggle(s.id)} aria-label={'Bỏ chọn '+s.name}>{s.name} ×</button>)}</div></details>}
    </section>}
    {setupPane==='content'&&<section className="audit-panel"><div className="audit-split"><h2>{kind==='inspection'?'Nội dung Audit':'Kết quả vệ sinh theo ca'}</h2><span className="audit-pill">{chosen.length} cửa hàng</span></div><details className="audit-bulk-context"><summary>Áp dụng cho {chosen.length} cửa hàng · xem danh sách</summary><p>{chosen.map(s=>s.name).join(' · ')}</p></details><div className="audit-form"><label>Ngày kiểm tra<input required type="date" max={vietnamDate()} value={date} onChange={e=>setDate(e.target.value)}/></label>{kind==='inspection'&&<label>Giờ kiểm tra<input required type="time" value={time} onChange={e=>setTime(e.target.value)}/></label>}</div>
     {kind==='inspection'?<><label className="audit-checkbox"><input type="checkbox" checked={clear} onChange={e=>setClear(e.target.checked)}/>Đã kiểm tra, không phát hiện vi phạm</label>{!clear&&<><div className="audit-split audit-bulk-subhead"><strong>Chọn nhiều lỗi</strong><div className="audit-inline"><button type="button" className="audit-link" onClick={()=>setIssues(activeTypes.map(c=>issues.find(i=>i.error_type_id===c.id)||{error_type_id:c.id,description:''}))}>Chọn hết</button><button type="button" className="audit-link" onClick={()=>setIssues([])}>Bỏ chọn</button></div></div><div className="audit-bulk-types">{activeTypes.map(c=><div key={c.id}><label className="audit-checkbox"><input type="checkbox" checked={issues.some(i=>i.error_type_id===c.id)} onChange={()=>toggleIssue(c.id)}/>{c.name}</label>{issues.some(i=>i.error_type_id===c.id)&&<input aria-label={'Mô tả chung: '+c.name} placeholder="Mô tả chung (nếu có)" value={issues.find(i=>i.error_type_id===c.id).description} onChange={e=>setIssues(xs=>xs.map(i=>i.error_type_id===c.id?{...i,description:e.target.value}:i))}/>}</div>)}{!activeTypes.length&&<p>Chưa có loại lỗi. Admin Audit có thể thêm tại Quản lý → Loại vi phạm.</p>}</div></>}</>:<><div className="audit-bulk-subhead"><strong>Chọn nhiều ca</strong><button type="button" className="audit-link" onClick={()=>setShifts([1,2,3])}>Chọn cả 3 ca</button></div><div className="audit-inline">{[1,2,3].map(s=><label className="audit-checkbox audit-bulk-shift" key={s}><input type="checkbox" checked={shifts.includes(s)} onChange={()=>setShifts(xs=>xs.includes(s)?xs.filter(x=>x!==s):[...xs,s])}/>Ca {s}</label>)}</div><label>Kết quả chung<select value={status} onChange={e=>setStatus(e.target.value)}>{Object.entries(STATUS).map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>{status==='unavailable'&&<label>Lý do không kiểm tra được<textarea required value={reason} onChange={e=>setReason(e.target.value)}/></label>}</>}
     <label className="audit-bulk-note">Ghi chú chung<textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Có thể chỉnh riêng ở bước xem lại"/></label>
    </section>}
   </div>
   </fieldset>
   <div className="audit-bulk-footer"><div><strong>{chosen.length} cửa hàng{setupPane==='content'&&kind==='hygiene'?' · '+shifts.length+' ca':''}</strong></div><div className="audit-inline">{setupPane==='content'&&<button type="button" className="audit-btn" disabled={busy} onClick={()=>{setSetupPane('stores');setError('');}}>← Chọn cửa hàng</button>}<button className="audit-btn primary" disabled={busy||!chosen.length} type="submit">{busy?'Đang kiểm tra…':setupPane==='stores'?'Tiếp: nhập nội dung →':'Xem lại →'}</button></div></div>
  </form>:<form onSubmit={save}>
   <div className="audit-panel"><div className="audit-split"><div><h2>Kiểm tra trước khi lưu · {kind==='inspection'?'Audit vận hành':'Vệ sinh theo ca'}</h2><div className="audit-muted">{dateLabel(date)} · {chosen.length} cửa hàng · {included.length}/{rows.length} dòng được chọn</div></div><button type="button" className="audit-btn" disabled={busy||uncertain} onClick={()=>{setStep('setup');setSetupPane('content');setError('');request.current=null;}}>← Sửa nội dung chung</button></div>
    <div className="audit-message">{kind==='inspection'?'Mỗi cửa hàng sẽ tạo một lượt Audit mới. Mở từng dòng để chỉnh giờ, lỗi và mô tả riêng.':'Ca đã có kết quả được bỏ chọn sẵn. Tick “Cập nhật ca này” nếu muốn thay kết quả; ca lịch sử được giữ nguyên.'} Tất cả dòng được chọn sẽ lưu trong một lần.</div>
    <fieldset className="audit-bulk-fieldset" disabled={busy||uncertain}>
    <div className="audit-bulk-select-actions"><button type="button" className="audit-link" onClick={()=>setRows(rs=>rs.map(r=>({...r,include:!r.existing})))}>Chọn tất cả {kind==='inspection'?'lượt Audit':'ca mới'}</button>{kind==='hygiene'&&rows.some(r=>r.existing?.source==='manual')&&<label className="audit-checkbox"><input type="checkbox" checked={rows.filter(r=>r.existing?.source==='manual').every(r=>r.include)} onChange={e=>{const include=e.target.checked;setRows(rs=>rs.map(r=>r.existing?.source==='manual'?{...r,include}:r));}}/>Chọn cập nhật {rows.filter(r=>r.existing?.source==='manual').length} ca đã có</label>}<button type="button" className="audit-link" onClick={()=>setRows(rs=>rs.map(r=>({...r,include:false})))}>Bỏ chọn tất cả dòng</button></div>
    {rows.map(r=><details className={'audit-bulk-review '+(!r.include?'excluded':'')} key={r.key}>
     <summary><span><strong>{r.name}{kind==='hygiene'?' · Ca '+r.shift:''}</strong><span className="audit-muted">{r.existing?(r.existing.source==='legacy'?'Dữ liệu lịch sử · không cập nhật':'Đã có: '+STATUS[r.existing.status]):kind==='inspection'?r.time+' · '+(r.clear?'Đã kiểm tra':r.issues.slice(0,2).map(i=>categories.find(c=>c.id===i.error_type_id)?.name).join(', ')+(r.issues.length>2?'…':'')):'Ca mới'}</span></span><span className={'audit-pill '+(!r.include?'':kind==='inspection'?(r.clear?'good':'bad'):({pass:'good',fail:'bad',pending:'pending'}[r.status]||''))}>{!r.include?'Bỏ qua':kind==='inspection'?(r.clear?'Không lỗi':r.issues.length+' lỗi'):STATUS[r.status]}</span></summary>
     <div className="audit-bulk-row-body"><label className="audit-checkbox"><input type="checkbox" disabled={r.existing?.source==='legacy'} checked={r.include} onChange={e=>patch(r.key,{include:e.target.checked})}/>{r.existing?'Cập nhật ca này':'Lưu dòng này'}</label>
     {r.include&&<>{kind==='inspection'?<><label>Giờ kiểm tra tại {r.name}<input type="time" value={r.time} onChange={e=>patch(r.key,{time:e.target.value})}/></label><label className="audit-checkbox"><input type="checkbox" checked={r.clear} onChange={e=>patch(r.key,{clear:e.target.checked})}/>Đã kiểm tra, không phát hiện vi phạm</label>{!r.clear&&<><div className="audit-bulk-row-issues">{r.issues.map((issue,j)=><div className="audit-bulk-issue-edit" key={issue.error_type_id}><label>{categories.find(c=>c.id===issue.error_type_id)?.name}<input aria-label={'Mô tả · '+r.name+' · '+(j+1)} value={issue.description} placeholder="Mô tả riêng (nếu có)" onChange={e=>patch(r.key,{issues:r.issues.map((x,i)=>i===j?{...x,description:e.target.value}:x)})}/></label><button type="button" className="audit-btn" aria-label={'Bỏ lỗi '+(j+1)+' tại '+r.name} onClick={()=>patch(r.key,{issues:r.issues.filter((_,i)=>i!==j)})}>×</button></div>)}</div><label>Thêm lỗi riêng<select value="" onChange={e=>{if(e.target.value)patch(r.key,{issues:[...r.issues,{error_type_id:e.target.value,description:''}]});}}><option value="">Chọn loại lỗi để thêm…</option>{activeTypes.filter(c=>!r.issues.some(i=>i.error_type_id===c.id)).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label></>}</>:<><label>Kết quả · {r.name} · Ca {r.shift}<select value={r.status} onChange={e=>patch(r.key,{status:e.target.value})}>{Object.entries(STATUS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>{r.status==='unavailable'&&<label>Lý do · {r.name} · Ca {r.shift}<textarea value={r.reason} onChange={e=>patch(r.key,{reason:e.target.value})}/></label>}</>}
     <label>Ghi chú · {r.name}{r.shift?' · Ca '+r.shift:''}<textarea value={r.note} onChange={e=>patch(r.key,{note:e.target.value})}/></label></>}
     </div>
    </details>)}
    </fieldset>
   </div>
   <div className="audit-bulk-footer"><div><strong>{included.length} {kind==='inspection'?'lượt Audit mới':'kết quả ca'} sẽ được lưu</strong><div className="audit-muted">{updates?updates+' ca sẽ thay kết quả hiện có · ':''}{rows.length-included.length} dòng bỏ qua · Có nhật ký từng bản ghi</div></div><button type="submit" className="audit-btn primary" disabled={busy||!included.length}>{busy?'Đang lưu toàn bộ…':uncertain?'Kiểm tra / thử lại':'Lưu '+included.length+' '+(kind==='inspection'?'lượt Audit':'kết quả ca')}</button></div>
  </form>}
 </section>;
}
