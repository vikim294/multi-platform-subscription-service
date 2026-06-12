import {
  Badge,
  Group,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import dayjs from 'dayjs';
import { getPlatformLabel } from '../utils/platform.js';

const formatNumber = (value, { signed = false } = {}) => {
  if (value === null || value === undefined) return '-';
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  return signed && number > 0 ? `+${number.toLocaleString()}` : number.toLocaleString();
};

export const TargetStatsModal = ({ opened, onClose, loading, stats }) => {
  const rows = stats?.rows || [];
  const latestWithFollowers = [...rows].reverse().find((row) => row.followersCount !== null);
  const latestFollowers = latestWithFollowers?.followersCount ?? null;
  const totalDelta = rows.reduce((sum, row) => sum + (Number(row.deltaCount) || 0), 0);
  const totalActivities = rows.reduce((sum, row) => sum + (Number(row.activityCount) || 0), 0);
  const target = stats?.target;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={target ? `${target.name} 统计数据` : '统计数据'}
      size="xl"
      centered
    >
      <Stack>
        {target && (
          <Group>
            <Badge variant="light">{getPlatformLabel(target.platform)}</Badge>
            <Text c="dimmed" size="sm">
              {target.platformTargetId}
            </Text>
          </Group>
        )}

        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <Paper withBorder radius="md" p="md">
            <Text c="dimmed" size="xs">
              粉丝量
            </Text>
            <Title order={3}>{formatNumber(latestFollowers)}</Title>
          </Paper>
          <Paper withBorder radius="md" p="md">
            <Text c="dimmed" size="xs">
              涨粉
            </Text>
            <Title order={3}>{formatNumber(totalDelta, { signed: true })}</Title>
          </Paper>
          <Paper withBorder radius="md" p="md">
            <Text c="dimmed" size="xs">
              发帖
            </Text>
            <Title order={3}>{formatNumber(totalActivities)}</Title>
          </Paper>
        </SimpleGrid>

        <Table.ScrollContainer minWidth={720}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>日期</Table.Th>
                <Table.Th>粉丝量</Table.Th>
                <Table.Th>涨粉</Table.Th>
                <Table.Th>发帖</Table.Th>
                <Table.Th>采集时间</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {loading && (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text c="dimmed">加载中...</Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {!loading &&
                rows.map((row) => (
                  <Table.Tr key={row.statDate}>
                    <Table.Td>{row.statDate}</Table.Td>
                    <Table.Td>{formatNumber(row.followersCount)}</Table.Td>
                    <Table.Td>{formatNumber(row.deltaCount, { signed: true })}</Table.Td>
                    <Table.Td>{formatNumber(row.activityCount)}</Table.Td>
                    <Table.Td>{row.capturedAt ? dayjs(row.capturedAt).format('YYYY-MM-DD HH:mm') : '-'}</Table.Td>
                  </Table.Tr>
                ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Stack>
    </Modal>
  );
};
