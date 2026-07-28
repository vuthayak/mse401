import {
  useCallback,
  useId,
  useRef,
  type KeyboardEvent,
} from 'react';
import { motion } from 'motion/react';
import { PERIOD_OPTIONS, type InsightsPeriod } from '../../lib/storeInsights';
import { SPRING_BOUNCE } from './motion';

export function PeriodSelector({
  value,
  onChange,
  ariaLabel,
}: {
  value: InsightsPeriod;
  onChange: (period: InsightsPeriod) => void;
  ariaLabel: string;
}) {
  const groupId = useId();
  const layoutId = `insights-period-pill-${groupId}`;
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedIndex = Math.max(
    0,
    PERIOD_OPTIONS.findIndex((option) => option.id === value),
  );

  const focusAt = useCallback((index: number) => {
    const el = buttonRefs.current[index];
    el?.focus();
  }, []);

  const selectAt = useCallback(
    (index: number) => {
      const option = PERIOD_OPTIONS[index];
      if (!option) return;
      onChange(option.id);
      focusAt(index);
    },
    [focusAt, onChange],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const last = PERIOD_OPTIONS.length - 1;
      let next = selectedIndex;

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          next = selectedIndex === last ? 0 : selectedIndex + 1;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          next = selectedIndex === 0 ? last : selectedIndex - 1;
          break;
        case 'Home':
          next = 0;
          break;
        case 'End':
          next = last;
          break;
        default:
          return;
      }

      event.preventDefault();
      selectAt(next);
    },
    [selectAt, selectedIndex],
  );

  return (
    <div
      className="insights-period"
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
    >
      {PERIOD_OPTIONS.map((option, index) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            className={
              active
                ? 'insights-period-btn insights-period-btn--active'
                : 'insights-period-btn'
            }
            onClick={() => onChange(option.id)}
            onFocus={() => {
              if (!active) onChange(option.id);
            }}
          >
            {active ? (
              <motion.span
                className="insights-period-pill"
                layoutId={layoutId}
                transition={SPRING_BOUNCE}
              />
            ) : null}
            <span style={{ position: 'relative', zIndex: 1 }}>
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
