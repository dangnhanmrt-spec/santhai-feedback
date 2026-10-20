const STATUS={not_submitted:'Chưa gửi',pending:'Chờ kiểm tra',pass:'Đạt',fail:'Không đạt',unavailable:'Không kiểm tra được'};
export function describeActivity(log,storeMap={},categoryMap={}){
 const d=log.details||{},after=d.after||{},before=d.before||{},inspection=d.inspection_before||d.inspection||{};
 const storeId=inspection.store_id||after.store_id||before.store_id;
 const date=inspection.audit_date||after.audit_date||before.audit_date;
 const removed=log.action==='REMOVE_INSPECTION'||log.action==='REMOVE_VIOLATION';
 const entity={audit_inspections:'lượt kiểm tra',audit_violations:'lỗi',audit_hygiene:'kết quả vệ sinh',audit_error_types:'loại vi phạm'}[log.entity]||'dữ liệu Audit';
 let label=(log.action==='INSERT'?'Thêm ':removed?'Xóa ':'Cập nhật ')+entity;
 const lines=[];
 if(removed){
  const issues=(d.violations_before||[]).filter(v=>log.action==='REMOVE_INSPECTION'||v.id===log.entity_id);
  for(const v of issues)lines.push((categoryMap[v.error_type_id]||'Loại lỗi lịch sử')+(v.description?' — '+v.description:''));
  if(log.action==='REMOVE_VIOLATION'&&d.inspection_removed)lines.push('Lỗi cuối cùng: lượt kiểm tra cũng được loại khỏi thống kê.');
  if(log.action==='REMOVE_INSPECTION')lines.push('Cả lượt kiểm tra được loại khỏi thống kê.');
 }else if(log.entity==='audit_violations'){
  lines.push((d.error_type_name||categoryMap[after.error_type_id]||'Loại lỗi lịch sử')+(after.description?' — '+after.description:''));
 }else if(log.entity==='audit_hygiene'){
  const state=STATUS[after.status]||after.status||'Chưa có thông tin';
  lines.push('Ca '+after.shift+' · '+(before.status?(STATUS[before.status]||before.status)+' → ':'')+state);
  if(after.reason)lines.push(after.reason);
 }else if(log.entity==='audit_error_types'){
  if(log.action==='UPDATE'&&before.active!==undefined&&before.active!==after.active)label=after.active?'Dùng lại loại vi phạm':'Ngừng dùng loại vi phạm';
  lines.push(after.name||'Loại vi phạm');lines.push(after.active===false?'Đã ngừng sử dụng':'Đang sử dụng');
 }else if(log.entity==='audit_inspections'){
  lines.push(after.source==='legacy'?'Ghi nhận dữ liệu lịch sử':'Ghi nhận lượt kiểm tra');
 }
 if(after.note)lines.push(after.note);
 return {label,tone:removed?'bad':log.action==='INSERT'?'good':'pending',storeName:storeId?(storeMap[storeId]?.name||storeId):'Danh mục chung',date,lines,removed,reason:removed?(d.reason||'Không nhập lý do'):null};
}
