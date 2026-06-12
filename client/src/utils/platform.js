export const platformOptions = [
  { value: 'weibo', label: '微博', targetLabel: '微博 uid', cookiePlaceholder: 'SUB=...; XSRF-TOKEN=...' },
  {
    value: 'xiaohongshu',
    label: '小红书',
    targetLabel: '小红书 user_id',
    cookiePlaceholder: 'a1=...; web_session=...',
  },
];

export const getPlatformOption = (platform) =>
  platformOptions.find((option) => option.value === platform) || platformOptions[0];

export const getPlatformLabel = (platform) => getPlatformOption(platform).label;

export const getTimeLabel = (activity) => (activity?.publishedAtSource === 'fetched_at' ? '抓取时间' : '发布时间');
