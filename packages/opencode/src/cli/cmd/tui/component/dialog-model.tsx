import { createMemo } from "solid-js"
import { useLocal } from "@tui/context/local"
import { AgencySwarmAdapter } from "@/agency-swarm/adapter"

export function useConnected() {
  const local = useLocal()
  return createMemo(() => local.model.current()?.providerID === AgencySwarmAdapter.PROVIDER_ID)
}
