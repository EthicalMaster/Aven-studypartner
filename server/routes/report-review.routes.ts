import {Router} from 'express';
import {z} from 'zod';
import {requireAuth} from '../middleware/auth.middleware.js';
import {getRequiredPool} from '../db/connection.js';
export const reportReviewRouter=Router();reportReviewRouter.use(requireAuth);
function isReviewer(id:string){return (process.env.AVEN_REVIEWER_USER_IDS||'').split(',').map(s=>s.trim()).filter(Boolean).includes(id);}
reportReviewRouter.get('/access',(req,res)=>res.json({allowed:isReviewer(req.user!.id)}));
reportReviewRouter.use((req,res,next)=>{if(!isReviewer(req.user!.id)){res.status(403).json({message:'Report reviewer access required.'});return;}next();});
reportReviewRouter.get('/',async(req,res)=>{
 const parsed=z.coerce.number().int().min(0).max(100000).safeParse(req.query.offset??0);if(!parsed.success){res.status(400).json({message:'Invalid page.'});return;}
 try{const result=await getRequiredPool().query(`SELECT id,reason,note,status,question_snapshot,reviewer_note,updated_at,
   to_char(updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS review_version
   FROM quiz_question_reports ORDER BY updated_at DESC,id LIMIT 50 OFFSET $1`,[parsed.data]);res.json({reports:result.rows});}catch{res.status(503).json({message:'Could not load reports.'});}
});
const reviewSchema=z.object({status:z.enum(['resolved','dismissed','pending_review']),note:z.string().trim().min(5).max(1500),version:z.string().datetime({offset:true})}).strict();
reportReviewRouter.patch('/:id',async(req,res)=>{
 const input=reviewSchema.safeParse(req.body);if(!input.success||!z.string().uuid().safeParse(req.params.id).success){res.status(400).json({message:'Invalid review.'});return;}
 let client;try{client=await getRequiredPool().connect();await client.query('BEGIN');
  const changed=await client.query('UPDATE quiz_question_reports SET status=$2,reviewer_note=$3,reviewed_by=$4,reviewed_at=NOW(),updated_at=NOW() WHERE id=$1 AND updated_at=$5::timestamptz RETURNING id',[req.params.id,input.data.status,input.data.note,req.user!.id,input.data.version]);
  if(!changed.rows.length){await client.query('ROLLBACK');res.status(409).json({message:'Report changed or was removed. Refresh before reviewing.'});return;}
  await client.query('INSERT INTO question_report_review_events(report_id,reviewer_id,status,note) VALUES($1,$2,$3,$4)',[req.params.id,req.user!.id,input.data.status,input.data.note]);await client.query('COMMIT');res.json({success:true});
 }catch{if(client)await client.query('ROLLBACK');res.status(503).json({message:'Could not save the review.'});}finally{client?.release();}
});
