import { describe, expect, test } from "bun:test"
import { EOL } from "node:os"
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
    expect(help).toContain("uninstall Agent Swarm and remove all related files")
    expect(help).not.toContain("uninstall opencode")
  })

  test("shows npm-only upgrade method help without unsupported methods", async () => {
    const help = await commandHelp(UpgradeCommand)

    expect(help).toContain("upgrade method to use; only npm is supported")
    expect(help).not.toContain('"curl"')
    expect(help).not.toContain('"yarn"')
    expect(help).not.toContain('"pnpm"')
    expect(help).not.toContain('"bun"')
    expect(help).not.toContain('"brew"')
    expect(help).not.toContain('"choco"')
    expect(help).not.toContain('"scoop"')
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
    const plain = UI.logo(undefined, AgencyProduct.resolve({}), 100)
    const row = " █████╗  ██████╗ ███████╗███╗   ██╗████████╗ ███████╗██╗    ██╗ █████╗ ██████╗ ███╗   ███╗"

    expect(`${glyphs.left[1]} ${glyphs.right[1]}`.trimEnd()).toBe(row)
    expect(plain).toContain(row)
    expect(plain).not.toContain(" ▓▓    ▓▓   ▓▓▓▓")
    expect(plain).not.toContain("█▀▀█ █▀▀█ █▀▀█ █▀▀▄")
  })

  test("uses compact text branding when the Agent Swarm wordmark would wrap", () => {
    expect(UI.logo(undefined, AgencyProduct.resolve({}), 80)).toBe("Agent Swarm")
  })

  test("uses text branding instead of the Agent Swarm wordmark for downstream product profiles", () => {
    const profile = AgencyProduct.resolve({
      AGENTSWARM_PRODUCT_DISPLAY_NAME: "Example Product",
      AGENTSWARM_PRODUCT_COMMAND: "example",
    })
    const plain = UI.logo("  ", profile)
    const row = `${glyphs.left[1]} ${glyphs.right[1]}`.trimEnd()

    expect(plain).toBe("  Example Product")
    expect(plain).not.toContain(row)
  })

  test("uses downstream plain wordmark lines when configured", () => {
    const profile = AgencyProduct.resolve({
      AGENTSWARM_PRODUCT_DISPLAY_NAME: "Example Product",
      AGENTSWARM_PRODUCT_WORDMARK_LINES: "EXAMPLE\\n PRODUCT",
    })
    const plain = UI.logo("  ", profile)
    const row = `${glyphs.left[1]} ${glyphs.right[1]}`.trimEnd()

    expect(plain).toBe(["  EXAMPLE", "   PRODUCT"].join(EOL))
    expect(plain).not.toContain(row)
  })

  test("keeps the Agent Swarm wordmark when only the downstream command is customized", () => {
    const profile = AgencyProduct.resolve({
      AGENTSWARM_PRODUCT_COMMAND: "example",
    })
    const plain = UI.logo("  ", profile)
    const row = `${glyphs.left[1]} ${glyphs.right[1]}`.trimEnd()

    expect(plain).toContain(`  ${row}`)
    expect(plain).not.toBe("  Agent Swarm")
  })

  test("does not invent uninstall commands for unpublished package-manager channels", () => {
    expect(packageManagerUninstallCommand("npm")).toEqual([
      "npm",
      "uninstall",
      "-g",
      InstallationDistribution.packageName,
    ])
    expect(packageManagerUninstallCommand("pnpm")).toEqual([
      "pnpm",
      "uninstall",
      "-g",
      InstallationDistribution.packageName,
    ])
    expect(packageManagerUninstallCommand("bun")).toEqual(["bun", "remove", "-g", InstallationDistribution.packageName])
    expect(packageManagerUninstallCommand("yarn")).toEqual([
      "yarn",
      "global",
      "remove",
      InstallationDistribution.packageName,
    ])
    expect(packageManagerUninstallCommand("brew")).toBeUndefined()
    expect(packageManagerUninstallCommand("choco")).toBeUndefined()
    expect(packageManagerUninstallCommand("scoop")).toBeUndefined()
  })
})
