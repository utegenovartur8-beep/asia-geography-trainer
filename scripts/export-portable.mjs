import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { strToU8, zipSync } from "fflate";

const source = new URL("../portable/index.html", import.meta.url);
const destination = new URL("../Азия.html", import.meta.url);
const html = readFileSync(source, "utf8");

if (/<script\b[^>]*\bsrc\s*=/i.test(html)) {
  throw new Error("Portable HTML still depends on an external script.");
}
if (/<link\b[^>]*\brel=["']stylesheet["']/i.test(html)) {
  throw new Error("Portable HTML still depends on an external stylesheet.");
}
if (/url\(\s*["']?(?:\.\/)?assets\//i.test(html)) {
  throw new Error("Portable HTML still depends on an external asset.");
}

copyFileSync(source, destination);
const instructions = `АЗИЯ — ГЕОГРАФИЧЕСКИЙ ТРЕНАЖЁР

КАК ОТКРЫТЬ НА WINDOWS
1. Распакуй архив целиком в обычную папку.
2. Открой файл «Азия.html» двойным щелчком.
3. Если он открылся как текст, нажми правой кнопкой мыши:
   «Открыть с помощью» → Microsoft Edge или Google Chrome.

Интернет, установка Node.js и команды в терминале не нужны.
Открывай HTML из распакованной папки, а не в предпросмотре мессенджера.
Для продолжения тренировки используй тот же файл, папку и браузер.

Внутри файла находятся приложение, карта, шрифты и все учебные данные:
48 стран из исходного «Азия.pdf». Учебные значения сохранены по таблице.
Есть обучение, экзамен, работа над ошибками, справочник и статистика.

Управление: Tab — переход; Enter / пробел — выбор;
Ctrl + Enter — проверить / следующая страна;
на карте + / - и стрелки; Home — сброс масштаба; Escape — свернуть карту.

Файл проверен при прямом открытии через file:// в Chromium.
Отдельная система Windows при проверке не использовалась.
`;
writeFileSync(
  new URL("../Asia-Windows.zip", import.meta.url),
  zipSync(
    {
      "Азия.html": strToU8(html),
      "Как открыть на Windows.txt": strToU8(
        instructions.replaceAll("\n", "\r\n"),
      ),
    },
    { level: 9 },
  ),
);
console.log(
  `Created Азия.html (${Math.round(Buffer.byteLength(html) / 1024)} KiB) and Asia-Windows.zip. Open the HTML directly in a browser.`,
);
