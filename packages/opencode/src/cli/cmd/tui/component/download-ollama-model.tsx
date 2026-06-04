import { TextAttributes } from "@opentui/core"
import { createSignal, onMount } from "solid-js"
import { AgencySwarmOllama } from "@/agency-swarm/ollama"
import { useTheme } from "@tui/context/theme"
import { DialogConfirm } from "../ui/dialog-confirm"
import type { DialogContext } from "../ui/dialog"
import type { ToastContext } from "../ui/toast"

type PullProgress = AgencySwarmOllama.PullProgress

export async function downloadOllamaModel(input: { dialog: DialogContext; toast: ToastContext; modelID: string }) {
  const confirmed = await DialogConfirm.show(
    input.dialog,
    "Download model",
    `${input.modelID} is not installed locally. Download it with Ollama now?`,
    "skip",
  )
  if (!confirmed) return false

  try {
    await showOllamaDownloadDialog(input.dialog, input.modelID)
    input.toast.show({
      variant: "success",
      message: `Downloaded ${input.modelID}`,
      duration: 3000,
    })
    return true
  } catch (error) {
    input.dialog.clear()
    input.toast.show({
      variant: "error",
      message: error instanceof Error ? error.message : String(error),
      duration: 8000,
    })
    return false
  }
}

function showOllamaDownloadDialog(dialog: DialogContext, modelID: string) {
  return new Promise<void>((resolve, reject) => {
    let done = false
    dialog.replace(
      () => (
        <DialogOllamaModelDownload
          modelID={modelID}
          onDone={() => {
            done = true
            dialog.clear()
            resolve()
          }}
          onError={(error) => {
            done = true
            reject(error)
          }}
        />
      ),
      () => {
        if (!done) {
          reject(new Error(`Download for ${modelID} was dismissed. The Ollama pull may still be running.`))
        }
      },
    )
  })
}

function DialogOllamaModelDownload(props: { modelID: string; onDone: () => void; onError: (error: unknown) => void }) {
  const { theme } = useTheme()
  const [progress, setProgress] = createSignal<PullProgress>({
    status: "starting download",
    percent: 0,
  })

  onMount(() => {
    void AgencySwarmOllama.pullModel(props.modelID, {
      onProgress(next) {
        setProgress(next)
      },
    })
      .then(props.onDone)
      .catch(props.onError)
  })

  return (
    <box paddingLeft={2} paddingRight={2} paddingBottom={1} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          Downloading {props.modelID}
        </text>
      </box>
      <box paddingTop={1}>
        <text fg={theme.text}>{AgencySwarmOllama.formatProgressBar(progress().percent)}</text>
      </box>
      <box>
        <text fg={theme.textMuted} wrapMode="word" width="100%">
          {progress().status}
        </text>
      </box>
      <box paddingTop={1}>
        <text fg={theme.textMuted}>Keep this window open until the download completes.</text>
      </box>
    </box>
  )
}
