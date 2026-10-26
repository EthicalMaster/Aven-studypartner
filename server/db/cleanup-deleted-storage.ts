import 'dotenv/config';
import {drainStorageDeletions} from '../services/account-deletion.service.js';
import {closePool,getRequiredPool} from './connection.js';
try{await drainStorageDeletions();const row=(await getRequiredPool().query('SELECT COUNT(*)::int AS pending,COUNT(*) FILTER(WHERE attempts>0)::int AS retrying FROM storage_deletion_queue')).rows[0];console.log(row);}catch{console.error('Cleanup unavailable. Check database and storage configuration.');process.exitCode=1;}finally{await closePool();}
