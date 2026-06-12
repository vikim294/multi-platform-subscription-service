import { notifications } from '@mantine/notifications';
import { useEffect, useRef } from 'react';
import { getUserToken } from '../api/http.js';

export const useNotificationStream = (onNewActivity) => {
  const pendingCountRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    const token = getUserToken();
    if (!token) return undefined;

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
    const source = new EventSource(`${baseUrl}/notifications/stream?token=${encodeURIComponent(token)}`);

    source.addEventListener('new-activity', (event) => {
      const payload = JSON.parse(event.data);
      onNewActivity?.(payload);

      pendingCountRef.current += 1;
      if (timerRef.current) return;

      timerRef.current = window.setTimeout(() => {
        const count = pendingCountRef.current;
        pendingCountRef.current = 0;
        timerRef.current = null;

        notifications.show({
          color: 'blue',
          title: '有新动态',
          message: count > 1 ? `你订阅的目标有 ${count} 条新动态` : '你订阅的目标发布了新动态',
        });
      }, 600);
    });

    source.onerror = () => {
      source.close();
    };

    return () => {
      source.close();
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      pendingCountRef.current = 0;
    };
  }, [onNewActivity]);
};
