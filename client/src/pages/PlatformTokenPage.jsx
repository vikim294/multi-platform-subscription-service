import { Alert, Button, Group, Paper, PasswordInput, Stack, Switch, Text, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconInfoCircle } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { adminApi } from '../api/admin.js';

export const PlatformTokenPage = () => {
  const [tokenInfo, setTokenInfo] = useState(null);
  const [saving, setSaving] = useState(false);
  const form = useForm({
    initialValues: {
      cookie: '',
      enabled: true,
    },
    validate: {
      cookie: (value) => (value.trim() ? null : '请输入微博 Cookie'),
    },
  });

  const load = async () => {
    const data = await adminApi.listPlatformTokens();
    setTokenInfo(data.items.find((item) => item.platform === 'weibo') || null);
  };

  useEffect(() => {
    load().catch((error) => notifications.show({ color: 'red', message: error.message }));
  }, []);

  const submit = form.onSubmit(async (values) => {
    setSaving(true);
    try {
      await adminApi.savePlatformToken('weibo', {
        cookie: values.cookie.trim(),
        enabled: values.enabled,
      });
      form.setFieldValue('cookie', '');
      await load();
      notifications.show({ color: 'green', message: '微博 Cookie 已保存' });
    } catch (error) {
      notifications.show({ color: 'red', message: error.response?.data?.error || error.message });
    } finally {
      setSaving(false);
    }
  });

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>微博 Cookie</Title>
        <Text c="dimmed" size="sm">
          Cookie 仅用于服务端抓取微博动态，列表接口只显示脱敏值
        </Text>
      </div>

      {tokenInfo && (
        <Alert icon={<IconInfoCircle size={18} />} color={tokenInfo.enabled ? 'green' : 'yellow'}>
          当前配置：{tokenInfo.cookieMasked}，状态：{tokenInfo.enabled ? '启用' : '停用'}
        </Alert>
      )}

      <Paper withBorder p="md" radius="md">
        <form onSubmit={submit}>
          <Stack>
            <PasswordInput
              label="Cookie"
              placeholder="SUB=...; XSRF-TOKEN=..."
              description="保存后输入框会清空"
              {...form.getInputProps('cookie')}
            />
            <Switch label="启用微博抓取" {...form.getInputProps('enabled', { type: 'checkbox' })} />
            <Group justify="flex-end">
              <Button type="submit" loading={saving} leftSection={<IconDeviceFloppy size={18} />}>
                保存
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </Stack>
  );
};
