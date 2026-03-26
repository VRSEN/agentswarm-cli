import { describe, expect, test } from "bun:test"
import { win32SanitizeInputMode } from "../../src/cli/cmd/tui/win32"

describe("cli.win32", () => {
  test("sanitizes console input mode for the tui", () => {
    const ENABLE_PROCESSED_INPUT = 0x0001
    const ENABLE_LINE_INPUT = 0x0002
    const ENABLE_MOUSE_INPUT = 0x0010
    const ENABLE_QUICK_EDIT_MODE = 0x0040
    const ENABLE_EXTENDED_FLAGS = 0x0080
    const ENABLE_VIRTUAL_TERMINAL_INPUT = 0x0200

    const mode =
      ENABLE_PROCESSED_INPUT |
      ENABLE_LINE_INPUT |
      ENABLE_MOUSE_INPUT |
      ENABLE_QUICK_EDIT_MODE |
      ENABLE_VIRTUAL_TERMINAL_INPUT

    const next = win32SanitizeInputMode(mode)

    expect(next & ENABLE_PROCESSED_INPUT).toBe(0)
    expect(next & ENABLE_MOUSE_INPUT).toBe(0)
    expect(next & ENABLE_QUICK_EDIT_MODE).toBe(0)
    expect(next & ENABLE_VIRTUAL_TERMINAL_INPUT).toBe(0)
    expect(next & ENABLE_EXTENDED_FLAGS).toBe(ENABLE_EXTENDED_FLAGS)
    expect(next & ENABLE_LINE_INPUT).toBe(ENABLE_LINE_INPUT)
  })
})
