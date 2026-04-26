type Priority = "P0" | "P1" | "P2" | "P3";

const VALID: readonly Priority[] = ["P0", "P1", "P2", "P3"] as const;

function isPriority(value: unknown): value is Priority {
  return typeof value === "string" && (VALID as readonly string[]).includes(value);
}

export default function PriorityBadge({
  priority,
}: {
  priority: string | null | undefined;
}) {
  if (!isPriority(priority)) {
    return (
      <span className="text-accentMuted text-sm" data-testid="priority-unclassified">
        —
      </span>
    );
  }
  return (
    <span className={`chip chip-${priority}`} data-testid={`priority-${priority}`}>
      {priority}
    </span>
  );
}
