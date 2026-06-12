import {
  Anchor,
  Badge,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlayerPlay } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { adminApi } from '../api/admin.js';
import { getTimeLabel } from '../utils/platform.js';

export const AdminDashboard = () => {
  const [targets, setTargets] = useState({ total: 0, items: [] });
  const [logs, setLogs] = useState({ total: 0, items: [] });
  const [activities, setActivities] = useState({ total: 0, items: [] });
  const [fetching, setFetching] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  const load = async () => {
    const [targetData, logData, activityData] = await Promise.all([
      adminApi.listTargets({ pageSize: 5 }),
      adminApi.listFetchLogs({ pageSize: 5 }),
      adminApi.listActivities({ pageSize: 5 }),
    ]);
    setTargets(targetData);
    setLogs(logData);
    setActivities(activityData);
  };

  useEffect(() => {
    load().catch((error) => {
      notifications.show({ color: 'red', message: error.message });
    });
  }, []);

  const fetchAll = async () => {
    setFetching(true);
    try {
      await adminApi.fetchAll();
      notifications.show({ color: 'green', message: '已开始后台抓取所有目标' });
    } catch (error) {
      notifications.show({ color: 'red', message: error.response?.data?.error || error.message });
    } finally {
      setFetching(false);
    }
  };

  const broadcastTest = async () => {
    setBroadcasting(true);
    try {
      const result = await adminApi.broadcastTestNewActivity();
      notifications.show({
        color: 'green',
        message: `已广播给 ${result.userCount} 个在线用户，${result.connectionCount} 个连接`,
      });
    } catch (error) {
      notifications.show({ color: 'red', message: error.response?.data?.error || error.message });
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="end">
        <div>
          <Title order={2}>概览</Title>
          <Text c="dimmed" size="sm">
            微博订阅 MVP 当前运行状态
          </Text>
        </div>
        <Group>
          <Button variant="light" loading={broadcasting} onClick={broadcastTest}>
            测试广播消息
          </Button>
          <Button leftSection={<IconPlayerPlay size={18} />} loading={fetching} onClick={fetchAll}>
            抓取全部
          </Button>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Paper withBorder p="md" radius="md">
          <Text size="sm" c="dimmed">
            订阅目标
          </Text>
          <Title order={2}>{targets.total}</Title>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Text size="sm" c="dimmed">
            抓取日志
          </Text>
          <Title order={2}>{logs.total}</Title>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Text size="sm" c="dimmed">
            已入库动态
          </Text>
          <Title order={2}>{activities.total}</Title>
        </Paper>
      </SimpleGrid>

      <Paper withBorder p="md" radius="md">
        <Title order={4} mb="md">
          最新动态
        </Title>
        <Table.ScrollContainer minWidth={760}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>目标</Table.Th>
                <Table.Th>内容</Table.Th>
                <Table.Th>发布时间</Table.Th>
                <Table.Th>链接</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {activities.items.map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td>{item.targetName || item.authorName}</Table.Td>
                  <Table.Td maw={420}>
                    <Text lineClamp={2} size="sm">
                      {item.content || '-'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Stack gap={2}>
                      <Text size="sm">{item.publishedAt ? dayjs(item.publishedAt).format('YYYY-MM-DD HH:mm') : '-'}</Text>
                      <Text c="dimmed" size="xs">
                        {getTimeLabel(item)}
                      </Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td>
                    {item.sourceUrl ? (
                      <Anchor href={item.sourceUrl} target="_blank" size="sm">
                        打开
                      </Anchor>
                    ) : (
                      <Badge color="gray">无链接</Badge>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>
    </Stack>
  );
};
