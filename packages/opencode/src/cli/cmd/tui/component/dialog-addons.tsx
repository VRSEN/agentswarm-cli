import { createMemo, createSignal, onMount } from "solid-js"
import { DialogSelect, type DialogSelectOption } from "@tui/ui/dialog-select"
import { useDialog } from "@tui/ui/dialog"
import { useTheme } from "../context/theme"
import { DialogPrompt } from "../ui/dialog-prompt"
import { readEnvKey, writeEnvKey } from "../util/env-file"

type Addon = {
  id: string
  title: string
  keys: string[]
  excludeProviders?: string[]
}

const ADDONS: Addon[] = [
  { id: "search", title: "Web Search", keys: ["SEARCH_API_KEY"] },
  { id: "anthropic", title: "Anthropic Claude", keys: ["ANTHROPIC_API_KEY"], excludeProviders: ["anthropic"] },
  { id: "composio", title: "Composio", keys: ["COMPOSIO_API_KEY", "COMPOSIO_USER_ID"] },
  { id: "google", title: "Google Gemini", keys: ["GOOGLE_API_KEY"], excludeProviders: ["google"] },
  { id: "fal", title: "Fal.ai", keys: ["FAL_KEY"] },
  { id: "pexels", title: "Pexels", keys: ["PEXELS_API_KEY"] },
  { id: "pixabay", title: "Pixabay", keys: ["PIXABAY_API_KEY"] },
  { id: "unsplash", title: "Unsplash", keys: ["UNSPLASH_ACCESS_KEY"] },
]

function keys(addons: Addon[]) {
  return addons.flatMap((addon) => addon.keys)
}

export function DialogAddons(props: { providerID: string; onDone: () => void }) {
  const dialog = useDialog()
  const { theme } = useTheme()
  const [selected, setSelected] = createSignal(new Set<string>())
  const [version, setVersion] = createSignal(0)
  const available = createMemo(() =>
    ADDONS.filter((addon) => !(addon.excludeProviders ?? []).includes(props.providerID)),
  )

  onMount(() => {
    if (available().length === 0) props.onDone()
  })

  function toggle(addon: Addon) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(addon.id)) next.delete(addon.id)
      else next.add(addon.id)
      return next
    })
  }

  function configured(addon: Addon) {
    version()
    return addon.keys.every((key) => readEnvKey(key))
  }

  async function prompt() {
    const picked = available().filter((addon) => selected().has(addon.id))
    if (picked.length === 0) {
      props.onDone()
      return
    }
    for (const key of keys(picked)) {
      const value = await DialogPrompt.show(dialog, key, {
        placeholder: key,
        value: readEnvKey(key) ?? "",
      })
      if (value === null) {
        dialog.replace(() => <DialogAddons providerID={props.providerID} onDone={props.onDone} />)
        return
      }
      const clean = value.trim()
      if (!clean) {
        dialog.replace(() => <DialogAddons providerID={props.providerID} onDone={props.onDone} />)
        return
      }
      writeEnvKey(key, clean)
    }
    setVersion((value) => value + 1)
    props.onDone()
  }

  const options = createMemo<DialogSelectOption<string>[]>(() => [
    ...available().map((addon) => ({
      title: addon.title,
      value: addon.id,
      description: configured(addon) ? "configured" : addon.keys.join(", "),
      gutter: (
        <text fg={selected().has(addon.id) ? theme.success : theme.textMuted}>
          {selected().has(addon.id) ? "✓" : "○"}
        </text>
      ),
      onSelect: () => toggle(addon),
    })),
    {
      title: "Continue",
      value: "continue",
      description: selected().size > 0 ? "Configure selected add-ons" : "Skip add-ons",
      onSelect: () => void prompt(),
    },
    {
      title: "Skip",
      value: "skip",
      onSelect: props.onDone,
    },
  ])

  return <DialogSelect title="Configure add-ons" options={options()} />
}
