import React,{useEffect,useState} from 'react';
type Usage={registeredAccounts:number;aiAccounts:number;active30Days:number;trackingStartedAt:string};
export function PublicUsage(){
 const [usage,setUsage]=useState<Usage|null>(null);
 useEffect(()=>{const controller=new AbortController();fetch('/api/public/usage',{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error();const d=await r.json();if(['registeredAccounts','aiAccounts','active30Days'].every(k=>Number.isSafeInteger(d[k])&&d[k]>=0))setUsage(d);}).catch(()=>{});return()=>controller.abort();},[]);
 if(!usage)return null;
 return <section className="aven-section" aria-label="Aven community activity"><p className="aven-eyebrow">A growing study community</p><h2>Every study journey starts somewhere.</h2><dl style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:24,margin:'28px 0'}}>
 {[[usage.registeredAccounts,'Registered accounts'],[usage.aiAccounts,'Accounts with an AI response'],[usage.active30Days,'Active learners in 30 days']].map(([count,label])=><div key={label}><dd style={{fontSize:40,fontWeight:600,margin:0}}>{Number(count).toLocaleString()}</dd><dt>{label}</dt></div>)}</dl>
 <p style={{fontSize:13,maxWidth:760}}>Real account counts, not visitor estimates. AI responses are counted from {new Date(usage.trackingStartedAt).toLocaleDateString()} and do not measure learning outcomes. Anonymous cumulative totals remain after account deletion. Activity reflects signed-in sessions; totals may update with a short delay.</p></section>;
}
