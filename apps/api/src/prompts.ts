import type { ChatMessage, Level, ScenarioContent } from '@app/shared';
import type { Msg } from './llm/gateway';

/** System prompt (TK §7.5). Prompt chỉ nằm ở server; app chỉ gửi `scenarioId`. */

const LEVEL_GUIDE: Record<Level, string> = {
  A1: 'The learner is a beginner (CEFR A1): use very simple, common words and short sentences (5-8 words). Speak slowly and clearly.',
  A2: 'The learner is elementary (CEFR A2): use simple everyday words and short sentences (up to 10 words).',
  B1: 'The learner is intermediate (CEFR B1): use natural everyday English with common idioms, sentences up to 15 words.',
  B2: 'The learner is upper-intermediate (CEFR B2): speak naturally like a native speaker in this situation.',
};

export function buildChatPrompt(s: ScenarioContent, level: Level): string {
  return [
    `You are ${s.aiRole}. The learner plays ${s.userRole}.`,
    `Setting: ${s.setting}`,
    `Useful phrases the learner may practise: ${s.keywords.join(', ')}.`,
    LEVEL_GUIDE[level],
    'Rules:',
    '- Always reply in English with 1 to 3 short, natural spoken sentences.',
    '- Stay in character. End each turn with a question or a prompt that keeps the conversation going.',
    '- Do not correct mistakes during the conversation; only ask again if you really do not understand.',
    '- No markdown, no emoji, no lists: your reply will be read aloud.',
    '- If the learner asks for something outside this situation, politely steer back to it.',
  ].join('\n');
}

const transcript = (messages: ChatMessage[]) =>
  messages.map((m) => `${m.role === 'user' ? 'Learner' : 'Partner'}: ${m.content}`).join('\n');

export function buildExplainMessages(
  level: Level,
  sentence: string,
  context: ChatMessage[],
): Msg[] {
  return [
    {
      role: 'system',
      content: [
        'You help a Vietnamese learner of English understand one English sentence from a conversation.',
        `Learner level: ${level}.`,
        'Reply ONLY with JSON: {"translation": string, "notes": [{"phrase": string, "meaning": string}]}.',
        '"translation": a natural Vietnamese translation of the sentence (not word by word).',
        '"notes": at most 3 useful phrases or idioms from the sentence with short Vietnamese meanings. Empty if none.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: `${context.length ? `Context:\n${transcript(context)}\n\n` : ''}Sentence: ${sentence}`,
    },
  ];
}

export function buildFeedbackMessages(
  s: ScenarioContent,
  level: Level,
  messages: ChatMessage[],
): Msg[] {
  return [
    {
      role: 'system',
      content: [
        'You are an encouraging English teacher for a Vietnamese learner.',
        `The learner (${level}) just practised this role-play: ${s.userRole} talking to ${s.aiRole}. Setting: ${s.setting}`,
        'Judge ONLY the learner lines. Write explanations in Vietnamese; keep English examples in English.',
        'Reply ONLY with JSON: {"summary": string, "mistakes": [{"original": string, "better": string, "note": string}], "usefulPhrases": [string]}.',
        '"summary": 2-3 Vietnamese sentences: what went well and one thing to improve.',
        '"mistakes": up to 5 real learner mistakes (grammar, word choice, unnatural phrasing): the original learner text, a better natural version, a short Vietnamese note. Empty if none.',
        '"usefulPhrases": 3-5 natural English phrases useful in this situation.',
      ].join('\n'),
    },
    { role: 'user', content: transcript(messages) },
  ];
}
