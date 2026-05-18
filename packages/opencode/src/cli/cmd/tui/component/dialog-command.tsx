import { useDialog } from "@tui/ui/dialog"
import { DialogSelect, type DialogSelectOption, type DialogSelectRef } from "@tui/ui/dialog-select"
import {
  createContext,
  createMemo,
  createSignal,
  getOwner,
  onCleanup,
  runWithOwner,
  useContext,
  type Accessor,
  type ParentProps,
} from "solid-js"
import { useKeyboard } from "@opentui/solid"
import { useKeybind } from "@tui/context/keybind"
import { Telemetry } from "@/telemetry/telemetry"

type Context = ReturnType<typeof init>
const ctx = createContext<Context>()

export type Slash = {
  name: string
  aliases?: string[]
}

export type CommandOption = DialogSelectOption<string> & {
  keybind?: string
  suggested?: boolean
  slash?: Slash
  hidden?: boolean
  enabled?: boolean
}

const BUILTIN_TRACKED_COMMANDS = new Set([
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

function init() {
  const root = getOwner()
  const [registrations, setRegistrations] = createSignal<Accessor<CommandOption[]>[]>([])
  const [suspendCount, setSuspendCount] = createSignal(0)
  const dialog = useDialog()
  const keybind = useKeybind()

  const entries = createMemo(() => {
    const all = registrations().flatMap((x) => x())
    return all.map((x) => ({
      ...x,
      footer: x.keybind ? keybind.print(x.keybind) : undefined,
    }))
  })

  const isEnabled = (option: CommandOption) => option.enabled !== false
  const isVisible = (option: CommandOption) => isEnabled(option) && !option.hidden
  const track = (
    option: CommandOption,
    source: "keybind" | "palette" | "programmatic" | "slash" | "suggested",
    slash?: string,
  ) => {
    const builtin = BUILTIN_TRACKED_COMMANDS.has(option.value)
    void Telemetry.capture("ui_command_executed", {
      category: builtin ? option.category : undefined,
      command: builtin ? option.value : undefined,
      keybind: builtin ? option.keybind : undefined,
      slash: builtin ? slash : undefined,
      source,
    })
  }
  const tracked = (option: CommandOption, source: "palette" | "suggested", trackedOption = option) => ({
    ...option,
    onSelect: (dialog: Parameters<NonNullable<CommandOption["onSelect"]>>[0]) => {
      track(trackedOption, source)
      option.onSelect?.(dialog)
    },
  })

  const visibleRawOptions = createMemo(() => entries().filter((option) => isVisible(option)))
  const visibleOptions = createMemo(() => visibleRawOptions().map((option) => tracked(option, "palette")))
  const suggestedOptions = createMemo(() =>
    visibleRawOptions()
      .filter((option) => option.suggested)
      .map((option) =>
        tracked(
          {
            ...option,
            value: `suggested:${option.value}`,
            category: "Suggested",
          },
          "suggested",
          option,
        ),
      ),
  )
  const suspended = () => suspendCount() > 0

  useKeyboard((evt) => {
    if (suspended()) return
    if (dialog.stack.length > 0) return
    if (evt.defaultPrevented) return
    for (const option of entries()) {
      if (!isEnabled(option)) continue
      if (option.keybind && keybind.match(option.keybind, evt)) {
        evt.preventDefault()
        track(option, "keybind")
        option.onSelect?.(dialog)
        return
      }
    }
  })

  const result = {
    trigger(name: string, source: "programmatic" | "slash" = "programmatic", slash?: string) {
      for (const option of entries()) {
        if (option.value === name) {
          if (!isEnabled(option)) return
          track(option, source, slash)
          option.onSelect?.(dialog)
          return
        }
      }
    },
    slashes() {
      return visibleOptions().flatMap((option) => {
        const slash = option.slash
        if (!slash) return []
        return {
          display: "/" + slash.name,
          description: option.description ?? option.title,
          aliases: slash.aliases?.map((alias) => "/" + alias),
          onSelect: () => result.trigger(option.value, "slash", slash.name),
        }
      })
    },
    keybinds(enabled: boolean) {
      setSuspendCount((count) => count + (enabled ? -1 : 1))
    },
    suspended,
    show() {
      dialog.replace(() => <DialogCommand options={visibleOptions()} suggestedOptions={suggestedOptions()} />)
    },
    register(cb: () => CommandOption[]) {
      const owner = getOwner() ?? root
      if (!owner) return () => {}

      let list: Accessor<CommandOption[]> | undefined

      // TUI plugins now register commands via an async store that runs outside an active reactive scope.
      // runWithOwner attaches createMemo/onCleanup to this owner so plugin registrations stay reactive and dispose correctly.
      runWithOwner(owner, () => {
        list = createMemo(cb)
        const ref = list
        if (!ref) return
        setRegistrations((arr) => [ref, ...arr])
        onCleanup(() => {
          setRegistrations((arr) => arr.filter((x) => x !== ref))
        })
      })

      if (!list) return () => {}
      let done = false
      return () => {
        if (done) return
        done = true
        const ref = list
        if (!ref) return
        setRegistrations((arr) => arr.filter((x) => x !== ref))
      }
    },
  }
  return result
}

export function useCommandDialog() {
  const value = useContext(ctx)
  if (!value) {
    throw new Error("useCommandDialog must be used within a CommandProvider")
  }
  return value
}

export function CommandProvider(props: ParentProps) {
  const value = init()
  const dialog = useDialog()
  const keybind = useKeybind()

  useKeyboard((evt) => {
    if (value.suspended()) return
    if (dialog.stack.length > 0) return
    if (evt.defaultPrevented) return
    if (keybind.match("command_list", evt)) {
      evt.preventDefault()
      value.show()
      return
    }
  })

  return <ctx.Provider value={value}>{props.children}</ctx.Provider>
}

function DialogCommand(props: { options: CommandOption[]; suggestedOptions: CommandOption[] }) {
  let ref: DialogSelectRef<string>
  const list = () => {
    if (ref?.filter) return props.options
    return [...props.suggestedOptions, ...props.options]
  }
  return <DialogSelect ref={(r) => (ref = r)} title="Commands" options={list()} />
}
