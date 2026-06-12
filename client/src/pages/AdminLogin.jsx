import { Button, Container, Paper, PasswordInput, Stack, Text, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconLogin } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { setAdminToken } from '../api/http.js';

export const AdminLogin = () => {
  const navigate = useNavigate();
  const form = useForm({
    initialValues: {
      token: '',
    },
    validate: {
      token: (value) => (value.trim() ? null : '请输入 ADMIN_TOKEN'),
    },
  });

  const submit = form.onSubmit((values) => {
    setAdminToken(values.token.trim());
    navigate('/admin', { replace: true });
  });

  return (
    <main className="min-h-screen bg-slate-50">
      <Container size={420} className="flex min-h-screen items-center">
        <Paper withBorder radius="md" p="xl" w="100%">
          <form onSubmit={submit}>
            <Stack>
              <div>
                <Title order={2}>管理员登录</Title>
                <Text c="dimmed" size="sm" mt={4}>
                  使用服务器环境变量 ADMIN_TOKEN 进入后台
                </Text>
              </div>
              <PasswordInput
                label="ADMIN_TOKEN"
                placeholder="输入管理员 token"
                {...form.getInputProps('token')}
              />
              <Button type="submit" leftSection={<IconLogin size={18} />} fullWidth>
                登录
              </Button>
            </Stack>
          </form>
        </Paper>
      </Container>
    </main>
  );
};
