import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INPUT_PAUSE_MAX_MS, INPUT_PAUSE_MS, noteUserInput, waitForInputPause } from "@/lib/inputPause";

describe("waitForInputPause", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  async function settled(promise: Promise<void>) {
    let done = false;
    void promise.then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(0);
    return done;
  }

  it("resolves at once when nothing has been done for a while", async () => {
    vi.advanceTimersByTime(60_000);
    expect(await settled(waitForInputPause())).toBe(true);
  });

  it("waits for a quiet moment after the last input", async () => {
    vi.advanceTimersByTime(60_000);
    noteUserInput();
    let done = false;
    void waitForInputPause().then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(INPUT_PAUSE_MS - 100);
    expect(done).toBe(false);
    // Another drag restarts the wait.
    noteUserInput();
    await vi.advanceTimersByTimeAsync(INPUT_PAUSE_MS - 100);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(200);
    expect(done).toBe(true);
  });

  it("never holds a save back longer than the limit, however long someone keeps working", async () => {
    vi.advanceTimersByTime(60_000);
    noteUserInput();
    let done = false;
    void waitForInputPause().then(() => {
      done = true;
    });
    for (let elapsed = 0; elapsed < INPUT_PAUSE_MAX_MS - 500; elapsed += 500) {
      noteUserInput();
      await vi.advanceTimersByTimeAsync(500);
    }
    expect(done).toBe(false);
    noteUserInput();
    await vi.advanceTimersByTimeAsync(600);
    expect(done).toBe(true);
  });
});
