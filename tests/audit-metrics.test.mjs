import test from 'node:test';
import assert from 'node:assert/strict';
import {addDays,monday,periodFor,summarize,vietnamDate} from '../src/audit/metrics.js';
import {safeEqual,validateSnapshot} from '../server/backup-core.js';
test('one visit with three issues is one violation; clean visits count in rate; legacy excluded',()=>{
 const stores=[{id:'a',active:true},{id:'b',active:true}];
 const inspections=[{id:'1',store_id:'a',source:'manual',counted_for_rate:true,audit_violations:[{error_type_id:'x'},{error_type_id:'x'},{error_type_id:'y'}]},
 {id:'2',store_id:'a',source:'manual',counted_for_rate:true,audit_violations:[]},
 {id:'3',store_id:'a',source:'legacy',counted_for_rate:false,audit_violations:[{error_type_id:'x'}]}];
 const result=summarize(stores,inspections,[],[]);assert.equal(result.totals.eligible,2);assert.equal(result.totals.violating,1);assert.equal(result.totals.issues,4);assert.equal(result.rows[0].rate,.5);assert.equal(result.rows[1].rate,null);assert.equal(result.unchecked,1);assert.equal(result.repeats[0].count,2);
});
test('hygiene excludes pending, unavailable and not submitted from pass rate',()=>{
 const hygiene=['pass','pass','fail','pending','not_submitted','unavailable'].map((status,id)=>({id,store_id:'a',status}));const s=summarize([{id:'a',active:true}],[],hygiene);
 assert.equal(s.totals.pass,2);assert.equal(s.totals.fail,1);assert.equal(s.rows[0].eligible,0);
});
test('Vietnam day boundary, Monday week and month rollover',()=>{
 assert.equal(vietnamDate('2026-10-18T17:01:00Z'),'2026-10-19');assert.equal(monday('2026-10-18'),'2026-10-12');assert.equal(addDays('2026-12-31',1),'2027-01-01');assert.deepEqual(periodFor('month','2026-02-17'),{start:'2026-02-01',end:'2026-02-28'});
});
test('backup validation rejects another project, unknown tables and duplicate IDs',()=>{
 const valid={project_ref:'stxymyjwxdtfxkvmsgmz',format_version:2,tables:{feedbacks:[{id:'1',note:null}]}};assert.deepEqual(validateSnapshot(valid),{feedbacks:1});
 assert.throws(()=>validateSnapshot({...valid,project_ref:'other'}));assert.throws(()=>validateSnapshot({...valid,tables:{feedbacks:[],spin_records:[]}}));assert.throws(()=>validateSnapshot({...valid,tables:{feedbacks:[{id:'1'},{id:'1'}]}}));
 assert.equal(safeEqual('abc','abc'),true);assert.equal(safeEqual('abc','ab'),false);assert.equal(safeEqual(undefined,undefined),false);
});

test('removed issues and inspections never affect rates, popular errors or repeat counts',()=>{
 const stores=[{id:'a',active:true},{id:'b',active:true}];
 const inspections=[
 {id:'gone',store_id:'b',source:'manual',counted_for_rate:true,deleted_at:'2026-10-20',audit_violations:[{error_type_id:'x'}]},
 {id:'active',store_id:'a',source:'manual',counted_for_rate:true,audit_violations:[{error_type_id:'x',deleted_at:'2026-10-20'},{error_type_id:'y'}]},
 {id:'clean',store_id:'a',source:'manual',counted_for_rate:true,audit_violations:[]}
 ];
 const result=summarize(stores,inspections,[],[{id:'x',name:'Removed'},{id:'y',name:'Active'}]);
 assert.equal(result.totals.issues,1);assert.equal(result.totals.eligible,2);assert.equal(result.totals.violating,1);
 assert.equal(result.rows[0].rate,.5);assert.equal(result.rows[1].inspections,0);assert.equal(result.unchecked,1);
 assert.deepEqual(result.popular,[{id:'y',name:'Active',count:1}]);assert.deepEqual(result.repeats,[]);
 assert.equal(inspections[1].audit_violations.length,2,'statistics must not mutate backup/source data');
});
