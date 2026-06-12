const errorMessages = {
  missing_keyword: '请输入关键词',
  unsupported_platform: '暂不支持该平台',
  missing_platform_token: '平台 Cookie 未配置',
  platform_token_expired: '平台 Cookie 可能已失效',
  platform_contract_error: '平台响应结构变化，请稍后重试',
  platform_network_error: '平台网络请求失败',
  platform_search_error: '平台搜索失败',
  platform_comment_error: '评论获取失败',
  target_not_found: '目标不存在',
  post_not_found: '帖子不存在',
  missing_ai_api_key: 'AI 服务未配置',
  missing_question: '请输入分析问题',
  missing_search_results: '当前没有可分析的搜索结果',
  missing_comments: '当前没有可分析的评论',
  ai_provider_error: 'AI 服务返回错误',
  ai_empty_response: 'AI 没有返回内容',
  ai_provider_timeout: 'AI 服务响应超时',
  ai_provider_network_error: 'AI 服务网络请求失败',
  rate_limit_exceeded: '请求太频繁，请稍后再试',
};

export const formatApiError = (error) => {
  const code = error.response?.data?.error || error.message;
  return errorMessages[code] || code || '请求失败';
};
