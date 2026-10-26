import {getRequiredPool} from '../db/connection.js';
export const accountSessionsService={
 async list(userId:string,currentHash:string){
  const result=await getRequiredPool().query(`SELECT id,LEFT(COALESCE(user_agent,'Unknown browser'),160) AS browser,
    created_at,last_seen_at,expires_at,(session_token_hash=$2) AS current
    FROM user_sessions WHERE user_id=$1 AND revoked_at IS NULL AND expires_at>NOW()
    ORDER BY (session_token_hash=$2) DESC,last_seen_at DESC LIMIT 20`,[userId,currentHash]);return result.rows;
 },
 async revokeOthers(userId:string,currentHash:string){
  const result=await getRequiredPool().query(`UPDATE user_sessions SET revoked_at=NOW()
    WHERE user_id=$1 AND session_token_hash<>$2 AND revoked_at IS NULL AND expires_at>NOW()
    RETURNING id`,[userId,currentHash]);return result.rows.length;
 }
};
