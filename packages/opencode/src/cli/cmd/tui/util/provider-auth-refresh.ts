type SessionStatusMap = Record<string, { type: string } | undefined>

export function hasActiveSession(status: SessionStatusMap) {
  return Object.values(status).some((item) => item && item.type !== "idle")
}

export async function refreshAfterProviderAuth(input: {
  sessionStatus: SessionStatusMap
  dispose: () => Promise<unknown>
  bootstrap: () => Promise<unknown>
}) {
  if (!hasActiveSession(input.sessionStatus)) await input.dispose()
  await input.bootstrap()
}
