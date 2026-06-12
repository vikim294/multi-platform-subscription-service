import {
  Anchor,
  Badge,
  Button,
  Group,
  Indicator,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconChecks, IconLogout, IconRefresh } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearUserToken } from '../api/http.js';
import { userApi } from '../api/user.js';
import { useNotificationStream } from '../hooks/useNotificationStream.js';

export const UserNotificationsPage = () => {
  const [data, setData] = useState({ unreadCount: 0, items: [] });
  const navigate = useNavigate();

  const load = useCallback(async () => {
    const nextData = await userApi.listUnreadNotifications();
    setData({
      ...nextData,
      items: nextData.items.map((item) => ({ ...item, localRead: false })),
    });
  }, []);

  useEffect(() => {
    load().catch((error) => notifications.show({ color: 'red', message: error.message }));
  }, [load]);

  useNotificationStream(load);

  const markRead = async (item) => {
    if (item.localRead) return;

    try {
      await userApi.markNotificationRead(item.id);
      setData((current) => ({
        unreadCount: Math.max(current.unreadCount - 1, 0),
        items: current.items.map((notification) =>
          notification.id === item.id ? { ...notification, localRead: true, readAt: new Date().toISOString() } : notification,
        ),
      }));
    } catch (error) {
      notifications.show({ color: 'red', message: error.response?.data?.error || error.message });
    }
  };

  const markAllRead = async () => {
    try {
      await userApi.markAllNotificationsRead();
      const readAt = new Date().toISOString();
      setData((current) => ({
        unreadCount: 0,
        items: current.items.map((item) => ({ ...item, localRead: true, readAt })),
      }));
      notifications.show({ color: 'green', message: '已全部标记为已读' });
    } catch (error) {
      notifications.show({ color: 'red', message: error.response?.data?.error || error.message });
    }
  };

  const logout = () => {
    clearUserToken();
    navigate('/login', { replace: true });
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-[64px] max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <Title order={2}>消息提醒</Title>
            <Text c="dimmed" size="sm">
              未读动态会在这里保留
            </Text>
          </div>
          <Group>
            <Button variant="subtle" leftSection={<IconArrowLeft size={18} />} onClick={() => navigate('/app')}>
              订阅列表
            </Button>
            <Button variant="light" leftSection={<IconRefresh size={18} />} onClick={load}>
              刷新
            </Button>
            <Button variant="subtle" leftSection={<IconLogout size={18} />} onClick={logout}>
              退出
            </Button>
          </Group>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6">
        <Stack>
          <Group justify="space-between">
            <Indicator label={data.unreadCount} size={18} disabled={data.unreadCount === 0}>
              <Badge size="lg" variant="light">
                未读动态
              </Badge>
            </Indicator>
            <Button
              variant="light"
              leftSection={<IconChecks size={18} />}
              disabled={data.unreadCount === 0}
              onClick={markAllRead}
            >
              一键已读
            </Button>
          </Group>

          {data.items.length === 0 && (
            <Paper withBorder radius="md" p="xl">
              <Text c="dimmed" ta="center">
                暂无未读动态
              </Text>
            </Paper>
          )}

          {data.items.map((item) => (
            <Paper
              key={item.id}
              withBorder
              radius="md"
              p="md"
              className={`cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md ${
                item.localRead ? 'bg-slate-50 opacity-80' : 'bg-white'
              }`}
              onClick={() => markRead(item)}
            >
              <Group align="flex-start" wrap="nowrap">
                <div
                  className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full transition-opacity ${
                    item.localRead ? 'opacity-0' : 'bg-blue-500 opacity-100'
                  }`}
                />
                <Stack gap="xs" className="min-w-0 flex-1">
                  <Group justify="space-between" align="start">
                    <div>
                      <Text fw={700}>{item.target?.name || '订阅目标'}</Text>
                      <Text c="dimmed" size="xs">
                        {item.activity?.publishedAt
                          ? dayjs(item.activity.publishedAt).format('YYYY-MM-DD HH:mm')
                          : dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')}
                      </Text>
                    </div>
                    <Badge color={item.localRead ? 'gray' : 'blue'} variant="light">
                      {item.localRead ? '已读' : '未读'}
                    </Badge>
                  </Group>
                  <Text size="sm">{item.activity?.content || '-'}</Text>
                  {item.activity?.sourceUrl && (
                    <Anchor
                      href={item.activity.sourceUrl}
                      target="_blank"
                      size="sm"
                      onClick={(event) => event.stopPropagation()}
                    >
                      打开原文
                    </Anchor>
                  )}
                </Stack>
              </Group>
            </Paper>
          ))}
        </Stack>
      </div>
    </main>
  );
};
