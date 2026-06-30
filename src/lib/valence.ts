import type { Valence } from '../types/survey';

const POSITIVE_SIGNALS = new Set([
  'PERFECT',
  'LOVE_COLOR',
  'FLATTERING_CUT',
  'PREMIUM_TEXTURE',
]);

export function getValence(signal: string): Valence {
  return POSITIVE_SIGNALS.has(signal) ? 'POSITIVE' : 'NEGATIVE';
}
