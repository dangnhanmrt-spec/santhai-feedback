import {useEffect,useRef} from 'react';
import {mountInternalMenu} from './internal-app-menu.js';

export default function InternalApps({currentId,currentLabel,onNavigate,identity}){
  const host=useRef(null);
  const navigate=useRef(onNavigate);navigate.current=onNavigate;
  useEffect(()=>mountInternalMenu(host.current,{
    currentId,currentLabel,
    onNavigate:app=>navigate.current?.(app),
  }),[currentId,currentLabel,identity]);
  return <span ref={host} style={{display:'inline-flex',flexShrink:0}}/>;
}
