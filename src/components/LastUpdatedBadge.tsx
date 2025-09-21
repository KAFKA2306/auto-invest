import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

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
      variant={isStale ? "destructive" : "secondary"}
      className={cn("flex items-center gap-2", className)}
    >
      <span className="font-medium">Last updated</span>
      <span>{relativeTime}</span>
      {isRefreshing && <span className="text-xs opacity-80">(refreshing...)</span>}
    </Badge>
  );
};
