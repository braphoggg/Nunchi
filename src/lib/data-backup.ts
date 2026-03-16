/**
 * Data backup/restore for all app localStorage data.
 */

/** All localStorage keys used by the app. */
const APP_KEYS = [
  "nunchi-vocabulary",
  "nunchi-gamification",
  "nunchi-lesson-history",
  "nunchi-sound-muted",
  "nunchi-sound-volume",
  "nunchi-settings",
  "nunchi-tutorial-completed",
  "nunchi-onboarded",
  "nunchi-visited-topics",
  "nunchi-achievements",
  "nunchi-daily-challenges",
] as const;

export interface BackupData {
  version: number;
  exportedAt: string;
  data: Record<string, string>;
}

/**
 * Collect all app data from localStorage into a backup object.
 */
export function createBackup(): BackupData {
  const data: Record<string, string> = {};
  for (const key of APP_KEYS) {
    const value = localStorage.getItem(key);
    if (value !== null) {
      data[key] = value;
    }
  }
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
}

/**
 * Trigger a JSON file download of the backup.
 */
export function downloadBackup(backup: BackupData): void {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nunchi-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Validate a parsed object looks like a valid backup.
 */
export function validateBackup(
  obj: unknown,
): { valid: true; backup: BackupData } | { valid: false; error: string } {
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
    return { valid: false, error: "Invalid file format" };
  }

  const record = obj as Record<string, unknown>;

  if (typeof record.version !== "number" || record.version < 1) {
    return { valid: false, error: "Missing or invalid version" };
  }

  if (typeof record.exportedAt !== "string") {
    return { valid: false, error: "Missing export timestamp" };
  }

  if (typeof record.data !== "object" || record.data === null || Array.isArray(record.data)) {
    return { valid: false, error: "Missing data section" };
  }

  const data = record.data as Record<string, unknown>;

  // Verify all values are strings and keys start with "nunchi-"
  for (const [key, value] of Object.entries(data)) {
    if (!key.startsWith("nunchi-")) {
      return { valid: false, error: `Unknown key: ${key}` };
    }
    if (typeof value !== "string") {
      return { valid: false, error: `Invalid value for key: ${key}` };
    }
  }

  return { valid: true, backup: record as unknown as BackupData };
}

/**
 * Restore backup data into localStorage.
 * Only restores keys that are in the APP_KEYS list.
 */
export function restoreBackup(backup: BackupData): number {
  const allowedKeys = new Set<string>(APP_KEYS);
  let restoredCount = 0;

  for (const [key, value] of Object.entries(backup.data)) {
    if (allowedKeys.has(key)) {
      localStorage.setItem(key, value);
      restoredCount++;
    }
  }

  return restoredCount;
}

/**
 * Read a File as text and parse as JSON backup.
 */
export function readBackupFile(
  file: File,
): Promise<{ valid: true; backup: BackupData } | { valid: false; error: string }> {
  return new Promise((resolve) => {
    // Reject files over 10 MB
    if (file.size > 10 * 1024 * 1024) {
      resolve({ valid: false, error: "File too large (max 10 MB)" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        resolve(validateBackup(parsed));
      } catch {
        resolve({ valid: false, error: "Invalid JSON file" });
      }
    };
    reader.onerror = () => {
      resolve({ valid: false, error: "Failed to read file" });
    };
    reader.readAsText(file);
  });
}
