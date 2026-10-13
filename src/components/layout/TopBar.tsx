import { Greeting } from "@/components/layout/Greeting";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { NewSurveyButton } from "@/components/layout/NewSurveyButton";
import { OrganizationSwitcher } from "@/components/layout/OrganizationSwitcher";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { Organization, User } from "@/types/survey";

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
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <OrganizationSwitcher organizations={organizations} currentId={currentOrganizationId} />
        <LanguageSwitcher />
        <NewSurveyButton />
      </div>
    </header>
  );
}
