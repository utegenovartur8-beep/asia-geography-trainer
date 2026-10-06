import { useEffect, useRef, useState } from "react";
import { geoMercator } from "d3-geo";
import { Expand, Minus, Plus, RotateCcw, Move, Crosshair } from "lucide-react";
import mapData from "../data/map-svg.json";
import points from "../data/map-points.json";
import { countries, countryById } from "../data/countries";
const projection = geoMercator()
  .scale(mapData.projection.scale)
  .translate(mapData.projection.translate as [number, number]);
const { background, shapes } = mapData;
const smallOffsets: Record<string, [number, number]> = {
  MDV: [0, 0],
  SGP: [8, 7],
  BRN: [0, -6],
  TLS: [8, 8],
  BHR: [-27, 14],
  QAT: [28, 30],
  KWT: [-3, -28],
  CYP: [-10, -12],
  LBN: [30, -25],
  ISR: [-28, 27],
  PSE: [25, 20],
};
const markerIds = Object.keys(smallOffsets);
const markers = markerIds.map((id) => {
  const point = (points as Record<string, number[]>)[id];
  const [x, y] = projection([point[0], point[1]])!;
  return {
    id,
    x,
    y,
    dx: smallOffsets[id][0],
    dy: smallOffsets[id][1],
    number: countries.findIndex((c) => c.id === id) + 1,
  };
});
type View = { x: number; y: number; k: number };
const initial: View = { x: 0, y: 0, k: 1 };
export default function AsiaMap({
  selected,
  correct,
  locked = false,
  onSelect,
  decorative = false,
}: {
  selected?: string;
  correct?: string;
  locked?: boolean;
  onSelect?: (id: string) => void;
  decorative?: boolean;
}) {
  const [view, setView] = useState<View>(initial);
  const [expanded, setExpanded] = useState(false);
  const [markerUnit, setMarkerUnit] = useState(1);
  const svg = useRef<SVGSVGElement>(null);
  const current = useRef(view);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(false);
  const origin = useRef({ x: 0, y: 0 });
  function change(v: View) {
    const k = Math.max(1, Math.min(10, v.k));
    const next = {
      k,
      x: Math.max(1000 * (1 - k) - 150, Math.min(150, v.x)),
      y: Math.max(620 * (1 - k) - 100, Math.min(100, v.y)),
    };
    current.current = next;
    setView(next);
  }
  function zoom(factor: number, cx = 500, cy = 310) {
    const prev = current.current,
      k = Math.max(1, Math.min(10, prev.k * factor));
    change({
      k,
      x: cx - ((cx - prev.x) * k) / prev.k,
      y: cy - ((cy - prev.y) * k) / prev.k,
    });
  }
  useEffect(() => {
    const element = svg.current;
    if (!element || decorative) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const prev = current.current,
        p = element.createSVGPoint();
      p.x = event.clientX;
      p.y = event.clientY;
      const local = p.matrixTransform(element.getScreenCTM()!.inverse());
      const cx = local.x,
        cy = local.y;
      const k = Math.max(
        1,
        Math.min(10, prev.k * Math.exp(-event.deltaY * 0.002)),
      );
      const next = {
        k,
        x: Math.max(
          1000 * (1 - k) - 150,
          Math.min(150, cx - ((cx - prev.x) * k) / prev.k),
        ),
        y: Math.max(
          620 * (1 - k) - 100,
          Math.min(100, cy - ((cy - prev.y) * k) / prev.k),
        ),
      };
      current.current = next;
      setView(next);
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [decorative]);
  useEffect(() => {
    if (decorative || !svg.current) return;
    const element = svg.current;
    const observer = new ResizeObserver(() => {
      const matrix = element.getScreenCTM();
      if (matrix && matrix.a > 0) setMarkerUnit(1 / matrix.a);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [decorative]);
  useEffect(() => {
    if (!expanded) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    svg.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [expanded]);
  function choose(id: string) {
    if (!locked && !moved.current && !decorative) onSelect?.(id);
  }
  function state(id: string) {
    return correct === id
      ? "correct"
      : correct && selected === id
        ? "wrong"
        : selected === id
          ? "selected"
          : "";
  }
  function focusRegion(lon: number, lat: number, k: number) {
    const p = projection([lon, lat])!;
    change({ k, x: 500 - p[0] * k, y: 310 - p[1] * k });
  }
  function label(id: string, n: number) {
    return correct ? countryById[id].name : `Участок карты ${n}`;
  }
  return (
    <div
      className={`map-shell ${decorative ? "decorative-map" : ""} ${expanded ? "map-expanded" : ""}`}
      role={expanded ? "dialog" : undefined}
      aria-modal={expanded ? true : undefined}
      aria-label={expanded ? "Развёрнутая карта Азии" : undefined}
      onKeyDown={(event) => {
        if (!expanded) return;
        if (event.key === "Escape") {
          event.preventDefault();
          setExpanded(false);
        }
        if (event.key === "Tab") {
          const controls = event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [tabindex="0"]',
          );
          const first = controls[0],
            last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      {!decorative && (
        <div className="map-top">
          <span>
            <span className="live-dot" /> ИНТЕРАКТИВНАЯ КАРТА
          </span>
          <button
            className="icon-button"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? "Свернуть карту" : "Развернуть карту"}
            aria-pressed={expanded}
          >
            <Expand size={17} />
          </button>
        </div>
      )}
      <svg
        ref={svg}
        viewBox="0 0 1000 620"
        className="asia-map"
        role={decorative ? "img" : "group"}
        aria-label="Карта Азии"
        tabIndex={decorative ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === "Escape") setExpanded(false);
          if (
            [
              "+",
              "=",
              "-",
              "Home",
              "ArrowLeft",
              "ArrowRight",
              "ArrowUp",
              "ArrowDown",
            ].includes(e.key)
          ) {
            e.preventDefault();
            if (e.key === "+" || e.key === "=") zoom(1.3);
            else if (e.key === "-") zoom(1 / 1.3);
            else if (e.key === "Home") change(initial);
            else
              change({
                ...current.current,
                x:
                  current.current.x +
                  (e.key === "ArrowLeft"
                    ? 60
                    : e.key === "ArrowRight"
                      ? -60
                      : 0),
                y:
                  current.current.y +
                  (e.key === "ArrowUp" ? 60 : e.key === "ArrowDown" ? -60 : 0),
              });
          }
        }}
        onPointerDown={(e) => {
          if (decorative) return;
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          origin.current = { x: e.clientX, y: e.clientY };
          moved.current = false;
        }}
        onPointerMove={(e) => {
          if (!pointers.current.has(e.pointerId)) return;
          const old = pointers.current.get(e.pointerId)!;
          const distance = Math.hypot(
            e.clientX - origin.current.x,
            e.clientY - origin.current.y,
          );
          if (distance > 5 || pointers.current.size > 1) moved.current = true;
          const all = [...pointers.current.entries()];
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (!moved.current) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          const inverse = e.currentTarget.getScreenCTM()!.inverse();
          const toLocal = (x: number, y: number) => {
            const p = e.currentTarget.createSVGPoint();
            p.x = x;
            p.y = y;
            return p.matrixTransform(inverse);
          };
          if (all.length === 2) {
            const other = all.find(([id]) => id !== e.pointerId)![1];
            const before = Math.hypot(old.x - other.x, old.y - other.y),
              after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
            const middle = toLocal(
              (e.clientX + other.x) / 2,
              (e.clientY + other.y) / 2,
            );
            if (before > 0) zoom(after / before, middle.x, middle.y);
          } else {
            const from = toLocal(old.x, old.y),
              to = toLocal(e.clientX, e.clientY);
            change({
              ...current.current,
              x: current.current.x + to.x - from.x,
              y: current.current.y + to.y - from.y,
            });
          }
        }}
        onPointerUp={(e) => pointers.current.delete(e.pointerId)}
        onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
      >
        <defs>
          <pattern
            id={decorative ? "hero-grid" : "map-grid"}
            width="65"
            height="62"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 65 0 L 0 0 0 62"
              fill="none"
              stroke="currentColor"
              strokeWidth=".6"
            />
          </pattern>
        </defs>
        <rect
          width="1000"
          height="620"
          fill={`url(#${decorative ? "hero-grid" : "map-grid"})`}
          className="map-grid"
        />
        <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
          <path d={background} className="map-context" />
          {shapes.map((s) => (
            <g
              key={s.id}
              data-country={s.id}
              role={decorative ? undefined : "button"}
              tabIndex={decorative || locked ? -1 : 0}
              aria-label={label(s.id, s.number)}
              aria-pressed={selected === s.id}
              aria-disabled={locked}
              className={`map-country ${state(s.id)}`}
              onClick={() => choose(s.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!locked) onSelect?.(s.id);
                }
              }}
            >
              <path d={s.d} />
            </g>
          ))}
          {!decorative &&
            markers.map((m) => (
              <g
                key={m.id}
                data-marker={m.id}
                className={`map-marker ${state(m.id)}`}
                onClick={() => choose(m.id)}
                aria-hidden="true"
              >
                <line
                  x1={m.x}
                  y1={m.y}
                  x2={m.x + (m.dx * (view.k >= 2 ? markerUnit : 1)) / view.k}
                  y2={m.y + (m.dy * (view.k >= 2 ? markerUnit : 1)) / view.k}
                  strokeWidth={markerUnit / view.k}
                />
                <circle
                  className="marker-hit"
                  cx={m.x + (m.dx * (view.k >= 2 ? markerUnit : 1)) / view.k}
                  cy={m.y + (m.dy * (view.k >= 2 ? markerUnit : 1)) / view.k}
                  r={((view.k >= 2 ? 20 : 6) * markerUnit) / view.k}
                />
                <circle
                  cx={m.x + (m.dx * (view.k >= 2 ? markerUnit : 1)) / view.k}
                  cy={m.y + (m.dy * (view.k >= 2 ? markerUnit : 1)) / view.k}
                  r={(5 * markerUnit) / view.k}
                />
              </g>
            ))}
        </g>
        <text x="475" y="548" className="ocean-label">
          ИНДИЙСКИЙ ОКЕАН
        </text>
        <text
          x="837"
          y="350"
          className="ocean-label"
          transform="rotate(65 837 350)"
        >
          ТИХИЙ ОКЕАН
        </text>
        {!decorative && (
          <g className="north-arrow" transform="translate(947 530)">
            <path d="m0 0-7 23 7-5 7 5Z" />
            <text x="0" y="-9" textAnchor="middle">
              С
            </text>
          </g>
        )}
      </svg>
      {!decorative && (
        <>
          <div className="map-zoom">
            <button
              className="icon-button"
              onClick={() => zoom(1.5)}
              aria-label="Увеличить карту"
            >
              <Plus size={19} />
            </button>
            <span>{view.k.toFixed(1)}×</span>
            <button
              className="icon-button"
              onClick={() => zoom(1 / 1.5)}
              aria-label="Уменьшить карту"
            >
              <Minus size={19} />
            </button>
            <button
              className="icon-button"
              onClick={() => change(initial)}
              aria-label="Сбросить масштаб"
            >
              <RotateCcw size={16} />
            </button>
          </div>
          <div className="map-regions">
            <button onClick={() => change(initial)}>Вся Азия</button>
            <button onClick={() => focusRegion(42, 31, 3.5)}>
              Западная Азия
            </button>
            <button onClick={() => focusRegion(111, 9, 2.4)}>Юго-восток</button>
            <button onClick={() => focusRegion(73, 4, 4)}>
              Острова Индийского океана
            </button>
          </div>
          <div className="map-bottom">
            <span>
              <Move size={14} /> Перетаскивай и увеличивай
            </span>
            <span>
              <Crosshair size={14} /> Точки — маленькие территории
            </span>
          </div>
        </>
      )}
    </div>
  );
}
