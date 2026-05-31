import { type ParentProps } from "solid-js"
import { formatKeyBindings } from "../keymap"
import { useTuiConfig } from "./tui-config"

export type KeybindKey = string

export function useKeybind() {
  const config = useTuiConfig()
  return {
    get all(): Record<string, unknown> {
      return {}
    },
    get leader() {
      return false
    },
    parse(evt: unknown) {
      return evt
    },
    match(_key: string, _evt: unknown) {
      return false
    },
    print(key: string) {
      return formatKeyBindings([], config) || key
    },
  }
}

export function KeybindProvider(props: ParentProps) {
  return <>{props.children}</>
}
