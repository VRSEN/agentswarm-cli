import { afterEach, describe, expect, test } from "bun:test"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { SessionPrompt } from "../../src/session/prompt"
import { SessionAgencySwarm } from "../../src/session/agency-swarm"
import { SessionCompaction } from "../../src/session/compaction"
import { SessionSummary } from "../../src/session/summary"
import { tmpdir } from "../fixture/fixture"

describe("session.prompt agency-swarm", () => {
  const compaction = SessionCompaction as any
  const summary = SessionSummary as any
  const originalStream = SessionAgencySwarm.stream
  const originalIsOverflow = SessionCompaction.isOverflow
  const originalCreate = SessionCompaction.create
  const originalSummarize = SessionSummary.summarize

  afterEach(() => {
    SessionAgencySwarm.stream = originalStream
    compaction.isOverflow = originalIsOverflow
    compaction.create = originalCreate
    summary.summarize = originalSummarize
  })

  test("schedules compaction when agency processor returns compact", async () => {
    const calls: unknown[] = []

    SessionAgencySwarm.stream = (async () => {
      const fullStream = (async function* () {
        yield { type: "start" }
        yield { type: "start-step" }
        yield {
          type: "finish-step",
          finishReason: "stop",
          usage: {
            inputTokens: 1,
            outputTokens: 1,
            totalTokens: 2,
          },
        }
        yield { type: "finish" }
      })()
      return { fullStream }
    }) as typeof SessionAgencySwarm.stream

    compaction.isOverflow = (async () => true) as typeof SessionCompaction.isOverflow
    compaction.create = (async (input: unknown) => {
      calls.push(input)
    }) as typeof SessionCompaction.create
    summary.summarize = Object.assign(async () => {}, {
      force: async () => {},
      schema: originalSummarize.schema,
    })

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
        const session = await Session.create({ title: "Agency Swarm Compaction Test" })
        const result = await SessionPrompt.prompt({
          sessionID: session.id,
          agent: "build",
          parts: [{ type: "text", text: "hello" }],
        })

        expect(result.info.role).toBe("assistant")
        expect(calls).toHaveLength(1)
        expect(calls[0]).toMatchObject({
          sessionID: session.id,
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
          auto: true,
        })
      },
    })
  })
})
