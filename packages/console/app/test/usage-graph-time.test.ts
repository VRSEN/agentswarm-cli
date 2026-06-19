import { describe, expect, mock, test } from "bun:test"

mock.module("@opencode-ai/console-core/drizzle/index.js", () => ({
  and: () => undefined,
  Database: {},
  eq: () => undefined,
  gte: () => undefined,
  inArray: () => undefined,
  isNull: () => undefined,
  lt: () => undefined,
  or: () => undefined,
  sql: Object.assign(() => undefined, { join: () => undefined }),
  sum: () => undefined,
}))
mock.module("@opencode-ai/console-core/schema/billing.sql.js", () => ({ UsageTable: {} }))
mock.module("@opencode-ai/console-core/schema/key.sql.js", () => ({ KeyTable: {} }))
mock.module("@opencode-ai/console-core/schema/user.sql.js", () => ({ UserTable: {} }))
mock.module("@opencode-ai/console-core/schema/auth.sql.js", () => ({ AuthTable: {} }))
mock.module("@solidjs/router", () => ({ useParams: () => ({}) }))
mock.module("solid-js", () => ({
  createEffect: () => undefined,
  createMemo: () => undefined,
  For: () => undefined,
  onCleanup: () => undefined,
  Show: () => undefined,
}))
mock.module("solid-js/store", () => ({ createStore: () => [{}, () => undefined] }))
mock.module("~/context/auth.withActor", () => ({ withActor: () => undefined }))
mock.module("~/component/dropdown", () => ({ Dropdown: () => undefined }))
mock.module("~/component/icon", () => ({ IconChevronLeft: () => undefined, IconChevronRight: () => undefined }))
mock.module("~/context/i18n", () => ({ useI18n: () => ({}) }))
mock.module("chart.js", () => ({
  BarController: {},
  BarElement: {},
  CategoryScale: {},
  Chart: { register: () => undefined },
  Legend: {},
  LinearScale: {},
  Tooltip: {},
}))
mock.module("../src/routes/workspace/[id]/usage/graph-section.module.css", () => ({ default: {} }))

const { localDateLabel, localDateUTC } = await import("../src/routes/workspace/[id]/usage/graph-section")

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

function bucket(timezone: string, year: number, month: number, at: Date): string | undefined {
  const monthEnd = localDateLabel(year, month + 1, 1)
  for (let day = 1; ; day++) {
    const date = localDateLabel(year, month, day)
    if (date >= monthEnd) return undefined
    const start = localDateUTC(timezone, year, month, day)
    const end = localDateUTC(timezone, year, month, day + 1)
    if (at >= start && at < end) return date
  }
}

describe("usage graph local day windows", () => {
  test("keeps New York pre-DST evening usage in the March 1 bucket", () => {
    const timezone = "America/New_York"
    const usage = new Date("2026-03-02T04:30:00.000Z")
    const march2 = localDateUTC(timezone, 2026, 2, 2)

    expect(localDate(timezone, usage)).toBe("2026-03-01")
    expect(bucket(timezone, 2026, 2, usage)).toBe("2026-03-01")
    expect(march2.toISOString()).toBe("2026-03-02T05:00:00.000Z")
    expect(usage.getTime()).toBeLessThan(march2.getTime())
  })
})
