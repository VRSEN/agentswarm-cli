import { useContext } from "solid-js"
import { createSimpleContext } from "./helper"
import type { PromptRef } from "../component/prompt"

export const {
  context: PromptRefContext,
  use: usePromptRef,
  provider: PromptRefProvider,
} = createSimpleContext({
  name: "PromptRef",
  init: () => {
    let current: PromptRef | undefined
    let generation = 0

    return {
      get current() {
        return current
      },
      get generation() {
        return generation
      },
      set(ref: PromptRef | undefined) {
        current = ref
      },
      next() {
        generation += 1
        return generation
      },
    }
  },
})

export function useOptionalPromptRef() {
  return useContext(PromptRefContext)
}
