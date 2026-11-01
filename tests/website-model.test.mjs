import test from 'node:test';
import assert from 'node:assert/strict';
import {validateStore,changes,methods} from '../src/website/model.js';
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
