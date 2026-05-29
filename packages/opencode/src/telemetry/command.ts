import { Telemetry } from "./telemetry"
import { trackedCommandValues } from "./command-values"
import type { CommandTelemetrySource } from "./command-values"

export type { CommandTelemetrySource } from "./command-values"

type CommandTelemetryInput = {
  builtin?: boolean | undefined
  category?: string | undefined
  keybind?: string | undefined
  source: CommandTelemetrySource
  value: string
}

export function captureCommand(input: CommandTelemetryInput) {
  if (input.builtin === false) return
  const builtin = trackedCommandValues.has(input.value)
  if (!builtin) return
  void Telemetry.capture("ui_command_executed", {
    category: input.category,
    command: input.value,
    keybind: !!input.keybind,
    source: input.source,
  })
}
