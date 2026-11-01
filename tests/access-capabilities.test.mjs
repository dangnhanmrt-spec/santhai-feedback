import test from 'node:test';
import assert from 'node:assert/strict';
import {describeAccount,OWNER_EMAIL} from '../src/access/capabilities.js';
const email='member@example.test';
const get=(module,role,who=email)=>describeAccount(who,[{email:who,module,role}]);
test('permission descriptions do not borrow another account or unknown role',()=>{
 const a=describeAccount(email,[{email:'other@example.test',module:'audit',role:'admin'},{email,module:'website',role:'unexpected'}]);
 assert.ok(a.modules.every(m=>m.role==='none'&&!m.operate.length&&!m.manage.length));
 assert.equal(a.system[0].role,'none');
});
test('Audit editor can enter data but is not described as able to remove or grant',()=>{
 const a=get('audit','editor').modules.find(m=>m.id==='audit');
 assert.ok(a.operate.some(x=>x.includes('hàng loạt')));
 assert.ok(a.operate.every(x=>!x.includes('Xóa')));
 assert.deepEqual(a.manage,[]);
 const admin=get('audit','admin').modules.find(m=>m.id==='audit');
 assert.ok(admin.operate.some(x=>x.includes('Xóa')));
 assert.ok(admin.manage.some(x=>x.includes('trừ chủ hệ thống')));
});
test('Feedback admin store management is distinct from owner-only grants',()=>{
 const member=get('feedback','admin').modules[0];
 assert.ok(member.manage.some(x=>x.includes('cửa hàng nội bộ')));
 assert.ok(member.manage.every(x=>!x.includes('quyền Feedback')));
 const owner=get('feedback','admin',OWNER_EMAIL).modules[0];
 assert.ok(owner.manage.some(x=>x.includes('quyền Feedback')));
});
test('Website admin and editor can edit content but only owner manages grants',()=>{
 for(const role of ['editor','admin']){
  const a=get('website',role).modules[2];
  assert.ok(a.operate.some(x=>x.includes('menu')));assert.deepEqual(a.manage,[]);
 }
 assert.deepEqual(get('website','viewer').modules[2].operate,[]);
 assert.ok(get('website','viewer',OWNER_EMAIL).modules[2].manage.some(x=>x.includes('quyền Website')));
});
test('shared overview follows module access; backup remains exclusive to owner',()=>{
 const a=get('audit','viewer');assert.equal(a.system[0].role,'viewer');assert.equal(a.system[1].role,'none');
 const owner=describeAccount(OWNER_EMAIL);assert.equal(owner.system[1].role,'admin');
 assert.ok(owner.modules.every(m=>m.role==='none'));
});
