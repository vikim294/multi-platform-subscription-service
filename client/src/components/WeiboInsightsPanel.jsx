import {
  Anchor,
  Avatar,
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconBrandWeibo,
  IconChartBarPopular,
  IconMessageCircle,
  IconSearch,
  IconSparkles,
  IconTrash,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { userApi } from '../api/user.js';
import { formatApiError } from '../utils/errors.js';
import { AiAnalysisModal } from './AiAnalysisModal.jsx';

const defaultSearchQuestion = '总结这些搜索结果正在讨论什么';
const defaultCommentQuestion = '总结这些评论的主要观点和情绪';

const Metric = ({ label, value }) => (
  <Group gap={4}>
    <Text c="dimmed" size="xs">
      {label}
    </Text>
    <Text size="xs" fw={600}>
      {value || 0}
    </Text>
  </Group>
);

export const WeiboInsightsPanel = ({ targets }) => {
  const weiboTargets = useMemo(() => targets.filter((target) => target.platform === 'weibo'), [targets]);
  const [keyword, setKeyword] = useState('');
  const [histories, setHistories] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchMeta, setSearchMeta] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchAnalysisOpened, searchAnalysisHandlers] = useDisclosure(false);
  const [searchQuestion, setSearchQuestion] = useState(defaultSearchQuestion);
  const [searchMessages, setSearchMessages] = useState([]);
  const [searchAiLoading, setSearchAiLoading] = useState(false);

  const [selectedTargetId, setSelectedTargetId] = useState(null);
  const [posts, setPosts] = useState([]);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [commentsData, setCommentsData] = useState(null);
  const [postsLoading, setPostsLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentOpened, commentHandlers] = useDisclosure(false);
  const [commentAnalysisOpened, commentAnalysisHandlers] = useDisclosure(false);
  const [commentQuestion, setCommentQuestion] = useState(defaultCommentQuestion);
  const [commentMessages, setCommentMessages] = useState([]);
  const [commentAiLoading, setCommentAiLoading] = useState(false);

  const loadHistories = useCallback(async () => {
    const data = await userApi.listSearchHistories({ limit: 10 });
    setHistories(data.histories);
  }, []);

  useEffect(() => {
    loadHistories().catch(() => {});
  }, [loadHistories]);

  useEffect(() => {
    if (!selectedTargetId && weiboTargets.length) {
      setSelectedTargetId(String(weiboTargets[0].id));
    }
  }, [selectedTargetId, weiboTargets]);

  const targetOptions = weiboTargets.map((target) => ({
    value: String(target.id),
    label: target.name,
  }));

  const postOptions = posts.map((post) => ({
    value: post.platformActivityId,
    label: `${dayjs(post.publishedAt).format('MM-DD HH:mm')} ${post.text || '无正文'}`.slice(0, 90),
  }));

  const selectedPost = posts.find((post) => post.platformActivityId === selectedPostId);

  const runSearch = async (nextKeyword = keyword) => {
    const normalizedKeyword = nextKeyword.trim();
    if (!normalizedKeyword) return;
    setKeyword(normalizedKeyword);
    setSearchLoading(true);
    try {
      const data = await userApi.searchContent({ platform: 'weibo', keyword: normalizedKeyword, page: 1 });
      setSearchResults(data.results);
      setSearchMeta({ keyword: data.keyword, platform: data.platform });
      setSearchMessages([]);
      await loadHistories();
    } catch (error) {
      notifications.show({ color: 'red', message: formatApiError(error) });
    } finally {
      setSearchLoading(false);
    }
  };

  const askSearch = async () => {
    setSearchAiLoading(true);
    const question = searchQuestion.trim();
    try {
      const data = await userApi.askSearch({
        platform: 'weibo',
        keyword: searchMeta?.keyword,
        question,
        results: searchResults,
      });
      setSearchMessages((messages) => [...messages, { role: 'user', content: question }, { role: 'assistant', content: data.answer }]);
      setSearchQuestion('');
    } catch (error) {
      notifications.show({ color: 'red', message: formatApiError(error) });
    } finally {
      setSearchAiLoading(false);
    }
  };

  const removeHistory = async (historyId) => {
    try {
      await userApi.deleteSearchHistory(historyId);
      await loadHistories();
    } catch (error) {
      notifications.show({ color: 'red', message: formatApiError(error) });
    }
  };

  const loadPosts = async () => {
    if (!selectedTargetId) return;
    setPostsLoading(true);
    try {
      const data = await userApi.listTargetPosts(selectedTargetId, { platform: 'weibo', pageSize: 20 });
      setPosts(data.posts);
      setSelectedPostId(data.posts[0]?.platformActivityId || null);
      setCommentsData(null);
    } catch (error) {
      notifications.show({ color: 'red', message: formatApiError(error) });
    } finally {
      setPostsLoading(false);
    }
  };

  const loadComments = async (append = false) => {
    if (!selectedTargetId || !selectedPostId) return;
    setCommentsLoading(true);
    try {
      const data = await userApi.listPostComments(selectedTargetId, selectedPostId, {
        maxId: append ? commentsData?.maxId : 0,
      });
      setCommentsData((current) =>
        append && current
          ? { ...data, comments: [...current.comments, ...data.comments] }
          : data,
      );
      setCommentMessages([]);
      commentHandlers.open();
    } catch (error) {
      notifications.show({ color: 'red', message: formatApiError(error) });
    } finally {
      setCommentsLoading(false);
    }
  };

  const askComments = async () => {
    setCommentAiLoading(true);
    const question = commentQuestion.trim();
    try {
      const data = await userApi.askComments({
        platform: 'weibo',
        targetName: commentsData?.target?.name,
        postText: commentsData?.post?.text,
        question,
        comments: commentsData?.comments || [],
      });
      setCommentMessages((messages) => [...messages, { role: 'user', content: question }, { role: 'assistant', content: data.answer }]);
      setCommentQuestion('');
    } catch (error) {
      notifications.show({ color: 'red', message: formatApiError(error) });
    } finally {
      setCommentAiLoading(false);
    }
  };

  return (
    <Stack mt="xl">
      <Group justify="space-between" align="flex-end">
        <div>
          <Group gap="xs">
            <IconBrandWeibo size={22} />
            <Title order={3}>微博洞察</Title>
          </Group>
          <Text c="dimmed" size="sm">
            搜索关键词、查看已入库微博帖子的评论区，并基于当前内容做 AI 分析
          </Text>
        </div>
      </Group>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        <Paper withBorder radius="md" p="md">
          <Stack>
            <Group justify="space-between">
              <Title order={4}>关键词搜索</Title>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconSparkles size={15} />}
                disabled={!searchResults.length}
                onClick={searchAnalysisHandlers.open}
              >
                AI 分析
              </Button>
            </Group>
            <Group align="flex-end" wrap="nowrap">
              <TextInput
                className="flex-1"
                label="关键词"
                placeholder="输入关键词，如：世界杯"
                value={keyword}
                onChange={(event) => setKeyword(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') runSearch();
                }}
              />
              <Button leftSection={<IconSearch size={16} />} loading={searchLoading} onClick={() => runSearch()}>
                搜索
              </Button>
            </Group>

            {histories.length > 0 && (
              <Group gap={6}>
                {histories.map((history) => (
                  <Badge
                    key={history.id}
                    variant="light"
                    rightSection={
                      <Tooltip label="删除">
                        <IconTrash
                          size={12}
                          className="cursor-pointer"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeHistory(history.id);
                          }}
                        />
                      </Tooltip>
                    }
                    onClick={() => runSearch(history.keyword)}
                    className="cursor-pointer"
                  >
                    {history.keyword}
                  </Badge>
                ))}
              </Group>
            )}

            <Divider />
            <Stack gap="sm">
              {!searchResults.length && (
                <Text c="dimmed" size="sm">
                  输入关键词后显示微博搜索结果。
                </Text>
              )}
              {searchResults.map((item) => (
                <Paper key={item.platformPostId} withBorder radius="md" p="sm">
                  <Stack gap={6}>
                    <Group justify="space-between" gap="xs">
                      <Text fw={600} size="sm">
                        {item.user?.name || '未知用户'}
                      </Text>
                      <Text c="dimmed" size="xs">
                        {item.postedAtText || '-'}
                      </Text>
                    </Group>
                    <Text size="sm" lineClamp={3}>
                      {item.text || '无正文'}
                    </Text>
                    <Group justify="space-between">
                      <Group gap="md">
                        <Metric label="评论" value={item.commentCount} />
                        <Metric label="转发" value={item.repostCount} />
                        <Metric label="点赞" value={item.likeCount} />
                      </Group>
                      {item.url && (
                        <Anchor href={item.url} target="_blank" size="xs">
                          打开
                        </Anchor>
                      )}
                    </Group>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Stack>
        </Paper>

        <Paper withBorder radius="md" p="md">
          <Stack>
            <Group justify="space-between">
              <Title order={4}>帖子评论区</Title>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconMessageCircle size={15} />}
                loading={commentsLoading}
                disabled={!selectedPostId}
                onClick={() => loadComments(false)}
              >
                查看评论
              </Button>
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <Select label="微博目标" data={targetOptions} value={selectedTargetId} onChange={setSelectedTargetId} placeholder="选择目标" />
              <Button
                mt={{ base: 0, sm: 25 }}
                variant="light"
                leftSection={<IconChartBarPopular size={16} />}
                loading={postsLoading}
                disabled={!selectedTargetId}
                onClick={loadPosts}
              >
                加载已入库帖子
              </Button>
            </SimpleGrid>
            <Select
              label="帖子"
              data={postOptions}
              value={selectedPostId}
              onChange={setSelectedPostId}
              placeholder={posts.length ? '选择帖子' : '先加载帖子'}
              searchable
            />
            {selectedPost ? (
              <Paper withBorder radius="md" p="sm" bg="gray.0">
                <Stack gap={6}>
                  <Text size="sm" lineClamp={4}>
                    {selectedPost.text || '无正文'}
                  </Text>
                  <Group justify="space-between">
                    <Group gap="md">
                      <Metric label="评论" value={selectedPost.commentCount} />
                      <Metric label="转发" value={selectedPost.repostCount} />
                      <Metric label="点赞" value={selectedPost.likeCount} />
                    </Group>
                    {selectedPost.url && (
                      <Anchor href={selectedPost.url} target="_blank" size="xs">
                        打开原文
                      </Anchor>
                    )}
                  </Group>
                </Stack>
              </Paper>
            ) : (
              <Text c="dimmed" size="sm">
                评论区依赖已入库的微博动态；如果没有帖子，请先等待抓取任务或在管理后台手动抓取。
              </Text>
            )}
          </Stack>
        </Paper>
      </SimpleGrid>

      <Modal opened={commentOpened} onClose={commentHandlers.close} title="评论详情" size="xl" centered>
        <Stack>
          {commentsData?.post && (
            <Paper withBorder radius="md" p="sm" bg="gray.0">
              <Text size="sm" lineClamp={3}>
                {commentsData.post.text || '无正文'}
              </Text>
            </Paper>
          )}
          <Group justify="space-between">
            <Text c="dimmed" size="sm">
              已加载 {commentsData?.comments?.length || 0} 条
              {commentsData?.total !== null && commentsData?.total !== undefined ? ` / 总评论 ${commentsData.total} 条` : ''}
            </Text>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconSparkles size={15} />}
              disabled={!commentsData?.comments?.length}
              onClick={commentAnalysisHandlers.open}
            >
              AI 分析
            </Button>
          </Group>
          <Stack gap="sm">
            {commentsData?.comments?.map((comment) => (
              <Paper key={comment.id} withBorder radius="md" p="sm">
                <Group align="flex-start" wrap="nowrap">
                  <Avatar src={comment.user.avatar} radius="xl" size={34}>
                    {comment.user.name?.slice(0, 1)}
                  </Avatar>
                  <Stack gap={4} className="min-w-0 flex-1">
                    <Group gap="xs">
                      <Text fw={600} size="sm">
                        {comment.user.name}
                      </Text>
                      {comment.user.verified && <Badge size="xs">认证</Badge>}
                    </Group>
                    <Text size="sm">{comment.text || '无内容'}</Text>
                    <Group gap="md">
                      <Text c="dimmed" size="xs">
                        {comment.createdAt ? dayjs(comment.createdAt).format('YYYY-MM-DD HH:mm') : '-'}
                      </Text>
                      <Metric label="点赞" value={comment.likeCount} />
                      <Metric label="回复" value={comment.replyCount} />
                    </Group>
                  </Stack>
                </Group>
              </Paper>
            ))}
          </Stack>
          {commentsData?.maxId ? (
            <Button variant="light" loading={commentsLoading} onClick={() => loadComments(true)}>
              加载更多评论
            </Button>
          ) : null}
        </Stack>
      </Modal>

      <AiAnalysisModal
        opened={searchAnalysisOpened}
        onClose={searchAnalysisHandlers.close}
        size="md"
        context={searchMeta ? `关键词：${searchMeta.keyword} · 当前 ${searchResults.length} 条结果` : ''}
        messages={searchMessages}
        question={searchQuestion}
        onQuestionChange={setSearchQuestion}
        onAsk={askSearch}
        loading={searchAiLoading}
        disabled={!searchResults.length}
        placeholder="问问这些搜索结果在讨论什么..."
      />
      <AiAnalysisModal
        opened={commentAnalysisOpened}
        onClose={commentAnalysisHandlers.close}
        size="md"
        context={`基于当前已加载 ${commentsData?.comments?.length || 0} 条评论`}
        messages={commentMessages}
        question={commentQuestion}
        onQuestionChange={setCommentQuestion}
        onAsk={askComments}
        loading={commentAiLoading}
        disabled={!commentsData?.comments?.length}
        placeholder="问问这些评论在讨论什么..."
      />
    </Stack>
  );
};
