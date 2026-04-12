import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Props {
  variant?: "player" | "team" | "match" | "stat" | "feed";
  className?: string;
}

export function SkeletonCard({ variant = "player", className }: Props) {
  if (variant === "player") {
    return (
      <div
        className={cn(
          "rounded-xl bg-card border border-border p-4 space-y-3",
          className,
        )}
      >
        <div className="flex items-start gap-3">
          <Skeleton className="size-12 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Skeleton className="h-5 w-8" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
        {/* sparkline placeholder */}
        <div className="pt-2 border-t border-border/60 flex items-center gap-4">
          <div className="space-y-1">
            <Skeleton className="h-6 w-8" />
            <Skeleton className="h-2.5 w-10" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-6 w-8" />
            <Skeleton className="h-2.5 w-10" />
          </div>
          <div className="ml-auto flex flex-col items-center gap-1">
            <Skeleton className="h-6 w-14 rounded" />
            <Skeleton className="h-2.5 w-8" />
          </div>
        </div>
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
    );
  }

  if (variant === "feed") {
    return (
      <div
        className={cn(
          "rounded-xl bg-card border border-border p-4 space-y-3",
          className,
        )}
      >
        <div className="flex items-start gap-3">
          <Skeleton className="size-14 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="size-7 rounded-full flex-shrink-0" />
        </div>
        <div className="pt-2 border-t border-border/60 flex items-center gap-4">
          <div className="space-y-1">
            <Skeleton className="h-7 w-8" />
            <Skeleton className="h-2.5 w-12" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-7 w-8" />
            <Skeleton className="h-2.5 w-12" />
          </div>
          <div className="ml-auto flex flex-col items-center gap-1">
            <Skeleton className="h-6 w-14 rounded" />
            <Skeleton className="h-2.5 w-8" />
          </div>
        </div>
        <div className="pt-2 border-t border-border/60">
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    );
  }

  if (variant === "team") {
    return (
      <div
        className={cn(
          "rounded-xl bg-card border border-border p-4 space-y-3",
          className,
        )}
      >
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-3 w-full" />
      </div>
    );
  }

  if (variant === "match") {
    return (
      <div
        className={cn(
          "rounded-xl bg-card border border-border p-4 space-y-2",
          className,
        )}
      >
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-40" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl bg-card border border-border p-4 space-y-2",
        className,
      )}
    >
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-6 w-16" />
    </div>
  );
}
