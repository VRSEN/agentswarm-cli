import { describe, expect, test } from "bun:test"
import { getMonthDayWindows } from "../src/routes/workspace/[id]/usage/date-window"

const hour = 60 * 60 * 1000

describe("getMonthDayWindows", () => {
  test("uses the pre-DST offset for March's New York start boundary", () => {
    const days = getMonthDayWindows("America/New_York", 2026, 2)

    expect(days[0].date).toBe("2026-03-01")
    expect(days[0].start.toISOString()).toBe("2026-03-01T05:00:00.000Z")
    expect(days[30].end.toISOString()).toBe("2026-04-01T04:00:00.000Z")
  })

  test("keeps the spring-forward day as a 23 hour local window", () => {
    const days = getMonthDayWindows("America/New_York", 2026, 2)
    const day = days[7]

    expect(day.date).toBe("2026-03-08")
    expect(day.start.toISOString()).toBe("2026-03-08T05:00:00.000Z")
    expect(day.end.toISOString()).toBe("2026-03-09T04:00:00.000Z")
    expect(day.end.getTime() - day.start.getTime()).toBe(23 * hour)
  })

  test("uses the first local date instant when DST skips midnight", () => {
    const days = getMonthDayWindows("America/Havana", 2026, 2)
    const day = days[7]

    expect(day.date).toBe("2026-03-08")
    expect(day.start.toISOString()).toBe("2026-03-08T05:00:00.000Z")
    expect(days[6].end.toISOString()).toBe("2026-03-08T05:00:00.000Z")
    expect(day.end.toISOString()).toBe("2026-03-09T04:00:00.000Z")
    expect(day.end.getTime() - day.start.getTime()).toBe(23 * hour)
  })

  test("keeps the fall-back day as a 25 hour local window", () => {
    const days = getMonthDayWindows("America/New_York", 2026, 10)
    const day = days[0]

    expect(day.date).toBe("2026-11-01")
    expect(day.start.toISOString()).toBe("2026-11-01T04:00:00.000Z")
    expect(day.end.toISOString()).toBe("2026-11-02T05:00:00.000Z")
    expect(day.end.getTime() - day.start.getTime()).toBe(25 * hour)
    expect(days[29].end.toISOString()).toBe("2026-12-01T05:00:00.000Z")
  })

  test("keeps fixed-offset zones on 24 hour local windows", () => {
    const days = getMonthDayWindows("Asia/Kolkata", 2026, 0)

    expect(days[0].start.toISOString()).toBe("2025-12-31T18:30:00.000Z")
    expect(days[0].end.toISOString()).toBe("2026-01-01T18:30:00.000Z")
    expect(days[0].end.getTime() - days[0].start.getTime()).toBe(24 * hour)
  })
})
