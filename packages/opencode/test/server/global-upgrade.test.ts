import { describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { Installation } from "../../src/installation"
import { resolveGlobalUpgrade } from "../../src/server/routes/global"

function service(overrides: Partial<Installation.Interface> = {}): Installation.Interface {
  return {
    info: () => Effect.succeed({ version: "1.0.0", latest: "1.2.3" }),
    method: () => Effect.succeed("npm"),
    latest: () => Effect.succeed("1.2.3"),
    upgrade: () => Effect.void,
    ...overrides,
  }
}

describe("global upgrade route helper", () => {
  test("returns structured errors when latest lookup fails", async () => {
    const result = await Effect.runPromise(
      resolveGlobalUpgrade(
        service({
          method: () => Effect.succeed("curl"),
          latest: () =>
            Effect.die(
              new Installation.UpgradeFailedError({
                stderr: "agentswarm-cli does not support curl upgrades. Use npm instead.",
              }),
            ),
        }),
      ),
    )

    expect(result).toEqual({
      success: false,
      status: 500,
      error: "agentswarm-cli does not support curl upgrades. Use npm instead.",
    })
  })

  test("returns structured errors when upgrade fails", async () => {
    const result = await Effect.runPromise(
      resolveGlobalUpgrade(
        service({
          upgrade: () =>
            Effect.fail(
              new Installation.UpgradeFailedError({
                stderr: "npm install failed",
              }),
            ),
        }),
      ),
    )

    expect(result).toEqual({
      success: false,
      status: 500,
      error: "npm install failed",
    })
  })
})
