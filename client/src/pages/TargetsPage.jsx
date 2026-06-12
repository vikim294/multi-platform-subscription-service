import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPlayerPlay, IconRefresh, IconTrash } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { adminApi } from '../api/admin.js';
import { TargetForm } from '../components/TargetForm.jsx';

export const TargetsPage = () => {
  const [data, setData] = useState({ items: [], total: 0 });
  const [creating, setCreating] = useState(false);
  const [fetchingId, setFetchingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [opened, { open, close }] = useDisclosure(false);

  const load = async () => {
    setData(await adminApi.listTargets({ pageSize: 100 }));
  };

  useEffect(() => {
    load().catch((error) => notifications.show({ color: 'red', message: error.message }));
  }, []);

  const createTarget = async (payload) => {
    setCreating(true);
    try {
      await adminApi.createTarget(payload);
      await load();
      notifications.show({ color: 'green', message: '目标已新增' });
    } catch (error) {
      notifications.show({ color: 'red', message: error.response?.data?.error || error.message });
    } finally {
      setCreating(false);
    }
  };

  const fetchTarget = async (target) => {
    setFetchingId(target.id);
    try {
      const result = await adminApi.fetchTarget(target.id);
      notifications.show({
        color: result.status === 'success' ? 'green' : 'yellow',
        message: `抓取完成：${result.fetchedCount} 条，新增 ${result.insertedCount} 条`,
      });
    } catch (error) {
      notifications.show({ color: 'red', message: error.response?.data?.error || error.message });
    } finally {
      setFetchingId(null);
    }
  };

  const requestDelete = (target) => {
    setDeleteTarget(target);
    open();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminApi.deleteTarget(deleteTarget.id);
      await load();
      close();
      setDeleteTarget(null);
      notifications.show({ color: 'green', message: '目标已删除' });
    } catch (error) {
      notifications.show({ color: 'red', message: error.response?.data?.error || error.message });
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="end">
        <div>
          <Title order={2}>订阅目标</Title>
          <Text c="dimmed" size="sm">
            MVP 只支持微博平台，新增目标需要 name 和 platform_target_id
          </Text>
        </div>
        <Button variant="light" leftSection={<IconRefresh size={18} />} onClick={load}>
          刷新
        </Button>
      </Group>

      <TargetForm onSubmit={createTarget} loading={creating} />

      <Paper withBorder p="md" radius="md">
        <Table.ScrollContainer minWidth={760}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>ID</Table.Th>
                <Table.Th>平台</Table.Th>
                <Table.Th>名称</Table.Th>
                <Table.Th>platform_target_id</Table.Th>
                <Table.Th>创建时间</Table.Th>
                <Table.Th ta="right">操作</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.items.map((target) => (
                <Table.Tr key={target.id}>
                  <Table.Td>{target.id}</Table.Td>
                  <Table.Td>
                    <Badge>weibo</Badge>
                  </Table.Td>
                  <Table.Td>{target.name}</Table.Td>
                  <Table.Td>{target.platformTargetId}</Table.Td>
                  <Table.Td>{dayjs(target.createdAt).format('YYYY-MM-DD HH:mm')}</Table.Td>
                  <Table.Td>
                    <Group justify="flex-end" gap="xs">
                      <Tooltip label="手动抓取">
                        <ActionIcon
                          variant="light"
                          loading={fetchingId === target.id}
                          onClick={() => fetchTarget(target)}
                        >
                          <IconPlayerPlay size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="删除">
                        <ActionIcon color="red" variant="light" onClick={() => requestDelete(target)}>
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      <Modal opened={opened} onClose={close} title="删除目标" centered>
        <Stack>
          <Text>
            确认删除 {deleteTarget?.name}？该目标已入库动态也会被删除。
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              取消
            </Button>
            <Button color="red" onClick={confirmDelete}>
              删除
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};
