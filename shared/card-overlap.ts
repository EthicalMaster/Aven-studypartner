// A review hint, never semantic verification or an automatic rejection.
export function similarCardPairs(cards:{question:string;answer:string}[]):[number,number][]{
 const words=(s:string)=>new Set(s.normalize('NFC').toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]);
 const result:[number,number][]=[];
 const sets=cards.map(c=>words(`${c.question} ${c.answer}`));
 for(let i=0;i<sets.length;i++)for(let j=i+1;j<sets.length;j++){
  const a=sets[i],b=sets[j];if(a.size<5||b.size<5)continue;
  const intersection=[...a].filter(w=>b.has(w)).length;
  if(intersection/(a.size+b.size-intersection)>=0.8)result.push([i,j]);
 }
 return result;
}
