import { reserveEstimate, reserveTokens, settleTokens } from '../token-budget.js';
import type { IAIProvider } from "../provider.interface.js";
import type { AIRequest, AIResponse, AIProviderHealth } from "../types.js";
import { getAIConfig } from "../config.js";
import {
  AIGatewayError,
  AIProviderAuthenticationError,
  AIProviderRateLimitedError,
  AIProviderUnavailableError,
  AIProviderTimeoutError,
  AIStructuredOutputError,
} from "../errors.js";

/** Server-only adapter. No automatic retry of possibly billed requests. */
export class GroqAIProvider implements IAIProvider {
  readonly id = "groq";
  readonly name = "Groq";
  readonly isDevelopment = false;
  get modelName() {
    return process.env.AI_MODEL?.trim() || "openai/gpt-oss-20b";
  }
  generate(request: AIRequest) {
    return this.chat(request);
  }
  async chat(request: AIRequest): Promise<AIResponse> {
    const key = process.env.GROQ_API_KEY?.trim();
    if (!key) throw new AIProviderAuthenticationError();
    const reservation = await reserveTokens(reserveEstimate(JSON.stringify({messages:request.messages,prompt:request.prompt,schema:request.jsonSchema}), request.maxTokens ?? 1500));
    const start = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      getAIConfig().requestTimeoutMs,
    );
    try {
      const messages = request.messages?.length
        ? request.messages
        : [{ role: "user", content: request.prompt || "" }];
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.modelName,
            messages,
            temperature: request.temperature ?? 0.2,
            max_completion_tokens: request.maxTokens ?? 1500,
            ...(this.modelName.startsWith("openai/gpt-oss")
              ? { reasoning_effort: "low" }
              : {}),
            ...(request.responseFormat === "json_schema"
              ? {
                  response_format: {
                    type: "json_schema",
                    json_schema: request.jsonSchema,
                  },
                }
              : request.responseFormat === "json_object"
                ? { response_format: { type: "json_object" } }
                : {}),
          }),
        },
      );
      if (response.status === 401 || response.status === 403)
        throw new AIProviderAuthenticationError();
      if (response.status === 429)
        throw new AIProviderRateLimitedError(
          "Groq capacity is currently exhausted. Wait before resuming; saved progress is safe.",
        );
      if (!response.ok)
        throw new AIProviderUnavailableError(
          `Groq could not complete this request (HTTP ${response.status}). Check the configured model and limits.`,
        );
      const data = await response.json();
      // On reconciliation failure keep the conservative reservation; do not discard a valid result.
      await settleTokens(reservation, data.usage?.total_tokens).catch(() => {});
      const choice = data.choices?.[0];
      if (
        choice?.finish_reason !== "stop" ||
        typeof choice?.message?.content !== "string" ||
        !choice.message.content.trim()
      ) {
        throw new AIStructuredOutputError(
          "The model returned an incomplete response. Resume to retry this part.",
        );
      }
      let parsedJson;
      if (request.responseFormat && request.responseFormat !== "text") {
        try {
          parsedJson = JSON.parse(choice.message.content);
        } catch {
          throw new AIStructuredOutputError();
        }
      }
      return {
        requestId: request.requestId,
        provider: this.id,
        model: this.modelName,
        text: choice.message.content,
        parsedJson,
        finishReason: "stop",
        latencyMs: Date.now() - start,
        usage: {
          inputTokens: data.usage?.prompt_tokens,
          outputTokens: data.usage?.completion_tokens,
          totalTokens: data.usage?.total_tokens,
        },
      };
    } catch (err) {
      if (controller.signal.aborted) throw new AIProviderTimeoutError();
      if (err instanceof AIGatewayError) throw err;
      throw new AIProviderUnavailableError(
        "Unable to reach Groq. Saved progress is safe; try again later.",
      );
    } finally {
      clearTimeout(timer);
    }
  }
  async checkHealth(): Promise<AIProviderHealth> {
    const base = {
      provider: this.id,
      model: this.modelName,
      isDevelopment: false,
    };
    if (!process.env.GROQ_API_KEY?.trim())
      return { ...base, available: false, status: "NOT_CONFIGURED" };
    try {
      const res = await fetch(
        `https://api.groq.com/openai/v1/models/${encodeURIComponent(this.modelName)}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY.trim()}`,
          },
          signal: AbortSignal.timeout(5000),
        },
      );
      return {
        ...base,
        available: res.ok,
        status: res.ok ? "READY" : "DEGRADED",
      };
    } catch {
      return { ...base, available: false, status: "ERROR" };
    }
  }
}
