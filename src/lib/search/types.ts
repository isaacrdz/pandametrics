import type { Role, SurveyCategory } from "@/types/survey";

// What the command palette's server search returns. Plain data (no Date objects), shared by the
// service, the action and the client.

// The palette shows this many rows per group; "See all" opens the full list
export const SEARCH_GROUP_LIMIT = 5;
export const SEARCH_QUERY_MAX = 100;

export interface SurveyHit {
  id: string;
  name: string;
  code: string;
  category: SurveyCategory;
  isActive: boolean;
  colorIndex: number;
}

export interface PersonHit {
  id: string;
  name: string;
  email: string;
  image: string | null;
  initials: string;
  role: Role;
  // In this organization (the membership), not the account
  isActive: boolean;
  isCurrentUser: boolean;
  isOwner: boolean;
}

export interface SearchGroup<T> {
  hits: T[];
  // Every match, for "See all N results"
  total: number;
}

export interface SearchResults {
  surveys: SearchGroup<SurveyHit>;
  people: SearchGroup<PersonHit>;
}

export const EMPTY_SEARCH_RESULTS: SearchResults = {
  surveys: { hits: [], total: 0 },
  people: { hits: [], total: 0 },
};
