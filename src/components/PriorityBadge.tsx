export type Priority = "P0" | "P1" | "P2" | "P3";

export default function PriorityBadge({
  priority,
}: {
  priority: string | null | undefined;
}) {
  if (!priority) {
    return <span className="text-accentMuted">—</span>;
  }
  return <span className={`chip chip-${priority}`}>{priority}</span>;
}
