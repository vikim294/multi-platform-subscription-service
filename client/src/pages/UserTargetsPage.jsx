import {
  Anchor,
  Badge,
  Button,
  Indicator,
  Group,
  Modal,
  Paper,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconBell, IconBellOff, IconLogout, IconRefresh, IconTimeline } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearUserToken } from '../api/http.js';
import { userApi } from '../api/user.js';
import { useNotificationStream } from '../hooks/useNotificationStream.js';

const ActivityPreview = ({ activity }) => {
  if (!activity) {
    return (
      <Text c="dimmed" size="sm">
        暂无动态
      </Text>
    );
  }

  return (
    <Stack gap={4}>
      <Text size="sm" lineClamp={2}>
        {activity.content || '-'}
      </Text>
      <Group gap="sm">
        <Text c="dimmed" size="xs">
          {activity.publishedAt ? dayjs(activity.publishedAt).format('YYYY-MM-DD HH:mm') : '未知时间'}
        </Text>
        {activity.sourceUrl && (
          <Anchor href={activity.sourceUrl} target="_blank" size="xs">
            打开
          </Anchor>
        )}
      </Group>
    </Stack>
  );
};

export const UserTargetsPage = () => {
  const [targets, setTargets] = useState([]);
  const [loadingTargetId, setLoadingTargetId] = useState(null);
  const [activityData, setActivityData] = useState({ target: null, items: [] });
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [opened, { open, close }] = useDisclosure(false);
  const navigate = useNavigate();

  const loadTargets = useCallback(async () => {
    const data = await userApi.listTargets();
    setTargets(data.items);
  }, []);

  const loadUnreadCount = useCallback(async () => {
    const data = await userApi.listUnreadNotifications();
    setUnreadCount(data.unreadCount);
  }, []);

  useEffect(() => {
    Promise.all([loadTargets(), loadUnreadCount()]).catch((error) =>
      notifications.show({ color: 'red', message: error.message }),
    );
  }, [loadTargets, loadUnreadCount]);

  const handleNewActivity = useCallback(() => {
    setUnreadCount((count) => count + 1);
    loadTargets().catch(() => {});
  }, [loadTargets]);

  useNotificationStream(handleNewActivity);

  const toggleSubscription = async (target) => {
    setLoadingTargetId(target.id);
    try {
      if (target.subscribed) {
        await userApi.unsubscribe(target.id);
      } else {
        await userApi.subscribe(target.id);
      }
      await loadTargets();
      notifications.show({
        color: 'green',
        message: target.subscribed ? '已取消订阅' : '已订阅',
      });
    } catch (error) {
      notifications.show({ color: 'red', message: error.response?.data?.error || error.message });
    } finally {
      setLoadingTargetId(null);
    }
  };

  const openActivities = async (target) => {
    setActivitiesLoading(true);
    setActivityData({ target, items: [] });
    open();
    try {
      const data = await userApi.listTargetActivities(target.id, { pageSize: 100 });
      setActivityData(data);
    } catch (error) {
      notifications.show({ color: 'red', message: error.response?.data?.error || error.message });
    } finally {
      setActivitiesLoading(false);
    }
  };

  const logout = () => {
    clearUserToken();
    navigate('/login', { replace: true });
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-[64px] max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <Title order={2}>订阅列表</Title>
            <Text c="dimmed" size="sm">
              已订阅目标靠前展示
            </Text>
          </div>
          <Group>
            <Indicator label={unreadCount} size={18} disabled={unreadCount === 0}>
              <Button variant="light" leftSection={<IconBell size={18} />} onClick={() => navigate('/notifications')}>
                消息提醒
              </Button>
            </Indicator>
            <Button variant="light" leftSection={<IconRefresh size={18} />} onClick={loadTargets}>
              刷新
            </Button>
            <Button variant="subtle" leftSection={<IconLogout size={18} />} onClick={logout}>
              退出
            </Button>
          </Group>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <Paper withBorder radius="md" p="md">
          <Table.ScrollContainer minWidth={920}>
            <Table verticalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>状态</Table.Th>
                  <Table.Th>目标</Table.Th>
                  <Table.Th>平台</Table.Th>
                  <Table.Th>最新动态</Table.Th>
                  <Table.Th ta="right">操作</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {targets.map((target) => (
                  <Table.Tr key={target.id}>
                    <Table.Td>
                      <Badge color={target.subscribed ? 'green' : 'gray'}>
                        {target.subscribed ? '已订阅' : '未订阅'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Stack gap={2}>
                        <Text fw={600}>{target.name}</Text>
                        <Text c="dimmed" size="xs">
                          {target.platformTargetId}
                        </Text>
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light">weibo</Badge>
                    </Table.Td>
                    <Table.Td maw={440}>
                      <ActivityPreview activity={target.latestActivity} />
                    </Table.Td>
                    <Table.Td>
                      <Group justify="flex-end" gap="xs">
                        <Button
                          variant={target.subscribed ? 'light' : 'filled'}
                          color={target.subscribed ? 'red' : 'blue'}
                          loading={loadingTargetId === target.id}
                          leftSection={target.subscribed ? <IconBellOff size={16} /> : <IconBell size={16} />}
                          onClick={() => toggleSubscription(target)}
                        >
                          {target.subscribed ? '取消订阅' : '订阅'}
                        </Button>
                        <Button
                          variant="light"
                          leftSection={<IconTimeline size={16} />}
                          onClick={() => openActivities(target)}
                        >
                          全部动态
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Paper>
      </div>

      <Modal
        opened={opened}
        onClose={close}
        title={activityData.target ? `${activityData.target.name} 的动态` : '目标动态'}
        size="lg"
        centered
      >
        <Stack>
          {activitiesLoading && <Text c="dimmed">加载中...</Text>}
          {!activitiesLoading && activityData.items.length === 0 && <Text c="dimmed">暂无动态</Text>}
          {!activitiesLoading &&
            activityData.items.map((activity) => (
              <Paper key={activity.id} withBorder radius="md" p="md">
                <Stack gap="xs">
                  <Text size="sm">{activity.content || '-'}</Text>
                  <Group justify="space-between">
                    <Text c="dimmed" size="xs">
                      {activity.publishedAt ? dayjs(activity.publishedAt).format('YYYY-MM-DD HH:mm') : '未知时间'}
                    </Text>
                    {activity.sourceUrl && (
                      <Anchor href={activity.sourceUrl} target="_blank" size="sm">
                        打开原文
                      </Anchor>
                    )}
                  </Group>
                </Stack>
              </Paper>
            ))}
        </Stack>
      </Modal>
    </main>
  );
};
