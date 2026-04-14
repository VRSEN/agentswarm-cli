#!/usr/bin/env bun
import { $ } from "bun"
import pkg from "../package.json"
import { Script } from "@opencode-ai/script"
import { fileURLToPath } from "url"

const dir = fileURLToPath(new URL("..", import.meta.url))
process.chdir(dir)

const binary = "agentswarm"
const commands = ["agentswarm"]
type RootPackage =
  | {
      dir: string
      name: string
      binSource: string
      description: string
      scripts: Record<string, string>
      optionalDependencies: true
      platformScope: string
    }
  | {
      dir: string
      name: string
      binSource: string
      description: string
      scripts: Record<string, string>
      dependency: string
    }

const roots: RootPackage[] = [
  {
    dir: pkg.name,
    name: pkg.name,
    binSource: `./bin/${binary}`,
    description: pkg.description,
    scripts: {
      postinstall: "bun ./postinstall.mjs || node ./postinstall.mjs",
    },
    optionalDependencies: true,
    platformScope: pkg.platformScope,
  },
  {
    dir: "agentswarm",
    name: "@vrsen/agentswarm",
    binSource: "./bin/agentswarm-npx",
    description: "One-command Agent Swarm launcher.",
    scripts: {},
    dependency: pkg.name,
  },
]

function getRootReadme(root: RootPackage) {
  if (root.name === "@vrsen/agentswarm") {
    return [
      "# @vrsen/agentswarm",
      "",
      "Run Agent Swarm with a single command:",
      "",
      "```bash",
      "npx @vrsen/agentswarm",
      "```",
      "",
      "The launcher can reuse the current Agency Swarm project, create a starter project, or connect to an existing agency server.",
      "",
      "It prepares the local Python environment, starts the Agency Swarm server, and opens the terminal UI.",
      "",
      "If you want the standalone CLI package instead, use `agentswarm-cli`.",
      "",
    ].join("\n")
  }

  return Bun.file("./README.md").text()
}

const bins: { dir: string; name: string; version: string }[] = []
for (const file of new Bun.Glob("*/package.json").scanSync({ cwd: "./dist" })) {
  const item = await Bun.file(`./dist/${file}`).json()
  bins.push({
    dir: file.replace("/package.json", ""),
    name: item.name,
    version: item.version,
  })
}

const version = bins[0]?.version
if (!version) {
  throw new Error("No platform packages were found in packages/opencode/dist. Run the build first.")
}

async function clean(dir: string) {
  for (const file of new Bun.Glob("*.tgz").scanSync({ cwd: dir })) {
    await Bun.file(`${dir}/${file}`).delete()
  }
}

for (const root of roots) {
  await $`rm -rf ./dist/${root.dir}`
  await $`mkdir -p ./dist/${root.dir}/bin`
  await $`cp ${root.binSource} ./dist/${root.dir}/bin/${binary}`
  if (root.name === pkg.name) {
    await $`cp ./script/postinstall.mjs ./dist/${root.dir}/postinstall.mjs`
  }
  await Bun.file(`./dist/${root.dir}/LICENSE`).write(await Bun.file("../../LICENSE").text())
  await Bun.file(`./dist/${root.dir}/README.md`).write(await getRootReadme(root))
  await Bun.file(`./dist/${root.dir}/package.json`).write(
    JSON.stringify(
      {
        name: root.name,
        version,
        type: "module",
        license: pkg.license,
        description: root.description,
        homepage: pkg.homepage,
        repository: pkg.repository,
        keywords: pkg.keywords,
        bin: Object.fromEntries(commands.map((cmd) => [cmd, `./bin/${binary}`])),
        scripts: root.scripts,
        ...("optionalDependencies" in root
          ? {
              optionalDependencies: Object.fromEntries(bins.map((item) => [item.name, item.version])),
              platformScope: root.platformScope,
            }
          : {
              dependencies: {
                [root.dependency]: version,
              },
            }),
        publishConfig: {
          access: "public",
        },
      },
      null,
      2,
    ),
  )
}

await Promise.all(
  bins.map(async (item) => {
    if (process.platform !== "win32") {
      await $`chmod -R 755 .`.cwd(`./dist/${item.dir}`)
    }
    await clean(`./dist/${item.dir}`)
    await $`bun pm pack`.cwd(`./dist/${item.dir}`)
    await $`npm publish *.tgz --access public --tag ${Script.channel}`.cwd(`./dist/${item.dir}`)
  }),
)

for (const root of roots) {
  if (process.platform !== "win32") {
    await $`chmod -R 755 .`.cwd(`./dist/${root.dir}`)
  }
  await clean(`./dist/${root.dir}`)
  await $`bun pm pack`.cwd(`./dist/${root.dir}`)
  await $`npm publish *.tgz --access public --tag ${Script.channel}`.cwd(`./dist/${root.dir}`)
}
