import {useEffect,useMemo,useRef,useState} from 'react';
import {addAuditStore,loadFeedbackStoreChoices,setAuditStoreScope} from './api.js';
import {feedbackStoreCandidates,inAuditScope,normalizeStoreName} from './storeScope.js';

export default function StoreManager({stores,onChanged,onReload}){
 const [query,setQuery]=useState(''),[region,setRegion]=useState(''),[status,setStatus]=useState('all');
 const [adding,setAdding]=useState(false),[choices,setChoices]=useState([]),[choice,setChoice]=useState(''),[addQuery,setAddQuery]=useState('');
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const inFlight=useRef(false);
 async function refresh(){
  if(inFlight.current)return;inFlight.current=true;setBusy('refresh');setLoading(true);setError('');setNotice('');
  try{const [rows]=await Promise.all([loadFeedbackStoreChoices(),onReload()]);setChoices(rows);setChoice('');}
  catch(e){setError(e.message);}finally{inFlight.current=false;setBusy('');setLoading(false);}
 }
 useEffect(()=>{let alive=true;loadFeedbackStoreChoices().then(rows=>{if(alive)setChoices(rows);}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[]);
 const current=stores.filter(s=>!s.historical_only);
 const shown=current.filter(inAuditScope).length,hidden=current.length-shown;
 const regions=useMemo(()=>[...new Set(current.map(s=>s.regionName||s.region_id))].sort((a,b)=>a.localeCompare(b,'vi')),[stores]);
 const filtered=current.filter(s=>(!region||(s.regionName||s.region_id)===region)&&normalizeStoreName(s.name).includes(normalizeStoreName(query))&&(status==='all'||(status==='shown')===inAuditScope(s)));
 const candidates=feedbackStoreCandidates(choices,stores).filter(s=>normalizeStoreName(s.name).includes(normalizeStoreName(addQuery)));
 async function run(key,action,message){
  if(inFlight.current)return;inFlight.current=true;setBusy(key);setError('');setNotice('');
  try{const row=await action();onChanged(row);setNotice(message);if(key==='add'){setChoice('');setAdding(false);}}
  catch(e){setError(e.message);}finally{inFlight.current=false;setBusy('');}
 }
 return <section className="audit-panel audit-store-manager" aria-label="Danh sách cửa hàng Audit">
  <div className="audit-section-heading"><div><h2>Phạm vi Audit</h2><div className="audit-muted">Chọn cửa hàng bộ phận Audit đang quản lý. Ẩn cửa hàng vẫn giữ toàn bộ lịch sử đã ghi nhận.</div></div><div className="audit-inline"><button className="audit-btn" disabled={!!busy||loading} onClick={refresh}>{busy==='refresh'?'Đang tải...':'↻ Làm mới'}</button><button className="audit-btn primary" disabled={!!busy} aria-expanded={adding} onClick={()=>{setAdding(!adding);setError('');}}>＋ Thêm cửa hàng</button></div></div>
  <div className="audit-scope-counts"><span className="audit-pill good">Đang hiện: {shown}</span><span className="audit-pill">Đang ẩn: {hidden}</span><span className="audit-muted">{current.length} cửa hàng đã thêm</span></div>
  {error&&<div className="audit-message error" role="alert">{error}</div>}{notice&&<div className="audit-message success" role="status">{notice}</div>}
  {adding&&<form className="audit-store-add" onSubmit={e=>{e.preventDefault();if(choice)run('add',()=>addAuditStore(choice),'Đã thêm cửa hàng vào phạm vi Audit.');}}>
   <h3>Thêm từ danh mục Feedback</h3><p className="audit-muted">Tên và khu vực được lấy theo Feedback để dùng đúng cùng một cửa hàng.</p>
   {loading?<div role="status">Đang tải danh mục cửa hàng...</div>:<><div className="audit-scope-add-fields"><label>Tìm trong danh mục Feedback<input type="search" value={addQuery} onChange={e=>{setAddQuery(e.target.value);setChoice('');}} disabled={!!busy} placeholder="Nhập tên cửa hàng"/></label><label>Cửa hàng chưa thêm<select required value={choice} onChange={e=>setChoice(e.target.value)} disabled={!!busy||!candidates.length}><option value="">Chọn cửa hàng từ Feedback</option>{candidates.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label></div>{!candidates.length&&<div className="audit-muted">{addQuery?'Không có cửa hàng chưa thêm phù hợp tên tìm.':'Tất cả cửa hàng trong Feedback đã có trong danh sách Audit. Với cửa hàng đang ẩn, dùng nút Hiện bên dưới.'}</div>}<div className="audit-inline"><button type="submit" className="audit-btn primary" disabled={!!busy||!choice}>{busy==='add'?'Đang thêm...':'Thêm vào Audit'}</button><button type="button" className="audit-btn" disabled={!!busy} onClick={()=>setAdding(false)}>Hủy</button></div></>}
  </form>}
  <div className="audit-scope-filters"><label>Tìm cửa hàng<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nhập tên cửa hàng"/></label><label>Khu vực<select value={region} onChange={e=>setRegion(e.target.value)}><option value="">Tất cả khu vực</option>{regions.map(r=><option key={r}>{r}</option>)}</select></label><label>Trạng thái<select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Tất cả</option><option value="shown">Đang hiện</option><option value="hidden">Đang ẩn</option></select></label></div>
  <div className="audit-filter-summary"><span>{filtered.length} cửa hàng{query||region||status!=='all'?' phù hợp bộ lọc':''}</span>{(query||region||status!=='all')&&<button className="audit-link" onClick={()=>{setQuery('');setRegion('');setStatus('all');}}>Xóa bộ lọc</button>}</div>
  <div className="audit-scroll"><table className="audit-table"><thead><tr><th>Cửa hàng</th><th>Khu vực</th><th>Phạm vi Audit</th><th className="audit-scope-action">Thao tác</th></tr></thead><tbody>{filtered.map(s=>{const visible=inAuditScope(s);return <tr key={s.id}><td><strong>{s.name}</strong></td><td>{s.regionName||s.region_id}</td><td><span className={'audit-pill '+(visible?'good':'')}>{visible?'Đang hiện':'Đang ẩn'}</span></td><td className="audit-scope-action"><button className={'audit-btn'+(visible?'':' audit-scope-show')} disabled={!!busy} aria-label={(visible?'Ẩn ':'Hiện ')+s.name} onClick={()=>run(s.id,()=>setAuditStoreScope(s.id,!visible,s.in_scope),visible?'Đã ẩn '+s.name+' khỏi phạm vi Audit.':'Đã hiện '+s.name+' trong phạm vi Audit.')}>{busy===s.id?'Đang lưu...':visible?'Ẩn':'Hiện'}</button></td></tr>;})}</tbody></table>{!filtered.length&&<div className="audit-empty">Không có cửa hàng phù hợp bộ lọc.</div>}</div>
 </section>;
}
