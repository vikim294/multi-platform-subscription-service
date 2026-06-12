import { Badge, Button, Group, Paper, Stack, Table, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconRefresh } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { adminApi } from '../api/admin.js';

const statusColor = {
  success: 'green',
  failed: 'red',
  skipped: 'yellow',
};

export const FetchLogsPage = () => {
  const [data, setData] = useState({ items: [], total: 0 });

  const load = async () => {
    setData(await adminApi.listFetchLogs({ pageSize: 100 }));
  };

  useEffect(() => {
    load().catch((error) => notifications.show({ color: 'red', message: error.message }));
  }, []);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="end">
        <div>
          <Title order={2}>抓取日志</Title>
          <Text c="dimmed" size="sm">
            查看手动抓取和定时抓取结果
          </Text>
        </div>
        <Button variant="light" leftSection={<IconRefresh size={18} />} onClick={load}>
          刷新
        </Button>
      </Group>

      <Paper withBorder p="md" radius="md">
        <Table.ScrollContainer minWidth={920}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>ID</Table.Th>
                <Table.Th>目标</Table.Th>
                <Table.Th>状态</Table.Th>
                <Table.Th>抓取</Table.Th>
                <Table.Th>新增</Table.Th>
                <Table.Th>开始</Table.Th>
                <Table.Th>结束</Table.Th>
                <Table.Th>消息</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.items.map((log) => (
                <Table.Tr key={log.id}>
                  <Table.Td>{log.id}</Table.Td>
                  <Table.Td>{log.targetName || log.targetId || '-'}</Table.Td>
                  <Table.Td>
                    <Badge color={statusColor[log.status]}>{log.status}</Badge>
                  </Table.Td>
                  <Table.Td>{log.fetchedCount}</Table.Td>
                  <Table.Td>{log.insertedCount}</Table.Td>
                  <Table.Td>{dayjs(log.startedAt).format('YYYY-MM-DD HH:mm:ss')}</Table.Td>
                  <Table.Td>{log.finishedAt ? dayjs(log.finishedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</Table.Td>
                  <Table.Td maw={320}>
                    <Text size="sm" lineClamp={2}>
                      {log.message || '-'}
                    </Text>
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
