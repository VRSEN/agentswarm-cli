/** @jsxImportSource @opentui/solid */
import { afterEach, expect, mock, spyOn, test } from "bun:test"
import type { CliRenderer } from "@opentui/core"
import { testRender } from "@opentui/solid"
import * as ArgsContext from "../../../src/cli/cmd/tui/context/args"
import * as EditorContext from "../../../src/cli/cmd/tui/context/editor"
import * as LocalContext from "../../../src/cli/cmd/tui/context/local"
import * as LogoModule from "../../../src/cli/cmd/tui/component/logo"
import * as ProjectContext from "../../../src/cli/cmd/tui/context/project"
import * as PromptModule from "../../../src/cli/cmd/tui/component/prompt"
import * as SyncContext from "../../../src/cli/cmd/tui/context/sync"
import * as ToastModule from "../../../src/cli/cmd/tui/ui/toast"
import * as TuiPluginRuntimeModule from "../../../src/cli/cmd/tui/plugin/runtime"
import type { PromptRef } from "../../../src/cli/cmd/tui/component/prompt"
import { PromptRefProvider } from "../../../src/cli/cmd/tui/context/prompt"
import { RouteProvider } from "../../../src/cli/cmd/tui/context/route"

const renderers: CliRenderer[] = []

afterEach(() => {
  for (const renderer of renderers) renderer.destroy()
  renderers.length = 0
  mock.restore()
})

async function renderHome(input: { startupFailure?: string }) {
  const toasts: ToastModule.ToastOptions[] = []
  let promptRef: PromptRef | undefined

  spyOn(ArgsContext, "useArgs").mockReturnValue({ startupFailure: input.startupFailure } as any)
  spyOn(EditorContext, "useEditorContext").mockReturnValue({ clearSelection: () => {} } as any)
  spyOn(LocalContext, "useLocal").mockReturnValue({ model: { ready: false } } as any)
  spyOn(LogoModule, "Logo").mockImplementation(() => <box />)
  spyOn(ProjectContext, "useProject").mockReturnValue({
    workspace: { current: () => "workspace" },
  } as any)
  spyOn(SyncContext, "useSync").mockReturnValue({ ready: false } as any)
  spyOn(ToastModule, "useToast").mockReturnValue({
    show: (options: any) => toasts.push(options),
    error: () => {},
    currentToast: null,
  } as any)
  // Render slot children directly, as the live runtime does when no plugin replaces the slot.
  spyOn(TuiPluginRuntimeModule, "Slot").mockImplementation((props: any) => <>{props.children}</>)
  spyOn(PromptModule, "Prompt").mockImplementation((props: any) => {
    const ref: PromptRef = {
      focused: false,
      current: { input: "", parts: [] },
      set(prompt) {
        ref.current = prompt
      },
      reset() {},
      blur() {},
      focus() {},
      submit() {},
    }
    promptRef = ref
    props.ref?.(ref)
    return <box />
  })

  const { Home } = await import("../../../src/cli/cmd/tui/routes/home")

  const rendered = await testRender(
    () => (
      <RouteProvider>
        <PromptRefProvider>
          <Home />
        </PromptRefProvider>
      </RouteProvider>
    ),
    { width: 120, height: 30 },
  )
  renderers.push(rendered.renderer)

  expect(promptRef).toBeDefined()
  return { promptRef: promptRef!, toasts }
}

test("home without a startup failure keeps the composer empty and shows no toast", async () => {
  const { promptRef, toasts } = await renderHome({})

  expect(promptRef.current.input).toBe("")
  expect(toasts).toHaveLength(0)
})

test("home seeds the startup failure into the composer and explains it with a toast", async () => {
  const failure = "Your agency project failed to start.\nSyntaxError: invalid syntax\nAt: agency.py:1"
  const { promptRef, toasts } = await renderHome({ startupFailure: failure })

  expect(promptRef.current.input).toBe(["Fix this startup error:", "", failure].join("\n"))
  expect(toasts).toHaveLength(1)
  expect(toasts[0]).toMatchObject({
    variant: "warning",
    title: "Agency project failed to start",
    message: "The startup error was added to your message. Press Enter to have Build fix it.",
  })
})
