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
  await $`rm -rf ./dist/${root}`
  await $`mkdir -p ./dist/${root}/bin`
  await $`cp ./bin/${binary} ./dist/${root}/bin/${binary}`
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
        optionalDependencies: Object.fromEntries(bins.map((item) => [item.name, item.version])),
        platformScope: pkg.platformScope,
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
    await $`chmod -R 755 .`.cwd(`./dist/${root}`)
  }
  await clean(`./dist/${root}`)
  await $`bun pm pack`.cwd(`./dist/${root}`)
  await $`npm publish *.tgz --access public --tag ${Script.channel}`.cwd(`./dist/${root}`)
}
