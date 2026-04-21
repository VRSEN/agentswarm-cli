import PROMPT_AGENT_PLANNER from "./prompt/agent-planner.txt"
import { SessionAgencySwarm } from "./agency-swarm"

export function agentPlannerInstructions(agent: string, providerID: string, enabled = true) {
  if (!enabled) return []
  if (agent !== "plan") return []
  if (providerID === SessionAgencySwarm.PROVIDER_ID) return []
  return [PROMPT_AGENT_PLANNER]
}
