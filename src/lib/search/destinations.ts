import type { PersonHit } from "@/lib/search/types";

// Where the command palette's results lead. The same places as clicking the row in the tables, so
// who may open what is decided in one place.

function withQuery(path: string, query: string): string {
  const trimmed = query.trim();
  return trimmed ? `${path}?${new URLSearchParams({ q: trimmed })}` : path;
}

export function surveyHref(id: string): string {
  return `/surveys/${id}`;
}

// Your own row → your profile; another person → their edit page when you are the owner or an admin
// (never the owner's row, which nobody else edits); otherwise the list filtered to them, since
// members see /users read-only
export function personHref(person: Pick<PersonHit, "id" | "email" | "isCurrentUser" | "isOwner">, canManage: boolean): string {
  if (person.isCurrentUser) return "/profile";
  if (canManage && !person.isOwner) return `/users/${person.id}`;
  return withQuery("/users", person.email);
}

// "See all N results": the full tables with the same search
export function seeAllHref(group: "surveys" | "people", query: string): string {
  return withQuery(group === "surveys" ? "/surveys" : "/users", query);
}

// "New survey named …"
export function newSurveyHref(name: string): string {
  const trimmed = name.trim();
  return trimmed ? `/surveys/new?${new URLSearchParams({ name: trimmed })}` : "/surveys/new";
}
