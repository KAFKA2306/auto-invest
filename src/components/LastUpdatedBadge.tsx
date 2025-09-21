import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { History, RefreshCw } from "lucide-react";

interface LastUpdatedBadgeProps {
  lastUpdated?: string | null;
  staleAfterMs?: number;
  className?: string;
  isRefreshing?: boolean;
}

export const LastUpdatedBadge = ({
  lastUpdated,
  staleAfterMs = 1000 * 60 * 60 * 24,
  className,
  isRefreshing = false,
}: LastUpdatedBadgeProps) => {
  if (!lastUpdated) {
    return null;
  }

  const parsed = new Date(lastUpdated);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const isStale = Date.now() - parsed.getTime() > staleAfterMs;
  const relativeTime = formatDistanceToNow(parsed, { addSuffix: true });

  return (
    <Badge
      variant={isStale ? "destructive" : "outline"}
      className={cn(
        "flex items-center gap-2 rounded-full border border-border/50 bg-background/80 px-3 py-1 text-xs font-medium shadow-sm",
        className
      )}
    >
      <History className="h-3.5 w-3.5 opacity-70" />
      <span className="uppercase tracking-wide text-muted-foreground">Last updated</span>
      <span className="text-foreground">{relativeTime}</span>
      {isRefreshing && (
        <span className="flex items-center gap-1 text-muted-foreground">
          <RefreshCw className="h-3 w-3 animate-spin" />
        </span>
      )}
    </Badge>
  );
};
