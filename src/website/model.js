export const MENU_GROUPS = {central:'Miền Trung',other:'Các cửa hàng còn lại'};
export const REGIONS = ['AN GIANG','BẠC LIÊU','BẾN TRE','CÀ MAU','CẦN THƠ','ĐÀ NẴNG','ĐỒNG THÁP','HẬU GIANG','KIÊN GIANG','LONG AN','SÓC TRĂNG','THÀNH PHỐ HUẾ','TIỀN GIANG','TRÀ VINH','VĨNH LONG'];
export const FIELD_LABELS = {name:'Tên cửa hàng',region:'Khu vực',address:'Địa chỉ',maps_url:'Google Maps',plus_code:'Plus Code',lat:'Vĩ độ',lng:'Kinh độ',delivery:'Giao tận nơi',pickup:'Đặt trước, ghé lấy',phone:'Hotline cửa hàng',apps:'App giao hàng',menu_group:'Nhóm menu',visible:'Hiển thị website',internal_store_id:'Mã nội bộ',images:'Ảnh menu'};
export function normalize(text=''){return text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().trim();}
export function emptyStore(){return {name:'',region:'',address:'',maps_url:'',plus_code:'',lat:'',lng:'',delivery:false,pickup:false,phone:'',apps:[],menu_group:'other',visible:false};}
export function methods(d){return [d.delivery&&'Giao tận nơi',d.pickup&&'Đặt trước, ghé lấy',d.phone&&'Hotline cửa hàng',d.apps?.length&&d.apps.map(a=>a.name).join(', ')].filter(Boolean);}
export function validateStore(d){
 for(const [k,max] of [['name',120],['region',80],['address',500]])if(!String(d[k]||'').trim()||d[k].length>max)throw new Error(FIELD_LABELS[k]+' chưa hợp lệ.');
 if(!/^https:\/\/(maps\.app\.goo\.gl\/|(www\.)?google\.com\/maps\/|goo\.gl\/maps\/)/i.test(d.maps_url))throw new Error('Vui lòng nhập link Google Maps hợp lệ.');
 if(d.lat===''||d.lng===''||!Number.isFinite(Number(d.lat))||!Number.isFinite(Number(d.lng))||Number(d.lat)<8||Number(d.lat)>24||Number(d.lng)<100||Number(d.lng)>115)throw new Error('Vui lòng nhập tọa độ chính xác của cửa hàng tại Việt Nam.');
 if(d.phone&&!/^\d{9,15}$/.test(d.phone.replace(/\D/g,'')))throw new Error('Hotline cần có từ 9 đến 15 chữ số.');
 if(d.apps.some(a=>!a.name.trim()||a.name.length>60||a.note.length>300))throw new Error('Kiểm tra tên và ghi chú app giao hàng.');
 if(!MENU_GROUPS[d.menu_group])throw new Error('Vui lòng chọn nhóm menu.');
 return {...d,name:d.name.trim(),region:d.region.trim().toUpperCase(),address:d.address.trim(),maps_url:d.maps_url.trim(),plus_code:d.plus_code.trim(),phone:d.phone.trim(),lat:Number(d.lat),lng:Number(d.lng),apps:d.apps.map(a=>({name:a.name.trim(),note:a.note.trim()}))};
}
export function changes(row){
 const before=row.before_data?.data?{...row.before_data.data,internal_store_id:row.before_data.internal_store_id}:row.before_data||{},after=row.after_data?.data?{...row.after_data.data,internal_store_id:row.after_data.internal_store_id}:row.after_data||{};
 return Object.entries(FIELD_LABELS).filter(([key])=>JSON.stringify(before[key])!==JSON.stringify(after[key])).map(([key,label])=>({key,label,before:before[key],after:after[key]}));
}
export function displayValue(value,key){if(value===undefined||value===null||value==='')return 'Chưa có';if(typeof value==='boolean')return value?'Có':'Không';if(key==='menu_group')return MENU_GROUPS[value]||value;if(Array.isArray(value))return value.map(a=>a.name?(a.name+(a.note?' - '+a.note:'')):a.alt||a.src).join('; ')||'Không có';return String(value);}

// Filter the complete journal before pagination. Calendar dates are Vietnam dates.
export function historyQuery(request,filters={}){
 let query=request;
 if(filters.entity)query=query.eq('entity',filters.entity);
 if(filters.entityId)query=query.eq('entity_id',filters.entityId);
 if(filters.actor?.trim())query=query.ilike('actor_email','%'+filters.actor.trim().replace(/[\\%_]/g,'\\$&')+'%');
 if(filters.from)query=query.gte('created_at',filters.from+'T00:00:00+07:00');
 if(filters.to){const end=new Date(filters.to+'T00:00:00+07:00');end.setUTCDate(end.getUTCDate()+1);query=query.lt('created_at',end.toISOString());}
 return query;
}
