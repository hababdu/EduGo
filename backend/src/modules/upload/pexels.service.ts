// src/modules/upload/pexels.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';

export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  avg_color: string;
  alt: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
}

@Injectable()
export class PexelsService {
  private readonly API_URL = 'https://api.pexels.com/v1';

  async searchPhotos(
    query: string,
    perPage = 24,
    page = 1,
  ): Promise<{
    photos: PexelsPhoto[];
    total_results: number;
    page: number;
    per_page: number;
  }> {
    if (!query?.trim()) {
      throw new BadRequestException("Qidiruv so'zi kiritilishi shart");
    }

    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) {
      throw new BadRequestException('PEXELS_API_KEY sozlanmagan');
    }

    const url = `${this.API_URL}/search?query=${encodeURIComponent(
      query.trim(),
    )}&per_page=${perPage}&page=${page}&orientation=landscape`;

    console.log(`[pexels] Searching: "${query}"`);

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: apiKey,
        },
      });

      if (!response.ok) {
        console.error(`[pexels] Error: ${response.status}`);
        throw new BadRequestException(`Pexels xatosi: ${response.status}`);
      }

      const data = await response.json();

      console.log(`[pexels] ✅ Found ${data.photos?.length || 0} photos`);

      return {
        photos: data.photos || [],
        total_results: data.total_results || 0,
        page: data.page || 1,
        per_page: data.per_page || perPage,
      };
    } catch (err: any) {
      console.error('[pexels] Search error:', err);
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(
        err?.message || 'Pexels qidiruvda xatolik',
      );
    }
  }
}