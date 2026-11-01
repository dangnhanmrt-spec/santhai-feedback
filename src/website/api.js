import {supabase} from '../supabaseAuth.js';
import {historyQuery} from './model.js';
async function result(request){const {data,error}=await request;if(error)throw new Error(error.code==='23505'?'Link Maps hoặc mã nội bộ đã được dùng cho một cửa hàng khác.':error.message);return data;}
export const websiteApi={
 loadStores:()=>result(supabase.from('website_store_profiles').select('*').order('updated_at',{ascending:false})),
 loadMenus:()=>result(supabase.from('website_menus').select('*').order('id')),
 async saveStore(row,data,internalId){
  const payload={data,internal_store_id:internalId||null};
  const saved=await result(row?.id?supabase.from('website_store_profiles').update(payload).eq('id',row.id).eq('version',row.version).select():supabase.from('website_store_profiles').insert(payload).select());
  if(!saved?.length)throw new Error('Thông tin đã được người khác thay đổi hoặc quyền chỉnh sửa đã hết. Tải lại danh sách rồi mở lại cửa hàng.');return saved[0];
 },
 async saveMenu(row,images){const saved=await result(supabase.from('website_menus').update({images}).eq('id',row.id).eq('version',row.version).select());if(!saved?.length)throw new Error('Menu đã được người khác cập nhật. Tải lại để xem bản mới nhất.');return saved[0];},
 async upload(file,group){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024)throw new Error('Chọn ảnh JPG, PNG hoặc WebP, tối đa 12 MB.');
  const object=group+'/'+crypto.randomUUID()+'.'+({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type]);
  await result(supabase.storage.from('website-menus').upload(object,file,{upsert:false,contentType:file.type,cacheControl:'31536000'}));
  return supabase.storage.from('website-menus').getPublicUrl(object).data.publicUrl;
 },
 async history(page=0,filters={}){return result(historyQuery(supabase.from('website_activity').select('*'),filters).order('created_at',{ascending:false}).order('id',{ascending:false}).range(page*30,page*30+30));},
 async members(){return result(supabase.from('feedback_app_members').select('email').order('email'));},
 async access(){return result(supabase.from('feedback_module_access').select('email,role').eq('module','website'));},
 async permissions(){return result(supabase.from('feedback_module_access').select('email,module,role').order('email'));},
 async addMember(email){return result(supabase.from('feedback_app_members').upsert({email},{onConflict:'email',ignoreDuplicates:true}));},
 async grant(email,role){return result(role==='none'?supabase.from('feedback_module_access').delete().eq('email',email).eq('module','website'):supabase.from('feedback_module_access').upsert({email,module:'website',role},{onConflict:'email,module'}));},
};
