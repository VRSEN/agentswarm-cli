import { type Accessor, type ParentProps } from "solid-js"
import { CommandPaletteProvider, useCommandPalette } from "../context/command-palette"

export type Slash = {
  name: string
  aliases?: string[]
}

export type CommandOption = {
  title: string
  value: string
  category?: string
  description?: string
  keybind?: string
  suggested?: boolean
  slash?: Slash
  hidden?: boolean
  enabled?: boolean
}

type SlashEntries = ReturnType<typeof useCommandPalette>["slashes"] extends Accessor<infer T> ? T : never

export function useCommandDialog(): {
  trigger: (name: string) => void
  show: () => void
  slashes: Accessor<SlashEntries>
  keybinds: (enabled: boolean) => void
  suspended: () => boolean
  register: (cb: () => CommandOption[]) => () => void
} {
  const palette = useCommandPalette()
  return {
    trigger: palette.run,
    show: palette.show,
    slashes: palette.slashes,
    keybinds(enabled) {
      palette.suspend(!enabled)
    },
    suspended() {
      return palette.suspended
    },
    register() {
      return () => {}
    },
  }
}

export function CommandProvider(props: ParentProps) {
  return <CommandPaletteProvider>{props.children}</CommandPaletteProvider>
}
