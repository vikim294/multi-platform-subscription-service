import { Alert, Button, Center, Loader, Paper, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setUserToken } from '../api/http.js';
import { userApi } from '../api/user.js';

export const BaizhiOAuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const exchangedRef = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (exchangedRef.current) return;
    exchangedRef.current = true;

    const temporaryToken = searchParams.get('token');
    if (!temporaryToken) {
      setError('百智授权失败：缺少临时 token');
      return;
    }

    const exchange = async () => {
      try {
        const data = await userApi.exchangeBaizhiToken(temporaryToken);
        setUserToken(data.token);
        window.history.replaceState(null, '', '/oauth/baizhi/callback');
        navigate('/app', { replace: true });
      } catch (err) {
        setError(err.response?.data?.error || err.message || '百智登录失败');
      }
    };

    void exchange();
  }, [navigate, searchParams]);

  return (
    <main className="min-h-screen bg-slate-50">
      <Center className="min-h-screen px-4">
        <Paper withBorder radius="md" p="xl" w="100%" maw={420}>
          <Stack align="center" gap="md">
            <Title order={3}>百智账号登录</Title>
            {error ? (
              <>
                <Alert color="red" icon={<IconAlertCircle size={18} />} title="登录失败" w="100%">
                  {error}
                </Alert>
                <Button onClick={() => navigate('/login', { replace: true })}>返回登录页</Button>
              </>
            ) : (
              <>
                <Loader />
                <Text c="dimmed" size="sm">
                  正在完成登录...
                </Text>
              </>
            )}
          </Stack>
        </Paper>
      </Center>
    </main>
  );
};
