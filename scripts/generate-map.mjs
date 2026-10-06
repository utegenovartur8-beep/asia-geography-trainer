import fs from "node:fs";
import { geoMercator, geoPath } from "d3-geo";
const geo = JSON.parse(
  fs.readFileSync(
    new URL("../src/data/asia.geo.json", import.meta.url),
    "utf8",
  ),
);
const countries = JSON.parse(
  fs.readFileSync(
    new URL("../src/data/countries.json", import.meta.url),
    "utf8",
  ),
);
const projection = geoMercator()
  .fitExtent(
    [
      [38, 38],
      [962, 575],
    ],
    {
      type: "FeatureCollection",
      features: geo.features.filter((f) => f.properties.study),
    },
  )
  .clipExtent([
    [-30, -30],
    [1030, 650],
  ]);
const path = geoPath(projection).digits(2);
// Simplify only the non-interactive context. All study-country geometry is retained.
function simplifyRing(ring) {
  const kept = [ring[0]];
  for (let i = 1; i < ring.length - 1; i++) {
    const last = kept[kept.length - 1],
      p = ring[i];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 0.12) kept.push(p);
  }
  kept.push(ring[ring.length - 1]);
  return kept.length >= 4 ? kept : ring;
}
function contextFeature(f) {
  const geometry = structuredClone(f.geometry);
  geometry.coordinates =
    geometry.type === "MultiPolygon"
      ? geometry.coordinates.map((p) => p.map(simplifyRing))
      : geometry.coordinates.map(simplifyRing);
  return { ...f, geometry };
}
const data = {
  projection: { scale: projection.scale(), translate: projection.translate() },
  background: geo.features
    .filter((f) => !f.properties.study)
    .map((f) => path(contextFeature(f)))
    .filter(Boolean)
    .join(" "),
  shapes: countries.map((c, i) => ({
    id: c.id,
    number: i + 1,
    d: geo.features
      .filter((f) => f.properties.id === c.id)
      .map((f) => path(f))
      .join(" "),
  })),
};
fs.writeFileSync(
  new URL("../src/data/map-svg.json", import.meta.url),
  JSON.stringify(data),
);
console.log(
  `Generated ${data.shapes.length} SVG countries; ${Math.round(JSON.stringify(data).length / 1024)} KiB. Geometry remains in asia.geo.json.`,
);
