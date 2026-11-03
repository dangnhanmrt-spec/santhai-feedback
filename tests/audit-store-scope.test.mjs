import test from 'node:test';
import assert from 'node:assert/strict';
import {feedbackStoreCandidates,inAuditScope,normalizeStoreName,reportStores} from '../src/audit/storeScope.js';
import {summarize} from '../src/audit/metrics.js';
import {describeActivity} from '../src/audit/activity.js';
test('scope stays independent of Feedback active status and excludes historical labels',()=>{
 assert.equal(inAuditScope({in_scope:true,active:false}),true);
 assert.equal(inAuditScope({in_scope:false,active:true}),false);
 assert.equal(inAuditScope({in_scope:true,historical_only:true}),false);
 assert.equal(inAuditScope(undefined),false);
});
test('hidden stores stay outside report denominators but remain available in history',()=>{
 const stores=[{id:'a',in_scope:true},{id:'b',in_scope:false},{id:'h',in_scope:false,historical_only:true}];
 const scope=reportStores(stores);
 assert.deepEqual(scope.map(s=>s.id),['a']);
 assert.deepEqual(reportStores(stores,{includeHidden:true}).map(s=>s.id),['a']);
 assert.equal(reportStores(stores,{history:true,includeHidden:true}).length,3);
 assert.equal(summarize(scope,[],[],[]).unchecked,1);
 assert.equal(stores.length,3);
});
test('add choices preserve Feedback ids and do not create duplicate or historical mappings',()=>{
 assert.deepEqual(feedbackStoreCandidates([{id:'f1',name:'One'},{id:'f2',name:'Two'},{id:'f3',name:'Three'}],[{id:'a1',current_store_id:'f1'},{id:'f2'}]),[{id:'f3',name:'Three'}]);
 assert.equal(normalizeStoreName('  Mỹ Xuyên Đường  '),'my xuyen duong');
});
test('scope journal describes explicit before and after without deleting history',()=>{
 const log={entity:'audit_stores',action:'UPDATE',details:{before:{id:'s',in_scope:true},after:{id:'s',name:'Cửa hàng',in_scope:false}}};
 const result=describeActivity(log,{s:{name:'Cửa hàng'}});
 assert.equal(result.label,'Ẩn cửa hàng khỏi Audit');
 assert.equal(result.storeName,'Cửa hàng');assert.equal(result.removed,false);
 assert.ok(result.lines.some(x=>x.includes('giữ nguyên lịch sử')));
});
