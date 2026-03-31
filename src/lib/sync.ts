/**
 * Sync utilities for localStorage <-> database synchronization.
 */

/** Make an authenticated fetch call to an internal API route. */
export async function fetchWithAuth(
  url: string,
  token: string,
  options?: RequestInit,
) {
  return fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

export type SyncDirection = "push" | "pull";

/**
 * Determine sync direction on first login.
 * - If DB has data → pull (DB is source of truth)
 * - If DB is empty but localStorage has data → push (migrate)
 */
export async function determineSyncDirection(
  token: string,
): Promise<SyncDirection> {
  const res = await fetchWithAuth("/api/user/sync-status", token);
  if (!res.ok) return "push"; // fallback to push on error
  const data = await res.json();
  return data.hasData ? "pull" : "push";
}

/**
 * Push all localStorage data to the database (first-login migration).
 * Uses the existing backup data structure from data-backup.ts.
 */
export async function pushLocalDataToDb(
  token: string,
  localStorageData: Record<string, string | null>,
): Promise<boolean> {
  const res = await fetchWithAuth("/api/user/migrate", token, {
    method: "POST",
    body: JSON.stringify({ data: localStorageData }),
  });
  return res.ok;
}
