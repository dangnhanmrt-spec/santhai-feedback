// Descriptions for the UI only. Authorization remains in existing UI guards/RLS.
export const OWNER_EMAIL='dangnhan.mrt@gmail.com';
export const MODULES=[['feedback','Feedback khách hàng'],['audit','Audit nội bộ'],['website','Website cửa hàng']];
const LABELS={admin:'Admin',editor:'Nhập liệu',viewer:'Chỉ xem',none:'Không truy cập'};
const allowed={feedback:['admin','viewer'],audit:['admin','editor','viewer'],website:['admin','editor','viewer']};
export function describeAccount(email,rows=[]){
 const owner=email.toLowerCase()===OWNER_EMAIL;
 const modules=MODULES.map(([id,title])=>{
  const stored=rows.find(r=>r.email.toLowerCase()===email.toLowerCase()&&r.module===id)?.role;
  const role=allowed[id].includes(stored)?stored:'none';
  const item={id,title,role,label:id==='website'&&role==='editor'?'Chỉnh sửa':LABELS[role],view:[],operate:[],manage:[]};
  if(role==='none')return item;
  if(id==='feedback'){
   item.view=['Dashboard tổng hợp','Timeline theo cửa hàng','Danh sách feedback'];
   if(role==='admin'){
    item.view.push('Lịch sử thao tác','Danh sách phân quyền');
    item.operate=['Thêm, sửa và xóa feedback'];
    item.manage=['Thêm, ẩn và hiện cửa hàng nội bộ'];
    if(owner)item.manage.push('Cấp, đổi và thu hồi quyền Feedback');
   }
  }
  if(id==='audit'){
   item.view=['Tổng quan','Bảng tuần','Thống kê cửa hàng','Lịch sử kiểm tra'];
   if(['editor','admin'].includes(role))item.operate=['Ghi nhận lượt Audit','Nhập và cập nhật vệ sinh theo ca','Nhập hàng loạt, xem lại trước khi lưu'];
   if(role==='admin'){
    item.view.push('Nhật ký thao tác','Dữ liệu lịch sử và mục cần rà soát','Danh sách phân quyền');
    item.operate.push('Xóa lỗi hoặc lượt Audit, có ghi lý do');
    item.manage=['Thêm và ngừng sử dụng loại vi phạm','Cấp, đổi và thu hồi quyền Audit cho tài khoản có sẵn, trừ chủ hệ thống'];
   }
  }
  if(id==='website'){
   item.view=['Hồ sơ cửa hàng','Menu và ảnh gốc','Lịch sử chỉnh sửa, nội dung trước/sau'];
   if(['editor','admin'].includes(role))item.operate=['Thêm và sửa hồ sơ công khai','Ẩn hoặc hiện cửa hàng trên website','Cập nhật, sắp xếp và bỏ ảnh menu trước khi lưu'];
   if(owner){item.view.push('Danh sách phân quyền');item.manage=['Thêm nhân sự vào danh sách','Cấp, đổi và thu hồi quyền Website'];}
  }
  return item;
 });
 const active=modules.some(m=>m.role!=='none');
 return {owner,modules,system:[
  {id:'overview',title:'Tổng quan chung',role:active?'viewer':'none',label:active?'Chỉ xem':'Không truy cập',view:active?['Tóm tắt các bộ phận được cấp quyền, mở từng bộ phận']:[],operate:[],manage:[]},
  {id:'backup',title:'Sao lưu & khôi phục',role:owner?'admin':'none',label:owner?'Chủ hệ thống':'Không truy cập',view:owner?['Trạng thái và lịch sử sao lưu, liên kết bản sao']:[],operate:owner?['Sao lưu ngay','Chọn bản và xác nhận khôi phục']:[],manage:[]}
 ]};
}
