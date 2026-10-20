export function vietnamDate(value = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
}
export function addDays(day, n) {
  const date = new Date(day+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+n);return date.toISOString().slice(0,10);
}
export function monday(day) {
  const date=new Date(day+'T12:00:00Z');return addDays(day,-((date.getUTCDay()+6)%7));
}
export function periodFor(mode, anchor) {
  if(mode==='week')return {start:monday(anchor),end:addDays(monday(anchor),6)};
  if(mode==='month'){const start=anchor.slice(0,7)+'-01';const d=new Date(start+'T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);return {start,end:addDays(d.toISOString().slice(0,10),-1)};}
  return {start:anchor,end:anchor};
}
export function percent(n,d) {return d ? new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format(n*100/d)+'%' : '—';}
// Removed rows stay in backups/logs, never in dashboards or rate denominators.
export function activeInspections(inspections) {
 return inspections.filter(i=>!i.deleted_at).map(i=>({...i,audit_violations:(i.audit_violations||[]).filter(v=>!v.deleted_at)}));
}
export function summarize(stores, inspections, hygiene, categories=[]) {
  inspections=activeInspections(inspections);
  const types=Object.fromEntries(categories.map(t=>[t.id,t.name]));
  const rows=stores.map(store=>{
    const list=inspections.filter(i=>i.store_id===store.id);
    const eligible=list.filter(i=>i.counted_for_rate && i.source==='manual');
    const withIssues=list.filter(i=>i.audit_violations?.length);
    const bad=eligible.filter(i=>i.audit_violations?.length);
    const checks=hygiene.filter(h=>h.store_id===store.id);
    const pass=checks.filter(h=>h.status==='pass').length;
    const fail=checks.filter(h=>h.status==='fail').length;
    return {...store,inspections:list.length,eligible:eligible.length,violating:bad.length,
      issueVisits:withIssues.length,issues:list.reduce((n,i)=>n+(i.audit_violations?.length||0),0),
      legacy:list.filter(i=>i.source==='legacy').length,pass,fail,hygiene:checks,
      rate:eligible.length?bad.length/eligible.length:null};
  });
  const totals=rows.reduce((a,r)=>({...a,eligible:a.eligible+r.eligible,violating:a.violating+r.violating,issues:a.issues+r.issues,legacy:a.legacy+r.legacy,pass:a.pass+r.pass,fail:a.fail+r.fail}),{eligible:0,violating:0,issues:0,legacy:0,pass:0,fail:0});
  const typeMap=new Map();const repeatMap=new Map();
  for(const i of inspections)for(const v of i.audit_violations||[]){
    typeMap.set(v.error_type_id,(typeMap.get(v.error_type_id)||0)+1);
    const key=i.store_id+'|'+v.error_type_id;
    if(!repeatMap.has(key))repeatMap.set(key,{store_id:i.store_id,error_type_id:v.error_type_id,visits:new Set()});
    repeatMap.get(key).visits.add(i.id);
  }
  return {rows,totals,checked:rows.filter(r=>r.inspections).length,
    unchecked:rows.filter(r=>r.active&&!r.inspections).length,
    popular:[...typeMap].map(([id,count])=>({id,name:types[id]||'Loại lỗi lịch sử',count})).sort((a,b)=>b.count-a.count),
    repeats:[...repeatMap.values()].filter(r=>r.visits.size>=2).map(r=>({...r,count:r.visits.size,name:types[r.error_type_id]||'Loại lỗi lịch sử'})).sort((a,b)=>b.count-a.count)};
}
