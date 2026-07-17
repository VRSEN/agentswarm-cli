import { describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import * as ts from "typescript"

const root = new URL("../../", import.meta.url)

async function source(path: string) {
  const url = new URL(path, root)
  return ts.createSourceFile(path, await Bun.file(url).text(), ts.ScriptTarget.Latest, true)
}

async function declaredProductEnvNames() {
  const file = await source("src/agency-swarm/product.ts")
  return file.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => statement.declarationList.declarations)
    .map((item) => item.name)
    .filter(ts.isIdentifier)
    .map((item) => item.text)
    .filter((name) => name.startsWith("AGENTSWARM_PRODUCT_"))
}

async function buildProductEnvNames() {
  const file = await source("script/build.ts")
  const statement = file.statements.find(
    (item): item is ts.VariableStatement =>
      ts.isVariableStatement(item) &&
      item.declarationList.declarations.some(
        (declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === "productEnvNames",
      ),
  )
  const declaration = statement?.declarationList.declarations.find(
    (item) => ts.isIdentifier(item.name) && item.name.text === "productEnvNames",
  )
  const array = declaration?.initializer
  if (!array || !ts.isAsExpression(array) || !ts.isArrayLiteralExpression(array.expression)) {
    throw new Error("expected productEnvNames to be an array literal")
  }
  return array.expression.elements
    .map((item) => {
      if (!ts.isStringLiteral(item)) throw new Error("expected productEnvNames item to be a string literal")
      return item.text
    })
    .filter((name) => name.startsWith("AGENTSWARM_PRODUCT_"))
}

describe("product build config", () => {
  test("defines every declared product env name", async () => {
    expect(await buildProductEnvNames()).toEqual(await declaredProductEnvNames())
  })

  test("rejects an empty model catalog without changing the generated snapshot", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "agentswarm-models-"))
    const packageRoot = path.join(directory, "packages", "opencode")
    const script = path.join(packageRoot, "script", "generate.ts")
    const snapshot = path.join(directory, "packages", "core", "src", "models-snapshot.js")
    const snapshotDeclaration = path.join(directory, "packages", "core", "src", "models-snapshot.d.ts")
    const fixture = path.join(directory, "models.json")
    const originalSnapshot = "snapshot sentinel\n"
    const originalDeclaration = "declaration sentinel\n"
    await mkdir(path.dirname(script), { recursive: true })
    await mkdir(path.dirname(snapshot), { recursive: true })
    await Bun.write(script, await Bun.file(new URL("script/generate.ts", root)).text())
    await Bun.write(snapshot, originalSnapshot)
    await Bun.write(snapshotDeclaration, originalDeclaration)
    await Bun.write(fixture, "{}")

    let result:
      | {
          exitCode: number
          output: string
          generatedSnapshot: string
          generatedDeclaration: string
        }
      | undefined
    try {
      const generate = Bun.spawn(["bun", "script/generate.ts"], {
        cwd: packageRoot,
        env: { ...process.env, MODELS_DEV_API_JSON: fixture },
        stdout: "pipe",
        stderr: "pipe",
      })
      const [exitCode, stdout, stderr] = await Promise.all([
        generate.exited,
        new Response(generate.stdout).text(),
        new Response(generate.stderr).text(),
      ])
      result = {
        exitCode,
        output: `${stdout}\n${stderr}`,
        generatedSnapshot: await Bun.file(snapshot).text(),
        generatedDeclaration: await Bun.file(snapshotDeclaration).text(),
      }
    } finally {
      await rm(directory, { recursive: true, force: true })
    }

    if (!result) throw new Error("generate script did not complete")
    expect(result.exitCode).not.toBe(0)
    expect(result.output).toContain("Model catalog must contain at least one provider and one model")
    expect(result.generatedSnapshot).toBe(originalSnapshot)
    expect(result.generatedDeclaration).toBe(originalDeclaration)
  })
})
