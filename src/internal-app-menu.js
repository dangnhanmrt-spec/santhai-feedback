// Public directory only. Each destination retains its existing authentication and authorization.
export const MENU_ENDPOINT = 'https://santhai-feedback.vercel.app/internal-apps.json';
const ORIGINS = new Set(['https://santhai-ceo-dashboard.vercel.app','https://santhai-feedback.vercel.app','https://santhai-gantt.vercel.app']);
export function safeApps(apps) {
  const seen = new Set();
  return (Array.isArray(apps) ? apps : []).filter(app => {
    try {
      const url = new URL(app.href);
      if (app.id === 'ceo' || (url.origin === 'https://santhai-ceo-dashboard.vercel.app' && (url.pathname !== '/kiem-soat-noi-bo' || url.search || url.hash)) || !app.id || typeof app.label !== 'string' || typeof app.group !== 'string' || seen.has(app.id) || !ORIGINS.has(url.origin) || url.protocol !== 'https:' || url.username || url.password) return false;
      seen.add(app.id); return true;
    } catch { return false; }
  });
}

export function mountInternalMenu(host, {currentId, currentLabel, onNavigate}) {
  const doc = host.ownerDocument;
  if (!doc.getElementById('santhai-menu-style')) {
    const style = doc.createElement('style'); style.id = 'santhai-menu-style';
    style.textContent = `
      .santhai-app-switch{display:inline-block;position:relative;flex-shrink:0;font-family:Lexend,Arial,sans-serif;line-height:1.5;color:#e7eef7}
      .santhai-app-switch>summary{box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:8px;height:40px;min-height:40px;padding:0 12px;border:1px solid #405670;border-radius:8px;background:#132237;color:#acbdd0;font-size:13px;font-weight:500;cursor:pointer;list-style:none;white-space:nowrap}
      .santhai-app-switch .santhai-menu-glyph{font-size:18px;line-height:1}.santhai-app-switch .santhai-menu-chevron{font-size:14px;line-height:1;color:#9aaec3;transition:transform .15s}.santhai-app-switch[open] .santhai-menu-chevron{transform:rotate(180deg)}
      .santhai-app-switch>summary::-webkit-details-marker{display:none}
      .santhai-app-switch>summary:hover,.santhai-app-switch[open]>summary{background:#203249;color:#e7eef7;border-color:#69839f}
      .santhai-app-switch>nav{position:fixed;z-index:9999;box-sizing:border-box;padding:8px;border:1px solid #405670;border-radius:11px;background:#142235;box-shadow:0 16px 48px #0008;overflow:auto;overscroll-behavior:contain;max-height:70vh}
      .santhai-app-switch:not([open])>nav{display:none}
      .santhai-app-switch .santhai-menu-group{margin:0;padding:4px 0;border:0;background:none}
      .santhai-app-switch .santhai-menu-group+.santhai-menu-group{margin-top:7px;padding-top:10px;border-top:1px solid #34465e}
      .santhai-app-switch .santhai-menu-group h2{margin:3px 10px 7px;color:#acbdd0;font-size:12px;font-weight:600;line-height:1.5}
      .santhai-app-switch .santhai-menu-item{display:flex;align-items:center;gap:8px;box-sizing:border-box;min-height:43px;margin:0;padding:9px 10px;border:0;border-radius:7px;color:#e7eef7;background:transparent;font-size:13px;font-weight:400;line-height:1.5;text-align:left;text-decoration:none;white-space:normal}
      .santhai-app-switch a.santhai-menu-item:hover{background:#203249}
      .santhai-app-switch .santhai-menu-item[aria-current]{background:#213a53;color:#a9d0f7}
      .santhai-app-switch .santhai-menu-label{flex:1}
      .santhai-app-switch .santhai-menu-hint{flex:none;color:#acbdd0;font-size:11px}
      .santhai-app-switch .santhai-menu-status{margin:8px 10px;color:#acbdd0;font-size:12px;line-height:1.6}
      .santhai-app-switch :focus-visible{outline:2px solid #65cef5;outline-offset:2px}
      @media(max-width:680px){.santhai-app-switch .santhai-menu-caption{display:none}.santhai-app-switch>summary{padding:0 10px}}
      @media print{.santhai-app-switch{display:none}}
    `;
    doc.head.append(style);
  }
  const make = (tag, text, cls) => {const el=doc.createElement(tag);if(text)el.textContent=text;if(cls)el.className=cls;return el;};
  const details = make('details','','santhai-app-switch');
  const summary = make('summary'); summary.setAttribute('aria-label','Ứng dụng nội bộ');
  const glyph=make('span','▦','santhai-menu-glyph');glyph.setAttribute('aria-hidden','true');
  const chevron=make('span','⌄','santhai-menu-chevron');chevron.setAttribute('aria-hidden','true');
  summary.append(glyph,make('span','Ứng dụng','santhai-menu-caption'),chevron);
  const nav = make('nav'); nav.setAttribute('aria-label','Ứng dụng nội bộ');
  details.append(summary,nav); host.replaceChildren(details);
  let disposed=false, sequence=0, controller;
  const position=()=>{const rect=summary.getBoundingClientRect();const width=Math.min(320,window.innerWidth-24);nav.style.width=width+'px';nav.style.left=Math.max(12,Math.min(rect.left,window.innerWidth-width-12))+'px';nav.style.top=(rect.bottom+8)+'px';nav.style.maxHeight=Math.max(120,window.innerHeight-rect.bottom-24)+'px';};
  const render = (apps=[], status='') => {
    nav.replaceChildren();
    const verified = safeApps(apps);
    // The current, already-authenticated screen is a non-clickable location indicator.
    if (!verified.some(app=>app.id===currentId)) verified.unshift({id:currentId,label:currentLabel,group:'Đang xem'});
    const groups = new Map();
    for(const app of verified){
      if(!groups.has(app.group)){const section=make('section','','santhai-menu-group');section.append(make('h2',app.group));groups.set(app.group,section);nav.append(section);}
      const current=app.id===currentId;
      const item=make(current?'span':'a','','santhai-menu-item');
      item.append(make('span',app.label,'santhai-menu-label'),make('span',current?'Đang xem':'↗','santhai-menu-hint'));
      if(current)item.setAttribute('aria-current','page');
      else {item.href=app.href;item.target='_blank';item.rel='noopener noreferrer';item.addEventListener('click',event=>{if(event.button===0&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey&&onNavigate?.(app)===true)event.preventDefault();details.open=false;});}
      groups.get(app.group).append(item);
    }
    if(status){const message=make('p',status,'santhai-menu-status');message.setAttribute('role','status');nav.append(message);}
    position();
  };
  const refresh = async () => {
    const request=++sequence;controller?.abort();controller=new AbortController();
    const activeController=controller;
    render([],'Đang tải danh sách ứng dụng…');
    const timeout=setTimeout(()=>activeController.abort(),9000);
    try {
      if(disposed||request!==sequence)return;
      const response=await fetch(MENU_ENDPOINT,{credentials:'omit',cache:'no-store',signal:activeController.signal,redirect:'error'});
      const payload=await response.json();
      if(!response.ok||payload.ok!==true)throw new Error('Unavailable');
      if(!disposed&&request===sequence)render(payload.apps);
    } catch {if(!disposed&&request===sequence)render([],'Chưa tải được danh sách ứng dụng. Mở lại để thử.');}
    finally {clearTimeout(timeout);}
  };
  const toggle=()=>{if(details.open)void refresh();else{++sequence;controller?.abort();render();}};
  const outside=event=>{if(!details.contains(event.target))details.open=false;};
  const key=event=>{if(event.key==='Escape'&&details.open){details.open=false;summary.focus();}};
  const focus=event=>{if(event.relatedTarget&&!details.contains(event.relatedTarget))details.open=false;};
  const visibility=()=>{if(doc.hidden){details.open=false;render();}};
  details.addEventListener('toggle',toggle);details.addEventListener('focusout',focus);
  doc.addEventListener('click',outside);doc.addEventListener('keydown',key);doc.addEventListener('visibilitychange',visibility);
  window.addEventListener('resize',position);
  const interval=setInterval(()=>{if(details.open)void refresh();},30000);
  render();
  return ()=>{disposed=true;++sequence;controller?.abort();clearInterval(interval);doc.removeEventListener('click',outside);doc.removeEventListener('keydown',key);doc.removeEventListener('visibilitychange',visibility);window.removeEventListener('resize',position);host.replaceChildren();};
}
