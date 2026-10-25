import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {setPoolForTesting} from '../db/connection.js';
import {academicPreferencesService as prefs} from '../services/academic-preferences.service.js';
const db=await PGlite.create();const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
try{
 setPoolForTesting({query:(sql:string,args:any[])=>db.query(sql,args)});
 await db.exec('CREATE TABLE student_profiles(id uuid PRIMARY KEY)');
 await db.exec(readFileSync(new URL('../db/migrations/019_academic_preferences.sql',import.meta.url),'utf8'));
 await db.query('INSERT INTO student_profiles VALUES($1),($2)',[a,b]);
 assert.equal(await prefs.get(a),null);
 await prefs.save(a,{level:'school',authority:'CBSE',stage:'Class 10'});
 assert.equal((await prefs.get(a))?.authority,'CBSE');assert.equal(await prefs.get(b),null);
 await assert.rejects(()=>prefs.save(a,{level:'school',authority:'CBSE',stage:'10',student_id:b}));
 await assert.rejects(()=>prefs.save(a,{level:'school',authority:'CBSE',stage:'10',subject:'Physics'}));
 await prefs.save(a,{level:'university',authority:'Unknown',stage:'Semester 1',program:'BSc'});
 assert.equal((await prefs.get(a))?.level,'university');
 await prefs.clear(b);assert(await prefs.get(a));await prefs.clear(a);assert.equal(await prefs.get(a),null);
 await prefs.save(a,{level:'school',authority:'CBSE',stage:'10'});await db.query('DELETE FROM student_profiles WHERE id=$1',[a]);assert.equal(await prefs.get(a),null);
 console.log('PASS: save/load, isolated students, strict fields, document subject excluded, path replacement, explicit delete, account cascade.');
}finally{setPoolForTesting(null);await db.close();}
