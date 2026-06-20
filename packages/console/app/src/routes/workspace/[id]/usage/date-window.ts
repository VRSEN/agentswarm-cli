export type DayWindow = {
  date: string
  start: Date
  end: Date
}

type LocalTime = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

const formatter = (timezone: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

function local(format: Intl.DateTimeFormat, at: Date): LocalTime {
  const parts = format.formatToParts(at).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value
    return acc
  }, {})

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  }
}

function localDateKey(format: Intl.DateTimeFormat, at: Date): string {
  const parts = local(format, at)
  return dateKey(parts.year, parts.month - 1, parts.day)
}

function dateKey(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month, day))
  const yyyy = date.getUTCFullYear().toString().padStart(4, "0")
  const mm = (date.getUTCMonth() + 1).toString().padStart(2, "0")
  const dd = date.getUTCDate().toString().padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function dayStart(format: Intl.DateTimeFormat, year: number, month: number, day: number): Date {
  const target = dateKey(year, month, day)
  const hour = 60 * 60 * 1000
  const full = 24 * hour
  const wall = Date.UTC(year, month, day)
  let low = wall - 36 * hour
  let high = wall + 36 * hour

  while (localDateKey(format, new Date(low)) >= target) low -= full
  while (localDateKey(format, new Date(high)) < target) high += full

  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    if (localDateKey(format, new Date(mid)) < target) {
      low = mid + 1
      continue
    }
    high = mid
  }

  const start = new Date(low)
  if (localDateKey(format, start) !== target) throw new Error(`Missing local date boundary for ${target}`)
  return start
}

export function getMonthDayWindows(timezone: string, year: number, month: number): DayWindow[] {
  const format = formatter(timezone)
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const starts = Array.from({ length: days + 1 }, (_, index) => dayStart(format, year, month, index + 1))

  return Array.from({ length: days }, (_, index) => ({
    date: dateKey(year, month, index + 1),
    start: starts[index],
    end: starts[index + 1],
  }))
}
