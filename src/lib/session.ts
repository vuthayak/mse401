let sessionToken: string | null = null;

export function getSessionToken(): string {
  if (!sessionToken) {
    sessionToken = crypto.randomUUID();
  }
  return sessionToken;
}

/** Adopt a known session token (e.g. from an attendant-assigned cart). */
export function setSessionToken(token: string): void {
  sessionToken = token;
}

export function resetSession(): void {
  sessionToken = null;
}
