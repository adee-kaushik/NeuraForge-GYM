'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
export function MemberRefresh(){
 const router=useRouter();
 useEffect(()=>{let last=Date.now();const refresh=()=>{if(document.visibilityState==='visible'&&Date.now()-last>15000){last=Date.now();router.refresh();}};const timer=setInterval(refresh,30000);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};},[router]);
 return null;
}
