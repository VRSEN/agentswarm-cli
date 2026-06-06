const HOUR = 60 * 60 * 1000

export function localDateLabel(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month, day))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`
}

export function localDateUTC(timezone: string, year: number, month: number, day: number): Date {
  const target = localDateLabel(year, month, day)
  const format = createLocalDateFormatter(timezone)
  const noon = Date.UTC(year, month, day, 12)
  const rangeStart = noon - 48 * HOUR
  const rangeEnd = noon + 48 * HOUR

  for (let time = rangeStart; time <= rangeEnd; time += HOUR) {
    if (format(new Date(time)) !== target) continue

    let low = time - HOUR
    let high = time
    while (low < high) {
      const mid = Math.floor((low + high) / 2)
      if (format(new Date(mid)) < target) low = mid + 1
      else high = mid
    }
    return new Date(low)
  }

  throw new Error(`Could not find local date ${target} in ${timezone}`)
}

function createLocalDateFormatter(timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  return (at: Date) => {
    const parts = formatter.formatToParts(at).reduce<Record<string, string>>((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value
      return acc
    }, {})
    return `${parts.year}-${parts.month}-${parts.day}`
  }
}
