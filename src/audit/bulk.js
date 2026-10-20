export const HYGIENE_STATUS={not_submitted:'Chưa gửi',pending:'Chờ kiểm tra',pass:'Đạt',fail:'Không đạt',unavailable:'Không kiểm tra được'};
export function buildBulkRows({kind,stores,date,time,shifts,status,note,reason,issues,clear,existing=[]}){
 return stores.flatMap(store=>kind==='inspection'?[{key:store.id,store_id:store.id,name:store.name,date,time,note,clear,issues:clear?[]:issues.map(i=>({...i})),include:true}]:shifts.map(shift=>{
  const old=existing.find(h=>h.store_id===store.id&&h.audit_date===date&&h.shift===shift);
  return {key:store.id+':'+shift,store_id:store.id,name:store.name,date,shift,status,note,reason,existing:old||null,include:!old};
 }));
}
export function bulkPayload(kind,rows){
 const chosen=rows.filter(r=>r.include);
 if(!chosen.length)throw new Error('Chọn ít nhất một dòng để lưu.');
 if(chosen.length>300)throw new Error('Mỗi đợt tối đa 300 dòng.');
 return chosen.map(r=>{
  if(!r.date)throw new Error(r.name+': Chọn ngày kiểm tra.');
  if(kind==='inspection'){
   if(!r.time)throw new Error(r.name+': Chọn giờ kiểm tra.');
   if(!r.clear&&!r.issues.length)throw new Error(r.name+': Chọn lỗi hoặc xác nhận đã kiểm tra không vi phạm.');
   if(r.issues.some(i=>!i.error_type_id))throw new Error(r.name+': Chọn loại lỗi đầy đủ.');
   return {store_id:r.store_id,occurred_at:new Date(r.date+'T'+r.time+':00+07:00').toISOString(),note:r.note,clear:r.clear,issues:r.clear?[]:r.issues};
  }
  if(r.existing?.source==='legacy')throw new Error(r.name+': Ca lịch sử không thể cập nhật.');
  if(!HYGIENE_STATUS[r.status])throw new Error(r.name+': Chọn kết quả ca.');
  if(r.status==='unavailable'&&!r.reason.trim())throw new Error(r.name+' · Ca '+r.shift+': Nhập lý do không kiểm tra được.');
  return {store_id:r.store_id,audit_date:r.date,shift:r.shift,status:r.status,note:r.note,reason:r.status==='unavailable'?r.reason:'',expected_updated_at:r.existing?.updated_at||null};
 });
}
