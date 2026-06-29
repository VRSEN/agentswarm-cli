import { describe, expect, spyOn, test } from "bun:test"
import { captureCommand } from "../../src/telemetry/command"
import { Telemetry } from "../../src/telemetry/telemetry"

describe("command telemetry", () => {
  test("tracks allowlisted slash command telemetry without arguments", () => {
    const capture = spyOn(Telemetry, "capture").mockResolvedValue(true)
    try {
      captureCommand({
        category: "Provider",
        source: "slash",
        value: "/auth openai",
      })

      expect(capture).toHaveBeenCalledWith("ui_command_executed", {
        category: "Provider",
        command: "auth",
        keybind: false,
        source: "slash",
      })
      expect(JSON.stringify(capture.mock.calls)).not.toContain("openai")
    } finally {
      capture.mockRestore()
    }
  })

  test("does not send non-allowlisted slash command names", () => {
    const capture = spyOn(Telemetry, "capture").mockResolvedValue(true)
    try {
      captureCommand({
        category: "Prompt",
        source: "slash",
        value: "/acme-deploy production",
      })

      expect(capture).not.toHaveBeenCalled()
      expect(JSON.stringify(capture.mock.calls)).not.toContain("acme-deploy")
      expect(JSON.stringify(capture.mock.calls)).not.toContain("production")
    } finally {
      capture.mockRestore()
    }
  })

  test("tracks allowlisted command-source slash telemetry by name only", () => {
    const capture = spyOn(Telemetry, "capture").mockResolvedValue(true)
    try {
      captureCommand({
        category: "Prompt",
        source: "slash",
        value: "/commit private args",
      })

      expect(capture).toHaveBeenCalledWith("ui_command_executed", {
        category: "Prompt",
        command: "commit",
        keybind: false,
        source: "slash",
      })
      expect(JSON.stringify(capture.mock.calls)).not.toContain("private")
      expect(JSON.stringify(capture.mock.calls)).not.toContain("args")
    } finally {
      capture.mockRestore()
    }
  })

  test("tracks docs open command telemetry", () => {
    const capture = spyOn(Telemetry, "capture").mockResolvedValue(true)
    try {
      captureCommand({
        category: "System",
        keybind: "help",
        source: "palette",
        value: "docs.open",
      })

      expect(capture).toHaveBeenCalledWith("ui_command_executed", {
        category: "System",
        command: "docs.open",
        keybind: true,
        source: "palette",
      })
    } finally {
      capture.mockRestore()
    }
  })
})
