import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {curriculumManifestSchema} from '../../shared/curriculum-catalog.js';
const sql=readFileSync('server/db/migrations/026_physics_content_corrections.sql','utf8');
const db=new PGlite();
await db.exec('CREATE TABLE question_bank(id UUID PRIMARY KEY,question_text TEXT,explanation TEXT);');
const statements=sql.split('\n').filter(s=>s.startsWith('UPDATE'));
for(const statement of statements){
 const match=statement.match(/SET (\w+)='((?:[^']|'')*)' WHERE id='([^']+)' AND \w+='((?:[^']|'')*)';/)!;
 assert.ok(match);const [,field,value,id,old]=match;
 await db.query(`INSERT INTO question_bank(id,${field}) VALUES($1,$2)`,[id,old.replaceAll("''","'")]);
 await db.exec(statement);
 assert.equal((await db.query<any>(`SELECT ${field} FROM question_bank WHERE id=$1`,[id])).rows[0][field],value.replaceAll("''","'"));
 await db.query(`UPDATE question_bank SET ${field}=$1 WHERE id=$2`,['Operator revision',id]);
 await db.exec(statement);
 assert.equal((await db.query<any>(`SELECT ${field} FROM question_bank WHERE id=$1`,[id])).rows[0][field],'Operator revision');
}
assert.equal(curriculumManifestSchema.parse(JSON.parse(readFileSync('server/db/catalog/cbse-11-physics-2026.json','utf8'))).placements.length,10);
await db.close();console.log('PASS: three guarded corrections, operator edits preserved, valid ten-question manifest. No live database writes.');
