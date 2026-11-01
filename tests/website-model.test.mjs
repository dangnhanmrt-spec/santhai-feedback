import test from 'node:test';
import assert from 'node:assert/strict';
import {validateStore,changes,methods,historyQuery} from '../src/website/model.js';
const valid={name:'Cửa hàng mẫu',region:'ĐÀ NẴNG',address:'132 Lê Đình Dương',maps_url:'https://maps.app.goo.gl/example',plus_code:'',lat:16.062,lng:108.217,delivery:true,pickup:true,phone:'0901 000 988',apps:[{name:'247',note:'Không nhận đơn sau 19:30'}],menu_group:'central',visible:true};
test('public profile retains hotline, app notes and explicit menu group',()=>{
 const d=validateStore(valid);assert.equal(d.apps[0].note,'Không nhận đơn sau 19:30');assert.equal(d.menu_group,'central');assert.equal(d.phone,'0901 000 988');assert.deepEqual(methods(d),['Giao tận nơi','Đặt trước, ghé lấy','Hotline cửa hàng','247']);
});
test('invalid coordinates and unsafe Maps links cannot be saved',()=>{
 const d=valid;
 for(const fields of [{lat:''},{lng:NaN},{lat:99},{maps_url:'javascript:alert(1)'},{phone:'abc'},{apps:[{name:'',note:''}]}])assert.throws(()=>validateStore({...d,...fields}));
});
test('visibility changes are explicit and journals show before and after',()=>{
 const d=valid;const diffs=changes({before_data:{data:d},after_data:{data:{...d,visible:!d.visible}}});assert.deepEqual(diffs,[{key:'visible',label:'Hiển thị website',before:d.visible,after:!d.visible}]);
 assert.deepEqual(methods({...d,delivery:false,pickup:false,phone:'',apps:[]}),[]);
});

test('history date filters include the entire Vietnam day, not the UTC day',()=>{
 const calls=[];const request={gte:(...args)=>{calls.push(['gte',...args]);return request;},lt:(...args)=>{calls.push(['lt',...args]);return request;}};
 historyQuery(request,{from:'2026-11-02',to:'2026-11-02'});
 const start=Date.parse(calls[0][2]),end=Date.parse(calls[1][2]);
 assert.equal(start,Date.parse('2026-11-01T17:00:00Z'));
 assert.equal(end,Date.parse('2026-11-02T17:00:00Z'));
 assert.equal(end-start,24*60*60*1000);
 for(const [stamp,included] of [['2026-11-01T16:59:59Z',false],['2026-11-01T17:00:00Z',true],['2026-11-02T16:59:59Z',true],['2026-11-02T17:00:00Z',false]])assert.equal(Date.parse(stamp)>=start&&Date.parse(stamp)<end,included);
});

test('history combines exact object filters with literal actor text',()=>{
 const calls=[];const request={eq:(...args)=>{calls.push(['eq',...args]);return request;},ilike:(...args)=>{calls.push(['ilike',...args]);return request;}};
 assert.equal(historyQuery(request,{entity:'website_store_profiles',entityId:'store-id',actor:' a_b%test@example.com '}),request);
 assert.deepEqual(calls,[['eq','entity','website_store_profiles'],['eq','entity_id','store-id'],['ilike','actor_email','%a\\_b\\%test@example.com%']]);
 assert.equal(historyQuery(request,{}),request);
});
