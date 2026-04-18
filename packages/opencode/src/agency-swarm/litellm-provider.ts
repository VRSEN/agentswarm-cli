const LITELLM_PROVIDER_IDS = new Set([
  "a2a",
  "a2a_agent",
  "ai21",
  "ai21_chat",
  "aiml",
  "aiohttp_openai",
  "amazon_nova",
  "anthropic",
  "anthropic_text",
  "apertis",
  "assemblyai",
  "auto_router",
  "aws_polly",
  "azure",
  "azure_ai",
  "azure_text",
  "baseten",
  "bedrock",
  "bedrock_mantle",
  "black_forest_labs",
  "bytez",
  "cerebras",
  "charity_engine",
  "chatgpt",
  "chutes",
  "clarifai",
  "cloudflare",
  "codestral",
  "cohere",
  "cohere_chat",
  "cometapi",
  "compactifai",
  "cursor",
  "custom",
  "custom_openai",
  "dashscope",
  "databricks",
  "datarobot",
  "deepgram",
  "deepinfra",
  "deepseek",
  "docker_model_runner",
  "dotprompt",
  "elevenlabs",
  "empower",
  "fal_ai",
  "featherless_ai",
  "fireworks_ai",
  "friendliai",
  "galadriel",
  "gemini",
  "gigachat",
  "github",
  "github_copilot",
  "gradient_ai",
  "groq",
  "helicone",
  "heroku",
  "hosted_vllm",
  "huggingface",
  "humanloop",
  "hyperbolic",
  "infinity",
  "jina_ai",
  "lambda_ai",
  "langfuse",
  "langgraph",
  "lemonade",
  "litellm_agent",
  "litellm_proxy",
  "llamafile",
  "lm_studio",
  "manus",
  "maritalk",
  "meta_llama",
  "milvus",
  "minimax",
  "mistral",
  "moonshot",
  "morph",
  "nano-gpt",
  "nebius",
  "nlp_cloud",
  "novita",
  "nscale",
  "nvidia_nim",
  "oci",
  "ollama",
  "ollama_chat",
  "oobabooga",
  "openai",
  "openai_like",
  "openrouter",
  "ovhcloud",
  "perplexity",
  "petals",
  "pg_vector",
  "poe",
  "predibase",
  "publicai",
  "ragflow",
  "recraft",
  "replicate",
  "runwayml",
  "s3_vectors",
  "sagemaker",
  "sagemaker_chat",
  "sagemaker_nova",
  "sambanova",
  "sap",
  "snowflake",
  "stability",
  "synthetic",
  "text-completion-codestral",
  "text-completion-openai",
  "together_ai",
  "topaz",
  "triton",
  "v0",
  "vercel_ai_gateway",
  "vertex_ai",
  "vertex_ai_beta",
  "vllm",
  "volcengine",
  "voyage",
  "wandb",
  "watsonx",
  "watsonx_text",
  "xai",
  "xiaomi_mimo",
  "xinference",
  "zai",
])

const PROVIDER_ALIASES: Record<string, string> = {
  "amazon-bedrock": "bedrock",
  "github-models": "github",
  "cloudflare-ai-gateway": "cloudflare",
  "cloudflare-workers-ai": "cloudflare",
  friendli: "friendliai",
  google: "gemini",
  "google-vertex": "vertex_ai",
  lmstudio: "lm_studio",
  nova: "amazon_nova",
  "sap-ai-core": "sap",
  togetherai: "together_ai",
  vercel: "vercel_ai_gateway",
}

export function mapProviderIDToLiteLLMProvider(providerID: string): string | undefined {
  const alias = PROVIDER_ALIASES[providerID]
  if (alias && LITELLM_PROVIDER_IDS.has(alias)) return alias

  const normalized = providerID.replace(/-/g, "_")
  if (LITELLM_PROVIDER_IDS.has(normalized)) return normalized

  return undefined
}

const AGENCY_SWARM_PROVIDER_ID = "agency-swarm"

const OPENAI_LITELLM_ID = "openai"

const LITELLM_OPENAI_PREFIX = "litellm/openai/"

/** Strips `litellm/openai/` and `openai/` prefixes used when routing OpenAI models through LiteLLM. */
function stripOpenAILiteLLMRoutePrefixes(t: string): string {
  if (t.startsWith(LITELLM_OPENAI_PREFIX)) {
    return t.slice(LITELLM_OPENAI_PREFIX.length)
  }
  if (t.startsWith(`${OPENAI_LITELLM_ID}/`)) {
    return t.slice(OPENAI_LITELLM_ID.length + 1)
  }
  return t
}

/**
 * Normalize optional `client_config.model` from JSON/config (may omit `litellm/`).
 * OpenAI upstream models are stored as the bare model id only (e.g. `gpt-4o`).
 * Other `provider/model` paths get a `litellm/` prefix for LiteLLM routing.
 */
export function normalizeExplicitClientConfigModel(raw: string): string {
  const t = raw.trim()
  if (!t) return t
  const stripped = stripOpenAILiteLLMRoutePrefixes(t)
  if (stripped !== t) return stripped
  if (t.startsWith("litellm/")) return t
  if (t.includes("/")) return `litellm/${t}`
  return t
}

/**
 * Build `client_config.model` from the CLI session selection.
 * OpenAI models use the bare model id only (e.g. `gpt-4o`). Other providers use `litellm/<provider>/<model>`.
 * Skips when the session model is the agency-swarm placeholder (no LLM provider).
 */
export function buildLitellmModelForClientConfig(providerID: string, modelID: string): string | undefined {
  if (providerID === AGENCY_SWARM_PROVIDER_ID) return undefined
  const t = modelID.trim()
  if (!t) return undefined
  const stripped = stripOpenAILiteLLMRoutePrefixes(t)
  if (stripped !== t) return stripped
  if (t.startsWith("litellm/")) return t

  const slash = t.indexOf("/")
  if (slash !== -1) {
    const prefix = t.slice(0, slash)
    const rest = t.slice(slash + 1)
    const mappedPrefix = mapProviderIDToLiteLLMProvider(prefix)
    if (mappedPrefix && rest) {
      if (mappedPrefix === OPENAI_LITELLM_ID) {
        return rest
      }
      return `litellm/${mappedPrefix}/${rest}`
    }
  }

  const mapped = mapProviderIDToLiteLLMProvider(providerID)
  if (!mapped) return undefined
  if (mapped === OPENAI_LITELLM_ID) {
    return t
  }
  return `litellm/${mapped}/${t}`
}
