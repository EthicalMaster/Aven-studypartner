import type {CurriculumQuestion} from "./types.js";
const corrections = [
  {
    "question": "Pointing to a photograph of a boy, Suresh said, \"He is the only son of my mother.\" How is Suresh related to that boy?",
    "changes": {
      "question_text": "Pointing to his own childhood photograph, Suresh says, \"This boy is the only son of my mother.\" Who is the boy?",
      "options": [
        {
          "id": "a",
          "text": "Suresh himself"
        },
        {
          "id": "b",
          "text": "His brother"
        },
        {
          "id": "c",
          "text": "His uncle"
        },
        {
          "id": "d",
          "text": "His cousin"
        }
      ],
      "explanation": "Suresh is his mother’s only son. The boy in his childhood photograph is Suresh himself, not his son."
    }
  },
  {
    "question": "For a twice-differentiable function f(x), which conditions guarantee that x = c is a strict local maximum?",
    "changes": {
      "question_text": "For a twice-differentiable function near an interior point c, which conditions are individually sufficient to guarantee a strict local maximum at c?",
      "options": [
        {
          "id": "a",
          "text": "f′(c) = 0 alone"
        },
        {
          "id": "b",
          "text": "f′(c) = 0 and f″(c) < 0"
        },
        {
          "id": "c",
          "text": "f′(c) = 0 and f″(c) > 0"
        },
        {
          "id": "d",
          "text": "f′ is positive immediately to the left of c and negative immediately to the right"
        }
      ],
      "correct_option_ids": [
        "b",
        "d"
      ],
      "explanation": "Both b (second derivative test) and d (first derivative sign test) suffice. A stationary point alone can be a minimum or neither. Option c gives a strict local minimum."
    }
  },
  {
    "question": "Find the smallest number which when divided by 6, 8, and 12 leaves a remainder of 2 in each case.",
    "changes": {
      "question_text": "Find the smallest positive integer greater than 12 that leaves remainder 2 when divided by 6, 8 and 12."
    }
  },
  {
    "question": "Five persons P, Q, R, S, T sit in a row facing North. S is between T and Q. Q is to the immediate left of R. P is to the immediate left of T. Which of the following statements are correct?",
    "changes": {
      "question_text": "Five persons P, Q, R, S, T sit in a row facing North. S sits immediately between T and Q. Q is to the immediate left of R. P is to the immediate left of T. Which of the following statements are correct?"
    }
  },
  {
    "question": "Statements: 1. All roses are flowers. 2. Some flowers are red. Conclusions: I. Some roses are red. II. Some flowers are roses. Which conclusions logically follow?",
    "changes": {
      "question_text": "Assume at least one rose exists. Statements: 1. All roses are flowers. 2. Some flowers are red. Conclusions: I. Some roses are red. II. Some flowers are roses. Which conclusions logically follow?"
    }
  },
  {
    "question": "For four numbers a, b, c, d in continued proportion (a/b = c/d), which of the following algebraic relations are mathematically true?",
    "changes": {
      "question_text": "Suppose a/b = c/d, where a, b, c and d are nonzero real numbers and a ≠ b and c ≠ d. Which of the following relations necessarily hold?"
    }
  },
  {
    "question": "A distribution with positive kurtosis (leptokurtic) has heavier tails and a sharper central peak than a standard normal distribution.",
    "changes": {
      "question_text": "Using the excess-kurtosis convention, a normal distribution has excess kurtosis zero.",
      "explanation": "Excess kurtosis subtracts 3 from the standardized fourth central moment. The normal distribution has ordinary kurtosis 3 and excess kurtosis 0. A kurtosis value alone does not determine peak shape."
    }
  },
  {
    "question": "Explain why ROC-AUC can present an overly optimistic assessment of model performance on severely imbalanced datasets, and describe what alternative metric should be used.",
    "changes": {
      "correct_answer_text": "ROC curves plot recall against false-positive rate. With a rare positive class, even a small false-positive rate can yield many false alerts relative to true positives. A high ROC-AUC therefore need not imply useful precision. Class imbalance alone does not force a high ROC-AUC. Inspect the precision-recall curve, average precision, class prevalence and the operating threshold alongside ROC-AUC. Average precision and trapezoidal PR-AUC are distinct summaries.",
      "explanation": "ROC-AUC describes ranking discrimination. Precision-recall analysis adds information about positive predictions under class imbalance; imbalance alone does not guarantee any particular AUC."
    }
  },
  {
    "question": "Explain the difference between `df.apply()` and vectorized NumPy operations on Pandas columns, highlighting computational performance.",
    "changes": {
      "correct_answer_text": "DataFrame.apply normally applies a function to each column with axis=0, or to each row with axis=1. Built-in array operations can avoid repeated Python callbacks and often improve numeric workloads. Performance depends on dtype, operation, engine, data size and pandas version. Benchmark the actual workload rather than assuming a fixed speedup.",
      "explanation": "The default axis is column-wise. Numeric vectorization can reduce Python callback overhead, but neither contiguous memory nor a fixed speedup is guaranteed."
    }
  },
  {
    "question": "According to the Central Limit Theorem (CLT), as sample size n increases (typically n ≥ 30), what distribution does the sample mean approach?",
    "changes": {
      "question_text": "For independent identically distributed observations with finite mean and finite nonzero variance, which distribution does the standardized sample mean approach as sample size increases?",
      "explanation": "The classical iid CLT gives sqrt(n)(sample mean − μ)/σ converging in distribution to a standard normal. There is no universal sample-size cutoff of 30."
    }
  },
  {
    "question": "Explain how list comprehensions provide memory and execution speed advantages over manual `for` loops in standard CPython.",
    "changes": {
      "question_text": "Compare a list comprehension with an equivalent append-based loop in CPython. Are memory or speed advantages guaranteed?",
      "correct_answer_text": "Both construct a list and store its elements. Comprehensions can reduce interpreter overhead and make simple transformations clearer, but their speed depends on Python version and workload. They still evaluate Python expressions. Neither a fixed percentage speedup nor a universal memory saving is guaranteed. A generator expression can avoid constructing the entire result list.",
      "explanation": "Comprehensions build lists; generators yield values lazily. Compare readability and benchmark performance on the target interpreter."
    }
  },
  {
    "question": "How does CPython’s Global Interpreter Lock (GIL) impact multithreaded CPU-bound Python programs?",
    "changes": {
      "question_text": "In a GIL-enabled CPython build, how does the Global Interpreter Lock affect multiple threads executing CPU-bound Python bytecode?",
      "explanation": "In a GIL-enabled interpreter, only one thread executes Python bytecode at a time. Native extensions may release the GIL, and optional free-threaded CPython builds have different behavior."
    }
  },
  {
    "question": "Describe Python’s memory management model, detailing reference counting, cyclic garbage collection, and memory pooling via PyMalloc.",
    "changes": {
      "question_text": "Describe reference counting, cyclic garbage collection and small-object allocation in traditional GIL-enabled CPython, noting implementation-version differences.",
      "correct_answer_text": "Reference counting tracks strong references and generally reclaims objects when the count reaches zero. Cyclic garbage collection detects unreachable reference cycles that counting alone cannot reclaim. CPython also uses specialized allocation strategies for small objects. Exact generations, arena sizes, allocator behavior and immortal-object handling depend on version, platform and build, so they should not be presented as universal constants.",
      "explanation": "This describes CPython implementation techniques rather than requirements of the Python language. Version and build details matter."
    }
  },
  {
    "question": "Detail the four phases of TCP congestion control (Slow Start, Congestion Avoidance, Fast Retransmit, Fast Recovery) according to RFC 5681.",
    "changes": {
      "correct_answer_text": "RFC 5681 describes slow start, congestion avoidance, fast retransmit and fast recovery. Slow start grows cwnd by at most one SMSS for each acknowledgement of new data, producing roughly exponential growth per RTT under common conditions. The initial window is not universally one segment: RFC 5681 gives bounds of 2, 3 or 4 SMSS depending on SMSS. Congestion avoidance increases cwnd by roughly one SMSS per RTT. Three duplicate ACKs trigger fast retransmit. Reno fast recovery uses ssthresh at no more than max(FlightSize/2, 2*SMSS), temporarily inflates cwnd for duplicate ACKs, and returns cwnd to ssthresh when recovery completes. Later TCP specifications and implementations can differ.",
      "explanation": "Initial-window rules differ from the one-segment loss window used after a retransmission timeout. See RFC 5681 sections 3.1 and 3.2."
    }
  },
  {
    "question": "Name the female embryonic structure consisting of an inner cell mass and an outer trophoblast layer that implants into the uterine endometrium.",
    "changes": {
      "question_text": "Name the early embryonic structure consisting of an inner cell mass and an outer trophoblast layer that implants into the uterine endometrium."
    }
  },
  {
    "question": "What is the oxidation number of Oxygen in fluorine monoxide (OF₂)?",
    "changes": {
      "question_text": "What is the oxidation number of Oxygen in oxygen difluoride (OF₂)?"
    }
  },
  {
    "question": "At what displacement from the mean position does the kinetic energy of a simple harmonic oscillator equal its potential energy?",
    "changes": {
      "question_text": "At what magnitude of displacement from equilibrium does a simple harmonic oscillator have equal kinetic and potential energy, taking potential energy as zero at equilibrium?",
      "explanation": "From (1/2)kx² = (1/4)kA², x²=A²/2. The two positions are x=±A/√2, so the magnitude is A/√2."
    }
  },
  {
    "question": "A body of mass 5 kg is accelerated across a frictionless surface from rest to 10 m/s in 2 seconds. What is the net applied force?",
    "changes": {
      "question_text": "A body of mass 5 kg is uniformly accelerated across a frictionless surface from rest to 10 m/s in 2 seconds. What is the net applied force?"
    }
  },
  {
    "question": "What is the orbital period in hours of a geostationary satellite orbiting Earth?",
    "changes": {
      "question_text": "Approximately what is the orbital period in hours of a geostationary satellite orbiting Earth? Round to the nearest whole hour.",
      "explanation": "A geostationary orbit has a sidereal-day period, approximately 23 hours 56 minutes. This rounds to 24 hours."
    }
  },
  {
    "question": "Provide an antonym for \"VERBOSE\" beginning with the letter \"C\": _____ (e.g. concise).",
    "changes": {
      "question_text": "Provide an antonym for VERBOSE beginning with the letter C."
    }
  },
  {
    "question": "A physically dimensionless quantity can still possess physical units.",
    "changes": {
      "explanation": "True. Plane angle (radian) and solid angle (steradian) are dimensionless derived SI units. The separate supplementary-unit category was abolished in 1995."
    }
  },
  {
    "question": "A rocket of initial mass M ejects fuel gases at a constant relative exhaust velocity v_rel at rate dm/dt = α. In the absence of gravity, what is the rocket speed after its mass decreases to M/2?",
    "changes": {
      "question_text": "A rocket starts from rest with initial mass M and ejects fuel at constant exhaust speed v_rel relative to the rocket. With no external forces, what is its speed after its mass decreases to M/2?"
    }
  },
  {
    "question": "Explain why a cricket player pulls their hands backwards while catching a fast-moving ball.",
    "changes": {
      "explanation": "The impulse-momentum theorem gives the magnitude of average stopping force as |Δp| / Δt. For the same momentum change, increasing stopping time reduces the average force; peak force also depends on the force-time profile."
    }
  }
];
export function applyReviewedCorrections(questions:CurriculumQuestion[]){for(const q of questions){const patch=corrections.find(p=>p.question===q.question_text);if(patch)Object.assign(q,patch.changes);}}
