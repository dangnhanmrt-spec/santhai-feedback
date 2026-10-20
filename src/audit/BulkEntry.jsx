import {useEffect,useMemo,useRef,useState} from 'react';
import {allRows,saveBulkAudit} from './api.js';
import {vietnamDate} from './metrics.js';
import {buildBulkRows,bulkPayload,reconcileBulkRows,HYGIENE_STATUS as STATUS} from './bulk.js';
const dateLabel=d=>d.split('-').reverse().join('/');
const nowTime=()=>new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit'}).format(new Date());
const statusTone=status=>({pass:'good',fail:'bad',pending:'pending',unavailable:'unavailable'}[status]||'');

function IssuePicker({categories,issues,onChange,prefix,compact=false}){
 function toggle(id){onChange(issues.some(i=>i.error_type_id===id)?issues.filter(i=>i.error_type_id!==id):[...issues,{error_type_id:id,description:''}]);}
 const describe=(issue,value)=>onChange(issues.map(i=>i.error_type_id===issue.error_type_id?{...i,description:value}:i));
 if(compact)return <div className="audit-row-issues">
  {issues.map(issue=><div className="audit-row-issue" key={issue.error_type_id}><div><span>{categories.find(c=>c.id===issue.error_type_id)?.name||'Loại lỗi đã ngừng dùng'}</span><button type="button" className="audit-icon-btn" aria-label={'Bỏ lỗi '+categories.find(c=>c.id===issue.error_type_id)?.name+' · '+prefix} onClick={()=>toggle(issue.error_type_id)}>×</button></div><input aria-label={'Mô tả '+categories.find(c=>c.id===issue.error_type_id)?.name+' · '+prefix} placeholder="Mô tả riêng (nếu có)" value={issue.description} onChange={e=>describe(issue,e.target.value)}/></div>)}
  <select aria-label={'Thêm lỗi · '+prefix} value="" onChange={e=>{if(e.target.value)toggle(e.target.value);}}><option value="">＋ Thêm loại vi phạm</option>{categories.filter(c=>c.active&&!issues.some(i=>i.error_type_id===c.id)).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
 </div>;
 return <div className="audit-common-issues">{categories.filter(c=>c.active).map(c=>{const issue=issues.find(i=>i.error_type_id===c.id);return <div key={c.id} className={issue?'chosen':''}><label className="audit-checkbox"><input type="checkbox" checked={!!issue} onChange={()=>toggle(c.id)}/>{c.name}</label>{issue&&<input aria-label={'Mô tả chung: '+c.name} placeholder="Mô tả chung (nếu có)" value={issue.description} onChange={e=>describe(issue,e.target.value)}/>}</div>;})}</div>;
}

export default function BulkEntry({stores,categories,onSaved,actorEmail}){
 const pendingKey='santhai.audit.bulk.pending:'+actorEmail;
 const [pending]=useState(()=>{try{const p=JSON.parse(sessionStorage.getItem(pendingKey));return p?.id&&['inspection','hygiene'].includes(p.kind)&&Array.isArray(p.rows)?p:null;}catch{return null;}});
 const [kind,setKind]=useState(pending?.kind||'inspection'),[stage,setStage]=useState(pending?'recover':'setup');
 const [date,setDate]=useState(vietnamDate()),[time,setTime]=useState(nowTime);
 const [selected,setSelected]=useState([]),[region,setRegion]=useState(''),[search,setSearch]=useState(''),[onlySelected,setOnlySelected]=useState(false);
 const [shifts,setShifts]=useState([]),[status,setStatus]=useState('pending');
 const [clear,setClear]=useState(false),[issues,setIssues]=useState([]),[note,setNote]=useState(''),[reason,setReason]=useState('');
 const [rows,setRows]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[result,setResult]=useState(null),[uncertain,setUncertain]=useState(false),[reviewFilter,setReviewFilter]=useState('all');
 const panel=useRef(null),request=useRef(pending),inFlight=useRef(false),baseline=useRef({kind:null,rows:[]});
 useEffect(()=>{if(error)panel.current?.querySelector('[role=alert]')?.scrollIntoView({block:'nearest'});},[error]);
 const activeStores=useMemo(()=>stores.filter(s=>s.active!==false),[stores]);
 const activeTypes=categories.filter(c=>c.active);
 const regions=[...new Set(activeStores.map(s=>s.regionName||s.region_id))].sort((a,b)=>a.localeCompare(b,'vi'));
 const selectedSet=new Set(selected);
 const matches=activeStores.filter(s=>(!region||(s.regionName||s.region_id)===region)&&s.name.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')));
 const visible=matches.filter(s=>!onlySelected||selectedSet.has(s.id));
 const chosen=activeStores.filter(s=>selectedSet.has(s.id));
 const outside=chosen.filter(s=>!matches.some(v=>v.id===s.id)).length;
 const groups=regions.map(name=>({name,stores:visible.filter(s=>(s.regionName||s.region_id)===name)})).filter(g=>g.stores.length);
 const included=rows.filter(r=>r.include),updates=included.filter(r=>r.existing).length,newCount=included.length-updates,skipped=rows.length-included.length;
 const typeName=kind==='inspection'?'lượt Audit':'kết quả ca';
 const shownRows=rows.filter(r=>reviewFilter==='all'||reviewFilter==='included'&&r.include||reviewFilter==='existing'&&r.existing||reviewFilter==='custom'&&isCustom(r));
 function isCustom(r){const base=baseline.current.rows.find(b=>b.key===r.key);return base&&['time','note','clear','issues','status','reason'].some(k=>JSON.stringify(base[k])!==JSON.stringify(r[k]));}
 function toggle(id){setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);setError('');}
 function patch(key,change){setRows(rs=>rs.map(r=>r.key===key?{...r,...change}:r));setError('');}
 function toTop(){panel.current?.scrollIntoView({block:'start'});}
 async function preview(e){
  e.preventDefault();setError('');
  if(!chosen.length){setError('Chọn ít nhất một cửa hàng.');return;}
  if(kind==='inspection'&&!clear&&!issues.length){setError('Chọn ít nhất một loại vi phạm hoặc xác nhận không phát hiện vi phạm.');return;}
  if(kind==='hygiene'&&!shifts.length){setError('Chọn ít nhất một ca vệ sinh.');return;}
  setBusy(true);
  try{
   const existing=kind==='hygiene'?await allRows('audit_hygiene','*',q=>q.eq('audit_date',date).in('store_id',chosen.map(s=>s.id))):[];
   const next=buildBulkRows({kind,stores:chosen,date,time,shifts:[...shifts].sort(),status,note,reason,issues,clear,existing});
   const same=baseline.current.kind===kind&&baseline.current.date===date;
   setRows(same?reconcileBulkRows(next,rows,baseline.current.rows):next);
   baseline.current={kind,date,rows:next};request.current=null;setUncertain(false);setReviewFilter('all');setStage('review');requestAnimationFrame(toTop);
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 async function save(e){
  e.preventDefault();if(inFlight.current)return;setError('');
  let payload;try{if(stage!=='recover')payload=bulkPayload(kind,rows);}catch(e){setError(e.message);return;}
  if(!request.current)request.current={id:crypto.randomUUID(),kind,rows:payload};
  try{sessionStorage.setItem(pendingKey,JSON.stringify(request.current));}catch{setError('Trình duyệt chưa cho lưu trạng thái đợt nhập. Vui lòng cho phép lưu trữ rồi thử lại.');return;}
  inFlight.current=true;setBusy(true);
  try{
   const receipt=await saveBulkAudit(request.current);sessionStorage.removeItem(pendingKey);setResult(receipt);setStage('done');setUncertain(false);requestAnimationFrame(toTop);
   try{await onSaved(receipt);}catch{setError('Đợt nhập đã lưu thành công. Khi mở báo cáo, bấm Làm mới để tải kết quả.');}
  }catch(e){
   // A lost response may have committed. Retry only the exact stored request.
   const unknown=!e.code||String(e.code).startsWith('PGRST');setUncertain(unknown);
   if(!unknown){request.current=null;sessionStorage.removeItem(pendingKey);if(stage==='recover')setStage('setup');}
   setError(unknown?'Chưa nhận được xác nhận lưu. Bấm “Kiểm tra / thử lại” để xác nhận cùng đợt, không tạo bản ghi trùng. '+e.message:e.message);
  }finally{inFlight.current=false;setBusy(false);}
 }
 function newBatch(){setStage('setup');setRows([]);setSelected([]);setShifts([]);setResult(null);setError('');setIssues([]);setClear(false);setNote('');setReason('');setOnlySelected(false);request.current=null;baseline.current={kind:null,rows:[]};}
 return <section className="audit-bulk" ref={panel}>
  {error&&<div className="audit-message error" role="alert">{error}</div>}
  {stage==='recover'?<form className="audit-panel" onSubmit={save}><span className="audit-pill pending">Chờ xác nhận lần lưu trước</span><h2 className="audit-bulk-recovery-title">{pending.rows.length} {typeName}</h2><p>Xác nhận đợt này trước khi nhập tiếp. Hệ thống sẽ kiểm tra cùng yêu cầu đã gửi để tránh lưu trùng.</p><button type="submit" className="audit-btn primary" disabled={busy}>{busy?'Đang xác nhận…':'Kiểm tra / thử lại'}</button></form>
  :stage==='done'?<section className="audit-panel audit-bulk-done"><span className="audit-pill good">✓ Đã lưu thành công</span><h2>{result?.saved} {typeName}</h2><p>Đã ghi nhận kết quả và nhật ký từng bản ghi.</p><button className="audit-btn primary" onClick={newBatch}>Nhập đợt tiếp theo</button></section>
  :stage==='setup'?<form onSubmit={preview}>
   <fieldset disabled={busy} className="audit-bulk-fieldset">
    <div className="audit-bulk-kind" role="group" aria-label="Nghiệp vụ nhập hàng loạt"><button type="button" aria-pressed={kind==='inspection'} onClick={()=>{setKind('inspection');setError('');}}>📋 Audit vận hành</button><button type="button" aria-pressed={kind==='hygiene'} onClick={()=>{setKind('hygiene');setError('');}}>✓ Vệ sinh theo ca</button></div>
    <div className="audit-bulk-layout">
     <section className="audit-panel audit-bulk-selection" aria-label="Chọn cửa hàng">
      <div className="audit-section-heading"><h2>Cửa hàng cần ghi nhận</h2><span className="audit-selection-count" role="status" aria-live="polite">Đã chọn <strong>{chosen.length}</strong> cửa hàng</span></div>
      <div className="audit-store-search"><label>Khu vực<select value={region} onChange={e=>setRegion(e.target.value)}><option value="">Tất cả khu vực</option>{regions.map(r=><option key={r}>{r}</option>)}</select></label><label>Tìm cửa hàng<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nhập tên cửa hàng"/></label></div>
      <div className="audit-selection-tools"><div className="audit-inline"><button className="audit-btn" type="button" disabled={!visible.length||visible.every(s=>selectedSet.has(s.id))} onClick={()=>setSelected(s=>[...new Set([...s,...visible.map(x=>x.id)])])}>Chọn tất cả</button><button className="audit-btn" type="button" disabled={!visible.some(s=>selectedSet.has(s.id))} onClick={()=>setSelected(s=>s.filter(id=>!visible.some(v=>v.id===id)))}>Bỏ chọn</button></div><span className="audit-muted">Trong danh sách: {visible.length} cửa hàng</span></div>
      <div className="audit-selection-scope"><label className="audit-checkbox"><input type="checkbox" checked={onlySelected} onChange={e=>setOnlySelected(e.target.checked)}/>Chỉ xem đã chọn</label>{(region||search||onlySelected)&&<button className="audit-link" type="button" onClick={()=>{setRegion('');setSearch('');setOnlySelected(false);}}>Xóa bộ lọc</button>}</div>
      {outside>0&&<div className="audit-selection-notice"><span>{outside} cửa hàng đã chọn ngoài bộ lọc vẫn thuộc đợt nhập.</span><button className="audit-link" type="button" onClick={()=>{setRegion('');setSearch('');setOnlySelected(true);}}>Xem đã chọn</button><button className="audit-link" type="button" onClick={()=>setSelected([])}>Bỏ chọn toàn bộ</button></div>}
      <div className="audit-store-groups">{groups.map(g=><section className="audit-store-group" key={g.name} style={{'--region-color':g.stores[0].regionColor||'#94a3b8'}}><h3>{g.name}</h3><div className="audit-store-options">{g.stores.map(s=><label key={s.id} className={'audit-store-option'+(selectedSet.has(s.id)?' selected':'')}><input type="checkbox" checked={selectedSet.has(s.id)} onChange={()=>toggle(s.id)}/><span>{s.name}</span></label>)}</div></section>)}{!visible.length&&<div className="audit-empty">{onlySelected?'Chưa có cửa hàng đã chọn trong bộ lọc.':'Không có cửa hàng phù hợp.'}</div>}</div>
     </section>
     <section className="audit-panel audit-bulk-common" aria-label="Nội dung chung">
      <div className="audit-section-heading"><h2>Nội dung chung</h2><button className="audit-btn primary" disabled={busy||!chosen.length||kind==='hygiene'&&!shifts.length} type="submit">{busy?'Đang kiểm tra…':rows.length?'Cập nhật bảng →':'Lập bảng kiểm tra →'}</button></div><p className="audit-common-hint">{!chosen.length?'Chọn cửa hàng ở danh sách bên cạnh.':'Áp dụng cho cửa hàng đã chọn. Chỉnh ngoại lệ trong bảng tiếp theo.'}</p>
      <div className="audit-bulk-datetime"><label>Ngày kiểm tra<input required type="date" max={vietnamDate()} value={date} onChange={e=>setDate(e.target.value)}/></label>{kind==='inspection'&&<label>Giờ kiểm tra<input required type="time" value={time} onChange={e=>setTime(e.target.value)}/></label>}</div>
      {kind==='inspection'?<>
       <label className={'audit-checkbox audit-clean-choice'+(clear?' selected':'')}><input type="checkbox" checked={clear} onChange={e=>setClear(e.target.checked)}/>Đã kiểm tra, không phát hiện vi phạm</label>
       {!clear&&<><div className="audit-section-heading audit-issues-heading"><h3>Loại vi phạm</h3><span className="audit-muted">Chọn nhiều loại</span></div><IssuePicker categories={categories} issues={issues} onChange={setIssues} prefix="Nội dung chung"/>{!activeTypes.length&&<div className="audit-message">Chưa có loại vi phạm. Admin Audit có thể thêm tại Quản lý → Loại vi phạm.</div>}</>}
      </>:<>
       <div className="audit-section-heading audit-issues-heading"><h3>Ca cần ghi nhận</h3><div className="audit-inline"><button type="button" className="audit-link" onClick={()=>setShifts([1,2,3])}>Chọn cả 3 ca</button><button type="button" className="audit-link" disabled={!shifts.length} onClick={()=>setShifts([])}>Bỏ chọn</button></div></div>
       <div className="audit-shift-options">{[1,2,3].map(s=><label className={'audit-checkbox'+(shifts.includes(s)?' selected':'')} key={s}><input type="checkbox" checked={shifts.includes(s)} onChange={()=>setShifts(xs=>xs.includes(s)?xs.filter(x=>x!==s):[...xs,s])}/>Ca {s}</label>)}</div>
       <label>Kết quả chung<select value={status} onChange={e=>setStatus(e.target.value)}>{Object.entries(STATUS).map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>
       {status==='unavailable'&&<label className="audit-bulk-note">Lý do không kiểm tra được<textarea required value={reason} onChange={e=>setReason(e.target.value)}/></label>}
       <p className="audit-muted">Ca đã có kết quả sẽ được bỏ qua. Chỉ cập nhật khi anh/chị chọn rõ trong bảng kiểm tra.</p>
      </>}
      <label className="audit-bulk-note">Ghi chú chung<textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Ghi chú áp dụng cho các cửa hàng đã chọn"/></label>
      {baseline.current.kind===kind&&baseline.current.date===date&&rows.length>0&&<p className="audit-common-hint">Các ngoại lệ đã chỉnh trong bảng sẽ được giữ lại.</p>}
     </section>
    </div>
   </fieldset>
  </form>
  :<form onSubmit={save}>
   <section className="audit-panel audit-bulk-review" aria-label="Bảng kiểm tra trước khi lưu">
    <div className="audit-section-heading"><div><h2>Bảng kiểm tra · {kind==='inspection'?'Audit vận hành':'Vệ sinh theo ca'}</h2><div className="audit-muted">{dateLabel(date)} · Chỉnh trực tiếp từng dòng trước khi lưu</div></div><button type="button" className="audit-btn" disabled={busy||uncertain} onClick={()=>{setStage('setup');setError('');request.current=null;requestAnimationFrame(toTop);}}>← Sửa phạm vi & nội dung chung</button></div>
    <div className="audit-batch-summary" aria-live="polite"><div><strong>{included.length} {typeName} sẽ lưu</strong><span>{newCount} tạo mới{kind==='hygiene'?' · '+updates+' cập nhật':''} · {skipped} bỏ qua</span></div><button type="submit" className="audit-btn primary" disabled={busy||!included.length}>{busy?'Đang lưu toàn bộ…':uncertain?'Kiểm tra / thử lại':'Lưu '+included.length+' '+typeName}</button></div>
    <p className="audit-bulk-review-help">{kind==='inspection'?'Mỗi cửa hàng tạo một lượt Audit mới, kể cả đã kiểm tra trong ngày.':'Ca đã có kết quả mặc định bỏ qua. Tick từng ca để cập nhật; dữ liệu lịch sử được khóa.'} Tất cả dòng tick “Lưu” được lưu cùng một đợt.</p>
    <fieldset disabled={busy||uncertain} className="audit-bulk-fieldset">
     <div className="audit-review-tools"><div className="audit-inline"><button type="button" className="audit-btn" onClick={()=>setRows(rs=>rs.map(r=>({...r,include:!r.existing})))}>Chọn {kind==='inspection'?'tất cả':'các ca mới'}</button><button type="button" className="audit-btn" onClick={()=>setRows(rs=>rs.map(r=>({...r,include:false})))}>Bỏ chọn</button></div><label>Hiển thị<select value={reviewFilter} onChange={e=>setReviewFilter(e.target.value)}><option value="all">Tất cả dòng ({rows.length})</option><option value="included">Dòng sẽ lưu ({included.length})</option><option value="custom">Đã chỉnh riêng ({rows.filter(isCustom).length})</option>{kind==='hygiene'&&<option value="existing">Ca đã có kết quả ({rows.filter(r=>r.existing).length})</option>}</select></label></div>
     <div className="audit-bulk-table-wrap"><table className={'audit-table audit-bulk-table '+(kind==='hygiene'?'hygiene':'inspection')}><thead><tr><th>Lưu</th><th>Cửa hàng{kind==='hygiene'?' / ca':''}</th>{kind==='inspection'?<><th>Giờ</th><th>Kết quả & loại vi phạm</th></>:<><th>Kết quả hiện có</th><th>Kết quả sẽ lưu</th></>}<th>Ghi chú riêng</th></tr></thead><tbody>{shownRows.map(r=>{
      const label=r.name+(r.shift?' · Ca '+r.shift:'');const locked=r.existing?.source==='legacy';
      return <tr key={r.key} className={!r.include?'audit-row-excluded':''}>
       <td><input type="checkbox" aria-label={(r.existing?'Cập nhật ':'Lưu ')+label} disabled={locked} checked={r.include} onChange={e=>patch(r.key,{include:e.target.checked})}/></td>
       <td><strong>{r.name}</strong>{r.shift&&<span className="audit-shift-label">Ca {r.shift}</span>}<span className="audit-row-meta">{locked?'Lịch sử · không cập nhật':r.existing?(r.include?'Sẽ cập nhật':'Bỏ qua ca đã có'):r.include?'Tạo mới':'Bỏ qua'}</span>{isCustom(r)&&<span className="audit-custom-label">Đã chỉnh riêng</span>}</td>
       {kind==='inspection'?<><td><input type="time" aria-label={'Giờ · '+label} disabled={!r.include} required={r.include} value={r.time} onChange={e=>patch(r.key,{time:e.target.value})}/></td><td><fieldset disabled={!r.include} className="audit-bulk-fieldset"><select aria-label={'Kết quả · '+label} value={r.clear?'clear':'issues'} onChange={e=>patch(r.key,{clear:e.target.value==='clear'})}><option value="issues">Có vi phạm{r.issues.length?' · '+r.issues.length+' lỗi':''}</option><option value="clear">Không phát hiện vi phạm</option></select>{!r.clear&&<IssuePicker compact categories={categories} issues={r.issues} prefix={label} onChange={value=>patch(r.key,{issues:value})}/>}</fieldset></td></>:<><td>{r.existing?<span className={'audit-pill '+statusTone(r.existing.status)}>{STATUS[r.existing.status]}</span>:<span className="audit-muted">Chưa có bản ghi</span>}</td><td>{!r.include?<span className="audit-muted">{locked?'Giữ nguyên lịch sử':'Không lưu thay đổi'}</span>:<><select aria-label={'Kết quả · '+label} disabled={!r.include||locked} value={r.status} onChange={e=>patch(r.key,{status:e.target.value})}>{Object.entries(STATUS).map(([id,text])=><option key={id} value={id}>{text}</option>)}</select>{r.status==='unavailable'&&<textarea aria-label={'Lý do · '+label} placeholder="Lý do không kiểm tra được" required={r.include} disabled={!r.include||locked} value={r.reason} onChange={e=>patch(r.key,{reason:e.target.value})}/>}</>}</td></>}
       <td><textarea aria-label={'Ghi chú · '+label} placeholder="Ghi chú (nếu có)" disabled={!r.include||locked} value={r.note} onChange={e=>patch(r.key,{note:e.target.value})}/></td>
      </tr>;
     })}</tbody></table></div>
     {!shownRows.length&&<div className="audit-empty">Không có dòng phù hợp bộ lọc.</div>}
    </fieldset>
    {rows.length>10&&<div className="audit-review-end"><span className="audit-muted">Hết bảng · Bộ lọc hiển thị không thay đổi các dòng sẽ lưu.</span><button type="button" className="audit-btn" onClick={toTop}>↑ Về phạm vi lưu</button></div>}
   </section>
  </form>}
 </section>;
}
