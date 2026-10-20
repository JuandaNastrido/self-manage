/**
 * Unit tests for duration/time formatting.
 */
import { formatDuration } from "@/lib/utils/ui";

describe("formatDuration", () => {
  it("formats seconds to MM:SS", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(30)).toBe("0:30");
    expect(formatDuration(59)).toBe("0:59");
    expect(formatDuration(60)).toBe("1:00");
    expect(formatDuration(119)).toBe("1:59");
    expect(formatDuration(3661)).toBe("1:01:01");
  });

  it("formats hours when seconds >= 3600", () => {
    expect(formatDuration(3600)).toBe("1:00:00");
    expect(formatDuration(3661)).toBe("1:01:01");
    expect(formatDuration(7325)).toBe("2:02:05");
    expect(formatDuration(86400)).toBe("24:00:00");
  });

  it("handles negative seconds by clamping to 0", () => {
    expect(formatDuration(-100)).toBe("0:00");
  });
});
