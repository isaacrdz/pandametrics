import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TableSearchProps {
  value: string;
  onChange: (value: string) => void;
  // Placeholder and accessible name
  label: string;
}

export function TableSearch({ value, onChange, label }: TableSearchProps) {
  return (
    <div className="relative w-full min-w-0 @2xl:max-w-sm @2xl:flex-1">
      <SearchIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={label}
        aria-label={label}
        className="h-11 w-full rounded-xl bg-card pl-10 text-[0.95rem]"
      />
    </div>
  );
}
