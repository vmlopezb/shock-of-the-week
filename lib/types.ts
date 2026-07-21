export type PgyLevel = "PGY-1" | "PGY-2" | "PGY-3" | "PGY-4" | "Attending/Faculty";
export type UserRole = "participant" | "admin";
export type MediaType = "image" | "video";
export type ChallengeStatus = "draft" | "published" | "archived";
export type QuestionType = "multiple_choice" | "short_answer";

export interface Hospital {
  id: string;
  name: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string;
  hospital_id: string | null;
  pgy_level: PgyLevel;
  role: UserRole;
  created_at: string;
}

export interface ProfilePublic {
  id: string;
  username: string;
  hospital_id: string | null;
  pgy_level: PgyLevel;
  created_at: string;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Challenge {
  id: string;
  title: string;
  vignette: string;
  media_url: string | null;
  media_type: MediaType | null;
  category_id: string | null;
  status: ChallengeStatus;
  publish_at: string;
  created_by: string | null;
  created_at: string;
}

export interface Question {
  id: string;
  challenge_id: string;
  position: number;
  question_text: string;
  type: QuestionType;
  options: QuestionOption[] | null;
  correct_option_id: string | null;
  accepted_answers: string[] | null;
  difficulty: 1 | 2 | 3;
  explanation: string | null;
  explanation_media_url: string | null;
  explanation_media_type: MediaType | null;
  category_id: string | null;
}

/** Question shape safe to send to the client before submission (no answer key). */
export type QuestionForTaking = Omit<
  Question,
  "correct_option_id" | "accepted_answers" | "explanation" | "explanation_media_url" | "explanation_media_type"
>;

export interface Submission {
  id: string;
  challenge_id: string;
  user_id: string;
  total_points: number;
  submitted_at: string;
}

export interface Answer {
  id: string;
  submission_id: string;
  question_id: string;
  selected_option_id: string | null;
  text_answer: string | null;
  confidence: 1 | 2 | 3 | 4 | 5;
  is_correct: boolean;
  points: number;
}

export interface Comment {
  id: string;
  challenge_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

export interface LeaderboardRow {
  user_id: string;
  username: string;
  hospital_id: string | null;
  hospital_name: string | null;
  pgy_level: PgyLevel;
  total_points: number;
  cases_done: number;
}

export interface UserCategoryStat {
  user_id: string;
  category_id: string;
  category_name: string;
  questions_answered: number;
  correct_count: number;
  accuracy_pct: number;
  avg_confidence: number;
  total_points: number;
}
