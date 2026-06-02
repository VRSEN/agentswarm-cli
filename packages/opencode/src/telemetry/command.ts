import { Telemetry } from "./telemetry"
import { normalizeSlashCommandName, trackedCommandValues } from "./command-values"
import type { CommandTelemetrySource } from "./command-values"

export type { CommandTelemetrySource } from "./command-values"

type CommandTelemetryInput = {
  category?: string | undefined
  keybind?: string | undefined
  source: CommandTelemetrySource
  value: string
}

export function captureCommand(input: CommandTelemetryInput) {
  const value = input.source === "slash" ? normalizeSlashCommandName(input.value) : input.value
  if (!value) return
  if (input.source !== "slash" && !trackedCommandValues.has(value)) return
  void Telemetry.capture("ui_command_executed", {
    category: input.category,
    command: value,
    keybind: !!input.keybind,
    source: input.source,
  })
}
