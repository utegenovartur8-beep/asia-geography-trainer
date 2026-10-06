import { useEffect, useState } from "react";
import {
  Compass,
  BookOpen,
  BarChart3,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  ArrowUpRight,
  AlertCircle,
  X,
  Map,
  Info,
} from "lucide-react";
import { Home } from "./components/Home";
import { Atlas } from "./components/Atlas";
import { Game } from "./components/Game";
import { Results } from "./components/Results";
import { Statistics } from "./components/Statistics";
import { Dialog } from "./components/Dialog";
import {
  checkAnswers,
  makeOptions,
  newSession,
  summarize,
  type Attempt,
  type Session,
  type Settings,
} from "./lib/engine";
import { countryById } from "./data/countries";
import { readData, writeData, recordAttempt } from "./lib/storage";
import { playSound } from "./lib/sound";
type Page = "home" | "atlas" | "game" | "results" | "stats";
export default function App() {
  const [loaded] = useState(() => readData());
  const [data, setData] = useState(loaded.data);
  const [warning, setWarning] = useState<string | null>(loaded.warning);
  const [page, setPage] = useState<Page>("home");
  const [result, setResult] = useState<Attempt | null>(null);
  const [dialog, setDialog] = useState<"reset" | "about" | null>(null);
  const [pendingSession, setPendingSession] = useState<Session | null>(null);
  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.theme;
    if (!writeData(data))
      setWarning(
        "Не удалось сохранить прогресс. Возможно, хранилище браузера заполнено или отключено. Тренировка продолжает работать.",
      );
  }, [data]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [page]);
  const settings = (patch: Partial<Settings>) =>
    setData((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  function activate(session: Session) {
    setData((prev) => ({ ...prev, session }));
    setPage("game");
    setPendingSession(null);
  }
  function start(random = false) {
    const session = newSession(data.settings, data.mistakes, undefined, random);
    if (!session) return;
    if (data.session) setPendingSession(session);
    else activate(session);
  }
  function repeat(attempt: Attempt) {
    const session: Session = {
      id: crypto.randomUUID(),
      mode: attempt.mode,
      taskType: attempt.taskType,
      questions: attempt.results.map((r) => ({
        countryId: r.countryId,
        fields: r.checks.map((c) => c.field),
        options: Object.fromEntries(
          r.checks
            .filter((c) => c.field !== "map")
            .map((c) => [
              c.field,
              makeOptions(countryById[r.countryId], c.field),
            ]),
        ),
      })),
      index: 0,
      answers: {},
      checked: false,
      results: [],
      startedAt: new Date().toISOString(),
    };
    if (data.session) setPendingSession(session);
    else activate(session);
  }
  function check() {
    const session = data.session;
    if (!session || session.checked) return;
    const result = checkAnswers(
      session.questions[session.index],
      session.answers,
    );
    setData((prev) => ({
      ...prev,
      session: {
        ...session,
        checked: true,
        results: [...session.results, result],
      },
    }));
    if (session.mode !== "exam")
      playSound(
        result.checks.every((c) => c.correct) ? "correct" : "wrong",
        data.settings.sound,
      );
  }
  function next() {
    const session = data.session;
    if (!session?.checked) return;
    if (session.index === session.questions.length - 1) {
      const updated = recordAttempt(data, session),
        attempt = updated.attempts.find((a) => a.id === session.id)!;
      setData(updated);
      setResult(attempt);
      setPage("results");
      playSound("finish", data.settings.sound);
    } else {
      setData((prev) => ({
        ...prev,
        session: {
          ...session,
          index: session.index + 1,
          answers: {},
          checked: false,
        },
      }));
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }
  function review() {
    settings({ mode: "review", taskType: "full", count: "all" });
    setPage("home");
  }
  function showResult(a: Attempt) {
    setResult(a);
    setPage("results");
  }
  const hasHistory = data.attempts.length > 0;
  return (
    <>
      <a className="skip-link" href="#main">
        Перейти к содержимому
      </a>
      <header className="site-header">
        <div className="header-inner">
          <button
            className="brand"
            onClick={() => setPage("home")}
            aria-label="Азия — на главную"
          >
            <span className="brand-logo">
              <Compass size={27} strokeWidth={1.6} />
            </span>
            <span>
              <strong>
                азия<span className="brand-period">.</span>
              </strong>
              <small>ГЕОГРАФИЧЕСКИЙ ТРЕНАЖЁР</small>
            </span>
          </button>
          <nav aria-label="Основная навигация">
            <button
              className={page === "home" || page === "game" ? "active" : ""}
              aria-current={
                page === "home" || page === "game" ? "page" : undefined
              }
              onClick={() => setPage("home")}
            >
              <Compass size={17} />
              <span>Тренировка</span>
            </button>
            <button
              className={page === "atlas" ? "active" : ""}
              aria-current={page === "atlas" ? "page" : undefined}
              onClick={() => setPage("atlas")}
            >
              <BookOpen size={17} />
              <span>Все страны</span>
            </button>
            <button
              className={page === "stats" || page === "results" ? "active" : ""}
              aria-current={page === "stats" ? "page" : undefined}
              onClick={() => setPage("stats")}
            >
              <BarChart3 size={17} />
              <span>Статистика</span>
            </button>
          </nav>
          <div className="header-actions">
            <button
              className="icon-button"
              aria-label={
                data.settings.sound ? "Выключить звук" : "Включить звук"
              }
              aria-pressed={data.settings.sound}
              onClick={() => settings({ sound: !data.settings.sound })}
            >
              {data.settings.sound ? (
                <Volume2 size={19} />
              ) : (
                <VolumeX size={19} />
              )}
            </button>
            <button
              className="icon-button"
              aria-label={
                data.settings.theme === "light"
                  ? "Включить тёмную тему"
                  : "Включить светлую тему"
              }
              onClick={() =>
                settings({
                  theme: data.settings.theme === "light" ? "dark" : "light",
                })
              }
            >
              {data.settings.theme === "light" ? (
                <Moon size={19} />
              ) : (
                <Sun size={19} />
              )}
            </button>
          </div>
        </div>
      </header>
      <main id="main" className="main-content">
        {warning && (
          <div className="warning-banner" role="alert">
            <AlertCircle size={20} />
            <span>{warning}</span>
            <button
              className="icon-button"
              aria-label="Закрыть уведомление"
              onClick={() => setWarning(null)}
            >
              <X size={17} />
            </button>
          </div>
        )}
        {page === "home" && (
          <Home
            data={data}
            onSettings={settings}
            onStart={start}
            onResume={() => setPage("game")}
            onAtlas={() => setPage("atlas")}
            onStats={() => setPage("stats")}
          />
        )}
        {page === "atlas" && <Atlas onBack={() => setPage("home")} />}
        {page === "game" && data.session && (
          <Game
            session={data.session}
            onAnswer={(answers) =>
              setData((prev) =>
                prev.session && !prev.session.checked
                  ? { ...prev, session: { ...prev.session, answers } }
                  : prev,
              )
            }
            onCheck={check}
            onNext={next}
            onBack={() => setPage("home")}
          />
        )}
        {page === "results" && result && (
          <Results
            attempt={result}
            onRepeat={() => repeat(result)}
            onReview={review}
            onHome={() => setPage("home")}
          />
        )}
        {page === "stats" && (
          <Statistics
            data={data}
            onHome={() => setPage("home")}
            onResult={showResult}
            onReset={() => setDialog("reset")}
            onReview={review}
          />
        )}
      </main>
      <footer className="site-footer">
        <div>
          <Compass size={17} />
          <span>Азия: географический тренажёр</span>
          <span className="footer-divider">·</span>
          <span>Учись с любопытством</span>
        </div>
        <button className="text-button" onClick={() => setDialog("about")}>
          О проекте <ArrowUpRight size={14} />
        </button>
      </footer>
      {dialog === "reset" && (
        <Dialog title="Сбросить статистику?" onClose={() => setDialog(null)}>
          <p>
            {hasHistory
              ? `${data.attempts.length} завершённых попыток, список ошибок и текущая тренировка будут удалены.`
              : "История пуста. Текущая тренировка, если она есть, будет удалена."}{" "}
            Настройки темы и звука сохранятся. Отменить удаление нельзя.
          </p>
          <div className="dialog-actions">
            <button
              className="button secondary"
              onClick={() => setDialog(null)}
              autoFocus
            >
              Отмена
            </button>
            <button
              className="button danger"
              onClick={() => {
                setData((prev) => ({
                  ...prev,
                  attempts: [],
                  mistakes: {},
                  session: null,
                }));
                setDialog(null);
              }}
            >
              Сбросить
            </button>
          </div>
        </Dialog>
      )}
      {pendingSession && (
        <Dialog
          title="Начать новую тренировку?"
          onClose={() => setPendingSession(null)}
        >
          <p>
            Сохранённая незавершённая тренировка будет заменена новым набором.
            Завершённые попытки останутся в статистике.
          </p>
          <div className="dialog-actions">
            <button
              className="button secondary"
              onClick={() => setPendingSession(null)}
              autoFocus
            >
              Отмена
            </button>
            <button
              className="button primary"
              onClick={() => activate(pendingSession)}
            >
              Начать новую
            </button>
          </div>
        </Dialog>
      )}
      {dialog === "about" && (
        <Dialog
          title="Азия: учись с любопытством"
          onClose={() => setDialog(null)}
        >
          <div className="about-line">
            <BookOpen size={22} />
            <p>
              Учебные данные: «Азия.pdf» из проекта. 48 стран, 6 столбцов, 3
              страницы. Все ответы проверяются по этой таблице.
            </p>
          </div>
          <div className="about-line">
            <Map size={22} />
            <p>
              Локальная геометрия карты:{" "}
              <a
                href="https://www.naturalearthdata.com/"
                target="_blank"
                rel="noreferrer"
              >
                Natural Earth
              </a>
              , public domain. Сетевые запросы для тренировок не нужны.
            </p>
          </div>
          <div className="about-line">
            <Info size={22} />
            <p>
              Один верный ответ — один балл. Оценки: от 90% — 5, от 75% — 4, от
              50% — 3, ниже — 2. Серия — число стран подряд без ошибок. Лучший
              результат среди завершённых попыток:{" "}
              {hasHistory
                ? `${Math.max(...data.attempts.map((a) => summarize(a.results).percent))}%`
                : "пока нет"}
              .
            </p>
          </div>
          <p className="small-muted">
            Tab — переход; Enter / пробел — выбор; Ctrl + Enter — проверка или
            следующее задание. На карте: + / −, стрелки, Home. Прогресс хранится
            в браузере. Неизвестные значения источника не оцениваются.
          </p>
          <button className="button primary" onClick={() => setDialog(null)}>
            Всё понятно
          </button>
        </Dialog>
      )}
    </>
  );
}
