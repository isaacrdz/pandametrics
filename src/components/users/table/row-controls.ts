import type { UserRow } from "@/lib/users/list";

// What the table and the stacked list need to render the checkbox and the "…" menu of a row
export interface UserRowControls {
  isSelected: (id: string) => boolean;
  onToggle: (id: string, checked: boolean) => void;
  // Header checkbox: every selectable row of the page, some of them, or none
  allState: boolean | "indeterminate";
  onToggleAll: (checked: boolean) => void;
  // Deactivate asks for confirmation, so the row hands it to the section's dialog
  onDeactivate: (row: UserRow) => void;
}
