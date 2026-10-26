import React,{useEffect,useState} from 'react';
import {settingsRequest,panelClass} from './settingsApi';
interface Report {id:string;question:string;quiz_title:string;reason:string;note:string;status:string;reviewer_note?:string;updated_at:string}
export function MyQuestionReports(){
 const [reports,setReports]=useState<Report[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{let alive=true;settingsRequest<{reports:Report[]}>('/api/quizzes/reports/mine').then(data=>{if(alive)setReports(data.reports);}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[]);
 return <section className={panelClass} id="reports"><h2 className="text-xl font-semibold">Your question reports</h2><p className="text-sm text-[var(--aven-muted)]">Your latest 50 reports. Reporting saves feedback for review; it does not automatically correct answers or change scores. No review time is promised.</p>
 {loading&&<p role="status">Loading reports…</p>}{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
 {!loading&&!error&&!reports.length&&<p className="text-sm">No reports yet. Use Report an issue beside a question in completed quiz results.</p>}
 <ul className="space-y-3">{reports.map(report=><li key={report.id} className="rounded-xl bg-[var(--aven-canvas)] p-4 text-sm space-y-2 break-words"><p className="font-semibold">{report.question}</p><p className="text-xs text-[var(--aven-muted)]">{report.quiz_title} · {report.status.replaceAll('_',' ')}</p><p>{report.reason.replaceAll('_',' ')}: {report.note}</p>{report.reviewer_note&&<p className="border-t pt-2"><strong>Review response:</strong> {report.reviewer_note}</p>}</li>)}</ul></section>;
}
