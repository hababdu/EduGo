// src/modules/ai/ai.types.ts
//
// Provayderdan mustaqil (Anthropic / Groq / boshqa) umumiy tiplar.
// Butun loyiha (yordamchi, tool'lar, generatsiya) FAQAT shu tiplar bilan ishlaydi;
// provayderga xos format o'zgarishlari providers/ ichida qoladi.

export type AiProviderName = 'anthropic' | 'groq';

/** fast — oddiy/arzon vazifalar; smart — murakkab fikrlash va tool use. */
export type AiTier = 'fast' | 'smart';

export interface AiTextBlock {
  type: 'text';
  text: string;
}

export interface AiToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface AiToolResultBlock {
  type: 'tool_result';
  toolUseId: string;
  content: string;
  isError?: boolean;
}

export type AiContentBlock = AiTextBlock | AiToolUseBlock | AiToolResultBlock;

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string | AiContentBlock[];
}

export interface AiToolDefinition {
  name: string;
  description: string;
  /** JSON Schema (type: 'object') */
  inputSchema: Record<string, unknown>;
}

export interface AiRequest {
  system?: string;
  messages: AiMessage[];
  tools?: AiToolDefinition[];
  maxTokens?: number;
  temperature?: number;
  /** true bo'lsa, qo'llab-quvvatlaydigan provayderlarda JSON rejimi yoqiladi */
  json?: boolean;
}

export interface AiUsageTokens {
  inputTokens: number;
  outputTokens: number;
}

export type AiStopReason = 'end' | 'tool_use' | 'max_tokens' | 'other';

export interface AiResponse {
  /** Barcha matn bloklarining birlashmasi */
  text: string;
  /** Assistant xabarini tarixga qo'shish uchun: matn + tool_use bloklari */
  content: AiContentBlock[];
  toolCalls: AiToolUseBlock[];
  stopReason: AiStopReason;
  usage: AiUsageTokens;
  model: string;
}

export type AiStreamEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; call: AiToolUseBlock }
  | { type: 'done'; response: AiResponse };

export interface AiProvider {
  readonly name: AiProviderName;
  isConfigured(): boolean;
  complete(req: AiRequest, model: string): Promise<AiResponse>;
  stream(req: AiRequest, model: string): AsyncGenerator<AiStreamEvent>;
}

/** Provayder darajasidagi xato. retryable=true bo'lsa, zaxira provayderga o'tish mumkin. */
export class AiProviderError extends Error {
  readonly status?: number;
  readonly retryable: boolean;
  readonly timeout: boolean;

  constructor(
    message: string,
    opts: { status?: number; retryable?: boolean; timeout?: boolean } = {},
  ) {
    super(message);
    this.name = 'AiProviderError';
    this.status = opts.status;
    this.retryable = opts.retryable ?? false;
    this.timeout = opts.timeout ?? false;
  }
}
