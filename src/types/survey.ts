// Mirrors the Prisma models in context/project-overview.md (section 5).
// Replace with the generated Prisma Client types once Prisma is added.

export type Role = "OWNER" | "ADMIN" | "MEMBER";

export type SurveyCategory = "SATISFACTION" | "RATING" | "POLL";

export type AnswerType = "REACTION" | "RATING" | "TEXT" | "IMAGE";

export type ResponseSource = "KIOSK" | "LINK" | "QR";

export type ReactionValue =
  | "VERY_BAD"
  | "BAD"
  | "GOOD"
  | "VERY_GOOD"
  | "INCREDIBLE";

export interface Organization {
  id: string;
  name: string;
  activeSurveyCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: Role;
  organizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnswerOption {
  id: string;
  type: AnswerType;
  value: string;
  label: string;
  color: string;
  archivedAt: Date | null;
}

export interface Question {
  id: string;
  text: string;
  options: AnswerOption[];
  archivedAt: Date | null;
}

export interface Survey {
  id: string;
  organizationId: string;
  createdById: string;
  code: string;
  name: string;
  description: string;
  category: SurveyCategory;
  isActive: boolean;
  questions: Question[];
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResponseItem {
  questionId: string;
  answerOptionId: string;
  answerType: AnswerType;
  answerValue: string;
  answerLabel: string;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  organizationId: string;
  items: ResponseItem[];
  source: ResponseSource;
  deviceId: string | null;
  locale: string | null;
  durationMs: number | null;
  createdAt: Date;
}

// Computed metrics (section 6 of the overview). Never stored.

export interface DateRange {
  from: Date;
  to: Date;
}

export interface OptionMetrics {
  optionId: string;
  type: AnswerType;
  value: string;
  label: string;
  color: string;
  count: number;
  share: number;
  archived: boolean;
}

export interface QuestionMetrics {
  questionId: string;
  text: string;
  totalAnswers: number;
  average: number | null;
  options: OptionMetrics[];
}

export interface SurveyMetrics {
  surveyId: string;
  totalResponses: number;
  questions: QuestionMetrics[];
}

export interface DashboardSummary {
  totalResponses: number;
  activeSurveys: number;
  activeSurveyLimit: number;
}
