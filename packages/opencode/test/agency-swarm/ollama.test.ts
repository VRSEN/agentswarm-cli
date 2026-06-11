import { describe, expect, test } from "bun:test"
import { AgencySwarmOllama } from "../../src/agency-swarm/ollama"

describe("AgencySwarmOllama", () => {
  test("isModelListed matches Ollama tag names and model ids", () => {
    const tags = {
      models: [{ name: "gemma4:e4b", model: "gemma4:e4b" }, { name: "qwen3:8b" }, { model: "llama3.1:8b" }],
    }

    expect(AgencySwarmOllama.isModelListed("gemma4:e4b", tags)).toBe(true)
    expect(AgencySwarmOllama.isModelListed("qwen3:8b", tags)).toBe(true)
    expect(AgencySwarmOllama.isModelListed("llama3.1:8b", tags)).toBe(true)
    expect(AgencySwarmOllama.isModelListed("qwen3:4b", tags)).toBe(false)
  })

  test("isModelListed treats tagless names as latest", () => {
    const tags = {
      models: [{ name: "llama3.2:latest" }, { model: "qwen2.5:latest" }],
    }

    expect(AgencySwarmOllama.isModelListed("llama3.2", tags)).toBe(true)
    expect(AgencySwarmOllama.isModelListed("qwen2.5", tags)).toBe(true)
    expect(AgencySwarmOllama.isModelListed("llama3.2:latest", tags)).toBe(true)
    expect(AgencySwarmOllama.isModelListed("llama3.2:3b", tags)).toBe(false)
  })

  test("parsePullProgress reads Ollama JSON progress", () => {
    expect(AgencySwarmOllama.parsePullProgress('{"status":"downloading","completed":50,"total":200}')).toEqual({
      status: "downloading",
      completed: 50,
      total: 200,
      percent: 25,
    })
  })

  test("parsePullProgress reads CLI percent progress", () => {
    expect(AgencySwarmOllama.parsePullProgress("pulling manifest 42%")).toEqual({
      status: "pulling manifest 42%",
      percent: 42,
    })
  })

  test("formatProgressBar renders known and unknown progress", () => {
    expect(AgencySwarmOllama.formatProgressBar(undefined)).toBe("[--------------------] --%")
    expect(AgencySwarmOllama.formatProgressBar(25)).toBe("[#####---------------] 25%")
  })
})
