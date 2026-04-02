import { AgencySwarmAdapter } from "@/agency-swarm/adapter"

export function shouldOpenAgencyConnectDialog(input: { providerID?: string; message: string }) {
  if (input.providerID !== AgencySwarmAdapter.PROVIDER_ID) return false
  return /cannot reach agency-swarm backend/i.test(input.message)
}
