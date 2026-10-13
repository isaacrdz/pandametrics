import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { Greeting } from "@/components/layout/Greeting";
import { OrganizationSwitcher } from "@/components/layout/OrganizationSwitcher";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { Organization, User } from "@/types/survey";

const NEW_SURVEY_LABEL = "Nueva encuesta";

interface TopBarProps {
  user: User;
  organizations: Organization[];
  currentOrganizationId: string;
}

export function TopBar({ user, organizations, currentOrganizationId }: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-20 shrink-0 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur md:px-8">
      <SidebarTrigger className="md:hidden" />
      <Greeting name={user.name} />
      <div className="ml-auto flex items-center gap-3">
        <OrganizationSwitcher organizations={organizations} currentId={currentOrganizationId} />
        <Button
          asChild
          className="h-11 gap-2 rounded-full bg-highlight px-3 text-[0.95rem] text-highlight-foreground shadow-[0_10px_24px_-12px_var(--highlight)] hover:bg-highlight/90 sm:px-5"
        >
          <Link href="/surveys/new" aria-label={NEW_SURVEY_LABEL}>
            <PlusIcon aria-hidden className="size-5" />
            <span className="hidden sm:inline">{NEW_SURVEY_LABEL}</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
