import { PERIOD_OPTIONS, type InsightsPeriod } from '../../lib/storeInsights';

export function PeriodSelector({
  value,
  onChange,
  ariaLabel,
}: {
  value: InsightsPeriod;
  onChange: (period: InsightsPeriod) => void;
  ariaLabel: string;
}) {
  return (
    <div className="insights-period" role="group" aria-label={ariaLabel}>
      {PERIOD_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          className={
            value === option.id
              ? 'insights-period-btn insights-period-btn--active'
              : 'insights-period-btn'
          }
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
