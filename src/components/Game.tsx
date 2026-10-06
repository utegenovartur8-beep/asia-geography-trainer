import { lazy, Suspense, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  MapPin,
  LockKeyhole,
  Flame,
  Trophy,
  CheckCheck,
  Keyboard,
  BookOpen,
} from "lucide-react";
import { countryById, fields, labels, type Field } from "../data/countries";
import { summarize, type Session, type Answers } from "../lib/engine";
import { modeNames } from "../lib/presentation";
const AsiaMap = lazy(() => import("./AsiaMap"));
export function Game({
  session,
  onAnswer,
  onCheck,
  onNext,
  onBack,
}: {
  session: Session;
  onAnswer: (answers: Answers) => void;
  onCheck: () => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const q = session.questions[session.index],
    country = countryById[q.countryId];
  const summary = summarize(session.results),
    exam = session.mode === "exam",
    reveal = session.checked && !exam;
  const result = session.results[session.index];
  const progress =
    ((session.index + Number(session.checked)) / session.questions.length) *
    100;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [session.index]);
  const primaryAction = useCallback(() => {
    if (session.checked) onNext();
    else onCheck();
  }, [session.checked, onNext, onCheck]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        primaryAction();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [primaryAction]);
  const selectedFields = q.fields.filter((f) => f !== "map");
  function feedback(field: Field) {
    return reveal ? result?.checks.find((c) => c.field === field) : undefined;
  }
  return (
    <>
      <div className="game-toolbar">
        <button className="text-button" onClick={onBack}>
          <ArrowLeft size={17} />
          Сохранить и выйти
        </button>
        <span className="mode-badge">
          {exam ? <LockKeyhole size={14} /> : <BookOpen size={14} />}{" "}
          {modeNames[session.mode]}
        </span>
      </div>
      <section className="game-heading">
        <div>
          <div className="eyebrow muted">
            СТРАНА {session.index + 1} ИЗ {session.questions.length}
          </div>
          <h1 ref={heading} tabIndex={-1}>
            {country.name}
          </h1>
          <p>
            {q.fields.includes("map")
              ? "Найди страну на карте" +
                (selectedFields.length ? " и выбери её характеристики." : ".")
              : "Вспомни и выбери характеристики страны."}
          </p>
        </div>
        <div className="game-score">
          <div>
            <Trophy size={20} />
            <strong>{exam ? "—" : summary.score}</strong>
            <span>{exam ? "Баллы в конце" : "баллов"}</span>
          </div>
          <div>
            <Flame size={20} />
            <strong>{exam ? "—" : summary.streak}</strong>
            <span>{exam ? "Серия в конце" : "подряд"}</span>
          </div>
        </div>
      </section>
      <div
        className="progress-track"
        role="progressbar"
        aria-label="Прогресс тренировки"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
      {exam && (
        <div className="exam-notice">
          <LockKeyhole size={16} />
          <span>
            Ответы, баллы и разбор ошибок появятся после завершения экзамена.
          </span>
        </div>
      )}
      <div
        className={`game-layout ${!q.fields.includes("map") ? "no-map" : ""}`}
      >
        {q.fields.includes("map") && (
          <section className="map-panel">
            <Suspense
              fallback={
                <div className="map-loading" role="status">
                  Загружаем локальную карту…
                </div>
              }
            >
              <AsiaMap
                key={q.countryId}
                selected={session.answers.map}
                correct={reveal ? country.id : undefined}
                locked={session.checked}
                onSelect={(id) => onAnswer({ ...session.answers, map: id })}
              />
            </Suspense>
            <div
              className={`map-selection ${feedback("map") ? (feedback("map")?.correct ? "is-correct" : "is-wrong") : ""}`}
              role="status"
            >
              <MapPin size={18} />
              <span>
                {reveal
                  ? feedback("map")?.correct
                    ? "Верно! Страна найдена."
                    : `Правильная страна выделена зелёным: ${country.name}.`
                  : session.answers.map
                    ? "Территория выбрана. Можно изменить выбор."
                    : "Нажми на территорию страны или её маркер."}
              </span>
            </div>
            <div className="map-legend">
              <span>
                <i />
                Страны из таблицы
              </span>
              <span>
                <i className="legend-selected" />
                Твой выбор
              </span>
              {reveal && (
                <span>
                  <i className="legend-correct" />
                  Правильный ответ
                </span>
              )}
            </div>
          </section>
        )}
        {selectedFields.length > 0 && (
          <section
            className="panel answers-panel"
            aria-label="Характеристики страны"
          >
            <div className="section-top">
              <h2>Вспомни главное</h2>
              <span className="small-muted">
                {selectedFields.filter((f) => session.answers[f]).length}/
                {selectedFields.length}
              </span>
            </div>
            {selectedFields.map((field, index) => {
              const check = feedback(field);
              return (
                <fieldset
                  key={field}
                  className={`answer-field ${check ? (check.correct ? "is-correct" : "is-wrong") : ""}`}
                  disabled={session.checked}
                >
                  <legend>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {labels[field]}
                    {check &&
                      (check.correct ? <Check size={17} /> : <X size={17} />)}
                  </legend>
                  <div
                    className={`answer-options ${field === "capital" ? "capital-options" : ""}`}
                    role="radiogroup"
                    aria-label={labels[field]}
                    aria-invalid={check ? !check.correct : undefined}
                    aria-describedby={check ? `feedback-${field}` : undefined}
                  >
                    {q.options[field]?.map((option) => (
                      <label
                        key={option}
                        className={`answer-option ${session.answers[field] === option ? "chosen" : ""} ${reveal && check?.expected === option ? "right-option" : ""} ${reveal && !check?.correct && session.answers[field] === option ? "wrong-option" : ""}`}
                      >
                        <input
                          type="radio"
                          name={field}
                          value={option}
                          checked={session.answers[field] === option}
                          onChange={() =>
                            onAnswer({ ...session.answers, [field]: option })
                          }
                        />
                        <span className="radio-dot" />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                  {check && (
                    <p id={`feedback-${field}`} className="answer-feedback">
                      {check.correct
                        ? "Верно"
                        : `Правильный ответ: ${check.expected}`}
                    </p>
                  )}
                </fieldset>
              );
            })}
          </section>
        )}
      </div>
      <div className={`game-action-bar ${session.checked ? "checked" : ""}`}>
        <div aria-live="polite">
          {session.checked ? (
            <>
              <strong>
                {exam
                  ? "Ответ сохранён"
                  : result.checks.every((c) => c.correct)
                    ? "Отлично! Всё верно."
                    : `Верно: ${result.checks.filter((c) => c.correct).length} из ${result.checks.length}`}
              </strong>
              <span>
                {exam
                  ? "Продолжай — разберём результаты в конце."
                  : result.checks.every((c) => c.correct)
                    ? "Ещё одна страна стала ближе."
                    : "Посмотри правильные ответы и попробуй запомнить."}
              </span>
            </>
          ) : (
            <>
              <strong>Готов проверить себя?</strong>
              <span>За каждый правильный ответ — один балл.</span>
            </>
          )}
        </div>
        <button className="button primary" onClick={primaryAction}>
          {session.checked ? (
            <>
              {session.index === session.questions.length - 1
                ? "Посмотреть результат"
                : "Следующая страна"}
              <ArrowRight size={18} />
            </>
          ) : (
            <>
              <CheckCheck size={19} />
              {exam ? "Сохранить ответ" : "Проверить"}
            </>
          )}
        </button>
      </div>
      {reveal && result.checks.some((c) => !c.correct) && (
        <section className="panel country-recap">
          <div className="section-top">
            <div>
              <div className="eyebrow muted">ЗАПОМНИ НА БУДУЩЕЕ</div>
              <h2>{country.name}</h2>
            </div>
            <BookOpen size={23} />
          </div>
          <dl>
            {fields
              .filter((f) => f !== "map")
              .map((f) => (
                <div key={f}>
                  <dt>{labels[f]}</dt>
                  <dd>{country[f] ?? "Нет данных в таблице"}</dd>
                </div>
              ))}
          </dl>
          <small>
            По «Азия.pdf», стр. {country.sourcePage}, строка {country.sourceRow}
            .
          </small>
        </section>
      )}
      <p className="keyboard-tip">
        <Keyboard size={15} /> Ctrl + Enter —{" "}
        {session.checked ? "следующее задание" : "проверить ответ"}. Tab —
        переход между элементами. На карте: стрелки, + / −, Home.
      </p>
    </>
  );
}
