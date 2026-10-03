import { ConfigService } from '@nestjs/config';
import { AiConfig } from '../ai.config';
import { AiProviderError, AiRequest } from '../ai.types';
import { AnthropicProvider, toAnthropicMessages } from './anthropic.provider';
import { GroqProvider, toOpenAiMessages } from './groq.provider';

const makeCfg = (env: Record<string, string> = {}) => {
  const cs = { get: (k: string) => env[k] } as unknown as ConfigService;
  return { cs, ai: new AiConfig(cs) };
};

const sse = (events: Array<[string | undefined, unknown]>) =>
  events.map(([e, d]) => (e ? `event: ${e}\n` : '') + `data: ${typeof d === 'string' ? d : JSON.stringify(d)}\n\n`).join('');

const toolConversation: AiRequest = {
  system: 'Sen yordamchisan',
  messages: [
    { role: 'user', content: 'Statistikamni ko\'rsat' },
    {
      role: 'assistant',
      content: [
        { type: 'text', text: '' },
        { type: 'tool_use', id: 't1', name: 'get_my_stats', input: { days: 7 } },
      ],
    },
    { role: 'user', content: [{ type: 'tool_result', toolUseId: 't1', content: '{"avg":80}' }] },
  ],
};

describe('format o\'girish', () => {
  it('Anthropic: bo\'sh matn bloki tashlanadi, tool_result to\'g\'ri', () => {
    const m: any[] = toAnthropicMessages(toolConversation.messages);
    expect(m[1].content).toEqual([{ type: 'tool_use', id: 't1', name: 'get_my_stats', input: { days: 7 } }]);
    expect(m[2].content).toEqual([{ type: 'tool_result', tool_use_id: 't1', content: '{"avg":80}' }]);
  });

  it('OpenAI: system, tool_calls va role=tool', () => {
    const m = toOpenAiMessages(toolConversation);
    expect(m[0]).toEqual({ role: 'system', content: 'Sen yordamchisan' });
    expect(m[2].tool_calls[0]).toEqual({
      id: 't1',
      type: 'function',
      function: { name: 'get_my_stats', arguments: '{"days":7}' },
    });
    expect(m[2].content).toBeNull();
    expect(m[3]).toEqual({ role: 'tool', tool_call_id: 't1', content: '{"avg":80}' });
  });
});

describe('AnthropicProvider', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('complete: matn va tool_use ni to\'g\'ri o\'qiydi, sarlavhalar to\'g\'ri', async () => {
    const { cs, ai } = makeCfg({ ANTHROPIC_API_KEY: 'sk-test' });
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          model: 'claude-x',
          stop_reason: 'tool_use',
          content: [
            { type: 'text', text: 'Hozir qarayman' },
            { type: 'tool_use', id: 'tu1', name: 'get_my_stats', input: { days: 3 } },
          ],
          usage: { input_tokens: 11, output_tokens: 7 },
        }),
        { status: 200 },
      ),
    );
    global.fetch = fetchMock as any;

    const p = new AnthropicProvider(cs, ai);
    const res = await p.complete(
      { messages: [{ role: 'user', content: 'salom' }], tools: [{ name: 'get_my_stats', description: 'd', inputSchema: { type: 'object' } }] },
      'claude-x',
    );

    expect(res.text).toBe('Hozir qarayman');
    expect(res.stopReason).toBe('tool_use');
    expect(res.toolCalls[0]).toEqual({ type: 'tool_use', id: 'tu1', name: 'get_my_stats', input: { days: 3 } });
    expect(res.usage).toEqual({ inputTokens: 11, outputTokens: 7 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(init.headers['x-api-key']).toBe('sk-test');
    expect(init.headers['anthropic-version']).toBe('2023-06-01');
    const body = JSON.parse(init.body);
    expect(body.max_tokens).toBe(1024);
    expect(body.tools[0].input_schema).toEqual({ type: 'object' });
  });

  it('429 -> retryable xato', async () => {
    const { cs, ai } = makeCfg({ ANTHROPIC_API_KEY: 'k' });
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'rate limited' } }), { status: 429 }),
    ) as any;
    await expect(new AnthropicProvider(cs, ai).complete({ messages: [] }, 'm')).rejects.toMatchObject({
      status: 429,
      retryable: true,
    });
  });

  it('401 -> retryable EMAS', async () => {
    const { cs, ai } = makeCfg({ ANTHROPIC_API_KEY: 'k' });
    global.fetch = jest.fn().mockResolvedValue(new Response('{"error":{"message":"bad key"}}', { status: 401 })) as any;
    const err = await new AnthropicProvider(cs, ai).complete({ messages: [] }, 'm').catch((e) => e);
    expect(err).toBeInstanceOf(AiProviderError);
    expect(err.retryable).toBe(false);
  });

  it('stream: matn bo\'laklari, tool_use va yakuniy usage', async () => {
    const { cs, ai } = makeCfg({ ANTHROPIC_API_KEY: 'k' });
    const payload = sse([
      ['message_start', { type: 'message_start', message: { model: 'claude-x', usage: { input_tokens: 20, output_tokens: 1 } } }],
      ['content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }],
      ['content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Sal' } }],
      ['content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'om' } }],
      ['content_block_stop', { type: 'content_block_stop', index: 0 }],
      ['content_block_start', { type: 'content_block_start', index: 1, content_block: { type: 'tool_use', id: 'tu9', name: 'navigate' } }],
      ['content_block_delta', { type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '{"path":' } }],
      ['content_block_delta', { type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '"/x"}' } }],
      ['content_block_stop', { type: 'content_block_stop', index: 1 }],
      ['message_delta', { type: 'message_delta', delta: { stop_reason: 'tool_use' }, usage: { output_tokens: 15 } }],
      ['message_stop', { type: 'message_stop' }],
    ]);
    global.fetch = jest.fn().mockResolvedValue(new Response(payload, { status: 200 })) as any;

    const events: any[] = [];
    for await (const ev of new AnthropicProvider(cs, ai).stream({ messages: [{ role: 'user', content: 'x' }] }, 'claude-x')) {
      events.push(ev);
    }

    expect(events.filter((e) => e.type === 'text').map((e) => e.text).join('')).toBe('Salom');
    expect(events.find((e) => e.type === 'tool_use').call).toEqual({
      type: 'tool_use',
      id: 'tu9',
      name: 'navigate',
      input: { path: '/x' },
    });
    const done = events[events.length - 1];
    expect(done.type).toBe('done');
    expect(done.response.stopReason).toBe('tool_use');
    expect(done.response.usage).toEqual({ inputTokens: 20, outputTokens: 15 });
    expect(done.response.content).toHaveLength(2);
  });
});

describe('GroqProvider', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('complete: tool_calls argumentlarini JSON qilib o\'qiydi', async () => {
    const { cs, ai } = makeCfg({ GROQ_API_KEY: 'gsk' });
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          model: 'llama',
          choices: [
            {
              finish_reason: 'tool_calls',
              message: { content: null, tool_calls: [{ id: 'c1', function: { name: 'f', arguments: '{"a":1}' } }] },
            },
          ],
          usage: { prompt_tokens: 5, completion_tokens: 3 },
        }),
        { status: 200 },
      ),
    ) as any;

    const res = await new GroqProvider(cs, ai).complete({ messages: [{ role: 'user', content: 'x' }] }, 'llama');
    expect(res.stopReason).toBe('tool_use');
    expect(res.toolCalls[0].input).toEqual({ a: 1 });
    expect(res.usage).toEqual({ inputTokens: 5, outputTokens: 3 });
  });

  it("stream: usage bo'lmasa taxmin qiladi va bo'lak-bo'lak tool argumentlarini yig'adi", async () => {
    const { cs, ai } = makeCfg({ GROQ_API_KEY: 'gsk' });
    const payload = sse([
      [undefined, { choices: [{ delta: { content: 'Ha' } }] }],
      [undefined, { choices: [{ delta: { tool_calls: [{ index: 0, id: 'c7', function: { name: 'go', arguments: '{"p":' } }] } }] }],
      [undefined, { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '1}' } }] }, finish_reason: 'tool_calls' }] }],
      [undefined, '[DONE]'],
    ]);
    global.fetch = jest.fn().mockResolvedValue(new Response(payload, { status: 200 })) as any;

    const events: any[] = [];
    for await (const ev of new GroqProvider(cs, ai).stream({ messages: [{ role: 'user', content: 'salom' }] }, 'llama')) {
      events.push(ev);
    }
    expect(events.find((e) => e.type === 'tool_use').call).toEqual({ type: 'tool_use', id: 'c7', name: 'go', input: { p: 1 } });
    const done = events[events.length - 1].response;
    expect(done.text).toBe('Ha');
    expect(done.usage.inputTokens).toBeGreaterThan(0);
  });
});
