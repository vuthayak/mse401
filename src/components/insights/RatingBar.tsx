import { motion } from 'motion/react';
import { SPRING } from './motion';

export function RatingBar({ value, max = 5 }: { value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="insights-bar" aria-hidden="true">
      <motion.div
        className="insights-bar-fill"
        initial={false}
        animate={{ scaleX: pct / 100 }}
        transition={SPRING}
      />
    </div>
  );
}
