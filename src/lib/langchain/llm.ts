// src/lib/langchain/llm.ts
import {
  BaseChatModel,
  type BaseChatModelParams,
} from '@langchain/core/language_models/chat_models';
import {
  AIMessage,
  AIMessageChunk,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages';
import { ChatResult, ChatGeneration } from '@langchain/core/outputs';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';

const PREFIXO_LOG = '[LangChain]';

export type EstrategiaLLM = 'principal' | 'fallback';

const MODELO_PRINCIPAL = 'deepseek-v4-flash';
const MODELO_FALLBACK  = 'deepseek-v4-flash';

const CONFIG_LLM = {
  temperatura:    0.4,
  maxTokensSaida: 4096,
  timeoutMs:      8000,
  maxRetries:     1,
} as const;

// ─── Tipos internos da API DeepSeek ───────────────────────────────────────────

type ComReasoning = { reasoning_content?: string };

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  reasoning_content?: string;
  tool_call_id?: string;
  tool_calls?: DeepSeekToolCall[];
}

interface DeepSeekToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

interface DeepSeekTool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
}

interface DeepSeekChunk {
  choices: Array<{
    delta: {
      content?: string;
      reasoning_content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string;
  }>;
}

// ─── Conversão LangChain → DeepSeek ──────────────────────────────────────────

function langchainParaDeepSeek(msg: BaseMessage): DeepSeekMessage {
  const content = typeof msg.content === 'string'
    ? msg.content
    : (msg.content as Array<{ type: string; text?: string }>)
        .map(b => b.text ?? '')
        .join('');

  if (msg instanceof SystemMessage) {
    return { role: 'system', content };
  }

  if (msg instanceof HumanMessage) {
    return { role: 'user', content };
  }

  if (msg instanceof ToolMessage) {
    return {
      role: 'tool',
      content,
      tool_call_id: msg.tool_call_id,
    };
  }

  if (msg instanceof AIMessage) {
    const reasoning =
      (msg as AIMessage & ComReasoning).reasoning_content ??
      (msg.additional_kwargs?.reasoning_content as string | undefined);

    const toolCalls = msg.tool_calls?.map(tc => ({
      id: tc.id ?? '',
      type: 'function' as const,
      function: {
        name: tc.name,
        arguments: typeof tc.args === 'string' ? tc.args : JSON.stringify(tc.args),
      },
    }));

    const deepSeekMsg: DeepSeekMessage = {
      role: 'assistant',
      content: content || '',
    };

    if (reasoning) deepSeekMsg.reasoning_content = reasoning;
    if (toolCalls?.length) deepSeekMsg.tool_calls = toolCalls;

    return deepSeekMsg;
  }

  return { role: 'user', content };
}

// ─── Conversão LangChain Tool → DeepSeek Tool ────────────────────────────────

function langchainToolParaDeepSeek(t: unknown): DeepSeekTool {
  // Já está no formato DeepSeek
  if (
    typeof t === 'object' && t !== null &&
    'type' in t &&
    (t as Record<string, unknown>).type === 'function'
  ) {
    return t as DeepSeekTool;
  }

  const tool = t as Record<string, unknown>;

  const schema =
    (tool.schema as Record<string, unknown>) ??
    (tool.parameters as Record<string, unknown>) ??
    { type: 'object', properties: {} };

  const parameters: Record<string, unknown> = {
    type: 'object',
    properties: (schema.properties as Record<string, unknown>) ?? {},
    required: (schema.required as string[]) ?? [],
  };

  return {
    type: 'function',
    function: {
      name:        (tool.name as string) ?? 'unknown',
      description: (tool.description as string) ?? '',
      parameters,
    },
  };
}

// ─── ChatDeepSeekCustom ───────────────────────────────────────────────────────

interface ChatDeepSeekCustomParams extends BaseChatModelParams {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  tools?: DeepSeekTool[];
}

class ChatDeepSeekCustom extends BaseChatModel {
  private apiKey: string;
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private tools?: DeepSeekTool[];

  constructor(params: ChatDeepSeekCustomParams) {
    super(params);
    this.apiKey      = params.apiKey;
    this.model       = params.model;
    this.temperature = params.temperature ?? 0.4;
    this.maxTokens   = params.maxTokens ?? 4096;
    this.tools       = params.tools;
  }

  _llmType(): string { return 'deepseek-custom'; }

  bindTools(langchainTools: unknown[]): ChatDeepSeekCustom {
    const deepSeekTools = langchainTools.map(langchainToolParaDeepSeek);

    return new ChatDeepSeekCustom({
      apiKey:      this.apiKey,
      model:       this.model,
      temperature: this.temperature,
      maxTokens:   this.maxTokens,
      tools:       deepSeekTools,
    });
  }

  async _generate(
    messages: BaseMessage[],
    _options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun,
  ): Promise<ChatResult> {
    const deepSeekMessages = messages.map(langchainParaDeepSeek);

    const body: Record<string, unknown> = {
      model:       this.model,
      messages:    deepSeekMessages,
      temperature: this.temperature,
      max_tokens:  this.maxTokens,
      stream:      true,
      thinking:    { type: 'enabled' },
    };

    if (this.tools?.length) body.tools = this.tools;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const erro = await response.text();
      throw new Error(`DeepSeek API error ${response.status}: ${erro}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    let textoFinal     = '';
    let reasoningFinal = '';
    const toolCallsBuffer: Record<number, { id: string; name: string; args: string }> = {};

    let sobra = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const linhas = (sobra + decoder.decode(value, { stream: true })).split('\n');
      sobra = linhas.pop() ?? '';

      for (const linha of linhas) {
        const trim = linha.trim();
        if (!trim || trim === 'data: [DONE]') continue;
        if (!trim.startsWith('data: ')) continue;

        let chunk: DeepSeekChunk;
        try {
          chunk = JSON.parse(trim.slice(6));
        } catch {
          continue;
        }

        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        if (delta.content) {
          textoFinal += delta.content;
          await runManager?.handleLLMNewToken(delta.content);
        }

        if (delta.reasoning_content) {
          reasoningFinal += delta.reasoning_content;
        }

        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (!toolCallsBuffer[tc.index]) {
              toolCallsBuffer[tc.index] = { id: tc.id ?? '', name: '', args: '' };
            }
            if (tc.function?.name)      toolCallsBuffer[tc.index].name += tc.function.name;
            if (tc.function?.arguments) toolCallsBuffer[tc.index].args += tc.function.arguments;
            if (tc.id)                  toolCallsBuffer[tc.index].id    = tc.id;
          }
        }
      }
    }

    const toolCalls = Object.values(toolCallsBuffer).map(tc => ({
      id:   tc.id,
      name: tc.name,
      args: (() => { try { return JSON.parse(tc.args); } catch { return {}; } })(),
      type: 'tool_call' as const,
    }));

    const additional: Record<string, unknown> = {};
    if (reasoningFinal) additional['reasoning_content'] = reasoningFinal;

    const aiMessage = new AIMessage({
      content:           textoFinal,
      tool_calls:        toolCalls.length ? toolCalls : undefined,
      additional_kwargs: additional,
    });

    if (reasoningFinal) {
      (aiMessage as AIMessage & ComReasoning).reasoning_content = reasoningFinal;
    }

    return {
      generations: [{ message: aiMessage, text: textoFinal } as ChatGeneration],
    };
  }

  async *_stream(
    messages: BaseMessage[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun,
  ): AsyncGenerator<AIMessageChunk, void, unknown> {
    const result = await this._generate(messages, options, runManager);
    const msg = result.generations[0].message as AIMessage;

    yield new AIMessageChunk({
      content:           msg.content,
      tool_calls:        msg.tool_calls?.map(tc => ({ ...tc, index: 0 })),
      additional_kwargs: msg.additional_kwargs,
    });
  }
}

// ─── Exports públicos ─────────────────────────────────────────────────────────

export function criarLLM(estrategia: EstrategiaLLM = 'principal'): ChatDeepSeekCustom {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error(`${PREFIXO_LOG} DEEPSEEK_API_KEY não definida.`);

  const modelName = estrategia === 'principal' ? MODELO_PRINCIPAL : MODELO_FALLBACK;
  console.log(`${PREFIXO_LOG} Inicializando LLM: ${estrategia} (${modelName})`);

  return new ChatDeepSeekCustom({
    apiKey,
    model:       modelName,
    temperature: CONFIG_LLM.temperatura,
    maxTokens:   CONFIG_LLM.maxTokensSaida,
  });
}

export function criarLLMParaAgente(estrategia: EstrategiaLLM = 'principal'): ChatDeepSeekCustom {
  return criarLLM(estrategia);
}

export function extrairReasoningContent(message: AIMessage): string | undefined {
  return (
    (message as AIMessage & ComReasoning).reasoning_content ??
    (message.additional_kwargs?.reasoning_content as string | undefined)
  );
}
