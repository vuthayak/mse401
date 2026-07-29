import { useEffect, useState } from 'react';

/**
 * Apple-aligned spring presets (WWDC Designing Fluid Interfaces).
 * bounce 0 ≈ damping 1.0 (critically damped); duration ≈ response.
 */
export const SPRING = { type: 'spring', bounce: 0, duration: 0.4 } as const;

/** Slight bounce for momentum-carrying moments (segmented-control pill). */
export const SPRING_BOUNCE = {
  type: 'spring',
  bounce: 0.2,
  duration: 0.35,
} as const;

/** Staggered entrance for KPI grids / category cards. */
export const STAGGER_CONTAINER = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05, delayChildren: 0.02 },
  },
} as const;

export const STAGGER_ITEM = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: SPRING },
} as const;

/**
 * Tracks `prefers-reduced-motion` so components can skip layout springs and
 * haptics behaviourally, not only via CSS.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
