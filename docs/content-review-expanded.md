# Expanded question review

The supplied export contains 554 questions across eight subjects. This pass screened question/answer pairs across that inventory, with selected long answers and distractor sets inspected in detail. It is a first-pass content review, not independent expert certification of all explanations, distractors or curriculum mappings.

Migration 028 corrects 20 entries with before-value guards. Fresh seed aggregation applies the same reviewed corrections, including the prior three Physics corrections. Existing paper snapshots and scores are deliberately unchanged. Do not reset/reseed the production bank to install these changes.

Corrections include the family-relationship answer, sufficient conditions for a local maximum, a remainder question missing a lower bound, ambiguous seating and syllogism assumptions, ratio denominators, kurtosis terminology, ROC/PR interpretation, pandas apply axes, CLT conditions, comprehension performance claims, CPython build/version caveats, TCP initial-window rules, embryonic wording, oxygen difluoride nomenclature, displacement magnitude, uniform acceleration, approximate orbital period and an answer accidentally disclosed in its prompt. Exact old/new fields and IDs are in server/test/fixtures/content-corrections.json.

Reasoning checks: stationary derivative alone does not imply a maximum (x cubed is a counterexample); 2 itself leaves remainder 2 under the original divisor question, so the intended 26 needs a lower bound; the boy described as his mother's only son refers to Suresh himself; equal oscillator energies occur at both signs of A/sqrt(2).

Primary sources consulted:
- https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.DataFrame.apply.html
- https://www.itl.nist.gov/div898/handbook/eda/section3/eda35b.htm
- https://scikit-learn.org/stable/auto_examples/model_selection/plot_precision_recall.html
- https://docs.python.org/3/howto/free-threading-python.html
- https://www.rfc-editor.org/rfc/rfc5681.html

Further review flags remain: Biology plant-hormone multiple-select wording combines effects of different hormones; some textbook statements generalize biological exceptions; several programming explanations assume a particular CPU or database implementation; long-form answer grading and phrasing need benchmark examples. These are not automatically labelled verified. The ten-question CBSE starter remains the only sourced curriculum placement delivered; university/board expansion and full-paper authenticity review are still separate content work.
