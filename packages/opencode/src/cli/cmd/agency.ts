import type { Argv } from "yargs"
import { cmd } from "./cmd"
import { bootstrap } from "../bootstrap"
import { UI } from "../ui"
import { AgencySwarmAdapter } from "@/agency-swarm/adapter"
import { AgencyProduct } from "@/agency-swarm/product"
import { Auth } from "@/auth"
import * as Config from "@/config/config"
import path from "path"

export const AgencyCommand = cmd({
  command: "agency",
  describe: "Agency Swarm backend management: connect, discover agencies, set default agency, Agent Builder helpers",
  builder: (yargs: Argv) =>
    yargs
      .command(AgencyConnectCommand)
      .command(AgencyAgenciesCommand)
      .command(AgencyUseCommand)
      .command(AgencyAgentCommand)
      .demandCommand(),
  async handler() {},
})

const AgencyConnectCommand = cmd({
  command: "connect",
  describe: "set Agency Swarm backend URL in global config",
  builder: (yargs: Argv) =>
    yargs
      .option("url", {
        alias: ["u"],
        type: "string",
        describe: "Agency Swarm FastAPI base URL",
        default: AgencySwarmAdapter.DEFAULT_BASE_URL,
      })
      .option("token", {
        type: "string",
        describe: "Bearer token for protected Agency Swarm endpoints",
      }),
  async handler(args) {
    await bootstrap(process.cwd(), async () => {
      const baseURL = AgencySwarmAdapter.normalizeBaseURL(String(args.url))
      const options = connectOptions(baseURL)
      const token = typeof args.token === "string" && args.token.trim() ? args.token.trim() : undefined
      if (token) {
        await Auth.set(AgencySwarmAdapter.PROVIDER_ID, {
          type: "api",
          key: token,
        })
      }

      await Config.updateGlobal({
        model: `${AgencySwarmAdapter.PROVIDER_ID}/${AgencySwarmAdapter.DEFAULT_MODEL_ID}`,
        provider: {
          [AgencySwarmAdapter.PROVIDER_ID]: {
            name: "Agency Swarm",
            options,
          },
        },
      })

      UI.println(`Saved Agency Swarm base URL: ${baseURL}`)
      UI.println(`Default model set to ${AgencySwarmAdapter.PROVIDER_ID}/${AgencySwarmAdapter.DEFAULT_MODEL_ID}`)
    })
  },
})

const AgencyAgenciesCommand = cmd({
  command: "agencies",
  describe: "discover agencies from the configured Agency Swarm backend",
  builder: (yargs: Argv) =>
    yargs
      .option("url", {
        alias: ["u"],
        type: "string",
        describe: "Override Agency Swarm FastAPI base URL",
      })
      .option("token", {
        type: "string",
        describe: "Override bearer token",
      })
      .option("timeout", {
        type: "number",
        describe: "Discovery timeout in milliseconds",
      }),
  async handler(args) {
    await bootstrap(process.cwd(), async () => {
      const runtime = await resolveRuntimeOptions(args)
      const discovered = await AgencySwarmAdapter.discover({
        baseURL: runtime.baseURL,
        token: runtime.token,
        timeoutMs: runtime.timeout,
      })

      if (discovered.agencies.length === 0) {
        UI.println(`No agencies discovered. Try \`${AgencyProduct.cmd} agency use <agency-id> --url ...\`.`)
        return
      }

      UI.println(`Discovered ${discovered.agencies.length} agencies at ${runtime.baseURL}`)
      for (const agency of discovered.agencies) {
        const description = agency.description ? ` - ${agency.description}` : ""
        UI.println(`- ${agency.id}${description}`)
      }
    })
  },
})

const AgencyUseCommand = cmd({
  command: "use <agency>",
  describe: "set default Agency Swarm agency in global config",
  builder: (yargs: Argv) =>
    yargs
      .positional("agency", {
        type: "string",
        describe: "Agency ID (matches /{agency}/get_metadata path)",
      })
      .option("url", {
        alias: ["u"],
        type: "string",
        describe: "Override Agency Swarm FastAPI base URL",
      })
      .option("token", {
        type: "string",
        describe: "Override bearer token",
      })
      .option("timeout", {
        type: "number",
        describe: "Discovery timeout in milliseconds",
      }),
  async handler(args) {
    await bootstrap(process.cwd(), async () => {
      const agency = String(args.agency)
      const runtime = await resolveRuntimeOptions(args)

      await AgencySwarmAdapter.getMetadata({
        baseURL: runtime.baseURL,
        agency,
        token: runtime.token,
        timeoutMs: runtime.timeout,
      })

      const options: Record<string, unknown> = {
        baseURL: runtime.baseURL,
        agency,
        discoveryTimeoutMs: runtime.timeout,
      }
      if (runtime.token) {
        await Auth.set(AgencySwarmAdapter.PROVIDER_ID, {
          type: "api",
          key: runtime.token,
        })
      }

      await Config.updateGlobal({
        model: `${AgencySwarmAdapter.PROVIDER_ID}/${AgencySwarmAdapter.DEFAULT_MODEL_ID}`,
        provider: {
          [AgencySwarmAdapter.PROVIDER_ID]: {
            name: "Agency Swarm",
            options,
          },
        },
      })

      UI.println(`Selected Agency Swarm agency: ${agency}`)
      UI.println(`Base URL: ${runtime.baseURL}`)
    })
  },
})

const AgencyAgentCommand = cmd({
  command: "agent",
  describe: "Agency Swarm Agent Builder helpers",
  builder: (yargs: Argv) => yargs.command(AgencyAgentNewCommand).demandCommand(),
  async handler() {},
})

const AgencyAgentNewCommand = cmd({
  command: "new <name>",
  describe: "create a new Agency Swarm agent scaffold via `agency-swarm create-agent-template`",
  builder: (yargs: Argv) =>
    yargs
      .positional("name", {
        type: "string",
        describe: "Agent name",
      })
      .option("purpose", {
        type: "string",
        describe: "Short purpose/description used in scaffold metadata",
      })
      .option("path", {
        type: "string",
        describe: "Output directory",
        default: process.cwd(),
      })
      .option("model", {
        type: "string",
        describe: "Model for generated template",
      })
      .option("reasoning", {
        type: "string",
        choices: ["low", "medium", "high"] as const,
        describe: "Reasoning effort for reasoning models",
      })
      .option("max-tokens", {
        type: "number",
        describe: "Max tokens for the template model settings",
      })
      .option("temperature", {
        type: "number",
        describe: "Temperature for non-reasoning models",
      })
      .option("use-txt", {
        type: "boolean",
        describe: "Use instructions.txt instead of instructions.md",
        default: false,
      }),
  async handler(args) {
    await bootstrap(process.cwd(), async () => {
      const name = String(args.name)
      const targetPath = path.resolve(String(args.path))

      const command = ["agency-swarm", "create-agent-template", name, "--path", targetPath]
      if (typeof args.purpose === "string" && args.purpose.trim()) {
        command.push("--description", args.purpose.trim())
      }
      if (typeof args.model === "string" && args.model.trim()) {
        command.push("--model", args.model.trim())
      }
      if (typeof args.reasoning === "string" && args.reasoning.trim()) {
        command.push("--reasoning", args.reasoning.trim())
      }
      if (typeof args.maxTokens === "number" && Number.isFinite(args.maxTokens)) {
        command.push("--max-tokens", String(args.maxTokens))
      }
      if (typeof args.temperature === "number" && Number.isFinite(args.temperature)) {
        command.push("--temperature", String(args.temperature))
      }
      if (args.useTxt) {
        command.push("--use-txt")
      }

      const proc = Bun.spawn({
        cmd: command,
        stdout: "pipe",
        stderr: "pipe",
      })
      const [exitCode, stdout, stderr] = await Promise.all([
        proc.exited,
        proc.stdout ? new Response(proc.stdout).text() : Promise.resolve(""),
        proc.stderr ? new Response(proc.stderr).text() : Promise.resolve(""),
      ])

      if (exitCode !== 0) {
        const detail = stderr.trim() || stdout.trim() || `exit code ${exitCode}`
        throw new Error(`Failed to run ${command.join(" ")}: ${detail}`)
      }

      const generatedPath = extractGeneratedPath(stdout) || targetPath
      UI.println(`Agent scaffold generated at: ${generatedPath}`)
      UI.println("Manual wiring steps:")
      UI.println("1. Import the generated agent in your Agency Swarm backend project.")
      UI.println("2. Add or update your agency factory so it can construct the new agent.")
      UI.println("3. Add the agency to run_fastapi(agencies={...}) mapping.")
      UI.println("4. Restart the FastAPI backend and verify it appears in /openapi.json and /<agency>/get_metadata.")
    })
  },
})

async function resolveRuntimeOptions(args: Record<string, unknown>) {
  const config = await Config.get()
  const provider = config.provider?.[AgencySwarmAdapter.PROVIDER_ID]
  const auth = await Auth.get(AgencySwarmAdapter.PROVIDER_ID)
  return runtimeOptions(args, provider?.options, auth)
}

export function connectOptions(baseURL: string) {
  return {
    baseURL,
    discoveryTimeoutMs: AgencySwarmAdapter.DEFAULT_DISCOVERY_TIMEOUT_MS,
    agency: null,
    recipientAgent: null,
    recipient_agent: null,
  } satisfies Record<string, unknown>
}

export function runtimeOptions(
  args: Record<string, unknown>,
  options: Record<string, unknown> | undefined,
  auth: Awaited<ReturnType<typeof Auth.get>>,
) {
  const fromConfigBaseURL =
    readString(options?.["baseURL"]) ?? readString(options?.["base_url"]) ?? AgencySwarmAdapter.DEFAULT_BASE_URL
  const fromConfigToken = readString(options?.["token"])
  const fromAuthToken = auth?.type === "api" ? auth.key : auth?.type === "wellknown" ? auth.token : undefined
  const fromConfigTimeout =
    readPositiveNumber(options?.["discoveryTimeoutMs"]) ??
    readPositiveNumber(options?.["discovery_timeout_ms"]) ??
    AgencySwarmAdapter.DEFAULT_DISCOVERY_TIMEOUT_MS

  const baseURL = AgencySwarmAdapter.normalizeBaseURL(
    typeof args.url === "string" && args.url.trim() ? args.url.trim() : fromConfigBaseURL,
  )
  const token =
    typeof args.token === "string" && args.token.trim() ? args.token.trim() : (fromAuthToken ?? fromConfigToken)
  const timeout =
    typeof args.timeout === "number" && Number.isFinite(args.timeout) && args.timeout > 0
      ? args.timeout
      : fromConfigTimeout

  return {
    baseURL,
    token,
    timeout,
  }
}

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function readPositiveNumber(value: unknown): number | undefined {
  if (typeof value !== "number") return undefined
  if (!Number.isFinite(value)) return undefined
  if (value <= 0) return undefined
  return value
}

function extractGeneratedPath(stdout: string): string | undefined {
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed.startsWith("Created at:")) continue
    const value = trimmed.slice("Created at:".length).trim()
    if (!value) continue
    return value
  }
  return undefined
}
