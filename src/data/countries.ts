import raw from './countries.json';
export const fields = ['map', 'capital', 'government', 'structure', 'economy', 'colony'] as const;
export type Field = (typeof fields)[number];
export type Characteristic = Exclude<Field, 'map'>;
export type Country = { id: string; name: string; sourcePage: number; sourceRow: number } & Record<Characteristic, string | null>;
export const countries: Country[] = raw;
export const countryById = Object.fromEntries(countries.map(c => [c.id, c])) as Record<string, Country>;
export const labels: Record<Field, string> = {
  map: 'Положение на карте', capital: 'Столица', government: 'Форма правления',
  structure: 'Государственное устройство', economy: 'Уровень экономического развития', colony: 'Колониальное прошлое',
};
export const shortLabels: Record<Field, string> = {
  map: 'Карта', capital: 'Столицы', government: 'Правление', structure: 'Устройство', economy: 'Экономика', colony: 'Колонии',
};
