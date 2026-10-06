import type { Mode, TaskType } from "./engine";
export const modeNames: Record<Mode, string> = {
  learn: "Обучение",
  exam: "Экзамен",
  review: "Работа над ошибками",
};
export const taskNames: Record<TaskType, string> = {
  map: "Только карта",
  capitals: "Карта и столицы",
  characteristics: "Только характеристики",
  full: "Полный режим",
};
