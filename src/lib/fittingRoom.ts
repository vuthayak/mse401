/** Default fitting-room number for the survey kiosk. Override with `?room=N` on `/#/survey-c`. */
export const DEFAULT_FITTING_ROOM = 2;

export const FITTING_ROOM_MIN = 1;
export const FITTING_ROOM_MAX = 5;

/**
 * Clamps a raw room value to 1–5. Invalid / missing values fall back to
 * {@link DEFAULT_FITTING_ROOM}.
 */
export function parseFittingRoom(raw: string | null | undefined): number {
  if (raw == null || raw === '') {
    return DEFAULT_FITTING_ROOM;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) {
    return DEFAULT_FITTING_ROOM;
  }
  return Math.min(FITTING_ROOM_MAX, Math.max(FITTING_ROOM_MIN, n));
}

/** Reads `room` from a URLSearchParams (or query string). */
export function getFittingRoom(
  search: URLSearchParams | string | null | undefined,
): number {
  if (search == null) {
    return DEFAULT_FITTING_ROOM;
  }
  const params =
    typeof search === 'string' ? new URLSearchParams(search) : search;
  return parseFittingRoom(params.get('room'));
}
