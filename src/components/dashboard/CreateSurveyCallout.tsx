import Link from "next/link";
import { ChevronRightIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const COPY = {
  title: "¿Tienes otra pregunta en mente?",
  description: "Crea una encuesta y empieza a recibir opiniones.",
  action: "Crear encuesta",
};

export function CreateSurveyCallout() {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-dashed border-card-border bg-card/60 p-5 sm:flex-row sm:items-center sm:p-6">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <PlusIcon aria-hidden className="size-5" />
      </span>
      <div className="flex-1">
        <h2 className="font-semibold text-foreground">{COPY.title}</h2>
        <p className="text-sm text-muted-foreground">{COPY.description}</p>
      </div>
      <Button asChild variant="outline" className="h-11 gap-1 rounded-xl bg-card px-5 font-semibold text-accent-foreground">
        <Link href="/surveys/new">
          {COPY.action}
          <ChevronRightIcon aria-hidden />
        </Link>
      </Button>
    </section>
  );
}
