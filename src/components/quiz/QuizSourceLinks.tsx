import React,{useEffect,useState} from 'react';
export function QuizSourceLinks({quizId}:{quizId:string}) {
  const [sources,setSources]=useState<{title:string;url:string;host:string}[]>([]);
  const [error,setError]=useState('');
  useEffect(()=>{
    const abort=new AbortController();setSources([]);setError('');
    fetch(`/api/quizzes/${quizId}/research`,{credentials:'include',signal:abort.signal}).then(async response=>{
      if(!response.ok)throw new Error();return response.json();
    }).then(data=>{if(!abort.signal.aborted)setSources(data.sources||[]);}).catch(()=>{if(!abort.signal.aborted)setError('Source links could not be loaded. You can still open the saved practice paper.');});
    return()=>abort.abort();
  },[quizId]);
  if(error)return <p className="text-sm text-[var(--aven-muted)] p-4">{error}</p>;
  if(!sources.length)return null;
  return <aside className="p-6 border-b border-[var(--aven-border)] text-sm space-y-2"><h3 className="font-semibold">Sources you reviewed</h3>
    <p className="text-[var(--aven-muted)]">Selected search candidates informed style only. They are not independently verified; this quiz is generated PDF practice.</p>
    <ul className="space-y-2">{sources.map(source=><li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className="underline text-[var(--aven-action)] break-words">{source.title} ↗</a><span className="block text-xs">{source.host}</span></li>)}</ul>
  </aside>;
}
