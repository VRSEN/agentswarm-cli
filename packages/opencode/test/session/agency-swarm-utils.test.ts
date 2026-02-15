import { describe, expect, test } from "bun:test"
import { asRawString, asString } from "../../src/session/agency-swarm-utils"

describe("session.agency-swarm-utils", () => {
  test("asRawString preserves whitespace-only deltas", () => {
    expect(asRawString(" hello")).toBe(" hello")
    expect(asRawString("\n\n")).toBe("\n\n")
    expect(asRawString(" ")).toBe(" ")
  })

  test("asString keeps trimmed semantics for identifiers/metadata", () => {
    expect(asString("  agent-name  ")).toBe("agent-name")
    expect(asString("   ")).toBeUndefined()
  })
})
