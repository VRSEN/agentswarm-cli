import { createContext, Show, useContext, type ParentProps } from "solid-js"

export function createSimpleContext<T, Props extends Record<string, any>>(input: {
  name: string
  init: ((input: Props) => T) | (() => T)
}) {
  const ctx = createContext<T>()

  return {
    provider: (props: ParentProps<Props>) => {
      const init = input.init(props)
      const state = init as T & {
        ready?: boolean
        providerReady?: boolean
      }
      const isReady = () =>
        state.providerReady === undefined
          ? state.ready === undefined || state.ready === true
          : state.providerReady === true
      return (
        <Show when={isReady()}>
          <ctx.Provider value={init}>{props.children}</ctx.Provider>
        </Show>
      )
    },
    use() {
      const value = useContext(ctx)
      if (!value) throw new Error(`${input.name} context must be used within a context provider`)
      return value
    },
  }
}
