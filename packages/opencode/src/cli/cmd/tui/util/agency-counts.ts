import { AgencySwarmAdapter } from "@/agency-swarm/adapter"

export type AgencyCounts = {
  main: number
  sub: number
}

export function countAgencyAgents(agents: readonly AgencySwarmAdapter.AgencyAgentDescriptor[]): AgencyCounts {
  const main = agents.filter((agent) => agent.isEntryPoint).length
  return {
    main,
    sub: agents.length - main,
  }
}

export function formatAgencyCounts(counts: AgencyCounts) {
  const sub = counts.sub === 1 ? "subagent" : "subagents"
  return `${counts.main} main / ${counts.sub} ${sub}`
}
