import {
  AppShell,
  Burger,
  Button,
  Group,
  NavLink,
  Text,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconActivity,
  IconCalendarTime,
  IconDatabase,
  IconHome,
  IconKey,
  IconLogout,
} from '@tabler/icons-react';
import { NavLink as RouterNavLink, useLocation, useNavigate } from 'react-router-dom';
import { clearAdminToken } from '../api/http.js';

const navItems = [
  { label: '概览', to: '/admin', icon: IconHome },
  { label: '平台 Cookie', to: '/admin/platform-token', icon: IconKey },
  { label: '订阅目标', to: '/admin/targets', icon: IconDatabase },
  { label: '定时任务', to: '/admin/scheduler', icon: IconCalendarTime },
  { label: '抓取日志', to: '/admin/fetch-logs', icon: IconActivity },
];

export const AppShellLayout = ({ children }) => {
  const [opened, { toggle, close }] = useDisclosure();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useMantineTheme();

  const logout = () => {
    clearAdminToken();
    navigate('/admin/login', { replace: true });
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 240,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={3} c={theme.primaryColor}>
              MPSS Admin
            </Title>
          </Group>
          <Button variant="subtle" leftSection={<IconLogout size={16} />} onClick={logout}>
            退出
          </Button>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Text size="xs" fw={700} c="dimmed" mb="sm">
          管理后台
        </Text>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              component={RouterNavLink}
              to={item.to}
              label={item.label}
              leftSection={<Icon size={18} />}
              active={location.pathname === item.to}
              onClick={close}
              className="rounded-md"
            />
          );
        })}
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
};
