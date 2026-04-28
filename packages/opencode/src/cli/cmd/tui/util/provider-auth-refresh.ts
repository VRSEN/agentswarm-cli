type SessionStatusMap = Record<string, { type: string } | undefined>
type SessionStatusInput = SessionStatusMap | (() => SessionStatusMap)

export function hasActiveSession(status: SessionStatusMap) {
  return Object.values(status).some((item) => item && item.type !== "idle")
}

export async function refreshAfterProviderAuth(input: {
  sessionStatus: SessionStatusInput
  dispose: () => Promise<unknown>
  bootstrap: () => Promise<unknown>
  defer?: (task: () => Promise<void>) => unknown
  sleep?: (ms: number) => Promise<unknown>
}) {
  if (hasActiveSession(readSessionStatus(input.sessionStatus))) {
    await input.bootstrap()
    ;(input.defer ?? ((task) => queueMicrotask(() => void task().catch(() => undefined))))(() =>
      refreshAfterActiveSessionsIdle({
        sessionStatus: input.sessionStatus,
        dispose: input.dispose,
        bootstrap: input.bootstrap,
        sleep: input.sleep,
      }),
    )
    return
  }

  await input.dispose()
  await input.bootstrap()
}

export async function refreshAfterActiveSessionsIdle(input: {
  sessionStatus: SessionStatusInput
  dispose: () => Promise<unknown>
  bootstrap: () => Promise<unknown>
  sleep?: (ms: number) => Promise<unknown>
}) {
  while (hasActiveSession(readSessionStatus(input.sessionStatus))) {
    await (input.sleep ?? sleep)(1000)
  }
  await input.dispose()
  await input.bootstrap()
}

function readSessionStatus(input: SessionStatusInput) {
  return typeof input === "function" ? input() : input
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
