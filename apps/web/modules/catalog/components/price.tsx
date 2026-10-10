import { formatPrice } from "@/lib/money";
import { cn } from "@/lib/utils";

export function Price({
  selling,
  offer,
  className,
}: {
  selling: number;
  offer: number | null;
  className?: string;
}) {
  const onOffer = offer !== null && offer < selling;

  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <span className="font-medium">
        {formatPrice(onOffer ? offer : selling)}
      </span>
      {onOffer && (
        <span className="text-xs text-muted-foreground line-through">
          <span className="sr-only">Was </span>
          {formatPrice(selling)}
        </span>
      )}
    </span>
  );
}
