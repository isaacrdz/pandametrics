import type { ReactNode } from "react";

interface FormSectionProps {
  id: string;
  number: number;
  title: string;
  description: string;
  children: ReactNode;
}

// Numbered card from the form screenshots; text comes from client parents
export function FormSection({ id, number, title, description, children }: FormSectionProps) {
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
          <h2 id={`${id}-title`} className="text-xl font-bold text-foreground sm:text-2xl">
            {title}
          </h2>
          <p className="mt-1 text-muted-foreground">{description}</p>
        </div>
      </header>
      <div className="mt-6 sm:mt-8">{children}</div>
    </section>
  );
}
