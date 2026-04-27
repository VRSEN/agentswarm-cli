import { createMemo } from "solid-js"
import { useSync } from "@tui/context/sync"
import { hasUsableProvider } from "../session-error"

export function useConnected() {
  const sync = useSync()
  return createMemo(() => hasUsableProvider(sync.data.provider))
}
