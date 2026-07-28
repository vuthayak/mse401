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
