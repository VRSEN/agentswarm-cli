#!/usr/bin/env bun
import { $ } from "bun"
import pkg from "../package.json"
import { Script } from "@opencode-ai/script"
import { fileURLToPath } from "url"

const dir = fileURLToPath(new URL("..", import.meta.url))
process.chdir(dir)

const binary = "agency"
const commands = ["agentswarm"]
const roots = [pkg.name]
const bins: Record<string, string> = {}
for (const file of new Bun.Glob("*/package.json").scanSync({ cwd: "./dist" })) {
  const item = await Bun.file(`./dist/${file}`).json()
  bins[item.name] = item.version
}

const version = Object.values(bins)[0]
if (!version) {
  throw new Error("No platform packages were found in packages/opencode/dist. Run the build first.")
}

async function clean(dir: string) {
  for (const file of new Bun.Glob("*.tgz").scanSync({ cwd: dir })) {
    await Bun.file(`${dir}/${file}`).delete()
  }
}

for (const root of roots) {
  await $`rm -rf ./dist/${root}`
  await $`mkdir -p ./dist/${root}`
  await $`cp -r ./bin ./dist/${root}/bin`
  await $`cp ./script/postinstall.mjs ./dist/${root}/postinstall.mjs`
  await Bun.file(`./dist/${root}/LICENSE`).write(await Bun.file("../../LICENSE").text())
  await Bun.file(`./dist/${root}/README.md`).write(await Bun.file("./README.md").text())
  await Bun.file(`./dist/${root}/package.json`).write(
    JSON.stringify(
      {
        name: root,
        version,
        type: "module",
        license: pkg.license,
        description: pkg.description,
        homepage: pkg.homepage,
        repository: pkg.repository,
        keywords: pkg.keywords,
        bin: Object.fromEntries(commands.map((cmd) => [cmd, `./bin/${binary}`])),
        scripts: {
          postinstall: "bun ./postinstall.mjs || node ./postinstall.mjs",
        },
        optionalDependencies: bins,
        publishConfig: {
          access: "public",
        },
      },
      null,
      2,
    ),
  )
}

for (const name of Object.keys(bins)) {
  if (process.platform !== "win32") {
    await $`chmod -R 755 .`.cwd(`./dist/${name}`)
  }
  await clean(`./dist/${name}`)
  await $`bun pm pack`.cwd(`./dist/${name}`)
  await $`npm publish *.tgz --access public --tag ${Script.channel}`.cwd(`./dist/${name}`)
}

for (const root of roots) {
  if (process.platform !== "win32") {
    await $`chmod -R 755 .`.cwd(`./dist/${root}`)
  }
  await clean(`./dist/${root}`)
  await $`bun pm pack`.cwd(`./dist/${root}`)
  await $`npm publish *.tgz --access public --tag ${Script.channel}`.cwd(`./dist/${root}`)
}
