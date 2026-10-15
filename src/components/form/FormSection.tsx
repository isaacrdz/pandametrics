import type { ReactNode } from "react";

interface FormSectionProps {
  id: string;
  number: number;
  title: string;
  description: string;
  // Shown next to the title, e.g. "Coming soon"
  badge?: string;
  children: ReactNode;
}

// Numbered card from the form screenshots; text comes from client parents
export function FormSection({ id, number, title, description, badge, children }: FormSectionProps) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="rounded-3xl border border-card-border bg-card p-5 sm:p-8"
    >
      <header className="flex items-start gap-4">
        <span
          aria-hidden
          className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent font-mono text-sm font-bold text-accent-foreground"
        >
          {String(number).padStart(2, "0")}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 id={`${id}-title`} className="text-xl font-bold text-foreground sm:text-2xl">
              {title}
            </h2>
            {badge && (
              <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-1 text-muted-foreground">{description}</p>
        </div>
      </header>
      {/* A container: field layouts follow the card width, not the viewport (the profile puts
          cards in a half-width column) */}
      <div className="@container mt-6 sm:mt-8">{children}</div>
    </section>
  );
}
