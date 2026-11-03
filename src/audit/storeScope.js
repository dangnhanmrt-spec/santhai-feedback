export const inAuditScope=store=>store?.in_scope===true&&!store.historical_only;
export const normalizeStoreName=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLocaleLowerCase('vi').trim();
export function feedbackStoreCandidates(feedbackStores,auditStores){
 const mapped=new Set(auditStores.flatMap(s=>[s.current_store_id,s.id]).filter(Boolean));
 return feedbackStores.filter(s=>!mapped.has(s.id));
}
export function reportStores(stores,{history=false,includeHidden=false}={}){
 return stores.filter(s=>inAuditScope(s)||(history&&includeHidden));
}
