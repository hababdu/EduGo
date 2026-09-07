import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { apiFetch } from '../lib/api-client';
import { useAuthStore } from '../store/auth.store';

export interface RankingEntry {
  studentId: string;
  firstName: string;
  username: string | null;
  totalScore: number;
  rank: number;
}

const WS_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/**
 * Dastlab REST orqali yuklanadi (`GET /ranking/global`), so'ng WebSocket'ga
 * ulanib, ball o'zgarishi bilan real-time yangilanadi. WebSocket uzilib qolsa
 * ham sahifa "qotib qolmaydi" — oxirgi ma'lumot ko'rsatilaveradi.
 */
export function useLiveRanking() {
  const [top, setTop] = useState<RankingEntry[]>([]);
  const [yourRank, setYourRank] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    apiFetch<{ top: RankingEntry[]; yourRank: number }>('/api/v1/ranking/global')
      .then((data) => {
        setTop(data.top);
        setYourRank(data.yourRank);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!accessToken) return;

    const socket = io(`${WS_URL}/ws`, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsLive(true);
      socket.emit('join:ranking', { scope: 'global' });
    });

    socket.on('disconnect', () => setIsLive(false));

    socket.on('RANKING_UPDATED', (payload: { scope: string; top: RankingEntry[] }) => {
      if (payload.scope === 'global') {
        setTop(payload.top);
      }
    });

    socket.on('SCORE_UPDATED', (payload: { newRank: number }) => {
      setYourRank(payload.newRank);
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken]);

  return { top, yourRank, isLoading, isLive };
}
