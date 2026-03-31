import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWithAuth, determineSyncDirection, pushLocalDataToDb } from "../sync";

// ─── fetchWithAuth ──────────────────────────────────────────────────

describe("fetchWithAuth", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("adds Authorization header with Bearer token", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response("ok"));
    await fetchWithAuth("/api/test", "my-token-123");

    expect(fetch).toHaveBeenCalledWith("/api/test", {
      headers: {
        Authorization: "Bearer my-token-123",
        "Content-Type": "application/json",
      },
    });
  });

  it("merges custom headers with auth headers", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response("ok"));
    await fetchWithAuth("/api/test", "tok", {
      headers: { "X-Custom": "value" },
    });

    expect(fetch).toHaveBeenCalledWith("/api/test", {
      headers: {
        "X-Custom": "value",
        Authorization: "Bearer tok",
        "Content-Type": "application/json",
      },
    });
  });

  it("passes through method and body from options", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response("ok"));
    await fetchWithAuth("/api/test", "tok", {
      method: "POST",
      body: JSON.stringify({ foo: 1 }),
    });

    expect(fetch).toHaveBeenCalledWith("/api/test", {
      method: "POST",
      body: JSON.stringify({ foo: 1 }),
      headers: {
        Authorization: "Bearer tok",
        "Content-Type": "application/json",
      },
    });
  });

  it("returns the fetch Response object", async () => {
    const mockResponse = new Response("data", { status: 200 });
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    const res = await fetchWithAuth("/api/test", "tok");
    expect(res).toBe(mockResponse);
  });

  it("propagates fetch errors", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));
    await expect(fetchWithAuth("/api/test", "tok")).rejects.toThrow("Network error");
  });

  it("handles empty token string", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response("ok"));
    await fetchWithAuth("/api/test", "");

    expect(fetch).toHaveBeenCalledWith("/api/test", {
      headers: {
        Authorization: "Bearer ",
        "Content-Type": "application/json",
      },
    });
  });
});

// ─── determineSyncDirection ─────────────────────────────────────────

describe("determineSyncDirection", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 'pull' when DB has data", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ hasData: true }), { status: 200 }),
    );

    const direction = await determineSyncDirection("tok");
    expect(direction).toBe("pull");
  });

  it("returns 'push' when DB is empty", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ hasData: false }), { status: 200 }),
    );

    const direction = await determineSyncDirection("tok");
    expect(direction).toBe("push");
  });

  it("returns 'push' on non-OK response (fallback)", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response("Unauthorized", { status: 401 }),
    );

    const direction = await determineSyncDirection("tok");
    expect(direction).toBe("push");
  });

  it("calls /api/user/sync-status with correct auth header", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ hasData: false }), { status: 200 }),
    );

    await determineSyncDirection("my-jwt");

    expect(fetch).toHaveBeenCalledWith("/api/user/sync-status", {
      headers: {
        Authorization: "Bearer my-jwt",
        "Content-Type": "application/json",
      },
    });
  });

  it("returns 'push' when response JSON has no hasData field", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    );

    const direction = await determineSyncDirection("tok");
    // hasData is undefined → falsy → "push"
    expect(direction).toBe("push");
  });
});

// ─── pushLocalDataToDb ──────────────────────────────────────────────

describe("pushLocalDataToDb", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true on successful push", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response("ok", { status: 200 }),
    );

    const result = await pushLocalDataToDb("tok", { key: "value" });
    expect(result).toBe(true);
  });

  it("returns false on failed push", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response("Server Error", { status: 500 }),
    );

    const result = await pushLocalDataToDb("tok", {});
    expect(result).toBe(false);
  });

  it("sends POST to /api/user/migrate with data payload", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response("ok", { status: 200 }),
    );

    const data = { "nunchi-vocab": "[]", "nunchi-settings": '{"theme":"dark"}' };
    await pushLocalDataToDb("tok", data);

    expect(fetch).toHaveBeenCalledWith("/api/user/migrate", {
      method: "POST",
      body: JSON.stringify({ data }),
      headers: {
        Authorization: "Bearer tok",
        "Content-Type": "application/json",
      },
    });
  });

  it("handles empty data object", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response("ok", { status: 200 }),
    );

    const result = await pushLocalDataToDb("tok", {});
    expect(result).toBe(true);
    expect(fetch).toHaveBeenCalled();
  });

  it("handles null values in data", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response("ok", { status: 200 }),
    );

    const data = { key1: "value", key2: null };
    await pushLocalDataToDb("tok", data);

    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.data).toEqual({ key1: "value", key2: null });
  });
});
