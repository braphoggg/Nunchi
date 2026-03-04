import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createBackup,
  validateBackup,
  restoreBackup,
  type BackupData,
} from "../data-backup";

// Mock localStorage
const store: Record<string, string> = {};
beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
  });
});

describe("createBackup", () => {
  it("collects all nunchi keys from localStorage", () => {
    store["nunchi-vocabulary"] = JSON.stringify([{ korean: "문" }]);
    store["nunchi-settings"] = JSON.stringify({ theme: "dark" });
    store["unrelated-key"] = "should not be included";

    const backup = createBackup();
    expect(backup.version).toBe(1);
    expect(backup.exportedAt).toBeTruthy();
    expect(backup.data["nunchi-vocabulary"]).toBeDefined();
    expect(backup.data["nunchi-settings"]).toBeDefined();
    expect(backup.data["unrelated-key"]).toBeUndefined();
  });

  it("creates a backup with correct version", () => {
    const backup = createBackup();
    expect(backup.version).toBe(1);
  });

  it("skips keys with no stored data", () => {
    store["nunchi-vocabulary"] = "[]";
    const backup = createBackup();
    expect(Object.keys(backup.data)).toHaveLength(1);
    expect(backup.data["nunchi-vocabulary"]).toBe("[]");
  });
});

describe("validateBackup", () => {
  it("accepts valid backup object", () => {
    const backup: BackupData = {
      version: 1,
      exportedAt: "2025-01-01T00:00:00Z",
      data: { "nunchi-vocabulary": "[]" },
    };
    const result = validateBackup(backup);
    expect(result.valid).toBe(true);
  });

  it("rejects null", () => {
    const result = validateBackup(null);
    expect(result.valid).toBe(false);
  });

  it("rejects array", () => {
    const result = validateBackup([1, 2, 3]);
    expect(result.valid).toBe(false);
  });

  it("rejects missing version", () => {
    const result = validateBackup({ exportedAt: "", data: {} });
    expect(result.valid).toBe(false);
  });

  it("rejects missing data section", () => {
    const result = validateBackup({ version: 1, exportedAt: "" });
    expect(result.valid).toBe(false);
  });

  it("rejects non-string values in data", () => {
    const result = validateBackup({
      version: 1,
      exportedAt: "",
      data: { "nunchi-vocabulary": 123 },
    });
    expect(result.valid).toBe(false);
  });

  it("rejects keys not starting with 'nunchi-'", () => {
    const result = validateBackup({
      version: 1,
      exportedAt: "",
      data: { "malicious-key": "value" },
    });
    expect(result.valid).toBe(false);
  });
});

describe("restoreBackup", () => {
  it("restores known keys into localStorage", () => {
    const backup: BackupData = {
      version: 1,
      exportedAt: "2025-01-01T00:00:00Z",
      data: {
        "nunchi-vocabulary": '[{"korean":"문"}]',
        "nunchi-settings": '{"theme":"dark"}',
      },
    };

    const count = restoreBackup(backup);
    expect(count).toBe(2);
    expect(store["nunchi-vocabulary"]).toBe('[{"korean":"문"}]');
    expect(store["nunchi-settings"]).toBe('{"theme":"dark"}');
  });

  it("ignores unknown keys even if they start with nunchi-", () => {
    const backup: BackupData = {
      version: 1,
      exportedAt: "2025-01-01T00:00:00Z",
      data: {
        "nunchi-vocabulary": "[]",
        "nunchi-unknown-key": "should not be restored",
      },
    };

    const count = restoreBackup(backup);
    expect(count).toBe(1); // only vocabulary is a known key
    expect(store["nunchi-unknown-key"]).toBeUndefined();
  });
});
