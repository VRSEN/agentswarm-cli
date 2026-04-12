import { AgencySwarmAdapter } from "@/agency-swarm/adapter"
import type { Provider } from "@opencode-ai/sdk/v2"

export function hasUsableProvider(providers: Provider[]) {
  return providers.some((provider) => {
    if (provider.id !== "opencode") return true
    return Object.values(provider.models).some((model) => model.cost?.input !== 0)
  })
}

export function shouldOpenAgencyConnectDialog(input: { providerID?: string; message: string }) {
  if (input.providerID !== AgencySwarmAdapter.PROVIDER_ID) return false
  return /cannot reach agency-swarm backend/i.test(input.message)
}
