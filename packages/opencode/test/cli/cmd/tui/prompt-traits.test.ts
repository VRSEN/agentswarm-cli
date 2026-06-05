import { describe, expect, test } from "bun:test"
import { computePromptTraits } from "../../../../src/cli/cmd/tui/component/prompt/traits"

describe("computePromptTraits", () => {
  test("normal mode without autocomplete only captures tab", () => {
    const traits = computePromptTraits({ mode: "normal", autocompleteVisible: false, hasAttachmentPrompt: false })
    expect(traits.capture).toEqual(["tab"])
    expect(traits.suspend).toBeUndefined()
    expect(traits.status).toBeUndefined()
  })

  test("normal mode with an attachment prompt captures submit", () => {
    const traits = computePromptTraits({ mode: "normal", autocompleteVisible: false, hasAttachmentPrompt: true })
    expect(traits.capture).toEqual(["submit", "tab"])
    expect(traits.suspend).toBeUndefined()
    expect(traits.status).toBeUndefined()
  })

  test("normal mode with autocomplete captures navigation keys", () => {
    const traits = computePromptTraits({ mode: "normal", autocompleteVisible: true, hasAttachmentPrompt: false })
    expect(traits.capture).toEqual(["escape", "navigate", "submit", "tab"])
    expect(traits.suspend).toBeUndefined()
    expect(traits.status).toBeUndefined()
  })

  test("shell mode does not write the keymap-owned suspend trait", () => {
    const traits = computePromptTraits({ mode: "shell", autocompleteVisible: false, hasAttachmentPrompt: false })
    expect(traits.suspend).toBeUndefined()
  })

  test("shell mode disables capture and labels the prompt", () => {
    const traits = computePromptTraits({ mode: "shell", autocompleteVisible: false, hasAttachmentPrompt: false })
    expect(traits.capture).toBeUndefined()
    expect(traits.status).toBe("SHELL")
  })
})
