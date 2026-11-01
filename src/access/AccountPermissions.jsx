import {describeAccount} from './capabilities.js';
import './permissions.css';

function CapabilityGroup({label,items,empty}){
 return <div className="access-capability"><dt>{label}</dt><dd>{items.length?<ul>{items.map(text=><li key={text}>{text}</li>)}</ul>:empty}</dd></div>;
}
function ModuleCard({item}){
 return <section className={'access-module '+(item.role==='none'?'access-module-none':'')} aria-label={item.title}>
  <div className="access-module-heading"><h4>{item.title}</h4><span className={'access-role access-role-'+item.role}>{item.label}</span></div>
  {item.role==='none'?<p className="access-no-entry">Không mở được bộ phận này.</p>:<dl>
   <CapabilityGroup label="Xem" items={item.view} empty="Không có chức năng riêng"/>
   <CapabilityGroup label="Thao tác dữ liệu" items={item.operate} empty="Không được thêm, sửa hoặc xóa dữ liệu"/>
   <CapabilityGroup label="Quản lý" items={item.manage} empty="Không được quản lý danh mục hoặc phân quyền"/>
  </dl>}
 </section>;
}
export default function AccountPermissions({email,rows,expanded,onToggle,detailsId}){
 const account=describeAccount(email,rows);
 return <button type="button" className={'access-details'+(expanded?' is-open':'')} aria-label={'Quyền chi tiết của '+email} aria-expanded={expanded} aria-controls={detailsId} onClick={onToggle}>
  <span className="access-summary-roles">{account.modules.map(m=><span key={m.id} className={'access-summary-role '+(m.role==='none'?'access-summary-none':'')}><b>{m.title.replace(' khách hàng','').replace(' nội bộ','').replace(' cửa hàng','')}</b><span>{m.label}</span></span>)}{account.owner&&<span className="access-owner">Chủ hệ thống</span>}</span><span className="access-expand">{expanded?'Thu gọn quyền':'Xem quyền chi tiết'}<span aria-hidden="true">⌄</span></span>
 </button>;
}
export function AccountPermissionDetail({email,rows,id}){
 const account=describeAccount(email,rows);
 return <div className="access-detail-body" id={id} role="region" aria-label={'Quyền chi tiết của '+email}>
   <div className="access-modules">{account.modules.map(item=><ModuleCard key={item.id} item={item}/>)}</div>
   <h4 className="access-system-heading">Chức năng dùng chung</h4>
   <div className="access-system">{account.system.map(item=><ModuleCard key={item.id} item={item}/>)}</div>
   <p className="access-detail-note">Các quyền độc lập theo bộ phận. Chỉ chủ hệ thống cấp quyền Feedback, Website và thêm nhân sự mới. Admin Audit chỉ quản lý quyền Audit của các tài khoản có sẵn. Đây là mô tả quyền hiện có, không thay đổi quyền của tài khoản.</p>
 </div>;
}
