// Plain shapes for the Jobs module (mirrors v1 tracker_ui.py state()).
export const STAGES = ["applied", "intro_call", "interview", "final", "offer", "ghosted", "rejected", "passed"] as const;
export type Stage = (typeof STAGES)[number];
export const STAGE_LABEL: Record<Stage, string> = { applied: "Applied", intro_call: "Intro call", interview: "Interviewing", final: "Final round", offer: "Offer", ghosted: "Ghosted", rejected: "They rejected me", passed: "I passed" };
export const ACTIVE: Stage[] = ["intro_call", "interview", "final"];

export interface Application {
  id: string; company: string; role: string; location: string; pay: string; url: string; source: "agent" | "me"; stage: Stage;
  applied_on: string; notes: string; follow_up: string; history: { stage: Stage; on: string }[]; record: string; search_id: string | null;
  kind: "applied" | "todo"; blocker: string; todo: string; todo_status: string;
}
export interface Search { id: string; name: string; start: string; end: string | null }
export interface Assessment { id: string; company: string; role: string; platform: string; minutes: string; invited: string | null; due: string | null; status: "todo" | "done" | "expired" | "skipped"; notes: string }
export interface Action { id: string; company: string; text: string; type: string; due: string | null; note: string; done: boolean }

export interface JobsState { apps: Application[]; todo: Application[]; assessments: Assessment[]; actions: Action[]; searches: Search[]; search: string; viewing: string; today: string }
