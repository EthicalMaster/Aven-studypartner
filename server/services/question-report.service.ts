import {getRequiredPool} from '../db/connection.js';
import {questionReportSchema} from '../../shared/question-report.js';
import {AIGatewayError} from './ai/errors.js';
export const questionReportService={
 async save(studentId:string,input:unknown){
  const data=questionReportSchema.parse(input);
  const result=await getRequiredPool().query(`INSERT INTO quiz_question_reports(student_id,question_id,session_id,reason,note,question_snapshot)
   SELECT $1,q.id,s.id,$4,$5,jsonb_build_object('question',q.question_text,'options',q.options,'correct_option_ids',q.correct_option_ids,'explanation',q.explanation)
   FROM quiz_questions q JOIN quizzes owned ON owned.id=q.quiz_id AND owned.student_id=$1 JOIN quiz_sessions s ON s.quiz_id=q.quiz_id JOIN quiz_results r ON r.session_id=s.id AND r.student_id=$1
   WHERE q.id=$2 AND s.id=$3 AND s.student_id=$1 AND s.status IN ('submitted','auto_submitted','expired')
   ON CONFLICT(student_id,question_id) DO UPDATE SET reason=EXCLUDED.reason,note=EXCLUDED.note,status='pending_review',reviewer_note=NULL,reviewed_by=NULL,reviewed_at=NULL,updated_at=NOW()
   RETURNING id,status,created_at,updated_at`,[studentId,data.questionId,data.sessionId,data.reason,data.note]);
  if(!result.rows[0])throw new AIGatewayError('QUESTION_UNAVAILABLE',404,'Report a question from one of your completed quiz results.');
  return result.rows[0];
 },
 async list(studentId:string){
  const result=await getRequiredPool().query(`SELECT r.id,r.reason,r.note,r.status,r.created_at,r.updated_at,r.reviewer_note,
   r.question_snapshot->>'question' AS question,q.title AS quiz_title
   FROM quiz_question_reports r JOIN quiz_questions qq ON qq.id=r.question_id JOIN quizzes q ON q.id=qq.quiz_id
   WHERE r.student_id=$1 ORDER BY r.updated_at DESC LIMIT 50`,[studentId]);return result.rows;
 }
};
