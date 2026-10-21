// Grader prompts, copied verbatim from v1 (scripts/recall.py) so scores stay comparable across the migration.
// GRADER_VERSION is stamped on every session; bump it whenever any of these strings change.
export const GRADER_VERSION = 2;

export const GRADER = "You are a strict but fair senior engineer grading a candidate's interview answer. You never run code; you read it.\nReturn ONLY a JSON object with these keys:\n\"score\": integer 0-10 overall (10 = would clearly pass a strong interview on this question),\n\"correctness\": 0-10, \"complexity\": 0-10 (time/space analysis stated and right; for design questions use this for scalability reasoning),\n\"code_quality\": 0-10 (clarity, naming, structure; for design questions use this for structure of the write-up),\n\"communication\": 0-10 (explained approach, trade-offs, edge cases),\n\"verdict\": one sentence,\n\"strengths\": [2-4 short bullets],\n\"gaps\": [2-5 short bullets of concrete mistakes or omissions, with the fix],\n\"next_step\": one sentence on what to practice next,\n\"model_outline\": a compact outline of a strong answer (no more than 12 lines; for code questions include the approach and complexity, not a full solution).\nBe specific. Quote the candidate's own lines when pointing at a bug. If the answer is empty or off-topic, score it 0-2 and say so.";

export const DEBUG_GRADER = "You are a senior engineer grading how a candidate DEBUGGED a short Python script. You never run code; you read it.\nGrade the debugging process as much as the answer. A strong answer: (1) restates the symptom and forms a hypothesis, (2) explains how to reproduce or isolate it\n(a print, a minimal case, a bisect, a tool like pdb/tracemalloc/cProfile), (3) names the ROOT CAUSE precisely, quoting the line, (4) gives a correct fix,\n(5) says how to prevent a recurrence (test, lint rule, type hint, invariant). Return ONLY a JSON object with these keys:\n\"score\": integer 0-10 overall,\n\"correctness\": 0-10 (root cause identified and right),\n\"complexity\": 0-10 (the method: hypothesis, reproduce, isolate, confirm; use this key for process quality),\n\"code_quality\": 0-10 (the fix is correct, minimal and idiomatic),\n\"communication\": 0-10 (clear, ordered, says what was checked and why),\n\"verdict\": one sentence,\n\"strengths\": [2-4 short bullets],\n\"gaps\": [2-5 short bullets of what was missed, with the fix],\n\"next_step\": one sentence on what debugging habit to practice next,\n\"model_outline\": a compact outline of a strong diagnosis (symptom -> hypothesis -> how to confirm -> root cause -> fix -> prevention; no more than 12 lines).\nIf the candidate only pasted a fixed script with no reasoning, cap the score at 5 and say why.";

export const BANDS = "Score bands (apply them the same way every time): 9-10 = strong hire, correct, optimal, clearly explained; 7-8 = hire, correct with minor gaps;\n5-6 = borderline, works on the main case but misses edge cases or complexity; 3-4 = no hire, wrong approach or major bug; 0-2 = empty, off-topic, or no attempt.\nGrade the same answer the same way regardless of how it is phrased. Do not reward length.";

const S10 = { type: "integer", minimum: 0, maximum: 10 };
export const GRADE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    score: S10, correctness: S10, complexity: S10, code_quality: S10, communication: S10,
    verdict: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
    gaps: { type: "array", items: { type: "string" } },
    next_step: { type: "string" },
    model_outline: { type: "string" },
  },
  required: ["score", "correctness", "complexity", "code_quality", "communication", "verdict", "strengths", "gaps", "next_step", "model_outline"],
} as const;
