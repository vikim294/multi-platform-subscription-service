import { Badge, Button, Group, Modal, Paper, Stack, Text, Textarea } from '@mantine/core';
import { IconSparkles } from '@tabler/icons-react';
import { MarkdownContent } from './MarkdownContent.jsx';

const presets = ['总结核心观点', '有哪些高频话题？', '情绪倾向如何？'];

export const AiAnalysisModal = ({
  opened,
  onClose,
  title = 'AI 分析',
  context,
  messages,
  question,
  onQuestionChange,
  onAsk,
  loading,
  disabled,
  placeholder,
  size = 'md',
}) => (
  <Modal opened={opened} onClose={onClose} title={title} size={size} centered>
    <Stack>
      {context && (
        <Group gap={6}>
          <Badge variant="light">微博</Badge>
          <Text c="dimmed" size="sm">
            {context}
          </Text>
        </Group>
      )}
      <Group gap="xs">
        {presets.map((item) => (
          <Button key={item} size="xs" variant="light" onClick={() => onQuestionChange(item)}>
            {item}
          </Button>
        ))}
      </Group>
      <Textarea
        minRows={3}
        maxLength={500}
        value={question}
        onChange={(event) => onQuestionChange(event.currentTarget.value)}
        placeholder={placeholder || '问问当前内容...'}
      />
      <Group justify="flex-end">
        <Button leftSection={<IconSparkles size={16} />} loading={loading} disabled={disabled} onClick={onAsk}>
          AI 分析
        </Button>
      </Group>
      <Stack gap="sm">
        {messages.length === 0 && (
          <Text c="dimmed" size="sm">
            分析结果会显示在这里。
          </Text>
        )}
        {messages.map((message, index) => (
          <Paper key={`${message.role}-${index}`} withBorder radius="md" p="sm" bg={message.role === 'assistant' ? 'blue.0' : undefined}>
            <Text fw={600} size="sm">
              {message.role === 'assistant' ? 'AI' : '你'}
            </Text>
            {message.role === 'assistant' ? (
              <MarkdownContent markdown={message.content} />
            ) : (
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                {message.content}
              </Text>
            )}
          </Paper>
        ))}
      </Stack>
    </Stack>
  </Modal>
);
