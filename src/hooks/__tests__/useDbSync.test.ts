import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDbSync } from "../useDbSync";

// ─── Auth mock ────────────────────────────────────────────────────

let mockSession: { access_token: string } | null = null;

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ session: mockSession }),
}));

// ─── Helpers ──────────────────────────────────────────────────────

function flushPromises(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function makeOptions(overrides: Partial<Parameters<typeof useDbSync>[0]> = {}) {
  return {
    endpoint: "/api/test",
    fromDb: vi.fn((data: unknown) => data),
    toDb: vi.fn((data: unknown) => data),
    localData: { value: "initial" },
    onPull: vi.fn(),
    debounceMs: 2000,
    ...overrides,
  };
}

// ─── Setup ────────────────────────────────────────────────────────

beforeEach(() => {
  mockSession = null;
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────

describe("useDbSync", () => {
  // ─── Pull behavior ────────────────────────────────────────

  it("does nothing when session is null (no fetch calls)", () => {
    mockSession = null;
    const opts = makeOptions();

    renderHook(() => useDbSync(opts));

    expect(fetch).not.toHaveBeenCalled();
  });

  it("pulls from DB on first auth (calls fetch GET with token)", () => {
    mockSession = { access_token: "tok-123" };
    const opts = makeOptions();
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: "from-db" }),
    });

    renderHook(() => useDbSync(opts));

    expect(fetch).toHaveBeenCalledWith("/api/test", {
      headers: { Authorization: "Bearer tok-123" },
    });
  });

  it("calls onPull with fromDb-transformed data when pull succeeds", async () => {
    mockSession = { access_token: "tok-123" };
    const dbPayload = { value: "from-db" };
    const transformed = { value: "transformed" };
    const fromDb = vi.fn(() => transformed);
    const onPull = vi.fn();

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(dbPayload),
    });

    renderHook(() =>
      useDbSync(makeOptions({ fromDb, onPull })),
    );

    // Flush the pull fetch chain
    await vi.advanceTimersByTimeAsync(0);

    expect(fromDb).toHaveBeenCalledWith(dbPayload);
    expect(onPull).toHaveBeenCalledWith(transformed);
  });

  it("does not call onPull when fetch returns non-ok response", async () => {
    mockSession = { access_token: "tok-123" };
    const onPull = vi.fn();

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve(null),
    });

    renderHook(() => useDbSync(makeOptions({ onPull })));

    await vi.advanceTimersByTimeAsync(0);

    expect(onPull).not.toHaveBeenCalled();
  });

  it("does not call onPull when fetch throws (network error)", async () => {
    mockSession = { access_token: "tok-123" };
    const onPull = vi.fn();

    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

    renderHook(() => useDbSync(makeOptions({ onPull })));

    await vi.advanceTimersByTimeAsync(0);

    expect(onPull).not.toHaveBeenCalled();
  });

  it("only pulls once (hasPulled ref prevents duplicate pulls)", async () => {
    mockSession = { access_token: "tok-123" };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: "db" }),
    });

    const opts = makeOptions();
    const { rerender } = renderHook(() => useDbSync(opts));

    await vi.advanceTimersByTimeAsync(0);

    // Rerender should not trigger another pull
    rerender();
    await vi.advanceTimersByTimeAsync(0);

    // fetch was called exactly once for the pull
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  // ─── Push behavior ────────────────────────────────────────

  it("does not push on first render after pull (skips isFirstRender)", async () => {
    mockSession = { access_token: "tok-123" };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: "db" }),
    });

    const opts = makeOptions();
    renderHook(() => useDbSync(opts));

    // Wait for pull to complete
    await vi.advanceTimersByTimeAsync(0);

    // Advance past debounce — no push should have been triggered
    vi.advanceTimersByTime(3000);

    // Only the GET pull call should exist
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("pushes to DB with debounce when localData changes after pull", async () => {
    mockSession = { access_token: "tok-123" };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: "db" }),
    });

    const opts = makeOptions();
    const { rerender } = renderHook(
      (props: { localData: { value: string } }) => useDbSync({ ...opts, localData: props.localData }),
      { initialProps: { localData: { value: "initial" } } },
    );

    // Wait for pull to complete
    await vi.advanceTimersByTimeAsync(0);

    // First rerender sets isFirstRender to false without pushing
    rerender({ localData: { value: "second" } });

    // Second rerender triggers the actual push
    rerender({ localData: { value: "third" } });

    // Advance past debounce
    vi.advanceTimersByTime(2000);

    // pull (GET) + push (PUT) = 2 calls
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("uses custom debounceMs when provided", async () => {
    mockSession = { access_token: "tok-123" };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: "db" }),
    });

    const opts = makeOptions({ debounceMs: 500 });
    const { rerender } = renderHook(
      (props: { localData: { value: string } }) => useDbSync({ ...opts, localData: props.localData }),
      { initialProps: { localData: { value: "initial" } } },
    );

    await vi.advanceTimersByTimeAsync(0);

    // Skip isFirstRender
    rerender({ localData: { value: "second" } });
    // Trigger actual push
    rerender({ localData: { value: "third" } });

    // Not yet at 500ms
    vi.advanceTimersByTime(400);
    expect(fetch).toHaveBeenCalledTimes(1); // only pull

    // Now at 500ms
    vi.advanceTimersByTime(100);
    expect(fetch).toHaveBeenCalledTimes(2); // pull + push
  });

  it("does not push when initialized is false", async () => {
    mockSession = { access_token: "tok-123" };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: "db" }),
    });

    const opts = makeOptions({ initialized: false });
    const { rerender } = renderHook(
      (props: { localData: { value: string } }) =>
        useDbSync({ ...opts, localData: props.localData }),
      { initialProps: { localData: { value: "initial" } } },
    );

    await vi.advanceTimersByTimeAsync(0);

    rerender({ localData: { value: "second" } });
    rerender({ localData: { value: "third" } });

    vi.advanceTimersByTime(3000);

    // Only the pull call, no push
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("clears previous timeout on rapid localData changes (debounce behavior)", async () => {
    mockSession = { access_token: "tok-123" };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: "db" }),
    });

    const opts = makeOptions({ debounceMs: 1000 });
    const { rerender } = renderHook(
      (props: { localData: { value: string } }) =>
        useDbSync({ ...opts, localData: props.localData }),
      { initialProps: { localData: { value: "initial" } } },
    );

    await vi.advanceTimersByTimeAsync(0);

    // Skip isFirstRender
    rerender({ localData: { value: "second" } });

    // Rapid changes — each should reset the debounce timer
    rerender({ localData: { value: "third" } });
    vi.advanceTimersByTime(800);
    rerender({ localData: { value: "fourth" } });
    vi.advanceTimersByTime(800);
    rerender({ localData: { value: "fifth" } });

    // Only 800ms since last change — no push yet
    vi.advanceTimersByTime(800);
    expect(fetch).toHaveBeenCalledTimes(1); // only pull

    // Now 1000ms since last change — push fires
    vi.advanceTimersByTime(200);
    expect(fetch).toHaveBeenCalledTimes(2); // pull + single push
  });

  it("push uses PUT method with correct headers and toDb-transformed body", async () => {
    mockSession = { access_token: "tok-456" };
    const toDb = vi.fn((data: { value: string }) => ({ transformed: data.value }));

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: "db" }),
    });

    const opts = makeOptions({ toDb, endpoint: "/api/settings" });
    const { rerender } = renderHook(
      (props: { localData: { value: string } }) =>
        useDbSync({ ...opts, localData: props.localData }),
      { initialProps: { localData: { value: "initial" } } },
    );

    await vi.advanceTimersByTimeAsync(0);

    // Skip isFirstRender
    rerender({ localData: { value: "second" } });
    // Trigger push
    rerender({ localData: { value: "pushed" } });

    vi.advanceTimersByTime(2000);

    expect(toDb).toHaveBeenCalledWith({ value: "pushed" });
    expect(fetch).toHaveBeenLastCalledWith("/api/settings", {
      method: "PUT",
      headers: {
        Authorization: "Bearer tok-456",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ transformed: "pushed" }),
    });
  });

  it("push failure is silently caught (fire-and-forget)", async () => {
    mockSession = { access_token: "tok-123" };

    // Pull succeeds, push will fail
    let callCount = 0;
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ value: "db" }),
        });
      }
      return Promise.reject(new Error("Network error"));
    });

    const opts = makeOptions();
    const { rerender } = renderHook(
      (props: { localData: { value: string } }) =>
        useDbSync({ ...opts, localData: props.localData }),
      { initialProps: { localData: { value: "initial" } } },
    );

    await vi.advanceTimersByTimeAsync(0);

    // Skip isFirstRender
    rerender({ localData: { value: "second" } });
    // Trigger push
    rerender({ localData: { value: "third" } });

    // Should not throw
    vi.advanceTimersByTime(2000);
    await vi.advanceTimersByTimeAsync(0);

    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
