import { Database, eq, sql } from "@opencode-ai/console-core/drizzle/index.js"
import { ModelStickyProviderTable } from "@opencode-ai/console-core/schema/ip.sql.js"

const STICKY_PROVIDER_TTL_MS = 86_400_000

export function createStickyTracker(modelId: string, stickyProvider: "strict" | "prefer" | undefined, session: string) {
  if (!stickyProvider) return
  if (!session) return
  const id = `${modelId}/${session}`
  let _providerId: string | undefined

  return {
    get: async () => {
      const data = await Database.use((tx) =>
        tx
          .select({
            providerId: ModelStickyProviderTable.providerId,
            timeUpdated: ModelStickyProviderTable.timeUpdated,
          })
          .from(ModelStickyProviderTable)
          .where(eq(ModelStickyProviderTable.id, id))
          .limit(1),
      )
      const row = data[0]
      if (!row || Date.now() - row.timeUpdated.getTime() > STICKY_PROVIDER_TTL_MS) {
        _providerId = undefined
        return _providerId
      }
      _providerId = row.providerId
      return _providerId
    },
    set: async (providerId: string) => {
      await Database.use((tx) =>
        tx
          .insert(ModelStickyProviderTable)
          .values({
            id,
            providerId,
          })
          .onDuplicateKeyUpdate({
            set: {
              providerId,
              timeUpdated: sql`CURRENT_TIMESTAMP(3)`,
            },
          }),
      )
      _providerId = providerId
    },
  }
}
