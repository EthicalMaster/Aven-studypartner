# Live bank review — 26 October 2026

Scope: supplied curriculum-bank-export.json, 554 records. No direct production access or changes. All IDs unique. No question-text duplicates after lowercasing and removing punctuation/extra spacing. This is not semantic duplicate detection or factual certification of the full bank.

Inventory: Biology 72, Chemistry 72, Computer Science 72, Data Science 70, English 60, General Aptitude 64, Mathematics 72, Physics 72. Difficulty: easy 158, medium 258, hard 138. Formats: MCQ 233, true/false 73, multiple-select 69, fill-blank 64, short 63, very-short 36, long 16.

A focused content review inspected 18 Physics entries under Units & Measurements, Kinematics and Laws of Motion. Migration 026 corrects three entries only if their previous text still exactly matches this export. It does not overwrite operator edits or modify copied historical quiz questions/results.

- 1f816852-190e-4a92-b1d6-d84aa63ddf5e: explanation incorrectly calls radian/steradian supplementary SI units. BIPM abolished this category in 1995. Correct to dimensionless derived units.
- 38f8d2b7-1fac-4e50-a033-32a8e1f064b9: rocket question asks absolute speed without initial speed. State starts from rest and no external forces; existing answer v_rel ln(2) is then appropriate. Not included in the starter mapping.
- fafb3a9b-997c-4bbe-9aea-bedc9184e0e1: impulse explanation infers peak force from average force. Correct to average force and explain that peak depends on the time profile. Not included in starter mapping.

Sources:
- https://www.bipm.org/en/committees/cg/cgpm/20-1995/resolution-8
- https://cbseacademic.nic.in/curriculum_2027.html
- https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart2/Physics_SecP2_2026-27.pdf

The CBSE PDF has an inconsistent 2025-26 heading on its opening page, but is linked from the official 2026-27 curriculum and its Class XI course structure is labelled 2026-27. Use that version context; do not infer that it is an exam paper.

The ten-question starter manifest maps a conservative subset to Class XI introductory Physics. Remaining questions are not automatically classified by topic name. The manifest contains question IDs, not copies of student records. Review is assistant-assisted; this is practice content, not official questions or guaranteed exam predictions. University and other school collections remain unpopulated pending source/content review.

## Apply

Run npm run db:migrate first. Then validate with:

    npm run curriculum:publish -- server/db/catalog/cbse-11-physics-2026.json

Publish once with:

    npm run curriculum:publish -- server/db/catalog/cbse-11-physics-2026.json --apply

Save the returned context ID. Repeating publication without adding that ID to a manifest fails on the unique context key; it does not replace anything silently. Select School → CBSE → Class 11 → Physics starter. Choose All Topics and Mixed difficulty for the broadest pool; a five-question paper is possible with the default objective formats. Narrow selections can have fewer than five questions.

## Still open

The remaining 536 entries have not received individual factual review in this pass. The catalog is a small starting collection, not full CBSE or university coverage. Live model correctness and full past-paper authenticity remain separate work. Migration and manifest were tested locally; no production publication is claimed.
