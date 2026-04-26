type Priority = "P0" | "P1" | "P2" | "P3";

export default function PriorityBadge({
  priority,
}: {
  priority: Priority | string | null | undefined;
}) {
  if (priority !== "P0" && priority !== "P1" && priority !== "P2" && priority !== "P3") {
    return <span className="text-accentMuted">—</span>;
  }
  return <span className={`chip chip-${priority}`}>{priority}</span>;
}
