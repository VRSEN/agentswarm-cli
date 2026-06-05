import { Installation } from "@/installation"
import { Cause, Effect } from "effect"

export { GlobalApi, GlobalPaths, GlobalUpgradeInput } from "./instance/httpapi/groups/global"

type UpgradeResult =
  | { success: true; status: 200; version: string }
  | { success: false; status: 400 | 500; error: string }

function upgradeErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "stderr" in error && typeof error.stderr === "string") return error.stderr
  if (error instanceof Error && error.message) return error.message
  return String(error)
}

export function resolveGlobalUpgrade(svc: Installation.Interface, target?: string): Effect.Effect<UpgradeResult> {
  return Effect.gen(function* () {
    const method = yield* svc.method()
    const next = target || (yield* svc.latest(method === "unknown" ? "npm" : method))
    yield* svc.upgrade(method, next)
    return { success: true as const, status: 200 as const, version: next }
  }).pipe(
    Effect.catchCause((cause) =>
      Effect.succeed({
        success: false as const,
        status: 500 as const,
        error: upgradeErrorMessage(Cause.squash(cause)),
      }),
    ),
  )
}
