import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  image: string | null;
  initials: string;
  className?: string;
}

// Decorative: the user's name is always shown next to it. The initials also cover an image
// that fails to load (Radix keeps the fallback until the image is ready).
export function UserAvatar({ image, initials, className }: UserAvatarProps) {
  return (
    <Avatar aria-hidden className={cn("size-9", className)}>
      {image && <AvatarImage src={image} alt="" />}
      <AvatarFallback className="bg-accent font-semibold text-accent-foreground">{initials}</AvatarFallback>
    </Avatar>
  );
}
