export type KpiTone = 'neutral' | 'positive' | 'negative';

export function Kpi({
  label,
  value,
  hint,
  tone = 'neutral',
  compact = false,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: KpiTone;
  compact?: boolean;
}) {
  return (
    <div className={`insights-kpi insights-kpi--${tone}`}>
      <span className="insights-kpi-label">{label}</span>
      <span
        className={
          compact
            ? 'insights-kpi-value insights-kpi-value--compact'
            : 'insights-kpi-value'
        }
      >
        {value}
      </span>
      {hint ? <span className="insights-kpi-hint">{hint}</span> : null}
    </div>
  );
}
