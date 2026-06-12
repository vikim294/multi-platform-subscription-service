import { Alert, Button, Group, Paper, PasswordInput, Select, Stack, Switch, Text, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconInfoCircle } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { adminApi } from '../api/admin.js';
import { getPlatformOption, platformOptions } from '../utils/platform.js';

export const PlatformTokenPage = () => {
  const [tokenItems, setTokenItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const form = useForm({
    initialValues: {
      platform: 'weibo',
      cookie: '',
      enabled: true,
    },
    validate: {
      cookie: (value) => (value.trim() ? null : '请输入 Cookie'),
    },
  });
  const selectedPlatform = getPlatformOption(form.values.platform);
  const tokenInfo = tokenItems.find((item) => item.platform === form.values.platform);

  const load = async () => {
    const data = await adminApi.listPlatformTokens();
    setTokenItems(data.items);
  };

  useEffect(() => {
    load().catch((error) => notifications.show({ color: 'red', message: error.message }));
  }, []);

  const submit = form.onSubmit(async (values) => {
    setSaving(true);
    try {
      await adminApi.savePlatformToken(values.platform, {
        cookie: values.cookie.trim(),
        enabled: values.enabled,
      });
      form.setFieldValue('cookie', '');
      await load();
      notifications.show({ color: 'green', message: `${selectedPlatform.label} Cookie 已保存` });
    } catch (error) {
      notifications.show({ color: 'red', message: error.response?.data?.error || error.message });
    } finally {
      setSaving(false);
    }
  });

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>平台 Cookie</Title>
        <Text c="dimmed" size="sm">
          Cookie 仅用于服务端抓取平台动态，列表接口只显示脱敏值
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
            <Select
              label="平台"
              data={platformOptions.map((option) => ({ value: option.value, label: option.label }))}
              {...form.getInputProps('platform')}
            />
            <PasswordInput
              label="Cookie"
              placeholder={selectedPlatform.cookiePlaceholder}
              description="保存后输入框会清空"
              {...form.getInputProps('cookie')}
            />
            <Switch label={`启用${selectedPlatform.label}抓取`} {...form.getInputProps('enabled', { type: 'checkbox' })} />
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
