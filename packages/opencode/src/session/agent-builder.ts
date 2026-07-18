import PROMPT_AGENT_BUILDER from "./prompt/agent-builder.txt"
import { SessionAgencySwarm } from "./agency-swarm"

const UNCLEAR_REQUIREMENTS_PLAN =
  "call `plan_enter` immediately before doing anything else. Do not plan, research, inspect files, or take any other action first; let Plan clarify requirements and create the implementation plan."
const UNCLEAR_REQUIREMENTS_ASK =
  "ask the user focused clarifying questions in chat and wait for the answers before doing anything else."
const MISSING_OUTPUT_LOCATION_PLAN = "call `plan_enter` immediately and do not create files."
const MISSING_OUTPUT_LOCATION_ASK =
  "ask the user in chat for the output location and do not create files until they provide it."

export function agentBuilderInstructions(agent: string, providerID: string, planEnterAvailable = false) {
  if (agent !== "build") return []
  if (providerID === SessionAgencySwarm.PROVIDER_ID) return []
  const prompt = PROMPT_AGENT_BUILDER.replaceAll(
    "{{unclear_requirements_action}}",
    planEnterAvailable ? UNCLEAR_REQUIREMENTS_PLAN : UNCLEAR_REQUIREMENTS_ASK,
  ).replaceAll(
    "{{missing_output_location_action}}",
    planEnterAvailable ? MISSING_OUTPUT_LOCATION_PLAN : MISSING_OUTPUT_LOCATION_ASK,
  )
  return [prompt]
}
