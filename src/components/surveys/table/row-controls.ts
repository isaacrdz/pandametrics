import type { SurveyRow } from "@/lib/surveys/list";

// What the table and the stacked list need to render the checkbox and the "…" menu of a row
export interface RowControls {
  isSelected: (id: string) => boolean;
  onToggle: (id: string, checked: boolean) => void;
  // Header checkbox: every row of the page, some of them, or none
  allState: boolean | "indeterminate";
  onToggleAll: (checked: boolean) => void;
  activeCount: number;
  onDelete: (row: SurveyRow) => void;
}
