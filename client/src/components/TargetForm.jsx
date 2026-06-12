import { Button, Group, Paper, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlus } from '@tabler/icons-react';

export const TargetForm = ({ onSubmit, loading }) => {
  const form = useForm({
    initialValues: {
      name: '',
      platformTargetId: '',
    },
    validate: {
      name: (value) => (value.trim() ? null : '请输入目标名称'),
      platformTargetId: (value) => (value.trim() ? null : '请输入微博 uid'),
    },
  });

  const submit = form.onSubmit(async (values) => {
    await onSubmit({
      name: values.name.trim(),
      platformTargetId: values.platformTargetId.trim(),
      platform: 'weibo',
    });
    form.reset();
  });

  return (
    <Paper withBorder p="md" radius="md">
      <form onSubmit={submit}>
        <Group align="start">
          <TextInput
            label="name"
            placeholder="目标名称"
            className="min-w-0 flex-1"
            {...form.getInputProps('name')}
          />
          <TextInput
            label="platform_target_id"
            placeholder="微博 uid"
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
