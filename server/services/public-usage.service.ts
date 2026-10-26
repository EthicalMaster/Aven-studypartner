import {getRequiredPool} from '../db/connection.js';
export async function recordAiAccount(studentId:string){
 // INSERT SELECT avoids restoring an identity if deletion won the race.
 await getRequiredPool().query('INSERT INTO account_ai_usage(student_id) SELECT id FROM student_profiles WHERE id=$1 ON CONFLICT DO NOTHING',[studentId]);
}
export async function publicUsage(){
 const row=(await getRequiredPool().query(`SELECT registered_accounts,ai_accounts,tracking_started_at,
 (SELECT COUNT(DISTINCT s.user_id) FROM user_sessions s JOIN users u ON u.id=s.user_id WHERE u.is_active AND s.last_seen_at>NOW()-INTERVAL '30 days') AS active_30_days
 FROM public_usage_totals WHERE singleton`)).rows[0];
 if(!row)throw Error('Usage tracking unavailable');
 return {registeredAccounts:Number(row.registered_accounts),aiAccounts:Number(row.ai_accounts),active30Days:Number(row.active_30_days),trackingStartedAt:row.tracking_started_at};
}
