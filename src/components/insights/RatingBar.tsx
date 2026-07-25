export function RatingBar({ value, max = 5 }: { value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="insights-bar" aria-hidden="true">
      <div className="insights-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
