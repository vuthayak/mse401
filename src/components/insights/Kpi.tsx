import { useEffect, useMemo } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'motion/react';
import { SPRING } from './motion';

export type KpiTone = 'neutral' | 'positive' | 'negative';

type ParsedValue =
  | { kind: 'plain'; text: string }
  | {
      kind: 'numeric';
      prefix: string;
      suffix: string;
      number: number;
      decimals: number;
    };

/** Parse the first numeric token out of a display string (e.g. "$1,234", "42%"). */
function parseDisplayValue(value: string): ParsedValue {
  const match = value.match(/^([^0-9\-]*?)(-?\d[\d,]*(?:\.\d+)?)(.*)$/);
  if (!match) return { kind: 'plain', text: value };

  const [, prefix, numStr, suffix] = match;
  const cleaned = numStr.replace(/,/g, '');
  const decimals = cleaned.includes('.')
    ? (cleaned.split('.')[1]?.length ?? 0)
    : 0;
  const number = Number(cleaned);
  if (!Number.isFinite(number)) return { kind: 'plain', text: value };

  return { kind: 'numeric', prefix, suffix, number, decimals };
}

function AnimatedDigits({
  value,
  decimals,
}: {
  value: number;
  decimals: number;
}) {
  const motionValue = useMotionValue(value);
  const spring = useSpring(motionValue, {
    stiffness: 170,
    damping: 26,
    mass: 1,
  });
  const display = useTransform(spring, (latest) =>
    latest.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }),
  );

  useEffect(() => {
    motionValue.set(value);
  }, [motionValue, value]);

  return <motion.span>{display}</motion.span>;
}

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
  const parsed = useMemo(() => parseDisplayValue(value), [value]);
  const valueClass = compact
    ? 'insights-kpi-value insights-kpi-value--compact'
    : 'insights-kpi-value';

  return (
    <motion.div
      className={`insights-kpi insights-kpi--${tone}`}
      variants={{
        hidden: { opacity: 0, y: 8 },
        show: { opacity: 1, y: 0, transition: SPRING },
      }}
    >
      <span className="insights-kpi-label">{label}</span>
      {parsed.kind === 'numeric' ? (
        <span className={valueClass}>
          {parsed.prefix}
          <AnimatedDigits value={parsed.number} decimals={parsed.decimals} />
          {parsed.suffix}
        </span>
      ) : (
        <span className={valueClass}>{parsed.text}</span>
      )}
      {hint ? <span className="insights-kpi-hint">{hint}</span> : null}
    </motion.div>
  );
}
