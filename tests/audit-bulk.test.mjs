import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBulkRows,bulkPayload,reconcileBulkRows} from '../src/audit/bulk.js';
const stores=[{id:'a',name:'A'},{id:'b',name:'B'}];
const setup={date:'2026-10-20',time:'09:30',stores,note:'Ghi chú',reason:'',clear:false,issues:[{error_type_id:'x',description:'Lỗi X'}],shifts:[1,3],status:'pass'};
test('bulk Audit copies independent issues per store and keeps Vietnam time',()=>{
 const rows=buildBulkRows({...setup,kind:'inspection'});rows[0].issues[0].description='Riêng A';
 assert.equal(rows[1].issues[0].description,'Lỗi X');assert.equal(setup.issues[0].description,'Lỗi X');
 const p=bulkPayload('inspection',rows);assert.equal(p[0].occurred_at,'2026-10-20T02:30:00.000Z');assert.equal(p.length,2);
 rows[0].include=false;assert.equal(bulkPayload('inspection',rows).length,1);
 rows[1].issues=[];assert.throws(()=>bulkPayload('inspection',rows),/xác nhận/);
 rows[1].clear=true;assert.deepEqual(bulkPayload('inspection',rows)[0].issues,[]);
});

test('revising common content preserves row exceptions and propagates unedited fields',()=>{
 const base=buildBulkRows({...setup,kind:'inspection'});
 const edited=structuredClone(base);
 edited[0].note='Riêng A';edited[0].time='11:00';edited[0].issues[0].description='Mô tả riêng';
 edited[0].issues.push({error_type_id:'z',description:'Lỗi bổ sung'});edited[1].include=false;
 const next=buildBulkRows({...setup,kind:'inspection',note:'Ghi chú chung mới',time:'10:00',issues:[{error_type_id:'x',description:'Mô tả chung mới'},{error_type_id:'y',description:'Mới'}],stores:[...stores,{id:'c',name:'C'}]});
 const merged=reconcileBulkRows(next,edited,base);
 assert.equal(merged[0].note,'Riêng A');assert.equal(merged[0].time,'11:00');
 assert.deepEqual(merged[0].issues.map(i=>i.error_type_id),['x','y','z']);assert.equal(merged[0].issues[0].description,'Mô tả riêng');
 assert.equal(merged[1].note,'Ghi chú chung mới');assert.equal(merged[1].time,'10:00');assert.equal(merged[1].include,false);
 assert.equal(merged[2].note,'Ghi chú chung mới');assert.equal(merged[2].include,true);
 assert.equal(base[0].note,setup.note);
});

test('removed row issue stays removed; existing-result snapshot does not silently refresh',()=>{
 const before={store_id:'a',audit_date:setup.date,shift:1,status:'fail',source:'manual',updated_at:'2026-10-20T01:00:00Z'};
 const base=buildBulkRows({...setup,kind:'hygiene',existing:[before]});
 const edited=structuredClone(base);edited[0].include=true;edited[0].reason='Riêng A';
 const next=buildBulkRows({...setup,kind:'hygiene',status:'pending',existing:[{...before,status:'pass',updated_at:'2026-10-20T02:00:00Z'}]});
 const merged=reconcileBulkRows(next,edited,base);
 assert.equal(merged[0].include,true);assert.equal(merged[0].status,'pending');
 assert.equal(bulkPayload('hygiene',merged)[0].expected_updated_at,before.updated_at);
 const ibase=buildBulkRows({...setup,kind:'inspection'});const iedited=structuredClone(ibase);iedited[0].issues=[];
 assert.deepEqual(reconcileBulkRows(ibase,iedited,ibase)[0].issues,[]);
});
test('multi-shift preview skips existing results; explicit updates carry conflict timestamp',()=>{
 const old={store_id:'a',audit_date:setup.date,shift:1,status:'fail',source:'manual',updated_at:'2026-10-20T01:00:00Z'};
 const legacy={...old,store_id:'b',shift:3,source:'legacy'};
 const rows=buildBulkRows({...setup,kind:'hygiene',existing:[old,legacy]});
 assert.equal(rows.length,4);assert.equal(rows.filter(r=>r.include).length,2);
 rows[0].include=true;const p=bulkPayload('hygiene',rows);assert.equal(p[0].expected_updated_at,old.updated_at);
 rows[3].include=true;assert.throws(()=>bulkPayload('hygiene',rows),/lịch sử/);
 rows[3].include=false;rows[1].status='unavailable';assert.throws(()=>bulkPayload('hygiene',rows),/lý do/);
 rows[1].reason='Không vào được';assert.equal(bulkPayload('hygiene',rows)[1].reason,'Không vào được');
});

