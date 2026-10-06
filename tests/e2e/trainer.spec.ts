import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import type { Country } from "../../src/data/countries";
const countries = JSON.parse(
  readFileSync(
    new URL("../../src/data/countries.json", import.meta.url),
    "utf8",
  ),
) as Country[];
const countryById = Object.fromEntries(countries.map((c) => [c.id, c]));
const STORAGE_KEY = "asia-trainer-v1";
import type { SavedData } from "../../src/lib/storage";
const saved = (page: Page) =>
  page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!) as SavedData,
    STORAGE_KEY,
  );
async function chooseMap(page: Page, id: string) {
  const region = page.locator(`[data-country="${id}"]`);
  await region.focus();
  await region.press("Enter");
  await expect(region).toHaveAttribute("aria-pressed", "true");
}
async function selectAnswers(page: Page, wrongCapital = false) {
  const state = await saved(page),
    s = state.session!,
    q = s.questions[s.index],
    c = countryById[q.countryId];
  if (q.fields.includes("map")) await chooseMap(page, c.id);
  for (const f of q.fields.filter((f) => f !== "map")) {
    const value =
      wrongCapital && f === "capital"
        ? q.options[f]!.find((v) => v !== c[f])!
        : c[f]!;
    const radio = page.getByRole("radio", { name: value, exact: true });
    await radio.locator("..").click();
    await expect(radio).toBeChecked();
  }
  return c;
}
test("home, local assets, atlas search/filters and settings", async ({
  page,
}) => {
  const errors: string[] = [],
    external: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (
      !r.url().startsWith("http://127.0.0.1:5173") &&
      !r.url().startsWith("data:")
    )
      external.push(r.url());
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Большая Азия. Твои маленькие победы." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Включить тёмную тему" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Включить звук" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("button", { name: "Выключить звук" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Все страны", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(48);
  const search = page.getByRole("searchbox");
  await search.fill("Бишкек");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody")).toContainText("Киргизия (Кыргызстан)");
  await search.fill("несуществующая страна");
  await expect(page.getByText("Пока ничего не найдено")).toBeVisible();
  await page.getByRole("button", { name: "Сбросить фильтры" }).click();
  await page.getByLabel("Характеристика для фильтра").selectOption("structure");
  await page.getByLabel("Значение фильтра").selectOption("Федерация");
  await expect(page.locator("tbody tr")).toHaveCount(7);
  await expect(page.locator("tbody")).toContainText("Непал");
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
test("every one of the 48 map objects responds to an actual pointer click", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Только карта", exact: true }).click();
  await page.getByRole("button", { name: "Случайная страна" }).click();
  await expect(page.locator("[data-country]")).toHaveCount(48);
  for (const country of countries) {
    await page.getByRole("button", { name: "Сбросить масштаб" }).click();
    if (
      isMobile &&
      [
        "AZE",
        "ARM",
        "GEO",
        "BHR",
        "QAT",
        "KWT",
        "CYP",
        "LBN",
        "ISR",
        "PSE",
      ].includes(country.id)
    )
      await page
        .getByRole("button", { name: "Западная Азия", exact: true })
        .click();
    if (isMobile && ["SGP", "BRN", "TLS"].includes(country.id))
      await page
        .getByRole("button", { name: "Юго-восток", exact: true })
        .click();
    if (isMobile && country.id === "MDV")
      await page
        .getByRole("button", { name: "Острова Индийского океана", exact: true })
        .click();
    const region = page.locator(`[data-country="${country.id}"]`);
    // Scroll into view first; then find a visible interior point of the real SVG geometry.
    await page
      .getByRole("group", { name: "Карта Азии", exact: true })
      .scrollIntoViewIfNeeded();
    const point = await page.evaluate((id) => {
      const marker = document.querySelector<SVGGElement>(
        `[data-marker="${id}"]`,
      );
      if (marker) {
        const circle = marker.querySelector<SVGCircleElement>(".marker-hit")!;
        const p = new DOMPoint(
          circle.cx.baseVal.value,
          circle.cy.baseVal.value,
        ).matrixTransform(circle.getScreenCTM()!);
        if (
          document.elementFromPoint(p.x, p.y)?.closest("[data-marker]") ===
          marker
        )
          return { x: p.x, y: p.y };
      }
      const group = document.querySelector<SVGGElement>(
        `[data-country="${id}"]`,
      )!;
      const path = group.querySelector<SVGPathElement>("path")!,
        bbox = path.getBBox(),
        matrix = path.getScreenCTM()!;
      for (let resolution = 8; resolution <= 40; resolution += 8)
        for (let y = 0; y < resolution; y++)
          for (let x = 0; x < resolution; x++) {
            const local = path.ownerSVGElement!.createSVGPoint();
            local.x = bbox.x + (bbox.width * (x + 0.5)) / resolution;
            local.y = bbox.y + (bbox.height * (y + 0.5)) / resolution;
            if (!path.isPointInFill(local)) continue;
            const p = local.matrixTransform(matrix);
            const hit = document.elementFromPoint(p.x, p.y);
            if (hit?.closest("[data-country]") === group)
              return { x: p.x, y: p.y };
          }
      return null;
    }, country.id);
    expect(point, `${country.name} has a visible hit point`).not.toBeNull();
    if (!point) throw Error(`Cannot click ${country.name}`);
    await page.mouse.click(point.x, point.y);
    await expect(region, `${country.name} selected`).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  }
  await expect(page.locator(".map-country.correct")).toHaveCount(0);
  await expect(page.locator(".map-country.wrong")).toHaveCount(0);
  for (const region of await page.locator("[data-country]").all())
    expect(await region.getAttribute("aria-label")).toMatch(
      /^Участок карты \d+$/,
    );
});
test("training, detailed feedback, restoration, results, focused review and replay", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Случайная страна" }).click();
  const c = await selectAnswers(page, true);
  const wrongId = c.id === "JPN" ? "IND" : "JPN";
  await chooseMap(page, wrongId);
  await expect(page.locator(".right-option")).toHaveCount(0);
  await expect(page.locator(".answer-feedback")).toHaveCount(0);
  await page.getByRole("button", { name: "Проверить", exact: true }).click();
  await expect(page.locator(`[data-country="${c.id}"]`)).toHaveClass(/correct/);
  await expect(page.locator(`[data-country="${wrongId}"]`)).toHaveClass(
    /wrong/,
  );
  await expect(page.locator(".answer-feedback")).toHaveCount(5);
  await expect(page.getByText("Верно: 4 из 6", { exact: true })).toBeVisible();
  await expect(page.locator(".country-recap")).toBeVisible();
  const state = await saved(page);
  await page.reload();
  await page.getByRole("button", { name: /^Продолжить:/ }).click();
  expect((await saved(page)).session).toEqual(state.session);
  await expect(
    page.getByRole("button", { name: "Посмотреть результат" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Посмотреть результат" }).click();
  await expect(page.locator(".result-percent")).toContainText("67");
  await expect(page.locator(".result-grade strong")).toHaveText("3");
  await expect(page.locator(".error-detail")).toHaveCount(2);
  expect((await saved(page)).attempts).toHaveLength(1);
  await page
    .getByRole("button", { name: "Работа над ошибками", exact: true })
    .click();
  await page.getByRole("button", { name: /^Начать/ }).click();
  const review = (await saved(page)).session!;
  expect(review.questions).toHaveLength(1);
  expect(review.questions[0].fields).toEqual(["map", "capital"]);
  await selectAnswers(page);
  await page.keyboard.press("Control+Enter");
  await expect(
    page.getByText("Отлично! Всё верно.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Посмотреть результат" }).click();
  expect((await saved(page)).mistakes).toEqual({});
  await expect(page.locator(".result-percent")).toContainText("100");
  await page.getByRole("button", { name: "Пройти тот же набор" }).click();
  const replay = (await saved(page)).session!;
  expect(replay.questions[0].countryId).toBe(c.id);
  expect(replay.questions[0].fields).toEqual(["map", "capital"]);
});
test("exam withholds feedback and scores until all ten countries finish", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Экзамен/ }).click();
  await page.getByRole("button", { name: "Только карта", exact: true }).click();
  await page.getByRole("button", { name: /^Начать/ }).click();
  for (let i = 0; i < 10; i++) {
    const session = (await saved(page)).session!,
      id = session.questions[session.index].countryId;
    if (i % 2 === 0) await chooseMap(page, id);
    else await chooseMap(page, id === "JPN" ? "IND" : "JPN");
    await page
      .getByRole("button", { name: "Сохранить ответ", exact: true })
      .click();
    await expect(page.locator(".map-country.correct")).toHaveCount(0);
    await expect(page.locator(".map-country.wrong")).toHaveCount(0);
    await expect(page.locator(".country-recap")).toHaveCount(0);
    await expect(page.locator(".game-score strong").first()).toHaveText("—");
    await expect(
      page.getByText("Ответ сохранён", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: i === 9 ? "Посмотреть результат" : "Следующая страна",
      })
      .click();
  }
  await expect(page.locator(".result-percent")).toContainText("50");
  await expect(page.locator(".result-grade strong")).toHaveText("3");
  await expect(page.locator(".error-country")).toHaveCount(5);
  expect((await saved(page)).attempts).toHaveLength(1);
  await page.getByRole("button", { name: "На главную", exact: true }).click();
  await page.getByRole("button", { name: "Статистика", exact: true }).click();
  await expect(page.locator(".attempt-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Сбросить статистику" }).click();
  await page.getByRole("button", { name: "Отмена", exact: true }).click();
  expect((await saved(page)).attempts).toHaveLength(1);
  await page.getByRole("button", { name: "Сбросить статистику" }).click();
  await page.getByRole("button", { name: "Сбросить", exact: true }).click();
  expect((await saved(page)).attempts).toEqual([]);
  expect((await saved(page)).mistakes).toEqual({});
});
test("map controls, keyboard, drag and full-screen map remain usable", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Только карта", exact: true }).click();
  await page.getByRole("button", { name: "Случайная страна" }).click();
  await page.getByRole("button", { name: "Увеличить карту" }).click();
  await expect(page.locator(".map-zoom>span")).toHaveText("1.5×");
  const svg = page.getByRole("group", { name: "Карта Азии", exact: true });
  await svg.focus();
  await svg.press("+");
  await expect(page.locator(".map-zoom>span")).toHaveText("2.0×");
  await svg.press("Home");
  await expect(page.locator(".map-zoom>span")).toHaveText("1.0×");
  await page
    .getByRole("button", { name: "Западная Азия", exact: true })
    .click();
  await expect(page.locator(".map-zoom>span")).toHaveText("3.5×");
  const transform = await page
    .locator(".asia-map>g")
    .first()
    .getAttribute("transform");
  await svg.scrollIntoViewIfNeeded();
  const box = (await svg.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.45);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.6, {
    steps: 7,
  });
  await page.mouse.up();
  expect(
    await page.locator(".asia-map>g").first().getAttribute("transform"),
  ).not.toBe(transform);
  expect((await saved(page)).session!.answers.map).toBeUndefined();
  await page.getByRole("button", { name: "Развернуть карту" }).click();
  await expect(page.locator(".map-expanded")).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "Развёрнутая карта Азии" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".map-expanded")).toHaveCount(0);
  await page.getByRole("button", { name: "Острова Индийского океана" }).click();
  await expect(page.locator(".map-zoom>span")).toHaveText("4.0×");
});
test("no horizontal page overflow at phone, tablet and desktop sizes", async ({
  page,
}) => {
  await page.goto("/");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(400);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `home at ${width}`,
    ).toBe(true);
  }
  await page.setViewportSize({ width: 320, height: 900 });
  await page.getByRole("button", { name: "Случайная страна" }).click();
  await expect(page.locator(".answers-panel")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
test("invalid local save is handled with an understandable message", async ({
  page,
}) => {
  await page.addInitScript(
    (key) => localStorage.setItem(key, "not valid json"),
    STORAGE_KEY,
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText(
    "Не удалось прочитать сохранение",
  );
  await expect(page.getByRole("button", { name: /^Начать/ })).toBeEnabled();
});
test("phone pinch zoom and a finger tap on a small-territory marker", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Touch scenario runs on the phone profile.");
  await page.goto("/");
  await page.getByRole("button", { name: "Только карта", exact: true }).click();
  await page.getByRole("button", { name: "Случайная страна" }).click();
  const svg = page.getByRole("group", { name: "Карта Азии", exact: true });
  await svg.scrollIntoViewIfNeeded();
  const box = (await svg.boundingBox())!;
  const cx = box.x + box.width * 0.55,
    cy = box.y + box.height * 0.55,
    cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: cx - 20, y: cy, id: 1 },
      { x: cx + 20, y: cy, id: 2 },
    ],
  });
  for (const distance of [30, 40, 55])
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: cx - distance, y: cy, id: 1 },
        { x: cx + distance, y: cy, id: 2 },
      ],
    });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  expect(
    Number.parseFloat((await page.locator(".map-zoom>span").textContent())!),
  ).toBeGreaterThan(2);
  expect((await saved(page)).session!.answers.map).toBeUndefined();
  await page
    .getByRole("button", { name: "Острова Индийского океана", exact: true })
    .click();
  await svg.scrollIntoViewIfNeeded();
  const point = await page
    .locator('[data-marker="MDV"] .marker-hit')
    .evaluate((circle) => {
      const c = circle as SVGCircleElement;
      const p = new DOMPoint(
        c.cx.baseVal.value,
        c.cy.baseVal.value,
      ).matrixTransform(c.getScreenCTM()!);
      return { x: p.x, y: p.y };
    });
  await page.touchscreen.tap(point.x, point.y);
  await expect(page.locator('[data-country="MDV"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("main screens and answer feedback satisfy automated accessibility checks in both themes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  async function audit() {
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
  for (const theme of ["light", "dark"]) {
    if (theme === "dark")
      await page.getByRole("button", { name: "Включить тёмную тему" }).click();
    await audit();
    await page.getByRole("button", { name: "Случайная страна" }).click();
    await expect(page.locator("[data-country]")).toHaveCount(48);
    await audit();
    await page.getByRole("button", { name: "Проверить", exact: true }).click();
    await audit();
    await page.getByRole("button", { name: "Посмотреть результат" }).click();
    await audit();
    await page.getByRole("button", { name: "Все страны", exact: true }).click();
    await audit();
    await page.getByRole("button", { name: "Тренировка", exact: true }).click();
  }
});
