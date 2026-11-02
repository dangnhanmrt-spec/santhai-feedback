import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {safeApps,MENU_ENDPOINT} from '../src/internal-app-menu.js';
const item=(href,id='audit')=>({id,group:'SanThai',label:'Audit',href});

test('directory includes existing employee destinations and excludes CEO',async()=>{
 const catalogue=JSON.parse(await readFile(new URL('../public/internal-apps.json',import.meta.url),'utf8'));
 assert.equal(catalogue.ok,true);
 assert.deepEqual(safeApps(catalogue.apps).map(a=>a.id),['internal','feedback','audit','website','calendar']);
 assert.equal(catalogue.apps.find(a=>a.id==='audit').href,'https://santhai-feedback.vercel.app/#audit');
});
test('CEO root and alternate CEO routes never become employee links',()=>{
 for(const url of ['https://santhai-ceo-dashboard.vercel.app/','https://santhai-ceo-dashboard.vercel.app/?foo=x','https://santhai-ceo-dashboard.vercel.app/index.html','https://santhai-ceo-dashboard.vercel.app/api/dashboard','https://santhai-ceo-dashboard.vercel.app/kiem-soat-noi-bo?redirect=/'])assert.deepEqual(safeApps([item(url)]),[]);
 assert.deepEqual(safeApps([item('https://santhai-feedback.vercel.app/#audit','ceo')]),[]);
 assert.equal(safeApps([item('https://santhai-ceo-dashboard.vercel.app/kiem-soat-noi-bo','internal')]).length,1);
});
test('directory rejects unsafe, foreign, credentialed and duplicate links',()=>{
 for(const url of ['javascript:alert(1)','https://attacker.test/','http://santhai-feedback.vercel.app/','https://user@santhai-feedback.vercel.app/','https://santhai-feedback.vercel.app.attacker.test/'])assert.deepEqual(safeApps([item(url)]),[]);
 assert.equal(safeApps([item('https://santhai-feedback.vercel.app/#audit'),item('https://santhai-feedback.vercel.app/#audit')]).length,1);
 assert.deepEqual(safeApps(null),[]);
});
test('shared public directory has CORS without changing backup configuration',async()=>{
 const cfg=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
 const rule=cfg.headers.find(r=>r.source==='/internal-apps.json');
 assert(rule.headers.some(h=>h.key==='Access-Control-Allow-Origin'&&h.value==='*'));
 assert.equal(cfg.crons[0].path,'/api/backup-cron');
 assert.equal(cfg.functions['api/backup.js'].maxDuration,300);
 assert.equal(MENU_ENDPOINT,'https://santhai-feedback.vercel.app/internal-apps.json');
});
