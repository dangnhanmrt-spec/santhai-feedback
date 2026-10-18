import backup from './backup.js';
export default function handler(req,res){req.query={...req.query,action:'cron'};return backup(req,res);}
