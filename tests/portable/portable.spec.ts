import { test, expect, type Page } from "@playwright/test";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Country } from "../../src/data/countries";
import type { SavedData } from "../../src/lib/storage";

const portableFile = new URL("../../Азия.html", import.meta.url);
const countries = JSON.parse(
  readFileSync(new URL("../../src/data/countries.json", import.meta.url), "utf8"),
) as Country[];
const countryById = Object.fromEntries(countries.map((c) => [c.id, c]));
const readProgress = (page: Page) =>
  page.evaluate(
    () => JSON.parse(localStorage.getItem("asia-trainer-v1")!) as SavedData,
  );

async function openFile(page: Page, url = portableFile.href) {
  await page.context().setOffline(true);
  await page.goto(url);
  await expect(page.locator(".hero .map-country")).toHaveCount(48);
}

async function answerCorrectly(page: Page) {
  const session = (await readProgress(page)).session!;
  const question = session.questions[session.index];
  const country = countryById[question.countryId];
  if (question.fields.includes("map")) {
    const region = page.locator(`[data-country="${country.id}"]`);
    await region.focus();
    await region.press("Enter");
  }
  for (const field of question.fields.filter((f) => f !== "map")) {
    const radio = page.getByRole("radio", {
      name: country[field]!,
      exact: true,
    });
    await radio.locator("..").click();
    await expect(radio).toBeChecked();
  }
}

test("standalone file opens offline, without loading adjacent files or network resources", async ({ page }) => {
  const failures: string[] = [], errors: string[] = [], dependencies: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("requestfailed", (request) => failures.push(request.url()));
  page.on("request", (request) => {
    if (request.url() !== portableFile.href && !request.url().startsWith("data:")) {
      dependencies.push(request.url());
    }
  });
  await openFile(page);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { name: "Большая Азия. Твои маленькие победы." })).toBeVisible();
  await page.getByRole("button", { name: "Все страны", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(48);
  for (const country of countries) {
    const row = page.getByRole("row").filter({
      has: page.getByRole("rowheader").filter({ hasText: country.name }),
    });
    await expect(row).toHaveCount(1);
    for (const field of ["capital", "government", "structure", "economy", "colony"] as const) {
      await expect(row).toContainText(country[field]!);
    }
  }
  expect(errors).toEqual([]);
  expect(failures).toEqual([]);
  expect(dependencies).toEqual([]);
});

test("all 48 map choices work in the standalone file", async ({ page }) => {
  await openFile(page);
  await page.getByRole("button", { name: "Только карта", exact: true }).click();
  await page.getByRole("button", { name: "Случайная страна" }).click();
  await expect(page.locator("[data-country]")).toHaveCount(48);
  for (const country of countries) {
    const region = page.locator(`[data-country="${country.id}"]`);
    await region.focus();
    await region.press("Enter");
    await expect(region).toHaveAttribute("aria-pressed", "true");
  }
  await page.getByRole("button", { name: "Увеличить карту" }).click();
  await expect(page.locator(".map-zoom>span")).toHaveText("1.5×");
  await page.getByRole("button", { name: "Развернуть карту" }).click();
  await expect(page.getByRole("dialog", { name: "Развёрнутая карта Азии" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".map-expanded")).toHaveCount(0);
});

test("answers, score and local progress survive reopening the file", async ({ page }) => {
  await openFile(page);
  await page.getByRole("button", { name: "Включить тёмную тему" }).click();
  await page.getByRole("button", { name: "Случайная страна" }).click();
  await answerCorrectly(page);
  await page.getByRole("button", { name: "Проверить", exact: true }).click();
  const checked = (await readProgress(page)).session;
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: /^Продолжить:/ }).click();
  expect((await readProgress(page)).session).toEqual(checked);
  await page.getByRole("button", { name: "Посмотреть результат" }).click();
  await expect(page.locator(".result-percent")).toContainText("100");
  await expect(page.locator(".result-grade strong")).toHaveText("5");
  expect((await readProgress(page)).attempts).toHaveLength(1);
  await page.reload();
  await page.getByRole("button", { name: "Статистика", exact: true }).click();
  await expect(page.locator(".attempt-row")).toHaveCount(1);
});

test("standalone exam still hides intermediate results", async ({ page }) => {
  await openFile(page);
  await page.getByRole("button", { name: /^Экзамен/ }).click();
  await page.getByRole("button", { name: "Только карта", exact: true }).click();
  await page.getByRole("button", { name: /^Начать/ }).click();
  for (let i = 0; i < 10; i++) {
    await answerCorrectly(page);
    await page.getByRole("button", { name: "Сохранить ответ", exact: true }).click();
    await expect(page.locator(".map-country.correct")).toHaveCount(0);
    await expect(page.locator(".game-score strong").first()).toHaveText("—");
    await page.getByRole("button", { name: i === 9 ? "Посмотреть результат" : "Следующая страна" }).click();
  }
  await expect(page.locator(".result-percent")).toContainText("100");
  await expect(page.locator(".result-grade strong")).toHaveText("5");
});

test("only the HTML is needed in a folder with spaces and Cyrillic characters", async ({ page }) => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  mkdirSync(join(root, "tmp"), { recursive: true });
  const temporary = mkdtempSync(join(root, "tmp", "portable-check-"));
  try {
    const folder = join(temporary, "Школьный проект для Windows");
    mkdirSync(folder);
    const destination = join(folder, "Азия для одноклассника.html");
    copyFileSync(portableFile, destination);
    await openFile(page, pathToFileURL(destination).href);
    await page.getByRole("button", { name: "Случайная страна" }).click();
    await answerCorrectly(page);
    await page.getByRole("button", { name: "Проверить", exact: true }).click();
    await page.getByRole("button", { name: "Посмотреть результат" }).click();
    await expect(page.locator(".result-percent")).toContainText("100");
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
