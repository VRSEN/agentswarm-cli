import { describe, expect, test } from "bun:test"
import yargs from "yargs"
import { AgencyProduct } from "../../src/agency-swarm/product"
import { logo as glyphs } from "../../src/cli/logo"
import { packageManagerUninstallCommand, UninstallCommand } from "../../src/cli/cmd/uninstall"
import { UpgradeCommand } from "../../src/cli/cmd/upgrade"
import { resolveNetworkOptionsNoConfig } from "../../src/cli/network"
import { UI } from "../../src/cli/ui"
import { serviceName } from "../../src/server/mdns"
import { InstallationDistribution } from "../../src/installation/distribution"

async function commandHelp(command: { command: string }) {
  const name = command.command.split(" ")[0]
  return new Promise<string>((resolve, reject) => {
    yargs()
      .scriptName(AgencyProduct.cmd)
      .command(command as any)
      .exitProcess(false)
      .help()
      .wrap(100)
      .fail((message, error) => reject(error ?? new Error(message)))
      .parse([name, "--help"], {}, (error, _argv, output) => {
        if (error) reject(error)
        else resolve(output)
      })
  })
}

describe("CLI branding help", () => {
  test("uses Agent Swarm wording for uninstall", async () => {
    const help = await commandHelp(UninstallCommand)

    expect(help).toContain("agentswarm uninstall")
    expect(help).toContain("uninstall Agent Swarm CLI and remove all related files")
    expect(help).not.toContain("uninstall opencode")
  })

  test("accepts yarn as an upgrade method so unsupported-channel handling can run", async () => {
    const help = await commandHelp(UpgradeCommand)

    expect(help).toContain('"yarn"')
  })

  test("uses the Agent Swarm mDNS domain by default", () => {
    const previousArgv = process.argv
    process.argv = ["bun", "agentswarm"]
    try {
      const network = resolveNetworkOptionsNoConfig({
        port: 0,
        hostname: "127.0.0.1",
        mdns: false,
        "mdns-domain": AgencyProduct.mdnsDomain,
        cors: [],
      })

      expect(network.mdnsDomain).toBe(AgencyProduct.mdnsDomain)
    } finally {
      process.argv = previousArgv
    }
  })

  test("uses the Agent Swarm mDNS service name", () => {
    expect(serviceName(4096)).toBe("agentswarm-4096")
  })

  test("uses the Agent Swarm wordmark for plain CLI output", () => {
    const plain = UI.logo()
    const row = `${glyphs.left[1]} ${glyphs.right[1]}`.trimEnd()

    expect(plain).toContain(row)
    expect(plain).not.toContain("█▀▀█ █▀▀█ █▀▀█ █▀▀▄")
  })

  test("does not invent uninstall commands for unpublished package-manager channels", () => {
    expect(packageManagerUninstallCommand("npm")).toEqual([
      "npm",
      "uninstall",
      "-g",
      InstallationDistribution.packageName,
    ])
    expect(packageManagerUninstallCommand("brew")).toBeUndefined()
    expect(packageManagerUninstallCommand("choco")).toBeUndefined()
    expect(packageManagerUninstallCommand("scoop")).toBeUndefined()
  })
})
