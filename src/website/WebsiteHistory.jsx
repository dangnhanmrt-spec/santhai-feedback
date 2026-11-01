import {useEffect,useState} from 'react';
import {MENU_GROUPS,changes,displayValue} from './model.js';

const emptyFilters=()=>({entity:'',entityId:'',actor:'',from:'',to:''});
const date=t=>new Date(t).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'});
const entityName=r=>r.after_data?.data?.name||r.before_data?.data?.name||MENU_GROUPS[r.entity_id]||r.entity_id;
const actionName=r=>r.action==='create'?'Thêm mới':r.entity==='access'?'Cập nhật quyền':'Cập nhật';
const actorName=r=>r.actor_email==='catalog_import'?'Dữ liệu ban đầu':r.actor_email;
const roleName=value=>({admin:'Admin',editor:'Chỉnh sửa nội dung',viewer:'Chỉ xem'}[value]||'Không truy cập');

function HistoryValue({value,field}){
 if(field!=='images')return <span>{displayValue(value,field)}</span>;
 if(!Array.isArray(value)||!value.length)return <span>Chưa có</span>;
 return <div className="wa-history-images">{value.map((img,index)=>{
  if(!/^https:\/\//i.test(img.src||''))return <span key={index}>Ảnh không có liên kết hợp lệ</span>;
  return <a key={img.src+index} href={img.src} target="_blank" rel="noreferrer"><img src={img.src} alt={img.alt||'Ảnh menu trang '+(index+1)} loading="lazy"/><span>Trang {index+1} · Xem ảnh gốc ↗</span></a>;
 })}</div>;
}

export default function WebsiteHistory({api,stores,Dialog}){
 const [draft,setDraft]=useState(emptyFilters),[filters,setFilters]=useState(emptyFilters),[page,setPage]=useState(0);
 const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[filterError,setFilterError]=useState(''),[detail,setDetail]=useState(null);
 useEffect(()=>{
  let alive=true;setLoading(true);setError('');
  api.history(page,filters).then(result=>{if(alive)setRows(result);}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});
  return()=>{alive=false;};
 },[api,page,filters]);
 const set=(key,value)=>setDraft(old=>({...old,[key]:value,...(key==='entity'?{entityId:''}:{})}));
 function apply(e){e.preventDefault();if(draft.from&&draft.to&&draft.from>draft.to){setFilterError('Ngày kết thúc cần bằng hoặc sau ngày bắt đầu.');return;}setFilterError('');setPage(0);setFilters({...draft});}
 function reset(){setDraft(emptyFilters());setFilters(emptyFilters());setPage(0);setFilterError('');}
 const active=Object.values(filters).some(Boolean),visible=rows.slice(0,30);
 return <>
  <div className="audit-page-heading"><div><h1>Lịch sử chỉnh sửa</h1><div className="audit-muted">Tra cứu nội dung trước - sau · Thời gian Việt Nam</div></div></div>
  <form className="audit-filter-panel wa-history-filters" onSubmit={apply}>
   <div className="audit-filters">
    <label>Loại nội dung<select value={draft.entity} onChange={e=>set('entity',e.target.value)}><option value="">Tất cả nội dung</option><option value="website_store_profiles">Cửa hàng</option><option value="website_menus">Menu</option><option value="access">Phân quyền</option></select></label>
    {draft.entity!=='access'&&<label className="wa-history-object">Cửa hàng / nhóm menu<select value={draft.entityId} onChange={e=>set('entityId',e.target.value)}><option value="">Tất cả</option>{draft.entity!=='website_menus'&&<optgroup label="Cửa hàng">{[...stores].sort((a,b)=>a.data.name.localeCompare(b.data.name,'vi')).map(s=><option key={s.id} value={s.id}>{s.data.name}</option>)}</optgroup>}{draft.entity!=='website_store_profiles'&&<optgroup label="Menu">{Object.entries(MENU_GROUPS).map(([id,name])=><option key={id} value={id}>Menu {name}</option>)}</optgroup>}</select></label>}
    <label>Người sửa<input placeholder="Email người sửa" value={draft.actor} onChange={e=>set('actor',e.target.value)}/></label>
    <label>Từ ngày<input type="date" value={draft.from} onChange={e=>set('from',e.target.value)}/></label>
    <label>Đến ngày<input type="date" value={draft.to} onChange={e=>set('to',e.target.value)}/></label>
    <button className="audit-btn primary">Lọc lịch sử</button>
   </div>
   <div className="audit-filter-summary" aria-live="polite">{loading?'Đang tải lịch sử...':error?'Chưa tải được lịch sử':`Trang ${page+1} · ${visible.length} bản ghi${active?' theo bộ lọc':''}`}{Object.values(draft).some(Boolean)||active?<button type="button" className="audit-link" onClick={reset}>Xóa bộ lọc</button>:null}</div>
  </form>
  {(error||filterError)&&<div className="audit-message error" role="alert">{filterError||error}</div>}
  {loading?<div className="audit-empty" role="status">Đang tải lịch sử...</div>:!error&&<div className="audit-scroll wa-history-scroll"><table className="audit-table wa-history-table"><caption className="wa-sr-only">Lịch sử chỉnh sửa nội dung website</caption><thead><tr><th>Nội dung</th><th>Thay đổi</th><th>Người sửa</th><th>Thời gian Việt Nam</th><th><span className="wa-sr-only">Chi tiết</span></th></tr></thead><tbody>{visible.map(r=><tr key={r.id}><td><strong>{entityName(r)}</strong><span className="wa-cell-sub">{r.entity==='website_menus'?'Menu':r.entity==='access'?'Phân quyền':'Cửa hàng'}</span></td><td><span className="wa-history-action">{actionName(r)}</span><span className="wa-change-summary" title={changes(r).map(c=>c.label).join(', ')}>{r.entity==='access'?'Quyền quản lý website':changes(r).map(c=>c.label).join(', ')||'Thông tin cửa hàng'}</span></td><td className="wa-actor">{actorName(r)}</td><td className="wa-history-time">{date(r.created_at)}</td><td><button className="audit-btn" aria-label={'Xem thay đổi '+entityName(r)} onClick={()=>setDetail(r)}>Xem thay đổi</button></td></tr>)}{!visible.length&&<tr><td colSpan="5" className="audit-empty">{active?'Không có thay đổi phù hợp với bộ lọc.':'Chưa có thay đổi.'}</td></tr>}</tbody></table></div>}
  <div className="audit-inline wa-pagination"><button className="audit-btn" disabled={loading||page===0} onClick={()=>setPage(p=>p-1)}>Trang trước</button><span>Trang {page+1}</span><button className="audit-btn" disabled={loading||!!error||rows.length<=30} onClick={()=>setPage(p=>p+1)}>Trang sau</button></div>
  {detail&&<Dialog title={'Thay đổi - '+entityName(detail)} onClose={()=>setDetail(null)}><div className="wa-dialog-body"><p className="wa-detail-meta">{actionName(detail)} · {actorName(detail)}<br/>{date(detail.created_at)} · Giờ Việt Nam</p><div className="wa-diff-head"><span>Trước thay đổi</span><span>Sau thay đổi</span></div>{detail.entity==='access'?<section className="wa-diff-field"><h3>Quyền quản lý website</h3><div className="wa-change-pair"><div>{roleName(detail.before_data?.role)}</div><div>{roleName(detail.after_data?.role)}</div></div></section>:changes(detail).map(c=><section className="wa-diff-field" key={c.key}><h3>{c.label}</h3><div className="wa-change-pair"><div><HistoryValue value={c.before} field={c.key}/></div><div><HistoryValue value={c.after} field={c.key}/></div></div></section>)}</div><footer className="wa-footer"><button className="audit-btn" onClick={()=>setDetail(null)}>Đóng</button></footer></Dialog>}
 </>;
}
