export namespace AgencyProduct {
  export const name = "agent-swarm-cli"
  export const cmd = "agentswarm"
  export const docs = "https://agency-swarm.ai/core-framework/agencies/agent-swarm-cli"
  export const issue = "https://github.com/VRSEN/agentswarm-cli/issues/new?template=bug-report.yml"
  export const connect = "Authenticate providers"
  export const start = [
    "Authenticate providers and connect to a local agency-swarm server before sending prompts.",
    "Use /auth for provider credentials, then /connect to choose the server and store a token.",
  ]

  const skip = [
    "Run {highlight}/share{/highlight}",
    "Press {highlight}Ctrl+X E{/highlight} or {highlight}/editor{/highlight}",
    "Run {highlight}/init{/highlight}",
    "Use {highlight}/review{/highlight}",
    "Run {highlight}/models{/highlight}",
    "Add {highlight}.md{/highlight} files to {highlight}.agentswarm/agent/{/highlight}",
    "Use {highlight}@agent-name{/highlight} in prompts to invoke specialized subagents",
    "Run {highlight}/connect{/highlight} to add API keys for 75+ supported LLM providers",
    "Press {highlight}F2{/highlight}",
    "Configure {highlight}model{/highlight}",
    "OpenCode auto-handles OAuth",
    "Run {highlight}opencode serve{/highlight}",
    "Use {highlight}/opencode{/highlight}",
    "Run {highlight}opencode github install{/highlight}",
    "Comment {highlight}/opencode fix this{/highlight}",
    "Comment {highlight}/oc{/highlight}",
    "Run {highlight}docker run -it --rm ghcr.io/anomalyco/opencode{/highlight}",
    "Use {highlight}/connect{/highlight} with OpenCode Zen",
  ]

  const add = [
    "Use {highlight}/auth{/highlight} to sign in to OpenAI or add API keys for supported providers",
    "Use {highlight}/connect{/highlight} to choose the local agency-swarm server you want to use",
    "Use {highlight}/agents{/highlight} to pick the active swarm or agent from live metadata",
    "Set {highlight}provider.agency-swarm.options.baseURL{/highlight} in config to pin a default local server",
    "Use {highlight}/connect{/highlight} to configure local server ports and your Agency token",
  ]

  const swap = [
    ["OpenCode", name],
    ["Open Code", name],
    ["{highlight}opencode run{/highlight}", `{highlight}${cmd} run{/highlight}`],
    ["{highlight}opencode --continue{/highlight}", `{highlight}${cmd} --continue{/highlight}`],
    ["{highlight}opencode run -f file.ts{/highlight}", `{highlight}${cmd} run -f file.ts{/highlight}`],
    ["{highlight}opencode run --attach{/highlight}", `{highlight}${cmd} run --attach{/highlight}`],
    ["{highlight}opencode upgrade{/highlight}", `{highlight}${cmd} upgrade{/highlight}`],
    ["{highlight}opencode agent create{/highlight}", `{highlight}${cmd} agent create{/highlight}`],
    ["{highlight}opencode debug config{/highlight}", `{highlight}${cmd} debug config{/highlight}`],
  ] as const

  export function tips(input: string[]) {
    const seen = new Set<string>()
    const list = input
      .filter((item) => !skip.some((text) => item.includes(text)))
      .map((item) => {
        let next = item
        for (const [from, to] of swap) next = next.replaceAll(from, to)
        if (next.includes("{highlight}/compact{/highlight}")) {
          next = next.replace("long sessions near context limits", "long agency-swarm sessions near context limits")
        }
        if (next.includes("{highlight}opencode auth list{/highlight}")) {
          next = "Run {highlight}agentswarm auth list{/highlight} to see configured provider credentials"
        }
        return next
      })
      .concat(add)
      .filter((item) => {
        if (seen.has(item)) return false
        seen.add(item)
        return true
      })
    return list
  }
}
