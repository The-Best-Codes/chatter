// TODO: Replace this file with shadcn/ui/avatar
import { cn } from "../../lib/utils";

function Avatar({ className, ...props }) {
  return (
    <div
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  );
}

function AvatarImage({ className, ...props }) {
  return (
    <img
      className={cn("aspect-square h-full w-full", className)}
      {...props}
    />
  );
}

function AvatarFallback({ className, ...props }) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted",
        className
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarFallback, AvatarImage };
