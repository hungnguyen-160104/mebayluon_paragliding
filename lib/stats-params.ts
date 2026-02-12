import { GroupByGranularity, DateRange } from "@/services/statistics.service";

export function parseDateRange(searchParams: URLSearchParams): DateRange | undefined {
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const from = fromParam ? new Date(fromParam) : undefined;
  const to = toParam ? new Date(toParam) : undefined;

  const hasFrom = from && !isNaN(from.getTime());
  const hasTo = to && !isNaN(to.getTime());

  if (!hasFrom && !hasTo) return undefined;
  return {
    from: hasFrom ? from : undefined,
    to: hasTo ? to : undefined,
  };
}

export function parseGroupBy(value: string | null, fallback: GroupByGranularity = "day") {
  if (value === "month" || value === "year" || value === "day") return value;
  return fallback;
}
