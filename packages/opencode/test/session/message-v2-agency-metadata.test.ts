import { describe, expect, test } from "bun:test"
import { MessageV2 } from "../../src/session/message-v2"
import type { Provider } from "../../src/provider/index"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { MessageID, PartID, SessionID } from "../../src/session/schema"

const sessionID = SessionID.make("session")
const providerID = ProviderID.make("test")
const model: Provider.Model = {
  id: ModelID.make("test-model"),
  providerID,
  api: {
    id: "test-model",
    url: "https://example.com",
    npm: "@ai-sdk/openai",
  },
  name: "Test Model",
  capabilities: {
    temperature: true,
    reasoning: false,
    attachment: false,
    toolcall: true,
    input: {
      text: true,
      audio: false,
      image: false,
      video: false,
      pdf: false,
    },
    output: {
      text: true,
      audio: false,
      image: false,
      video: false,
      pdf: false,
    },
    interleaved: false,
  },
  cost: {
    input: 0,
    output: 0,
    cache: {
      read: 0,
      write: 0,
    },
  },
  limit: {
    context: 0,
    input: 0,
    output: 0,
  },
  status: "active",
  options: {},
  headers: {},
  release_date: "2026-01-01",
}

describe("session.message-v2 Agency metadata", () => {
  test("drops flat assistant metadata before model prompt conversion", async () => {
    const assistantID = MessageID.make("msg_assistant")
    const input: MessageV2.WithParts[] = [
      {
        info: assistantInfo(assistantID),
        parts: [
          {
            ...basePart(assistantID, "prt_reasoning"),
            type: "reasoning",
            text: "thinking",
            time: { start: 0 },
            metadata: {
              agent: "Slides Agent",
              callerAgent: "Orchestrator",
              agent_run_id: "agent_run_123",
              item_id: "rs_flat",
              summary_index: 0,
              output_index: 0,
              encrypted_content: "encrypted",
              openai: {
                itemId: "rs_123",
              },
            },
          },
          {
            ...basePart(assistantID, "prt_answer"),
            type: "text",
            text: "answer",
            metadata: {
              agent: "Slides Agent",
              callerAgent: null,
            },
          },
          {
            ...basePart(assistantID, "prt_flat"),
            type: "text",
            text: "flat only",
            metadata: {
              item_id: "msg_flat",
              summary_index: 1,
            },
          },
        ] as MessageV2.Part[],
      },
    ]

    expect(await MessageV2.toModelMessages(input, model)).toStrictEqual([
      {
        role: "assistant",
        content: [
          {
            type: "reasoning",
            text: "thinking",
            providerOptions: {
              openai: {
                itemId: "rs_123",
              },
            },
          },
          { type: "text", text: "answer" },
          { type: "text", text: "flat only" },
        ],
      },
    ])
  })

  test("drops flat Agency tool metadata before model prompt conversion", async () => {
    const assistantID = MessageID.make("msg_tool_assistant")
    const input: MessageV2.WithParts[] = [
      {
        info: assistantInfo(assistantID),
        parts: [
          {
            ...basePart(assistantID, "prt_tool_1"),
            type: "tool",
            callID: "call_1",
            tool: "send_message",
            state: {
              status: "completed",
              input: { message: "continue" },
              output: "done",
              title: "send_message",
              metadata: {},
              time: { start: 0, end: 1 },
            },
            metadata: {
              parent_run_id: "run_parent",
            },
          },
        ] as MessageV2.Part[],
      },
    ]

    expect(await MessageV2.toModelMessages(input, model)).toStrictEqual([
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "call_1",
            toolName: "send_message",
            input: { message: "continue" },
            providerExecuted: undefined,
          },
        ],
      },
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "call_1",
            toolName: "send_message",
            output: { type: "text", value: "done" },
          },
        ],
      },
    ])
  })
})

function assistantInfo(id: MessageID): MessageV2.Assistant {
  return {
    id,
    sessionID,
    role: "assistant",
    time: { created: 0 },
    parentID: "m-parent",
    modelID: model.api.id,
    providerID,
    mode: "",
    agent: "agent",
    path: { cwd: "/", root: "/" },
    cost: 0,
    tokens: {
      input: 0,
      output: 0,
      reasoning: 0,
      cache: { read: 0, write: 0 },
    },
  } as unknown as MessageV2.Assistant
}

function basePart(messageID: MessageID, id: string) {
  return {
    id: PartID.make(id),
    sessionID,
    messageID,
  }
}
