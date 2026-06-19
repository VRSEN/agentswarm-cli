import { describe, expect, test } from "bun:test"
import {
  CodexAuthPlugin,
  parseJwtClaims,
  extractAccountIdFromClaims,
  extractAccountId,
  type IdTokenClaims,
} from "../../src/plugin/codex"
import type { Auth, Model, Provider } from "@opencode-ai/sdk/v2"

function createTestJwt(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url")
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
  return `${header}.${body}.sig`
}

function createModel(id: string, apiID = id): Model {
  return {
    id,
    providerID: "openai",
    api: {
      id: apiID,
      url: "https://api.openai.com/v1",
      npm: "@ai-sdk/openai",
    },
    name: id,
    capabilities: {
      temperature: true,
      reasoning: true,
      attachment: false,
      toolcall: true,
      input: {
        text: true,
        audio: false,
        image: true,
        video: false,
        pdf: true,
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
      input: 1,
      output: 2,
      cache: {
        read: 3,
        write: 4,
      },
    },
    limit: {
      context: 128_000,
      output: 16_384,
    },
    status: "active",
    options: {},
    headers: {},
    release_date: "2026-01-01",
  }
}

function createProvider(models: Record<string, Model>): Provider {
  return {
    id: "openai",
    name: "OpenAI",
    source: "api",
    env: [],
    options: {},
    models,
  }
}

async function loadModels(provider: Provider, auth: Auth | undefined) {
  const hooks = await CodexAuthPlugin({} as never)
  const models = hooks.provider?.models
  if (!models) throw new Error("Codex provider hook missing")
  return models(provider, { auth })
}

describe("plugin.codex", () => {
  describe("models", () => {
    test("keeps recommended Codex OAuth visible model keys", async () => {
      const result = await loadModels(
        createProvider({
          "gpt-5.5": createModel("gpt-5.5"),
          "gpt-5.5-2026-06-18": createModel("gpt-5.5-2026-06-18", "gpt-5.5"),
          "gpt-5.5-fast": createModel("gpt-5.5-fast", "gpt-5.5"),
          "gpt-5.5-pro": createModel("gpt-5.5-pro", "gpt-5.5"),
          "gpt-5.4": createModel("gpt-5.4"),
          "gpt-5.4-2026-06-18": createModel("gpt-5.4-2026-06-18", "gpt-5.4"),
          "gpt-5.4-fast": createModel("gpt-5.4-fast", "gpt-5.4"),
          "gpt-5.4-nano": createModel("gpt-5.4-nano"),
          "gpt-5.4-pro": createModel("gpt-5.4-pro", "gpt-5.4"),
          "gpt-5.4-mini": createModel("gpt-5.4-mini"),
          "gpt-5.4-mini-2026-06-18": createModel("gpt-5.4-mini-2026-06-18", "gpt-5.4-mini"),
          "gpt-5.4-mini-fast": createModel("gpt-5.4-mini-fast", "gpt-5.4-mini"),
          "gpt-5.4-mini-pro": createModel("gpt-5.4-mini-pro", "gpt-5.4-mini"),
          "gpt-5.3-codex-spark": createModel("gpt-5.3-codex-spark"),
          "gpt-5.2": createModel("gpt-5.2"),
          "gpt-5.3-codex": createModel("gpt-5.3-codex"),
        }),
        {
          type: "oauth",
          refresh: "refresh",
          access: "access",
          expires: Date.now() + 60_000,
        },
      )

      expect(Object.keys(result)).toEqual(["gpt-5.5", "gpt-5.4", "gpt-5.4-mini", "gpt-5.3-codex-spark"])
      expect(result["gpt-5.2"]).toBeUndefined()
      expect(result["gpt-5.3-codex"]).toBeUndefined()
      expect(result["gpt-5.4-mini"]?.cost).toEqual({
        input: 0,
        output: 0,
        cache: { read: 0, write: 0 },
      })
      expect(result["gpt-5.4-mini"]?.limit).toEqual({
        context: 128_000,
        output: 16_384,
      })
      expect(result["gpt-5.5"]?.limit).toEqual({
        context: 400_000,
        input: 272_000,
        output: 128_000,
      })
    })

    test("hides Codex OAuth models with unsupported API ids", async () => {
      const result = await loadModels(
        createProvider({
          "gpt-5.4": createModel("gpt-5.4", "gpt-5.4-nano"),
          "gpt-5.4-mini": createModel("gpt-5.4-mini"),
        }),
        {
          type: "oauth",
          refresh: "refresh",
          access: "access",
          expires: Date.now() + 60_000,
        },
      )

      expect(Object.keys(result)).toEqual(["gpt-5.4-mini"])
      expect(result["gpt-5.4"]).toBeUndefined()
    })

    test("keeps API key models unfiltered", async () => {
      const provider = createProvider({
        "gpt-5.2": createModel("gpt-5.2"),
        "gpt-5.3-codex": createModel("gpt-5.3-codex"),
        "gpt-5.3-codex-spark": createModel("gpt-5.3-codex-spark"),
        "gpt-5.4": createModel("gpt-5.4", "gpt-5.4-nano"),
        "gpt-5.4-nano": createModel("gpt-5.4-nano"),
        "gpt-5.4-mini": createModel("gpt-5.4-mini"),
        "gpt-5.4-mini-2026-06-18": createModel("gpt-5.4-mini-2026-06-18", "gpt-5.4-mini"),
        "gpt-5.5": createModel("gpt-5.5"),
        "gpt-5.5-fast": createModel("gpt-5.5-fast", "gpt-5.5"),
        "gpt-5.5-pro": createModel("gpt-5.5-pro", "gpt-5.5"),
      })

      const result = await loadModels(provider, {
        type: "api",
        key: "sk-test",
      })

      expect(result).toBe(provider.models)
    })
  })

  describe("parseJwtClaims", () => {
    test("parses valid JWT with claims", () => {
      const payload = { email: "test@example.com", chatgpt_account_id: "acc-123" }
      const jwt = createTestJwt(payload)
      const claims = parseJwtClaims(jwt)
      expect(claims).toEqual(payload)
    })

    test("returns undefined for JWT with less than 3 parts", () => {
      expect(parseJwtClaims("invalid")).toBeUndefined()
      expect(parseJwtClaims("only.two")).toBeUndefined()
    })

    test("returns undefined for invalid base64", () => {
      expect(parseJwtClaims("a.!!!invalid!!!.b")).toBeUndefined()
    })

    test("returns undefined for invalid JSON payload", () => {
      const header = Buffer.from("{}").toString("base64url")
      const invalidJson = Buffer.from("not json").toString("base64url")
      expect(parseJwtClaims(`${header}.${invalidJson}.sig`)).toBeUndefined()
    })
  })

  describe("extractAccountIdFromClaims", () => {
    test("extracts chatgpt_account_id from root", () => {
      const claims: IdTokenClaims = { chatgpt_account_id: "acc-root" }
      expect(extractAccountIdFromClaims(claims)).toBe("acc-root")
    })

    test("extracts chatgpt_account_id from nested https://api.openai.com/auth", () => {
      const claims: IdTokenClaims = {
        "https://api.openai.com/auth": { chatgpt_account_id: "acc-nested" },
      }
      expect(extractAccountIdFromClaims(claims)).toBe("acc-nested")
    })

    test("prefers root over nested", () => {
      const claims: IdTokenClaims = {
        chatgpt_account_id: "acc-root",
        "https://api.openai.com/auth": { chatgpt_account_id: "acc-nested" },
      }
      expect(extractAccountIdFromClaims(claims)).toBe("acc-root")
    })

    test("extracts from organizations array as fallback", () => {
      const claims: IdTokenClaims = {
        organizations: [{ id: "org-123" }, { id: "org-456" }],
      }
      expect(extractAccountIdFromClaims(claims)).toBe("org-123")
    })

    test("returns undefined when no accountId found", () => {
      const claims: IdTokenClaims = { email: "test@example.com" }
      expect(extractAccountIdFromClaims(claims)).toBeUndefined()
    })
  })

  describe("extractAccountId", () => {
    test("extracts from id_token first", () => {
      const idToken = createTestJwt({ chatgpt_account_id: "from-id-token" })
      const accessToken = createTestJwt({ chatgpt_account_id: "from-access-token" })
      expect(
        extractAccountId({
          id_token: idToken,
          access_token: accessToken,
          refresh_token: "rt",
        }),
      ).toBe("from-id-token")
    })

    test("falls back to access_token when id_token has no accountId", () => {
      const idToken = createTestJwt({ email: "test@example.com" })
      const accessToken = createTestJwt({
        "https://api.openai.com/auth": { chatgpt_account_id: "from-access" },
      })
      expect(
        extractAccountId({
          id_token: idToken,
          access_token: accessToken,
          refresh_token: "rt",
        }),
      ).toBe("from-access")
    })

    test("returns undefined when no tokens have accountId", () => {
      const token = createTestJwt({ email: "test@example.com" })
      expect(
        extractAccountId({
          id_token: token,
          access_token: token,
          refresh_token: "rt",
        }),
      ).toBeUndefined()
    })

    test("handles missing id_token", () => {
      const accessToken = createTestJwt({ chatgpt_account_id: "acc-123" })
      expect(
        extractAccountId({
          id_token: "",
          access_token: accessToken,
          refresh_token: "rt",
        }),
      ).toBe("acc-123")
    })
  })
})
