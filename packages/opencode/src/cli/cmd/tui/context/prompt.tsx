import { createContext, useContext, type ParentProps } from "solid-js"
import type { PromptRef } from "../component/prompt"

type PromptRefContext = {
  readonly current: PromptRef | undefined
  set(ref: PromptRef | undefined): void
}

const ctx = createContext<PromptRefContext>()

export function PromptRefProvider(props: ParentProps) {
  let current: PromptRef | undefined
  const state: PromptRefContext = {
    get current() {
      return current
    },
    set(ref) {
      current = ref
    },
  }

  return <ctx.Provider value={state}>{props.children}</ctx.Provider>
}

export function usePromptRef() {
  const value = useContext(ctx)
  if (!value) throw new Error("PromptRef context must be used within a context provider")
  return value
}

export function useOptionalPromptRef() {
  return useContext(ctx)
}
