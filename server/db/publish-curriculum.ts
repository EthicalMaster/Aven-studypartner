import 'dotenv/config';
import {readFileSync} from 'node:fs';
import {curriculumCatalogService} from '../services/curriculum-catalog.service.js';
import {closePool} from './connection.js';
const file=process.argv[2];
try{if(!file||file.startsWith('--'))throw new Error('Provide a reviewed JSON manifest. Default mode is validation only; --apply publishes it.');
 const result=await curriculumCatalogService.publish(JSON.parse(readFileSync(file,'utf8')),process.argv.includes('--apply'));console.log(JSON.stringify(result));
}catch(error){console.error(error instanceof Error?error.message:'Publication failed');process.exitCode=1;}finally{await closePool();}
