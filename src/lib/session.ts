let sessionToken: string | null = null;

export function getSessionToken(): string {
  if (!sessionToken) {
    sessionToken = crypto.randomUUID();
  }
  return sessionToken;
}

export function resetSession(): void {
  sessionToken = null;
}
