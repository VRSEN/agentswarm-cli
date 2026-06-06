import { describe, expect, test } from "bun:test"
import { localDateLabel, localDateUTC } from "../src/routes/workspace/[id]/usage/usage-time"

function localDate(timezone: string, at: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(at)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value
      return acc
    }, {})
  return `${parts.year}-${parts.month}-${parts.day}`
}

describe("localDateLabel", () => {
  test("normalizes month overflow", () => {
    expect(localDateLabel(2026, 12, 1)).toBe("2027-01-01")
  })
})

describe("localDateUTC", () => {
  test("finds the first instant of a normal local day", () => {
    const start = localDateUTC("America/New_York", 2026, 0, 15)

    expect(start.toISOString()).toBe("2026-01-15T05:00:00.000Z")
    expect(localDate("America/New_York", new Date(start.getTime() - 1))).toBe("2026-01-14")
    expect(localDate("America/New_York", start)).toBe("2026-01-15")
  })

  test("finds the first instant when DST skips local midnight", () => {
    const start = localDateUTC("Africa/Cairo", 2024, 3, 26)

    expect(start.toISOString()).toBe("2024-04-25T22:00:00.000Z")
    expect(localDate("Africa/Cairo", new Date(start.getTime() - 1))).toBe("2024-04-25")
    expect(localDate("Africa/Cairo", start)).toBe("2024-04-26")
  })
})
