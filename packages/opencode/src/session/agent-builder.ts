import PROMPT_AGENT_BUILDER from "./prompt/agent-builder.txt"
import { SessionAgencySwarm } from "./agency-swarm"

export function agentBuilderInstructions(agent: string, providerID: string) {
  if (agent !== "build") return []
  if (providerID === SessionAgencySwarm.PROVIDER_ID) return []
  return [PROMPT_AGENT_BUILDER]
}
