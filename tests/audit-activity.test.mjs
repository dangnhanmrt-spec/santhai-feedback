import test from 'node:test';
import assert from 'node:assert/strict';
import {describeActivity} from '../src/audit/activity.js';
const stores={a:{name:'Cửa hàng A'}};const categories={x:'Lỗi X',y:'Lỗi Y'};
test('deleting one issue shows only that issue and retained inspection context',()=>{
 const log={action:'REMOVE_VIOLATION',entity:'audit_violations',entity_id:'v2',details:{reason:null,inspection_before:{store_id:'a',audit_date:'2026-10-20'},violations_before:[{id:'v1',error_type_id:'x'},{id:'v2',error_type_id:'y',description:'nhập nhầm'}],inspection_removed:false}};
 const r=describeActivity(log,stores,categories);assert.equal(r.label,'Xóa lỗi');assert.equal(r.storeName,'Cửa hàng A');assert.deepEqual(r.lines,['Lỗi Y — nhập nhầm']);assert.equal(r.reason,'Không nhập lý do');assert.equal(r.date,'2026-10-20');
});
test('insert logs without issue snapshots never claim a clean inspection',()=>{
 const r=describeActivity({action:'INSERT',entity:'audit_inspections',details:{after:{store_id:'a',source:'manual',note:'ghi chú'}}},stores,categories);
 assert.deepEqual(r.lines,['Ghi nhận lượt kiểm tra','ghi chú']);assert.equal(r.label,'Thêm lượt kiểm tra');assert.equal(r.removed,false);
});
test('hygiene edits show stored before/after; issue adds use stored name/context',()=>{
 const h=describeActivity({action:'UPDATE',entity:'audit_hygiene',details:{before:{status:'pending'},after:{store_id:'a',shift:2,status:'fail'}}},stores);
 assert.deepEqual(h.lines,['Ca 2 · Chờ kiểm tra → Không đạt']);
 const v=describeActivity({action:'INSERT',entity:'audit_violations',details:{inspection:{store_id:'a',audit_date:'2026-10-20'},error_type_name:'Tên lúc ghi nhận',after:{error_type_id:'x',description:'chi tiết'}}},stores,categories);
 assert.deepEqual(v.lines,['Tên lúc ghi nhận — chi tiết']);assert.equal(v.storeName,'Cửa hàng A');
});
