'use client';
import {useEffect} from 'react';
export function PwaRegistration(){useEffect(()=>{
  // Icon font is decorative: fetch after hydration instead of blocking the first paint.
  if (!document.querySelector('link[data-nf-symbols]')) {
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.dataset.nfSymbols = 'true';
    link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@400&display=swap';
    document.head.appendChild(link);
  }
if(process.env.NODE_ENV!=='production'||!('serviceWorker' in navigator))return;const register=()=>{navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).catch(()=>{});};if(document.readyState==='complete')register();else window.addEventListener('load',register,{once:true});return()=>window.removeEventListener('load',register);},[]);return null;}
