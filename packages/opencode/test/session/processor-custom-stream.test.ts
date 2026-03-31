import { afterEach, describe, expect, test } from "bun:test"
import { Agent } from "../../src/agent/agent"
import { Instance } from "../../src/project/instance"
import { Provider } from "../../src/provider/provider"
import { Session } from "../../src/session"
import { MessageV2 } from "../../src/session/message-v2"
import { SessionCompaction } from "../../src/session/compaction"
import { SessionProcessor } from "../../src/session/processor"
import { SessionPrompt } from "../../src/session/prompt"
import { SessionSummary } from "../../src/session/summary"
import { Identifier } from "../../src/id/id"
import { tmpdir } from "../fixture/fixture"

describe("session.processor custom stream", () => {
  const compaction = SessionCompaction as any
  const summary = SessionSummary as any
  const originalIsOverflow = SessionCompaction.isOverflow
  const originalSummarize = SessionSummary.summarize

  afterEach(() => {
    compaction.isOverflow = originalIsOverflow
    summary.summarize = originalSummarize
  })

  test("processes cancelled finish-step from custom stream when abort is already set", async () => {
    compaction.isOverflow = (async () => false) as typeof SessionCompaction.isOverflow
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
        const session = await Session.create({ title: "Processor cancel stream test" })
        const created = await SessionPrompt.prompt({
          sessionID: session.id,
          agent: "build",
          noReply: true,
          parts: [{ type: "text", text: "hello" }],
        })
        if (created.info.role !== "user") throw new Error("Expected user message")

        const user = created.info
        const model = await Provider.getModel(user.model.providerID, user.model.modelID)
        const agent = await Agent.get(user.agent)
        if (!agent) throw new Error("Expected agent")

        const assistantMessage = (await Session.updateMessage({
          id: Identifier.ascending("message"),
          parentID: user.id,
          role: "assistant",
          mode: agent.name,
          agent: agent.name,
          variant: user.variant,
          path: {
            cwd: Instance.directory,
            root: Instance.worktree,
          },
          cost: 0,
          tokens: {
            input: 0,
            output: 0,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
          modelID: model.id,
          providerID: model.providerID,
          time: {
            created: Date.now(),
          },
          sessionID: session.id,
        })) as MessageV2.Assistant

        const abort = new AbortController()
        abort.abort()
        const processor = SessionProcessor.create({
          assistantMessage,
          sessionID: session.id,
          model,
          abort: abort.signal,
        })

        const result = await processor.process({
          user,
          agent,
          abort: abort.signal,
          sessionID: session.id,
          system: [],
          messages: [],
          tools: {},
          model,
          createStream: async () => ({
            fullStream: (async function* () {
              yield { type: "start" as const }
              yield { type: "start-step" as const }
              yield {
                type: "finish-step" as const,
                finishReason: "cancelled",
                usage: {
                  inputTokens: 0,
                  outputTokens: 0,
                  totalTokens: 0,
                },
              }
              yield { type: "finish" as const }
            })(),
          }),
        })

        expect(result).toBe("continue")
        expect(processor.message.finish).toBe("cancelled")
        expect(processor.message.error).toBeUndefined()
      },
    })
  })

  test("marks message finish as error when custom stream emits terminal error without finish-step", async () => {
    compaction.isOverflow = (async () => false) as typeof SessionCompaction.isOverflow
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
        const session = await Session.create({ title: "Processor stream error finish test" })
        const created = await SessionPrompt.prompt({
          sessionID: session.id,
          agent: "build",
          noReply: true,
          parts: [{ type: "text", text: "hello" }],
        })
        if (created.info.role !== "user") throw new Error("Expected user message")

        const user = created.info
        const model = await Provider.getModel(user.model.providerID, user.model.modelID)
        const agent = await Agent.get(user.agent)
        if (!agent) throw new Error("Expected agent")

        const assistantMessage = (await Session.updateMessage({
          id: Identifier.ascending("message"),
          parentID: user.id,
          role: "assistant",
          mode: agent.name,
          agent: agent.name,
          variant: user.variant,
          path: {
            cwd: Instance.directory,
            root: Instance.worktree,
          },
          cost: 0,
          tokens: {
            input: 0,
            output: 0,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
          modelID: model.id,
          providerID: model.providerID,
          time: {
            created: Date.now(),
          },
          sessionID: session.id,
        })) as MessageV2.Assistant

        const abort = new AbortController()
        const processor = SessionProcessor.create({
          assistantMessage,
          sessionID: session.id,
          model,
          abort: abort.signal,
        })

        const result = await processor.process({
          user,
          agent,
          abort: abort.signal,
          sessionID: session.id,
          system: [],
          messages: [],
          tools: {},
          model,
          createStream: async () => ({
            fullStream: (async function* () {
              yield { type: "start" as const }
              yield { type: "start-step" as const }
              yield {
                type: "error" as const,
                error: new Error("stream boom"),
              }
            })(),
          }),
        })

        expect(result).toBe("stop")
        expect(processor.message.finish).toBe("error")
        expect(processor.message.error).toBeDefined()
      },
    })
  })
})
