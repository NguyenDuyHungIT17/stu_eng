/** Biểu tượng cho từng chủ đề (emoji, không cần thư viện icon). */
const ICONS: Record<string, string> = {
  greetings: '👋',
  'daily-life': '🏠',
  restaurant: '🍜',
  'small-talk': '☕',
  'making-plans': '📅',
  shopping: '🛍️',
  directions: '🧭',
  travel: '✈️',
  'phone-calls': '📞',
  health: '🩺',
  'feelings-opinions': '💭',
  workplace: '💼',
  meetings: '🖥️',
  'polite-requests': '🙏',
  complaints: '⚠️',
  'job-interview': '🤝',
  presentations: '📊',
  negotiation: '⚖️',
};

export const topicIcon = (id: string) => ICONS[id] ?? '💬';
