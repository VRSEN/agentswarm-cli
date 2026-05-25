import { createMemo, createSignal, onMount } from "solid-js"
import { DialogSelect, type DialogSelectOption } from "@tui/ui/dialog-select"
import { useDialog } from "@tui/ui/dialog"
import { useTheme } from "../context/theme"
import { DialogPrompt } from "../ui/dialog-prompt"
import { readEnvKey, writeEnvKeys } from "../util/env-file"
import { errorMessage as toErrorMessage } from "@/util/error"
import { AgencyProduct } from "@/agency-swarm/product"

function keys(addons: AgencyProduct.Addon[]) {
  return addons.flatMap((addon) => addon.keys)
}

export function DialogAddons(props: { providerID: string; onDone: () => void; error?: string }) {
  const dialog = useDialog()
  const { theme } = useTheme()
  const [selected, setSelected] = createSignal(new Set<string>())
  const [version, setVersion] = createSignal(0)
  const [error, setError] = createSignal(props.error)
  const available = createMemo(() =>
    AgencyProduct.addons.filter((addon) => !(addon.excludeProviders ?? []).includes(props.providerID)),
  )

  onMount(() => {
    if (available().length === 0) props.onDone()
  })

  function toggle(addon: AgencyProduct.Addon) {
    setError(undefined)
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(addon.id)) next.delete(addon.id)
      else next.add(addon.id)
      return next
    })
  }

  function configured(addon: AgencyProduct.Addon) {
    version()
    return addon.keys.every((key) => readEnvKey(key))
  }

  async function prompt() {
    const picked = available().filter((addon) => selected().has(addon.id))
    if (picked.length === 0) {
      props.onDone()
      return
    }
    const values: [string, string][] = []
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
      values.push([key, clean])
    }
    try {
      writeEnvKeys(values)
    } catch (err) {
      dialog.replace(() => (
        <DialogAddons
          providerID={props.providerID}
          onDone={props.onDone}
          error={`Could not save add-ons: ${toErrorMessage(err)}`}
        />
      ))
      return
    }
    setVersion((value) => value + 1)
    props.onDone()
  }

  const options = createMemo<DialogSelectOption<string>[]>(() => [
    ...(error()
      ? [
          {
            title: "Add-ons were not saved",
            value: "error",
            description: error(),
          },
        ]
      : []),
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
