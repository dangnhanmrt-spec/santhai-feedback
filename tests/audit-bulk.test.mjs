import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBulkRows,bulkPayload} from '../src/audit/bulk.js';
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
