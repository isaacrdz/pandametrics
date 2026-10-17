import { AuthFrame } from "@/components/auth/AuthFrame";

// Public sign-in and register pages: the logo above the card (no language switcher). The frame is the
// static shell; each page streams its form after checking the session
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <AuthFrame logoAboveCard>{children}</AuthFrame>
    </div>
  );
}
