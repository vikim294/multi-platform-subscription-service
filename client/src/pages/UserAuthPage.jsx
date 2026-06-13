import {
  Button,
  Container,
  Divider,
  Group,
  Paper,
  PasswordInput,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconLogin, IconSparkles, IconUserPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setUserToken } from '../api/http.js';
import { userApi } from '../api/user.js';

const credentialPattern = /^[A-Za-z0-9]{6,64}$/;

export const UserAuthPage = () => {
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [baizhiLoading, setBaizhiLoading] = useState(false);
  const navigate = useNavigate();
  const form = useForm({
    initialValues: {
      account: '',
      password: '',
    },
    validate: {
      account: (value) => (credentialPattern.test(value) ? null : '账号需为 6-64 位英文或数字'),
      password: (value) => (credentialPattern.test(value) ? null : '密码需为 6-64 位英文或数字'),
    },
  });

  const submit = form.onSubmit(async (values) => {
    setLoading(true);
    try {
      const payload = {
        account: values.account.trim(),
        password: values.password,
      };
      const data = mode === 'login' ? await userApi.login(payload) : await userApi.register(payload);
      setUserToken(data.token);
      navigate('/app', { replace: true });
    } catch (error) {
      notifications.show({ color: 'red', message: error.response?.data?.error || error.message });
    } finally {
      setLoading(false);
    }
  });

  const loginWithBaizhi = async () => {
    setBaizhiLoading(true);
    try {
      const data = await userApi.getBaizhiAuthorizeUrl();
      if (!data.authorizeUrl) throw new Error('未获取到百智授权地址');
      window.location.href = data.authorizeUrl;
    } catch (error) {
      notifications.show({ color: 'red', message: error.response?.data?.error || error.message });
      setBaizhiLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <Container size={440} className="flex min-h-screen items-center">
        <Paper withBorder radius="md" p="xl" w="100%">
          <form onSubmit={submit}>
            <Stack>
              <div>
                <Title order={2}>订阅服务</Title>
                <Text c="dimmed" size="sm" mt={4}>
                  登录后查看和管理你的订阅目标
                </Text>
              </div>

              <SegmentedControl
                value={mode}
                onChange={setMode}
                data={[
                  { label: '登录', value: 'login' },
                  { label: '注册', value: 'register' },
                ]}
                fullWidth
              />

              <TextInput label="账号" placeholder="6 位以上英文或数字" {...form.getInputProps('account')} />
              <PasswordInput label="密码" placeholder="6 位以上英文或数字" {...form.getInputProps('password')} />

              <Group justify="space-between">
                <Button variant="subtle" component="a" href="/admin/login">
                  管理后台
                </Button>
                <Button
                  type="submit"
                  loading={loading}
                  leftSection={mode === 'login' ? <IconLogin size={18} /> : <IconUserPlus size={18} />}
                >
                  {mode === 'login' ? '登录' : '注册'}
                </Button>
              </Group>

              <Divider label="或" labelPosition="center" />

              <Button
                type="button"
                variant="light"
                fullWidth
                loading={baizhiLoading}
                leftSection={<IconSparkles size={18} />}
                onClick={loginWithBaizhi}
              >
                使用百智账号登录
              </Button>
            </Stack>
          </form>
        </Paper>
      </Container>
    </main>
  );
};
