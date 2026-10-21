// Plain data shapes for the Recall engine. Mirrors v1 (scripts/recall.py) so golden fixtures apply 1:1.
export type Track = "leetcode" | "python" | "system_design" | "dsa" | "debugging";
export const TRACKS: Track[] = ["leetcode", "python", "system_design", "dsa", "debugging"];
export const ROTATION: Track[] = ["python", "system_design", "dsa", "debugging"];

export type Difficulty = "Easy" | "Medium" | "Hard" | "";

export interface BankItem {
  id: string;
  title: string;
  difficulty?: Difficulty | string;
  topic?: string;
  topics?: string[];
  lists?: string[];
  url?: string;
  prompt?: string;
  rubric?: string;
  symptom?: string;
}

export interface Bank {
  items: BankItem[];
  categories: string[];
  companies?: string[];
  company_lists?: Record<string, string[]>;
}

export type Banks = Record<Track, Bank>;

export interface Progress {
  attempts: number;
  best: number;
  last?: number;
  last_date?: string;
  interval: number;
  next_due?: string;
}

export interface Session {
  id: string;
  date: string;      // YYYY-MM-DD
  track: Track;
  item: string;
  topic?: string;
  score: number;
  minutes_used?: number | null;
  timer_minutes?: number | null;
}

export interface ExternalRep {
  date: string;
  kind: "mock_interview" | "interview" | "study";
  minutes?: number | null;
  rating?: number | null;
}

export interface CurriculumItem { id: string; est_min?: number; what?: string; text?: string; book?: string; track?: string }
export interface Week {
  week: number;
  phase: "learn" | "speed";
  focus: Partial<Record<Track, string>>;
  reading: CurriculumItem[];
  homework: CurriculumItem[];
}
export interface Curriculum { weeks: Week[]; daily_minutes?: number; program_weeks?: number; principles?: [string, string][] }

export interface PracticeSlot { kind: "practice"; track: Track; minutes: number; track_why?: string; id?: string; title?: string; difficulty?: string; topic?: string; why?: string; skipped?: string[] }
export interface StudySlot { kind: "reading" | "homework"; id: string; week: number; minutes: number; title?: string; book: string; track: string }
export type Slot = PracticeSlot | StudySlot;
export interface Plan { date: string; week: number; slots: Slot[] }

export interface ProgramState { start?: string; done?: Record<string, { date: string; minutes: number }>; minutes?: Record<string, number>; snapshots?: Record<string, number> }

/** Everything the engine reads. Loaded from the DB by the caller; the engine never touches the DB. */
export interface RecallState {
  items: Record<string, Progress>;           // key `${track}:${id}`
  sessions: Session[];
  plans: Record<string, Plan>;               // by date
  program: ProgramState;
  external?: ExternalRep[];
}

export interface Recommendation { id: string; title: string; difficulty: string; topic: string; why: string }
