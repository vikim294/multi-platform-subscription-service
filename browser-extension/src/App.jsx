import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Divider,
  Group,
  NumberInput,
  Paper,
  PasswordInput,
  ScrollArea,
  Stack,
  Tabs,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconBrandWeibo,
  IconCopy,
  IconDownload,
  IconLogin,
  IconLogout,
  IconRefresh,
  IconSparkles,
  IconWorldSearch,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';

const DEFAULT_BASE_URL = 'http://localhost:3000';
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;
const STORAGE_DEFAULTS = {
  baseUrl: DEFAULT_BASE_URL,
  account: '',
  token: '',
  scrapeLimit: DEFAULT_LIMIT,
};

const chromeApi = globalThis.chrome;

export const App = () => {
  const [settings, setSettings] = useState(STORAGE_DEFAULTS);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState('');
  const [scrape, setScrape] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [question, setQuestion] = useState('总结当前页面内容的核心观点和情绪倾向');
  const [answer, setAnswer] = useState('');

  const selectedItems = useMemo(() => {
    const ids = new Set(selectedIds);
    return (scrape?.items || []).filter((item, index) => ids.has(itemKey(item, index)));
  }, [scrape, selectedIds]);

  useEffect(() => {
    loadSettings().then(setSettings).catch(() => {});
  }, []);

  const saveSettings = async (nextSettings = settings) => {
    const normalized = {
      ...nextSettings,
      baseUrl: normalizeBaseUrl(nextSettings.baseUrl),
      scrapeLimit: normalizeLimit(nextSettings.scrapeLimit),
    };
    await chromeApi.storage.local.set(normalized);
    setSettings(normalized);
    notifications.show({ color: 'green', message: '配置已保存' });
  };

  const login = async () => {
    const account = settings.account.trim();
    if (!/^[A-Za-z0-9]{6,64}$/.test(account) || !/^[A-Za-z0-9]{6,64}$/.test(password)) {
      notifications.show({ color: 'red', message: '账号和密码需为 6-64 位英文或数字' });
      return;
    }

    setLoading('login');
    try {
      const response = await fetch(`${normalizeBaseUrl(settings.baseUrl)}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account, password }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || '登录失败');

      const nextSettings = { ...settings, account, token: data.token, baseUrl: normalizeBaseUrl(settings.baseUrl) };
      await chromeApi.storage.local.set(nextSettings);
      setSettings(nextSettings);
      setPassword('');
      notifications.show({ color: 'green', message: '登录成功' });
    } catch (error) {
      await chromeApi.storage.local.remove('token');
      setSettings((current) => ({ ...current, token: '' }));
      notifications.show({ color: 'red', message: readableError(error) });
    } finally {
      setLoading('');
    }
  };

  const logout = async () => {
    await chromeApi.storage.local.remove('token');
    setSettings((current) => ({ ...current, token: '' }));
    setScrape(null);
    setSelectedIds([]);
    setAnswer('');
    notifications.show({ color: 'blue', message: '已退出登录' });
  };

  const scrapeCurrentPage = async () => {
    if (!settings.token) {
      notifications.show({ color: 'red', message: '请先登录' });
      return;
    }

    setLoading('scrape');
    try {
      const [tab] = await chromeApi.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('未找到当前标签页');
      if (!isSupportedPageUrl(tab.url || '')) {
        throw new Error('请先打开微博、小红书或抖音页面');
      }

      const response = await chromeApi.tabs.sendMessage(tab.id, {
        type: 'MPSS_SCRAPE_PAGE',
        limit: normalizeLimit(settings.scrapeLimit),
      });
      if (!response?.ok) throw new Error(response?.error || '抓取失败');

      setScrape(response);
      setAnswer('');
      setSelectedIds(response.items.map((item, index) => itemKey(item, index)));
      notifications.show({ color: 'green', message: `已抓取 ${response.items.length} 条内容` });
    } catch (error) {
      notifications.show({ color: 'red', message: readableError(error) });
    } finally {
      setLoading('');
    }
  };

  const askAi = async () => {
    if (!settings.token) {
      notifications.show({ color: 'red', message: '请先登录' });
      return;
    }
    if (!question.trim()) {
      notifications.show({ color: 'red', message: '请输入分析问题' });
      return;
    }
    if (!selectedItems.length) {
      notifications.show({ color: 'red', message: '请至少选择一条内容' });
      return;
    }

    setLoading('ai');
    try {
      const response = await fetch(`${normalizeBaseUrl(settings.baseUrl)}/api/extension/analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.token}`,
        },
        body: JSON.stringify({
          source: scrape?.source || 'weibo',
          pageType: scrape?.pageType || 'page',
          pageUrl: scrape?.pageUrl || '',
          question,
          items: selectedItems,
        }),
      });
      const data = await response.json().catch(() => null);
      if (response.status === 401 && data?.error === 'Unauthorized') {
        await chromeApi.storage.local.remove('token');
        setSettings((current) => ({ ...current, token: '' }));
        throw new Error('登录已过期，请重新登录');
      }
      if (!response.ok) throw new Error(data?.error || '分析失败');

      setAnswer(data.answer || 'AI 没有返回内容。');
      notifications.show({ color: 'green', message: '分析完成' });
    } catch (error) {
      notifications.show({ color: 'red', message: readableError(error) });
    } finally {
      setLoading('');
    }
  };

  const copyMarkdown = async () => {
    const markdown = buildMarkdown({ scrape, selectedItems, question, answer });
    if (!markdown) return;
    await navigator.clipboard.writeText(markdown);
    notifications.show({ color: 'green', message: 'Markdown 已复制' });
  };

  const downloadMarkdown = () => {
    const markdown = buildMarkdown({ scrape, selectedItems, question, answer });
    if (!markdown) return;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mpss-analysis-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const toggleItem = (key, checked) => {
    setSelectedIds((current) => (checked ? [...new Set([...current, key])] : current.filter((item) => item !== key)));
  };

  const loggedIn = Boolean(settings.token);

  return (
    <main className="extension-shell">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap="xs">
              <IconBrandWeibo size={22} />
              <Title order={3}>MPSS AI 分析</Title>
            </Group>
            <Text c="dimmed" size="sm">
              抓取当前社交页面可见内容，发送到用户后台做 AI 分析
            </Text>
          </div>
          <Badge color={loggedIn ? 'green' : 'gray'}>{loggedIn ? '已登录' : '未登录'}</Badge>
        </Group>

        <Tabs defaultValue="work">
          <Tabs.List grow>
            <Tabs.Tab value="work" leftSection={<IconWorldSearch size={16} />}>
              工作台
            </Tabs.Tab>
            <Tabs.Tab value="settings" leftSection={<IconLogin size={16} />}>
              登录配置
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="work" pt="md">
            <Stack>
              <Paper withBorder radius="md" p="sm">
                <Group justify="space-between">
                  <Stack gap={2}>
                    <Text fw={700}>当前页面</Text>
                    <Text c="dimmed" size="xs">
                      {scrape ? `${pageTypeLabel(scrape.pageType)} · 已抓取 ${scrape.items.length} 条` : '尚未抓取'}
                    </Text>
                  </Stack>
                  <Button leftSection={<IconRefresh size={16} />} loading={loading === 'scrape'} disabled={!loggedIn} onClick={scrapeCurrentPage}>
                    抓取
                  </Button>
                </Group>
              </Paper>

              <Paper withBorder radius="md" p="sm">
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text fw={700}>内容列表</Text>
                    <Badge variant="light">已选 {selectedItems.length}</Badge>
                  </Group>
                  <ScrollArea h={260} type="auto">
                    <Stack gap="xs">
                      {!scrape?.items?.length && (
                        <Text c="dimmed" size="sm">
                          请打开微博、小红书或抖音页面后点击抓取。
                        </Text>
                      )}
                      {scrape?.items?.map((item, index) => {
                        const key = itemKey(item, index);
                        return (
                          <Paper key={key} withBorder radius="md" p="xs" className="item-card">
                            <Group align="flex-start" wrap="nowrap">
                              <Checkbox checked={selectedIds.includes(key)} onChange={(event) => toggleItem(key, event.currentTarget.checked)} />
                              <Stack gap={4} className="min-w-0">
                                <Group gap={6}>
                                  <Badge size="xs" variant="light">
                                    {item.type || 'page'}
                                  </Badge>
                                  <Text size="xs" c="dimmed" truncate>
                                    {item.author || '未知作者'}
                                  </Text>
                                </Group>
                                {item.parentTitle && (
                                  <Text size="xs" c="dimmed" lineClamp={1}>
                                    所属：{item.parentTitle}
                                  </Text>
                                )}
                                <Text size="sm" lineClamp={3}>
                                  {stripTimeLine(item.text || item.title || '无内容')}
                                </Text>
                              </Stack>
                            </Group>
                          </Paper>
                        );
                      })}
                    </Stack>
                  </ScrollArea>
                </Stack>
              </Paper>

              <Paper withBorder radius="md" p="sm">
                <Stack>
                  <Textarea
                    label="分析问题"
                    minRows={3}
                    maxLength={500}
                    value={question}
                    onChange={(event) => setQuestion(event.currentTarget.value)}
                  />
                  <Group>
                    {['总结核心观点', '有哪些高频话题？', '情绪倾向如何？'].map((preset) => (
                      <Button key={preset} size="xs" variant="light" onClick={() => setQuestion(preset)}>
                        {preset}
                      </Button>
                    ))}
                  </Group>
                  <Button leftSection={<IconSparkles size={16} />} loading={loading === 'ai'} disabled={!loggedIn || !selectedItems.length} onClick={askAi}>
                    AI 分析
                  </Button>
                  <Divider />
                  {answer ? (
                    <Stack>
                      <MarkdownContent markdown={answer} />
                      <Group justify="flex-end">
                        <Tooltip label="复制 Markdown">
                          <ActionIcon variant="light" onClick={copyMarkdown}>
                            <IconCopy size={17} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="下载 Markdown">
                          <ActionIcon variant="light" onClick={downloadMarkdown}>
                            <IconDownload size={17} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Stack>
                  ) : (
                    <Text c="dimmed" size="sm">
                      AI 分析结果会显示在这里。
                    </Text>
                  )}
                </Stack>
              </Paper>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="settings" pt="md">
            <Stack>
              <TextInput
                label="API Base URL"
                value={settings.baseUrl}
                onChange={(event) => setSettings((current) => ({ ...current, baseUrl: event.currentTarget.value }))}
              />
              <NumberInput
                label="最大抓取数量"
                min={1}
                max={MAX_LIMIT}
                value={settings.scrapeLimit}
                onChange={(value) => setSettings((current) => ({ ...current, scrapeLimit: normalizeLimit(value) }))}
              />
              <TextInput
                label="账号"
                value={settings.account}
                onChange={(event) => setSettings((current) => ({ ...current, account: event.currentTarget.value }))}
              />
              <PasswordInput label="密码" value={password} onChange={(event) => setPassword(event.currentTarget.value)} />
              <Group grow>
                <Button variant="light" onClick={() => saveSettings()}>
                  保存配置
                </Button>
                <Button leftSection={<IconLogin size={16} />} loading={loading === 'login'} onClick={login}>
                  登录
                </Button>
              </Group>
              <Button variant="subtle" color="red" leftSection={<IconLogout size={16} />} disabled={!loggedIn} onClick={logout}>
                退出登录
              </Button>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </main>
  );
};

const loadSettings = async () => {
  const data = await chromeApi.storage.local.get(STORAGE_DEFAULTS);
  return {
    baseUrl: normalizeBaseUrl(data.baseUrl),
    account: String(data.account || ''),
    token: String(data.token || ''),
    scrapeLimit: normalizeLimit(data.scrapeLimit),
  };
};

const isSupportedPageUrl = (url) => /(^https:\/\/|^http:\/\/).*(weibo|xiaohongshu|douyin)\.com/.test(url);

const normalizeBaseUrl = (value) => String(value || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');

const normalizeLimit = (value) => {
  const parsed = Number(value || DEFAULT_LIMIT);
  if (!Number.isInteger(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
};

const itemKey = (item, index) => item.platformCommentId || item.platformPostId || item.url || `${item.type}-${index}`;

const stripTimeLine = (text) =>
  String(text || '')
    .split('\n')
    .filter((line) => !/^时间[:：]/.test(line.trim()))
    .join('\n')
    .trim();

const pageTypeLabel = (value) => {
  const labels = {
    search_results: '搜索结果页',
    post_detail: '帖子详情页',
    note_detail: '笔记详情页',
    douyin_post_detail: '抖音作品详情页',
    page: '普通页面',
  };
  return labels[value] || value || '未知页面';
};

const readableError = (error) => {
  const map = {
    missing_ai_api_key: 'AI 服务未配置',
    missing_question: '请输入问题',
    missing_extension_items: '当前没有可分析的页面内容',
    rate_limit_exceeded: '请求太频繁，请稍后再试',
    Unauthorized: '登录已过期，请重新登录',
  };
  return map[error?.message] || error?.message || '操作失败';
};

const buildMarkdown = ({ scrape, selectedItems, question, answer }) => {
  if (!scrape?.items?.length || !answer) return '';
  const lines = [
    '# 页面内容 AI 分析',
    '',
    '## 基本信息',
    '',
    `- 来源：${scrape.source || '未知'}`,
    `- 页面类型：${pageTypeLabel(scrape.pageType)}`,
    `- 页面地址：${scrape.pageUrl || ''}`,
    `- 分析数量：${selectedItems.length}`,
    '',
    '## 分析问题',
    '',
    question || '未记录问题',
    '',
    '## AI 分析',
    '',
    answer,
    '',
    '## 抓取内容',
    '',
  ];

  selectedItems.forEach((item, index) => {
    lines.push(`### ${index + 1}. ${item.title || stripTimeLine(item.text) || '无标题'}`, '');
    if (item.author) lines.push(`- 作者：${item.author}`);
    if (item.parentTitle) lines.push(`- 所属：${item.parentTitle}`);
    if (item.url) lines.push(`- 链接：${item.url}`);
    lines.push('', '```text', stripTimeLine(item.text || item.title || '无内容'), '```', '');
  });

  return `${lines.join('\n').trim()}\n`;
};

const MarkdownContent = ({ markdown }) => {
  const blocks = parseMarkdown(markdown);

  return (
    <div className="markdown-content">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          const HeadingTag = `h${block.level}`;
          return <HeadingTag key={index}>{renderInlineMarkdown(block.text)}</HeadingTag>;
        }
        if (block.type === 'list') {
          const ListTag = block.ordered ? 'ol' : 'ul';
          return (
            <ListTag key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInlineMarkdown(item)}</li>
              ))}
            </ListTag>
          );
        }
        if (block.type === 'code') {
          return (
            <pre key={index}>
              <code>{block.text}</code>
            </pre>
          );
        }
        return <p key={index}>{renderInlineMarkdown(block.text)}</p>;
      })}
    </div>
  );
};

const parseMarkdown = (markdown) => {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let paragraph = [];
  let list = null;
  let code = null;

  const flushParagraph = () => {
    const text = paragraph.join('\n').trim();
    if (text) blocks.push({ type: 'paragraph', text });
    paragraph = [];
  };

  const flushList = () => {
    if (list?.items.length) blocks.push(list);
    list = null;
  };

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (code) {
        blocks.push({ type: 'code', text: code.join('\n') });
        code = null;
      } else {
        flushParagraph();
        flushList();
        code = [];
      }
      continue;
    }

    if (code) {
      code.push(line);
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2].trim() });
      continue;
    }

    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      const orderedList = Boolean(ordered);
      if (!list || list.ordered !== orderedList) flushList();
      if (!list) list = { type: 'list', ordered: orderedList, items: [] };
      list.items.push((unordered?.[1] || ordered?.[1] || '').trim());
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  if (code) blocks.push({ type: 'code', text: code.join('\n') });
  flushParagraph();
  flushList();

  return blocks.length ? blocks : [{ type: 'paragraph', text: markdown }];
};

const renderInlineMarkdown = (text) => {
  const parts = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const token = match[0];
    if (token.startsWith('**')) {
      parts.push(<strong key={parts.length}>{token.slice(2, -2)}</strong>);
    } else {
      parts.push(<code key={parts.length}>{token.slice(1, -1)}</code>);
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
};
