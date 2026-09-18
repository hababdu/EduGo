// src/hooks/usePexelsSearch.ts
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api-client';

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

export interface PexelsResponse {
  photos: PexelsPhoto[];
  total_results: number;
  page: number;
  per_page: number;
}

export function usePexelsSearch(query: string, enabled: boolean) {
  return useQuery({
    queryKey: ['pexels-search', query],
    queryFn: () =>
      apiFetch<PexelsResponse>(
        `/api/v1/upload/search-photos?query=${encodeURIComponent(
          query,
        )}&perPage=24`,
      ),
    enabled: enabled && query.trim().length > 0,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}