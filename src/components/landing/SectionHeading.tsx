interface SectionHeadingProps {
  id: string;
  eyebrow: string;
  title: string;
}

// Eyebrow + title shared by the landing sections (text comes from client parents)
export function SectionHeading({ id, eyebrow, title }: SectionHeadingProps) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-semibold tracking-[0.18em] text-primary uppercase">{eyebrow}</p>
      <h2 id={id} className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
    </div>
  );
}
