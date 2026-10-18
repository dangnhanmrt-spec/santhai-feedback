import {supabase} from '../supabaseAuth.js';
export async function allRows(table, select='*', filter=q=>q) {
  const rows=[];
  for(let offset=0;;offset+=500){const {data,error}=await filter(supabase.from(table).select(select)).range(offset,offset+499);if(error)throw error;rows.push(...data);if(data.length<500)break;}
  return rows;
}
export async function loadMyAccess(){const {data:{user},error:authError}=await supabase.auth.getUser();if(authError)throw authError;if(!user)return {};const {data,error}=await supabase.from('feedback_module_access').select('module,role').eq('email',user.email.toLowerCase());if(error)throw error;return Object.fromEntries(data.map(x=>[x.module,x.role]));}
export async function loadAudit(start,end){
  const [inspections,hygiene,categories,auditStores]=await Promise.all([
    allRows('audit_inspections','*,audit_violations(*)',q=>q.gte('audit_date',start).lte('audit_date',end).order('occurred_at',{ascending:false}).order('id')),
    allRows('audit_hygiene','*',q=>q.gte('audit_date',start).lte('audit_date',end).order('audit_date').order('id')),
    allRows('audit_error_types','*',q=>q.order('name')),allRows('audit_stores','*',q=>q.order('name'))]);return {inspections,hygiene,categories,auditStores};
}
export async function saveInspection({store,occurredAt,note,issues}){
  const {data,error}=await supabase.rpc('audit_save_inspection',{p_store:store,p_occurred_at:occurredAt,p_note:note,p_issues:issues});if(error)throw error;return data;
}
export async function saveHygiene(row){const {error}=await supabase.from('audit_hygiene').upsert({...row,source:'manual',source_keys:[],created_by:(await supabase.auth.getUser()).data.user?.id,updated_at:new Date().toISOString()},{onConflict:'store_id,audit_date,shift'});if(error)throw error;}
export async function addType(name){const {error}=await supabase.from('audit_error_types').insert({name:name.trim()});if(error)throw error;}
export async function toggleType(id,active){const {error}=await supabase.from('audit_error_types').update({active}).eq('id',id);if(error)throw error;}
export async function backupRequest(action,body={}){
 const {data:{session}}=await supabase.auth.getSession();
 const r=await fetch('/api/backup?action='+action,{method:action==='status'?'GET':'POST',headers:{Authorization:'Bearer '+session?.access_token,'Content-Type':'application/json'},...(action==='status'?{}:{body:JSON.stringify(body)})});
 const result=await r.json();if(!r.ok)throw new Error(result.error||'Không thể xử lý backup');return result;
}
