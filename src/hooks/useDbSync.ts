"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface UseDbSyncOptions<T> {
  /** API endpoint to GET/PUT (e.g. "/api/settings") */
  endpoint: string;
  /** Transform DB response to local state shape */
  fromDb: (dbData: unknown) => T;
  /** Transform local state to request body */
  toDb: (localData: T) => unknown;
  /** Current local state value */
  localData: T;
  /** Called when DB data should replace local state */
  onPull: (data: T) => void;
  /** Debounce ms for push operations (default 2000) */
  debounceMs?: number;
  /** Whether the hook has finished its initial localStorage load */
  initialized?: boolean;
}

/**
 * Generic hook for syncing local state with the database.
 *
 * - On first auth: pulls from DB and calls onPull to update local state
 * - On local state changes (after initial pull): debounced push to DB
 * - No-ops entirely when session is null (preserves offline/no-auth behavior)
 */
export function useDbSync<T>(options: UseDbSyncOptions<T>) {
  const { session } = useAuth();
  const token = session?.access_token;
  const pushTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hasPulled = useRef(false);
  const isFirstRender = useRef(true);

  // Pull from DB on first auth
  useEffect(() => {
    if (!token || hasPulled.current) return;
    hasPulled.current = true;

    fetch(options.endpoint, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) options.onPull(options.fromDb(data));
      })
      .catch(() => {
        // Graceful failure — localStorage stands as source of truth
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Debounced push to DB on local state changes
  useEffect(() => {
    // Don't push if: no auth, haven't pulled yet, or hook hasn't initialized from localStorage
    if (!token || !hasPulled.current) return;
    if (options.initialized === false) return;

    // Skip the first render after pull to avoid echoing pulled data back
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      fetch(options.endpoint, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(options.toDb(options.localData)),
      }).catch(() => {
        // Fire-and-forget; localStorage is always the fallback
      });
    }, options.debounceMs ?? 2000);

    return () => clearTimeout(pushTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, options.localData]);
}
