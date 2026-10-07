// src/modules/ai/providers/gemini.provider.ts
//
// Google Gemini — rasmiy OpenAI-mos endpoint orqali (generativelanguage.googleapis.com/v1beta/openai).
// Kalit FAQAT serverda: GEMINI_API_KEY (Render env). GEMINI_BASE_URL ixtiyoriy.
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiConfig } from '../ai.config';
import { OpenAiCompatProvider } from './groq.provider';

@Injectable()
export class GeminiProvider extends OpenAiCompatProvider {
  readonly name = 'gemini' as const;

  constructor(env: ConfigService, cfg: AiConfig) {
    super(
      env,
      cfg,
      'GEMINI_API_KEY',
      'GEMINI_BASE_URL',
      'https://generativelanguage.googleapis.com/v1beta/openai',
    );
  }
}
