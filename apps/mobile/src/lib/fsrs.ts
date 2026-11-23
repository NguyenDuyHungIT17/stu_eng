import { type Card, createEmptyCard, fsrs, type Grade, type State } from 'ts-fsrs';

/**
 * Lịch ôn tập ngắt quãng FSRS (bọc thư viện ts-fsrs). Xem Thiết kế kỹ thuật §6.1.
 * Trạng thái thẻ lưu dạng JSON trong `review_cards.fsrs_state`, thời gian là epoch ms.
 */

export const Rating = { Again: 1, Hard: 2, Good: 3, Easy: 4 } as const;
export type Rating = (typeof Rating)[keyof typeof Rating];

export type CardState = {
  due: number;
  stability: number;
  difficulty: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: State;
  lastReview: number | null;
};

const scheduler = fsrs({ request_retention: 0.9, enable_short_term: true });

function toLib(c: CardState): Card {
  return {
    due: new Date(c.due),
    stability: c.stability,
    difficulty: c.difficulty,
    scheduled_days: c.scheduledDays,
    learning_steps: c.learningSteps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.lastReview === null ? undefined : new Date(c.lastReview),
  } as Card;
}

function fromLib(c: Card): CardState {
  return {
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    scheduledDays: c.scheduled_days,
    learningSteps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    lastReview: c.last_review ? c.last_review.getTime() : null,
  };
}

/** Thẻ chưa học, đến hạn ngay. */
export function newCard(now: number): CardState {
  return fromLib(createEmptyCard(new Date(now)));
}

/** Tính trạng thái mới sau khi người học chấm `rating`. `card = null` là lần học đầu tiên. */
export function scheduleNext(card: CardState | null, rating: Rating, now: number): CardState {
  const current = card ?? newCard(now);
  const result = scheduler.next(toLib(current), new Date(now), rating as Grade);
  return fromLib(result.card);
}

export function serializeCard(c: CardState): string {
  return JSON.stringify(c);
}

const NUM_FIELDS = [
  'due',
  'stability',
  'difficulty',
  'scheduledDays',
  'learningSteps',
  'reps',
  'lapses',
  'state',
] as const;

export function parseCard(json: string): CardState {
  const raw = JSON.parse(json) as Record<string, unknown>;
  for (const k of NUM_FIELDS) {
    if (typeof raw[k] !== 'number' || !Number.isFinite(raw[k])) {
      throw new Error(`fsrs_state hỏng: trường ${k}`);
    }
  }
  if (raw.lastReview !== null && typeof raw.lastReview !== 'number') {
    throw new Error('fsrs_state hỏng: trường lastReview');
  }
  return raw as unknown as CardState;
}
