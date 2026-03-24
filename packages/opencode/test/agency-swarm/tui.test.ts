import { describe, expect, test } from "bun:test"
import { queries, rows } from "../../src/agency-swarm/tui"

describe("agency-swarm tui helpers", () => {
  test("queries drops placeholder values and keeps action query", () => {
    expect(
      queries({
        query: "None",
        queries: ["agency swarm events", "None"],
        action: {
          type: "search",
          query: "show latest agency swarm release",
        },
      }),
    ).toEqual(["agency swarm events", "show latest agency swarm release"])
  })

  test("rows parses top-level search results", () => {
    expect(
      rows(
        JSON.stringify([
          {
            file_id: "daily_revenue_report.pdf",
            text: "Daily report with revenue summary and top metrics",
          },
        ]),
      ),
    ).toEqual([
      {
        title: "daily_revenue_report.pdf",
        text: "Daily report with revenue summary and top metrics",
      },
    ])
  })

  test("rows parses nested results arrays and trims snippets", () => {
    expect(
      rows(
        JSON.stringify({
          results: [
            {
              path: "reports/daily_revenue_report.pdf",
              content: {
                text: "  first line\nsecond line\nthird line  ",
              },
            },
          ],
        }),
      ),
    ).toEqual([
      {
        title: "reports/daily_revenue_report.pdf",
        text: "first line second line third line",
      },
    ])
  })

  test("rows returns empty rows for invalid payloads", () => {
    expect(rows("not json")).toEqual([])
    expect(rows(JSON.stringify({ results: [] }))).toEqual([])
  })
})
