import {
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconRefresh, IconTimeline } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { adminApi } from '../api/admin.js';

const statusColor = {
  pending: 'gray',
  running: 'blue',
  success: 'green',
  failed: 'red',
  skipped: 'yellow',
};

export const SchedulerPage = () => {
  const [schedule, setSchedule] = useState({ date: '', summary: {}, rounds: [] });
  const [selectedRound, setSelectedRound] = useState(null);
  const [opened, { open, close }] = useDisclosure(false);

  const load = async () => {
    setSchedule(await adminApi.getTodaySchedule());
  };

  useEffect(() => {
    load().catch((error) => notifications.show({ color: 'red', message: error.message }));
  }, []);

  const openRound = (round) => {
    setSelectedRound(round);
    open();
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="end">
        <div>
          <Title order={2}>今日定时任务</Title>
          <Text c="dimmed" size="sm">
            {schedule.date || '-'} 的多轮目标抓取计划
          </Text>
        </div>
        <Button variant="light" leftSection={<IconRefresh size={18} />} onClick={load}>
          刷新
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 2, sm: 6 }}>
        {['total', 'pending', 'running', 'success', 'failed', 'skipped'].map((key) => (
          <Paper key={key} withBorder radius="md" p="md">
            <Text c="dimmed" size="xs">
              {key}
            </Text>
            <Title order={3}>{schedule.summary?.[key] || 0}</Title>
          </Paper>
        ))}
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }}>
        {schedule.rounds.map((round) => {
          const firstTask = round.tasks[0];
          const lastTask = round.tasks[round.tasks.length - 1];
          const counts = round.tasks.reduce((acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
          }, {});

          return (
            <Paper key={round.roundIndex} withBorder radius="md" p="md">
              <Stack>
                <Group justify="space-between">
                  <Title order={4}>第 {round.roundIndex} 轮</Title>
                  <Badge variant="light">{round.tasks.length} 个目标</Badge>
                </Group>

                <Stack gap={4}>
                  <Text size="sm">
                    开始：{firstTask ? dayjs(firstTask.scheduledAt).format('HH:mm:ss') : '-'}
                  </Text>
                  <Text size="sm">
                    结束：{lastTask ? dayjs(lastTask.scheduledAt).format('HH:mm:ss') : '-'}
                  </Text>
                </Stack>

                <Group gap="xs">
                  {Object.entries(counts).map(([status, count]) => (
                    <Badge key={status} color={statusColor[status]} variant="light">
                      {status} {count}
                    </Badge>
                  ))}
                </Group>

                <Button variant="light" leftSection={<IconTimeline size={18} />} onClick={() => openRound(round)}>
                  查看详情
                </Button>
              </Stack>
            </Paper>
          );
        })}
      </SimpleGrid>

      <Modal
        opened={opened}
        onClose={close}
        title={selectedRound ? `第 ${selectedRound.roundIndex} 轮抓取计划` : '抓取计划'}
        size="xl"
        centered
      >
        <Table.ScrollContainer minWidth={820}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>计划时间</Table.Th>
                <Table.Th>目标</Table.Th>
                <Table.Th>platform_target_id</Table.Th>
                <Table.Th>状态</Table.Th>
                <Table.Th>抓取</Table.Th>
                <Table.Th>新增</Table.Th>
                <Table.Th>消息</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(selectedRound?.tasks || []).map((task) => (
                <Table.Tr key={task.id}>
                  <Table.Td>{dayjs(task.scheduledAt).format('YYYY-MM-DD HH:mm:ss')}</Table.Td>
                  <Table.Td>{task.targetName || task.targetId}</Table.Td>
                  <Table.Td>{task.platformTargetId || '-'}</Table.Td>
                  <Table.Td>
                    <Badge color={statusColor[task.status]}>{task.status}</Badge>
                  </Table.Td>
                  <Table.Td>{task.fetchedCount}</Table.Td>
                  <Table.Td>{task.insertedCount}</Table.Td>
                  <Table.Td maw={260}>
                    <Text size="sm" lineClamp={2}>
                      {task.message || '-'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Modal>
    </Stack>
  );
};
