import {createHash,createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {SUPABASE_ANON_KEY,SUPABASE_URL} from '../src/supabaseConfig.js';
export const hash=text=>createHash('sha256').update(text).digest('hex');
export function safeEqual(a,b){if(typeof a!=='string'||typeof b!=='string')return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export function validateSnapshot(data){
 if(data?.project_ref!=='stxymyjwxdtfxkvmsgmz'||![1,2].includes(data.format_version)||!data.tables?.feedbacks)throw new Error('Bản sao không thuộc hệ thống SanThai Feedback');
 const allowed=new Set(['feedbacks','stores','allowed_emails','audit_log_feedback','feedback_app_members','feedback_module_access','audit_stores','audit_error_types','audit_inspections','audit_violations','audit_hygiene','audit_activity_log','audit_import_batches','audit_import_cells','app_backup_runs']);
 const counts={};for(const [name,rows] of Object.entries(data.tables)){if(!allowed.has(name)||!Array.isArray(rows)||rows.length>1000000)throw new Error('Bảng dữ liệu backup không hợp lệ');counts[name]=rows.length;const keys=new Set();for(const r of rows){if(!r||typeof r!=='object'||Array.isArray(r))throw new Error('Bản ghi backup không hợp lệ');const key=name==='feedback_module_access'?r.email+'|'+r.module:name==='allowed_emails'||name==='feedback_app_members'?r.email:name==='audit_import_cells'?r.source_key:r.id;if(!key||keys.has(key))throw new Error('ID thiếu hoặc trùng trong '+name);keys.add(key);}}
 return counts;
}
export async function dbRpc(name,params){
 const r=await fetch(SUPABASE_URL+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:SUPABASE_ANON_KEY,Authorization:'Bearer '+SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify(params),signal:AbortSignal.timeout(120000)});
 const data=await r.json();if(!r.ok)throw new Error(data.message||'Không đọc được backup database');return data;
}
export async function ownerFromRequest(req){
 const authorization=req.headers.authorization;if(!authorization?.startsWith('Bearer '))return null;
 const r=await fetch(SUPABASE_URL+'/auth/v1/user',{headers:{apikey:SUPABASE_ANON_KEY,Authorization:authorization},signal:AbortSignal.timeout(15000)});if(!r.ok)return null;const user=await r.json();return user.email?.toLowerCase()==='dangnhan.mrt@gmail.com'?user:null;
}
export async function listRuns(authorization){
 const r=await fetch(SUPABASE_URL+'/rest/v1/app_backup_runs?select=*&order=started_at.desc&limit=60',{headers:{apikey:SUPABASE_ANON_KEY,Authorization:authorization},signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error('Không tải được lịch sử backup');return r.json();
}
async function bridge(action,payload){
 const url=process.env.BACKUP_BRIDGE_URL,secret=process.env.BACKUP_BRIDGE_SECRET;
 if(!url||!secret||!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url))throw new Error('Chưa kết nối Google Drive cho backup tự động');
 const message=JSON.stringify({action,payload,timestamp:Date.now(),nonce:randomUUID()});const signature=createHmac('sha256',secret).update(message).digest('hex');
 const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,signature}),signal:AbortSignal.timeout(270000)});
 if(!r.ok)throw new Error('Google Drive không phản hồi thành công');let result;try{result=await r.json();}catch{throw new Error('Google Drive cần hoàn tất cấp quyền backup');}if(!result.ok)throw new Error(result.error||'Backup Google Drive thất bại');return result;
}
export async function runBackup(actor){
 const token=process.env.BACKUP_DB_TOKEN;if(!token)throw new Error('Chưa cấu hình kết nối backup database');
 if(!process.env.BACKUP_BRIDGE_URL)throw new Error('Chưa kết nối Google Drive cho backup tự động');
 const id=await dbRpc('feedback_backup_begin',{p_token:token,p_actor:actor});
 try{
  const snapshot=await dbRpc('feedback_backup_snapshot',{p_token:token});const counts=validateSnapshot(snapshot);const raw=JSON.stringify(snapshot);const checksum=hash(raw);
  const result=await bridge('save',{id,checksum,compressed:gzipSync(raw).toString('base64'),counts});
  if(result.checksum!==checksum||JSON.stringify(result.counts)!==JSON.stringify(counts))throw new Error('Đối chiếu bản sao Google Sheets không khớp');
  await dbRpc('feedback_backup_log',{p_token:token,p_run:{id,status:'completed',triggered_by:actor,counts,checksum,sheet_url:result.sheetUrl,archive_url:result.archiveUrl}});
  return {id,counts,sheetUrl:result.sheetUrl,archiveUrl:result.archiveUrl};
 }catch(e){await dbRpc('feedback_backup_log',{p_token:token,p_run:{id,status:'failed',triggered_by:actor,error:e.message}}).catch(()=>{});throw e;}
}
export async function readArchive(run){
 const result=await bridge('read',{id:run.id,checksum:run.checksum});const raw=gunzipSync(Buffer.from(result.compressed,'base64'),{maxOutputLength:150*1024*1024}).toString('utf8');
 if(hash(raw)!==run.checksum)throw new Error('Checksum bản sao không khớp');const data=JSON.parse(raw);validateSnapshot(data);return data;
}
