import type { KeyEvent, Renderable } from "@opentui/core"
import type { Binding } from "@opentui/keymap"
import type { Accessor } from "solid-js"

export function useTextareaKeybindings(): Accessor<readonly Binding<Renderable, KeyEvent>[]> {
  return () => []
}
