import { z } from 'zod';
import { countryById, fields } from '../data/countries';
import { updateMistakes, type Attempt, type Mistakes, type Session, type Settings } from './engine';
export const STORAGE_KEY = 'asia-trainer-v1';
export type SavedData = { version: 1; settings: Settings; attempts: Attempt[]; mistakes: Mistakes; session: Session | null };
export const defaultSettings: Settings = { mode: 'learn', count: '10', taskType: 'full', sound: false, theme: 'light' };
export const freshData = (): SavedData => ({ version: 1, settings: { ...defaultSettings }, attempts: [], mistakes: {}, session: null });
const field = z.enum(fields);
const id = z.string().refine(v => Boolean(countryById[v]));
const mode = z.enum(['learn', 'exam', 'review']);
const taskType = z.enum(['map', 'capitals', 'characteristics', 'full']);
const result = z.object({ countryId: id, checks: z.array(z.object({ field, selected: z.string().nullable(), expected: z.string(), correct: z.boolean() })).min(1).max(6) });
const question = z.object({ countryId: id, fields: z.array(field).min(1).max(6), options: z.record(field, z.array(z.string())) });
const sessionSchema = z.object({ id: z.string(), mode, taskType, questions: z.array(question).min(1).max(48), index: z.number().int().min(0), answers: z.record(field,z.string()), checked: z.boolean(), results: z.array(result).max(48), startedAt: z.string() }).refine(s => s.index < s.questions.length && s.results.length === s.index + Number(s.checked));
const schema = z.object({ version: z.literal(1), settings: z.object({ mode, taskType, count: z.enum(['10','20','all']), theme: z.enum(['light','dark']), sound: z.boolean() }),
  attempts: z.array(z.object({ id: z.string(), mode, taskType, date: z.string(), countryIds: z.array(id), results: z.array(result) })),
  mistakes: z.record(id,z.array(field)), session: sessionSchema.nullable(),
});
export function readData(storage?: Pick<Storage, 'getItem'>): { data: SavedData; warning: string | null } {
  try {
    const raw = (storage ?? window.localStorage).getItem(STORAGE_KEY);
    if (!raw) return { data: freshData(), warning: null };
    const parsed = schema.safeParse(JSON.parse(raw));
    if (!parsed.success) return { data: freshData(), warning: 'Сохранение повреждено или устарело. Начата новая история.' };
    return { data: parsed.data, warning: null };
  } catch { return { data: freshData(), warning: 'Не удалось прочитать сохранение. Можно заниматься, но прогресс может не сохраниться.' }; }
}
export function writeData(data: SavedData, storage?: Pick<Storage, 'setItem'>): boolean {
  try { (storage ?? window.localStorage).setItem(STORAGE_KEY, JSON.stringify(data)); return true; } catch { return false; }
}
export function recordAttempt(data: SavedData, session: Session): SavedData {
  if (session.results.length !== session.questions.length) throw new Error('Попытка ещё не завершена');
  if (data.attempts.some(a => a.id === session.id)) return { ...data, session: null };
  const attempt: Attempt = { id: session.id, mode: session.mode, taskType: session.taskType, date: new Date().toISOString(), countryIds: session.questions.map(q => q.countryId), results: session.results };
  return { ...data, session: null, attempts: [...data.attempts, attempt], mistakes: updateMistakes(data.mistakes, session.results) };
}
