/** SanThai Feedback/Audit backup receiver. Daily schedule belongs to Vercel Cron. */
function backupSetup() {
 var p=PropertiesService.getScriptProperties();
 if(!p.getProperty('BACKUP_BRIDGE_SECRET'))throw new Error('Chưa cài BACKUP_BRIDGE_SECRET trong Thuộc tính tập lệnh.');
 var folder=DriveApp.getFolderById('1ajGdKihv-eoSLRbyDplmxTV9so83jPj5');
 console.log('Đã kiểm tra thư mục: '+folder.getName());
 SpreadsheetApp.getActiveSpreadsheet();
}
function doGet(){return ContentService.createTextOutput(JSON.stringify({ok:true,service:'SanThai backup bridge'})).setMimeType(ContentService.MimeType.JSON);}
function doPost(e){
 try{
  var request=JSON.parse(e.postData.contents);var secret=PropertiesService.getScriptProperties().getProperty('BACKUP_BRIDGE_SECRET');
  if(!secret||!request.message||!request.signature)throw new Error('Unauthorized');
  var signature=backupHex_(Utilities.computeHmacSha256Signature(request.message,secret));
  if(!backupEqual_(signature,request.signature))throw new Error('Unauthorized');
  var msg=JSON.parse(request.message);
  if(Math.abs(Date.now()-msg.timestamp)>300000||!/^[a-f0-9-]{36}$/.test(msg.nonce))throw new Error('Expired request');
  var lock=LockService.getScriptLock();if(!lock.tryLock(2000))throw new Error('Một lượt backup khác đang chạy');
  try{
   var cache=CacheService.getScriptCache();if(cache.get(msg.nonce))throw new Error('Duplicate request');cache.put(msg.nonce,'1',600);
   var result=msg.action==='save'?backupSave_(msg.payload):msg.action==='read'?backupRead_(msg.payload):null;
   if(!result)throw new Error('Unknown action');return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }finally{lock.releaseLock();}
 }catch(err){return ContentService.createTextOutput(JSON.stringify({ok:false,error:String(err.message||err)})).setMimeType(ContentService.MimeType.JSON);}
}
function backupHex_(bytes){return bytes.map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');}
function backupEqual_(a,b){if(typeof b!=='string'||a.length!==b.length)return false;var n=0;for(var i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0;}
function backupSave_(p){
 if(!/^[a-f0-9-]{36}$/.test(p.id))throw new Error('Invalid backup id');
 var raw=Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(p.compressed),'application/gzip')).getDataAsString('UTF-8');
 var checksum=backupHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,raw,Utilities.Charset.UTF_8));
 if(checksum!==p.checksum)throw new Error('Checksum mismatch');
 var data=JSON.parse(raw);if(data.project_ref!=='stxymyjwxdtfxkvmsgmz'||data.format_version!==2)throw new Error('Invalid snapshot');
 var folder=DriveApp.getFolderById('1ajGdKihv-eoSLRbyDplmxTV9so83jPj5');
 var stamp=Utilities.formatDate(new Date(data.snapshot_at),'Asia/Ho_Chi_Minh','yyyy-MM-dd HH-mm-ss');
 var name='SanThai Feedback Audit - Backup '+stamp+' - '+p.id;
 var ss=SpreadsheetApp.create(name);ss.setSpreadsheetTimeZone('Asia/Ho_Chi_Minh');ss.setSpreadsheetLocale('vi_VN');
 DriveApp.getFileById(ss.getId()).moveTo(folder);
 var info=ss.getSheets()[0];info.setName('Thong_tin');info.getRange('A1:B6').setValues([
  ['Mục','Giá trị'],['Thời điểm UTC',data.snapshot_at],['Checksum SHA-256',checksum],['Snapshot ID',p.id],['Phạm vi','Feedback và Audit nội bộ'],['Khôi phục','Dùng bản JSON.GZ cùng thư mục; không sửa bản backup.']]);
 info.getRange('A1:B1').setBackground('#eeeeee').setFontWeight('bold');info.setColumnWidth(1,180);info.setColumnWidth(2,600);info.getRange('A1:B6').setWrap(true);
 var counts={};var names=Object.keys(data.tables);
 for(var ti=0;ti<names.length;ti++){
  var table=names[ti];var records=data.tables[table];if(records.length!==p.counts[table])throw new Error('Row count mismatch: '+table);
  var cols=(data.columns||[]).filter(function(c){return c.table_name===table;}).sort(function(a,b){return a.ordinal_position-b.ordinal_position;}).map(function(c){return c.column_name;});
  if(!cols.length&&records.length)cols=Object.keys(records[0]);
  var headers=cols.concat('_row_json');var sheet=ss.insertSheet(table);
  if(sheet.getMaxRows()<records.length+1)sheet.insertRowsAfter(sheet.getMaxRows(),records.length+1-sheet.getMaxRows());
  if(sheet.getMaxColumns()<headers.length)sheet.insertColumnsAfter(sheet.getMaxColumns(),headers.length-sheet.getMaxColumns());
  sheet.getRange(1,1,1,headers.length).setValues([headers]).setBackground('#eeeeee').setFontWeight('bold');sheet.setFrozenRows(1);
  for(var off=0;off<records.length;off+=500){
   var chunk=records.slice(off,off+500).map(function(r){return cols.map(function(c){var v=r[c];if(v===null||v===undefined)return '';if(typeof v==='object')return JSON.stringify(v);if(typeof v==='string'&&/^[=+@]/.test(v))return "'"+v;return v;}).concat(JSON.stringify(r));});
   sheet.getRange(off+2,1,chunk.length,headers.length).setNumberFormat('@').setValues(chunk);
  }
  SpreadsheetApp.flush();
  for(var check=0;check<records.length;check+=1000){var saved=sheet.getRange(check+2,headers.length,Math.min(1000,records.length-check),1).getValues();for(var j=0;j<saved.length;j++)if(saved[j][0]!==JSON.stringify(records[check+j]))throw new Error('Verification failed: '+table+' row '+(check+j));}
  counts[table]=records.length;sheet.setColumnWidths(1,headers.length,170);sheet.setColumnWidth(headers.length,550);
 }
 var archive=folder.createFile(Utilities.newBlob(Utilities.base64Decode(p.compressed),'application/gzip','SanThai_Backup_'+p.id+'.json.gz'));
 return {ok:true,checksum:checksum,counts:counts,sheetUrl:ss.getUrl(),archiveUrl:archive.getUrl()};
}
function backupRead_(p){
 if(!/^[a-f0-9-]{36}$/.test(p.id))throw new Error('Invalid backup id');
 var files=DriveApp.getFolderById('1ajGdKihv-eoSLRbyDplmxTV9so83jPj5').getFilesByName('SanThai_Backup_'+p.id+'.json.gz');
 if(!files.hasNext())throw new Error('Không tìm thấy dữ liệu gốc trong thư mục backup');
 var file=files.next();return {ok:true,compressed:Utilities.base64Encode(file.getBlob().getBytes())};
}
