import {dbRpc,listRuns,ownerFromRequest,readArchive,runBackup,safeEqual} from '../server/backup-core.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const action=req.query?.action||new URL(req.url,'https://local.invalid').searchParams.get('action')||'status';
 try{
  const cron=action==='cron'&&req.method==='GET'&&process.env.CRON_SECRET&&safeEqual(req.headers.authorization,'Bearer '+process.env.CRON_SECRET);
  const user=cron?null:await ownerFromRequest(req);if(!cron&&!user)return res.status(403).json({error:'Chỉ chủ hệ thống được dùng Sao lưu & khôi phục.'});
  if(action==='status'&&req.method==='GET')return res.status(200).json({configured:Boolean(process.env.BACKUP_DB_TOKEN&&process.env.BACKUP_BRIDGE_URL&&process.env.BACKUP_BRIDGE_SECRET),runs:await listRuns(req.headers.authorization),folderUrl:'https://drive.google.com/drive/folders/1ajGdKihv-eoSLRbyDplmxTV9so83jPj5'});
  if((action==='cron'&&cron)||(action==='run'&&req.method==='POST'&&user))return res.status(200).json(await runBackup(cron?'vercel-cron':user.email));
  if(action==='restore'&&req.method==='POST'&&user){
   const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
   if(body?.confirmation!=='KHOI PHUC'||typeof body.runId!=='string')return res.status(400).json({error:'Thiếu xác nhận khôi phục'});
   const runs=await listRuns(req.headers.authorization);const run=runs.find(r=>r.id===body.runId&&r.status==='completed'&&r.checksum);
   if(!run)return res.status(404).json({error:'Không tìm thấy bản sao hợp lệ trong lịch sử gần đây'});
   const data=await readArchive(run);await runBackup('before-restore:'+user.email);
   const result=await dbRpc('feedback_restore_snapshot',{p_token:process.env.BACKUP_DB_TOKEN,p_snapshot:data,p_actor:user.email});
   return res.status(200).json(result);
  }
  return res.status(405).json({error:'Thao tác không hợp lệ'});
 }catch(e){console.error('[backup]',action,e.message);return res.status(500).json({error:e.message||'Backup thất bại'});}
}
