import { Button, Group, Paper, Select, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlus } from '@tabler/icons-react';
import { getPlatformOption, platformOptions } from '../utils/platform.js';

export const TargetForm = ({ onSubmit, loading }) => {
  const form = useForm({
    initialValues: {
      platform: 'weibo',
      name: '',
      platformTargetId: '',
    },
    validate: {
      name: (value) => (value.trim() ? null : '请输入目标名称'),
      platformTargetId: (value) => (value.trim() ? null : '请输入平台目标 ID'),
    },
  });
  const selectedPlatform = getPlatformOption(form.values.platform);

  const submit = form.onSubmit(async (values) => {
    await onSubmit({
      name: values.name.trim(),
      platformTargetId: values.platformTargetId.trim(),
      platform: values.platform,
    });
    form.reset();
  });

  return (
    <Paper withBorder p="md" radius="md">
      <form onSubmit={submit}>
        <Group align="start">
          <Select
            label="platform"
            data={platformOptions.map((option) => ({ value: option.value, label: option.label }))}
            className="min-w-36"
            {...form.getInputProps('platform')}
          />
          <TextInput
            label="name"
            placeholder="目标名称"
            className="min-w-0 flex-1"
            {...form.getInputProps('name')}
          />
          <TextInput
            label="platform_target_id"
            placeholder={selectedPlatform.targetLabel}
            className="min-w-0 flex-1"
            {...form.getInputProps('platformTargetId')}
          />
          <Button type="submit" mt={24} loading={loading} leftSection={<IconPlus size={18} />}>
            新增
          </Button>
        </Group>
      </form>
    </Paper>
  );
};
