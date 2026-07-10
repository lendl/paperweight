/** Pull a human-readable message off an unknown thrown value, else a fallback. */
export function errText(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}
