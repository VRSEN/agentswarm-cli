import { afterEach, describe, expect, test } from "bun:test"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { SessionCompaction } from "../../src/session/compaction"
import { SessionPrompt } from "../../src/session/prompt"
import { Identifier } from "../../src/id/id"
import { Server } from "../../src/server/server"
import { tmpdir } from "../fixture/fixture"

const compaction = SessionCompaction as any
const prompt = SessionPrompt as any
const originalCreate = SessionCompaction.create
const originalLoop = SessionPrompt.loop

afterEach(() => {
  compaction.create = originalCreate
  prompt.loop = originalLoop
})

describe("session.summarize agency-swarm", () => {
  test("uses the session's last user model instead of a mismatched request model", async () => {
    const calls: unknown[] = []
    compaction.create = (async (input: unknown) => {
      calls.push(input)
    }) as typeof SessionCompaction.create
    prompt.loop = (async () => {}) as unknown as typeof SessionPrompt.loop

    await using tmp = await tmpdir({
      git: true,
      config: {
        enabled_providers: ["agency-swarm"],
        provider: {
          "agency-swarm": {},
        },
        agent: {
          build: {
            model: "agency-swarm/default",
          },
        },
      },
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const session = await Session.create({ title: "summarize test" })
        const msg = await Session.updateMessage({
          id: Identifier.ascending("message"),
          role: "user",
          sessionID: session.id,
          agent: "build",
          model: {
            providerID: "agency-swarm",
            modelID: "default",
          },
          time: {
            created: Date.now(),
          },
        })
        await Session.updatePart({
          id: Identifier.ascending("part"),
          messageID: msg.id,
          sessionID: session.id,
          type: "text",
          text: "hello",
        })

        const app = Server.App()
        const response = await app.request(`/session/${session.id}/summarize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            providerID: "openai",
            modelID: "gpt-4.1",
          }),
        })

        expect(response.status).toBe(200)
        expect(calls).toHaveLength(1)
        expect(calls[0]).toMatchObject({
          sessionID: session.id,
          agent: "build",
          model: {
            providerID: "agency-swarm",
            modelID: "default",
          },
          auto: false,
        })
      },
    })
  })
})
