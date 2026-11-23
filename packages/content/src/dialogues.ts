import type { DialogueContent, PhraseContent } from '@app/shared';

/** Id của câu thứ `lineNo` trong đoạn hội thoại (kebab-case, ổn định giữa các phiên bản). */
export const lineId = (dialogueId: string, lineNo: number) => `${dialogueId}-l${lineNo}`;

/**
 * Mỗi câu trong hội thoại thành một dòng `phrases` (để ôn tập, lưu ghi chú).
 * Ngữ cảnh (đoạn hội thoại, người nói) đi kèm qua `dialogueId`, `lineNo`, `speaker`.
 */
export function dialogueToPhrases(d: DialogueContent): PhraseContent[] {
  return d.lines.map((l, i) => ({
    id: lineId(d.id, i),
    topicId: d.topicId,
    text: l.text,
    meaningVi: l.meaningVi,
    level: d.level,
    dialogueId: d.id,
    lineNo: i,
    speaker: l.speaker,
    ...(l.blank ? { blank: l.blank } : {}),
    ...(l.noteVi ? { noteVi: l.noteVi } : {}),
  }));
}
