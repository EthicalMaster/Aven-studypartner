export async function settingsRequest<T>(url:string,method='GET',body?:unknown):Promise<T>{
 const response=await fetch(url,{method,credentials:'include',headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.message||'Could not complete this request. Try again.');
 return data as T;
}
export const fieldClass='mt-1 w-full rounded-xl border border-[var(--aven-border)] bg-[var(--aven-canvas)] p-3 text-sm';
export const actionClass='rounded-xl bg-[var(--aven-action)] text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50';
export const panelClass='rounded-3xl border border-[var(--aven-border)] bg-[var(--aven-surface)] p-5 sm:p-6 space-y-4';
