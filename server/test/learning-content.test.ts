import assert from 'node:assert/strict';
import {selectPassages,validateCards} from '../services/learning-content/flashcards.js';
const pages=Array.from({length:10},(_,i)=>({page_number:i+1,text:`SCHOOL NOTES\nUnit ${i+1}\nConcept ${i}: Energy can transfer between objects through work and heat. In a closed system total energy is conserved, although it can change form.\nDepartment of Science\nPage ${i+1}`}));
const selected=selectPassages(pages);assert.equal(selected.length,6);assert.equal(selected[0].page,1);assert.equal(selected.at(-1)!.page,10);
assert(selected.every(p=>!p.text.includes('SCHOOL NOTES')&&!p.text.includes('Department of Science')&&!p.text.includes('Unit ')));
assert.equal(selectPassages([{page_number:1,text:'UNIT 2\nPage 1'}]).length,0);
assert(selected.reduce((n,p)=>n+p.text.length,0)<=6000);
const card={question:'What happens to energy in a closed system?',answer:'Total energy is conserved, although it can change form.',keyConcept:'Energy conservation',formula:'',difficulty:'easy',sourceId:selected[0].id,evidence:'In a closed system total energy is conserved, although it can change form.'};
assert.equal(validateCards({flashcards:[card]},selected).length,1);
assert.equal(validateCards({flashcards:[card,card]},selected).length,1);
assert.throws(()=>validateCards({flashcards:[{...card,evidence:'An invented supporting quote that does not exist.'}]},selected));
assert.throws(()=>validateCards({flashcards:[{...card,question:'What is Unit 2 about?'}]},selected));
console.log('PASS: distributed coverage, page-furniture removal, sparse rejection, input budget, exact evidence, duplicate and vague-question rejection.');

// Short evidence can be a complete formula or factual statement.
const formulaPassage=[{id:'formula',page:2,text:'Newton’s second law is F = ma. Here F is force, m is mass and a is acceleration.'}];
const shortCard={...card,question:'What formula expresses Newton’s second law?',answer:'F = ma, where force equals mass times acceleration.',sourceId:'formula',evidence:'F = ma.'};
assert.equal(validateCards({flashcards:[shortCard]},formulaPassage).length,1);
for(const evidence of ['', '   ', 'F = mv.', 'x'.repeat(801)])assert.throws(()=>validateCards({flashcards:[{...shortCard,evidence}]},formulaPassage));
assert.throws(()=>validateCards({flashcards:[{...shortCard,sourceId:'missing'}]},formulaPassage));
console.log('PASS: short supported evidence accepted; empty, whitespace, invented, oversized and wrong-source evidence rejected.');

const {validateCardBatch,evidenceMatches}=await import('../services/learning-content/flashcards.js');
const physics=[{id:'physics',page:1,text:'Inside a conductor at electrostatic equilibrium, the electric field is Zero. The answer is 0. The relationship is E = −∇V, not E = ∇V. Newton’s law: F = ma. The ratio is x²/y, not x2/y.'}];
const zero={...card,question:'What is the electric field inside a conductor at equilibrium?',answer:'Zero',sourceId:'physics',evidence:'the electric field is Zero.'};
assert.equal(validateCards({flashcards:[zero]},physics)[0].answer,'Zero');
assert.equal(validateCards({flashcards:[{...zero,answer:'0',evidence:'The answer is 0.'}]},physics)[0].answer,'0');
const mixed=validateCardBatch({flashcards:[zero,{...zero,question:'What unrelated fact was given?',evidence:'An invented quotation.'},{...zero,answer:'   '},zero]},physics);
assert.equal(mixed.cards.length,1);assert.equal(mixed.rejectedCount,3);
assert(evidenceMatches('Newton’s law:\n F = ma.',"Newton's law: F = ma."));
assert(!evidenceMatches('E = −∇V','E = ∇V'));
assert(!evidenceMatches('x²/y','x2/y'));
assert(!evidenceMatches('E = F/q','e = F/q'));
assert(!evidenceMatches('100','0'));
assert(!evidenceMatches('concatenate','cat'));
assert.throws(()=>validateCardBatch({flashcards:[{...zero,evidence:'Unrelated quote.'},{...zero,answer:''}]},physics),/None of the generated cards/);
assert.throws(()=>validateCardBatch({flashcards:Array(7).fill(zero)},physics));
console.log('PASS: Zero/numeric answers, partial batch retained, exact rejection counts, typography tolerance, math signs/case/exponents preserved, token boundaries and all-invalid handling.');
