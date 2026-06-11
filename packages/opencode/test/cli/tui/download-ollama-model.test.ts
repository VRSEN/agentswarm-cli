import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { downloadOllamaModel } from "../../../src/cli/cmd/tui/component/download-ollama-model"
import { DialogConfirm } from "../../../src/cli/cmd/tui/ui/dialog-confirm"
import type { DialogContext } from "../../../src/cli/cmd/tui/ui/dialog"
import type { ToastContext } from "../../../src/cli/cmd/tui/ui/toast"

describe("downloadOllamaModel", () => {
  afterEach(() => {
    mock.restore()
  })

  test("does not clear a newer dialog after the download dialog is dismissed", async () => {
    spyOn(DialogConfirm, "show").mockResolvedValue(true)

    const stack: DialogContext["stack"] = []
    const clear = mock(() => {
      stack.splice(0, stack.length)
    })
    const newer = {} as DialogContext["stack"][number]["element"]
    const dialog = {
      clear,
      replace: (_element: DialogContext["stack"][number]["element"], onClose?: () => void) => {
        stack.splice(0, stack.length, { element: newer })
        queueMicrotask(() => onClose?.())
      },
      get stack() {
        return stack
      },
      get size() {
        return "medium" as const
      },
      setSize: () => {},
    } satisfies DialogContext
    const toast = {
      show: mock(() => {}),
      error: mock(() => {}),
      currentToast: null,
    } as unknown as ToastContext

    const result = await downloadOllamaModel({
      dialog,
      toast,
      modelID: "qwen2.5:0.5b",
    })

    expect(result).toBe(false)
    expect(clear).not.toHaveBeenCalled()
    expect(toast.show).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "error",
        message: "Download for qwen2.5:0.5b was dismissed. The Ollama pull may still be running.",
      }),
    )
    expect(stack).toHaveLength(1)
  })
})
