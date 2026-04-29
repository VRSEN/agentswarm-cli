import { describe, expect, test } from "bun:test"
import {
  cancelQueuedRunModeMessages,
  collectQueuedRunModeMessages,
} from "../../../src/cli/cmd/tui/util/run-queued-messages"

describe("run-mode queued messages", () => {
  test("finds user messages queued after the active assistant turn", () => {
    const queued = collectQueuedRunModeMessages({
      messages: [
        {
          id: "msg_1",
          role: "user",
          sessionID: "ses_1",
          time: { created: 1 },
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
        },
        {
          id: "msg_2",
          role: "assistant",
          sessionID: "ses_1",
          parentID: "msg_1",
          time: { created: 2 },
          agent: "build",
          mode: "build",
          path: { cwd: "/tmp", root: "/tmp" },
          cost: 0,
          tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
          providerID: "agency-swarm",
          modelID: "default",
        },
        {
          id: "msg_3",
          role: "user",
          sessionID: "ses_1",
          time: { created: 3 },
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
        },
        {
          id: "msg_4",
          role: "user",
          sessionID: "ses_1",
          time: { created: 4 },
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
        },
      ],
      parts: {
        msg_3: [{ id: "part_1", sessionID: "ses_1", messageID: "msg_3", type: "text", text: "second" }],
        msg_4: [{ id: "part_2", sessionID: "ses_1", messageID: "msg_4", type: "text", text: "third" }],
      },
    })

    expect(queued.map((item) => item.message.id)).toEqual(["msg_3", "msg_4"])
    expect(queued.map((item) => item.prompt.input)).toEqual(["second", "third"])
  })

  test("queued cancel removes queued Run-mode user messages without aborting the active turn", async () => {
    const calls: string[] = []

    const removed = await cancelQueuedRunModeMessages({
      frameworkMode: true,
      messages: [
        {
          id: "msg_1",
          role: "user",
          sessionID: "ses_1",
          time: { created: 1 },
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
        },
        {
          id: "msg_2",
          role: "assistant",
          sessionID: "ses_1",
          parentID: "msg_1",
          time: { created: 2 },
          agent: "build",
          mode: "build",
          path: { cwd: "/tmp", root: "/tmp" },
          cost: 0,
          tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
          providerID: "agency-swarm",
          modelID: "default",
        },
        {
          id: "msg_3",
          role: "user",
          sessionID: "ses_1",
          time: { created: 3 },
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
        },
      ],
      parts: {},
      abort: async () => {
        calls.push("abort")
      },
      deleteMessage: async (messageID) => {
        calls.push(`delete:${messageID}`)
      },
    })

    expect(removed.map((item) => item.message.id)).toEqual(["msg_3"])
    expect(calls).toEqual(["delete:msg_3"])
  })

  test("queued cancel aborts the active turn when there are no queued messages", async () => {
    const calls: string[] = []

    const removed = await cancelQueuedRunModeMessages({
      frameworkMode: true,
      messages: [
        {
          id: "msg_1",
          role: "user",
          sessionID: "ses_1",
          time: { created: 1 },
          agent: "build",
          model: { providerID: "agency-swarm", modelID: "default" },
        },
        {
          id: "msg_2",
          role: "assistant",
          sessionID: "ses_1",
          parentID: "msg_1",
          time: { created: 2 },
          agent: "build",
          mode: "build",
          path: { cwd: "/tmp", root: "/tmp" },
          cost: 0,
          tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
          providerID: "agency-swarm",
          modelID: "default",
        },
      ],
      parts: {},
      abort: async () => {
        calls.push("abort")
      },
      deleteMessage: async (messageID) => {
        calls.push(`delete:${messageID}`)
      },
    })

    expect(removed).toEqual([])
    expect(calls).toEqual(["abort"])
  })
})
