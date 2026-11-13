import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api-client';
import { useAuthStore } from '../store/auth.store';

type EnabledFeaturesResponse = { organizationId: string | null; features: string[] };

export function useEducationFeatures() {
  const userId = useAuthStore((state) => state.user?.id);
  const query = useQuery({
    queryKey: ['education-enabled-features', userId],
    queryFn: () => apiFetch<EnabledFeaturesResponse>('/api/v1/organization/education/enabled-features'),
    enabled: !!userId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  const enabled = (feature: string) => !query.data || query.data.features.includes(feature);
  return { ...query, enabled };
}
