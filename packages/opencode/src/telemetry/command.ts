import { Telemetry } from "./telemetry"

export type CommandTelemetrySource = "keybind" | "palette" | "programmatic" | "slash" | "suggested"

type CommandTelemetryInput = {
  category?: string | undefined
  keybind?: string | undefined
  source: CommandTelemetrySource
  value: string
}

const tracked = new Set([
  "agent.cycle",
  "agent.cycle.reverse",
  "agent.list",
  "app.console",
  "app.debug",
  "app.exit",
  "app.heap_snapshot",
  "app.toggle.animations",
  "app.toggle.diffwrap",
  "console.org.switch",
  "docs.open",
  "help.show",
  "mcp.list",
  "message.copy",
  "messages.copy",
  "model.cycle_favorite",
  "model.cycle_favorite_reverse",
  "model.cycle_recent",
  "model.cycle_recent_reverse",
  "model.list",
  "opencode.status",
  "plugins.install",
  "plugins.list",
  "prompt.clear",
  "prompt.editor",
  "prompt.paste",
  "prompt.skills",
  "prompt.stash",
  "prompt.stash.list",
  "prompt.stash.pop",
  "prompt.submit",
  "provider.auth",
  "provider.addons",
  "provider.connect",
  "session.child.first",
  "session.child.next",
  "session.child.previous",
  "session.compact",
  "session.copy",
  "session.export",
  "session.first",
  "session.fork",
  "session.half.page.down",
  "session.half.page.up",
  "session.interrupt",
  "session.last",
  "session.line.down",
  "session.line.up",
  "session.list",
  "session.message.next",
  "session.message.previous",
  "session.messages_last_user",
  "session.new",
  "session.page.down",
  "session.page.up",
  "session.parent",
  "session.redo",
  "session.rename",
  "session.revert",
  "session.share",
  "session.sidebar.toggle",
  "session.timeline",
  "session.toggle.actions",
  "session.toggle.conceal",
  "session.toggle.generic_tool_output",
  "session.toggle.scrollbar",
  "session.toggle.thinking",
  "session.toggle.timestamps",
  "session.undo",
  "session.unshare",
  "subagent.view",
  "terminal.suspend",
  "terminal.title.toggle",
  "tips.toggle",
  "variant.cycle",
  "variant.list",
])

export function captureCommand(input: CommandTelemetryInput) {
  const builtin = tracked.has(input.value)
  if (!builtin) return
  void Telemetry.capture("ui_command_executed", {
    category: input.category,
    command: input.value,
    keybind: input.keybind,
    source: input.source,
  })
}
