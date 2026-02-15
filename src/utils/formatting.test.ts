import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { formatTime, formatDate } from "./formatting";

describe("formatTime", () => {
  it("formats seconds as M:SS when less than 1 hour", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(5)).toBe("0:05");
    expect(formatTime(59)).toBe("0:59");
    expect(formatTime(60)).toBe("1:00");
    expect(formatTime(125)).toBe("2:05");
    expect(formatTime(599)).toBe("9:59");
    expect(formatTime(3599)).toBe("59:59");
  });

  it("formats seconds as H:MM:SS when 1 hour or more", () => {
    expect(formatTime(3600)).toBe("1:00:00");
    expect(formatTime(3661)).toBe("1:01:01");
    expect(formatTime(7200)).toBe("2:00:00");
    expect(formatTime(7325)).toBe("2:02:05");
    expect(formatTime(36000)).toBe("10:00:00");
    expect(formatTime(359999)).toBe("99:59:59");
  });

  it("pads minutes and seconds with zeros", () => {
    expect(formatTime(3605)).toBe("1:00:05");
    expect(formatTime(3665)).toBe("1:01:05");
    expect(formatTime(36305)).toBe("10:05:05");
  });
});

describe("formatDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Today" for current day', () => {
    const now = new Date("2024-02-14T15:30:00");
    vi.setSystemTime(now);
    const timestamp = now.getTime();
    expect(formatDate(timestamp)).toBe("Today");
  });

  it('returns "Yesterday" for previous day', () => {
    const now = new Date("2024-02-14T15:30:00");
    vi.setSystemTime(now);
    const yesterday = new Date("2024-02-13T10:00:00");
    expect(formatDate(yesterday.getTime())).toBe("Yesterday");
  });

  it('returns "N days ago" for dates within past week', () => {
    const now = new Date("2024-02-14T15:30:00");
    vi.setSystemTime(now);
    const twoDaysAgo = new Date("2024-02-12T10:00:00");
    const fiveDaysAgo = new Date("2024-02-09T10:00:00");
    expect(formatDate(twoDaysAgo.getTime())).toBe("2 days ago");
    expect(formatDate(fiveDaysAgo.getTime())).toBe("5 days ago");
  });

  it("returns short date for dates 7+ days ago in same year", () => {
    const now = new Date("2024-02-14T15:30:00");
    vi.setSystemTime(now);
    const tenDaysAgo = new Date("2024-02-04T10:00:00");
    const result = formatDate(tenDaysAgo.getTime());
    // Format depends on locale, but should include month and day, not year
    expect(result).toMatch(/Feb/i);
    expect(result).toMatch(/4/);
    expect(result).not.toMatch(/2024/);
  });

  it("returns short date with year for dates in different year", () => {
    const now = new Date("2024-02-14T15:30:00");
    vi.setSystemTime(now);
    const lastYear = new Date("2023-12-25T10:00:00");
    const result = formatDate(lastYear.getTime());
    // Should include year when different from current year
    expect(result).toMatch(/Dec/i);
    expect(result).toMatch(/25/);
    expect(result).toMatch(/2023/);
  });
});
