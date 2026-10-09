import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { geoContains, geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { FeatureCollection, Geometry } from 'geojson';
import type { Topology } from 'topojson-specification';
import worldData from 'world-atlas/countries-110m.json';
import type { Place } from '../types';
import { countryRu } from '../countries';

const W = 960;
const H = 500;
const MAX_ZOOM = 12;

type CountryProps = { name: string };

const topology = worldData as unknown as Topology;
const countries = feature(
  topology,
  topology.objects.countries,
) as unknown as FeatureCollection<Geometry, CountryProps>;

const projection = geoNaturalEarth1().fitSize([W, H], { type: 'Sphere' });
const pathGen = geoPath(projection);
const spherePath = pathGen({ type: 'Sphere' }) ?? '';
const countryPaths = countries.features.map((f, i) => ({
  key: i,
  name: f.properties.name,
  d: pathGen(f) ?? '',
}));

// Hue by index gives every country its own colour
const countryFill = (i: number) => `hsl(${(i * 47) % 360} 70% 72%)`;

// Ширина подписи маркера — по реальным размерам текста (шрифт как в .label text в styles.css)
const measureCtx = document.createElement('canvas').getContext('2d');
if (measureCtx) measureCtx.font = '700 11px "Segoe UI", system-ui, sans-serif';
const textWidth = (text: string) => measureCtx?.measureText(text).width ?? text.length * 7;

interface Props {
  places: Place[];
  onPick: (pick: { lat: number; lng: number; country: string }) => void;
  onOpen: (place: Place) => void;
}

export default function WorldMap({ places, onPick, onOpen }: Props) {
  const [view, setView] = useState({ x: 0, y: 0, w: W });
  const [hovered, setHovered] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ px: number; py: number; vx: number; vy: number; moved: boolean } | null>(null);

  const h = (view.w * H) / W;
  const scale = view.w / W;

  const markers = useMemo(
    () =>
      places.flatMap((p) => {
        const pt = projection([p.lng, p.lat]);
        return pt ? [{ place: p, x: pt[0], y: pt[1] }] : [];
      }),
    [places],
  );

  const clamp = (x: number, y: number, w: number) => ({
    w,
    x: Math.min(Math.max(x, 0), W - w),
    y: Math.min(Math.max(y, 0), H - (w * H) / W),
  });

  const zoom = (factor: number, cx = view.x + view.w / 2, cy = view.y + h / 2) => {
    setView((v) => {
      const w = Math.min(W, Math.max(W / MAX_ZOOM, v.w / factor));
      const k = w / v.w;
      return clamp(cx - (cx - v.x) * k, cy - (cy - v.y) * k, w);
    });
  };

  const toSvg = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: view.x + ((clientX - rect.left) / rect.width) * view.w,
      y: view.y + ((clientY - rect.top) / rect.height) * h,
    };
  };

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    drag.current = { px: e.clientX, py: e.clientY, vx: view.x, vy: view.y, moved: false };
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    d.moved = true;
    const rect = svgRef.current!.getBoundingClientRect();
    setView((v) => clamp(d.vx - (dx / rect.width) * v.w, d.vy - (dy / rect.width) * v.w, v.w));
  };

  const onPointerUp = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.moved) return;
    const { x, y } = toSvg(e.clientX, e.clientY);
    const coords = projection.invert?.([x, y]);
    if (!coords) return;
    const [lng, lat] = coords;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
    const country = countries.features.find((f) => geoContains(f, [lng, lat]))?.properties.name ?? '';
    onPick({ lat, lng, country: countryRu(country) });
  };

  const onWheel = (e: WheelEvent) => {
    const { x, y } = toSvg(e.clientX, e.clientY);
    zoom(e.deltaY < 0 ? 1.25 : 0.8, x, y);
  };

  // React вешает onWheel как passive-слушатель, и preventDefault в нём не работает:
  // колесо одновременно масштабировало бы карту и прокручивало страницу.
  // Поэтому подписываемся вручную, а актуальный обработчик берём из ref (он видит свежий view).
  const wheelRef = useRef(onWheel);
  wheelRef.current = onWheel;
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      wheelRef.current(e);
    };
    svg.addEventListener('wheel', handler, { passive: false });
    return () => svg.removeEventListener('wheel', handler);
  }, []);

  const openOnKey = (e: KeyboardEvent<SVGGElement>, place: Place) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(place);
    }
  };

  return (
    <div className="map-wrap">
      <svg
        ref={svgRef}
        className="map"
        viewBox={`${view.x} ${view.y} ${view.w} ${h}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => (drag.current = null)}
      >
        <defs>
          <radialGradient id="ocean" cx="50%" cy="40%" r="75%">
            <stop offset="0%" stopColor="#7fe3ff" />
            <stop offset="100%" stopColor="#3b82f6" />
          </radialGradient>
        </defs>
        <path d={spherePath} fill="url(#ocean)" />
        {countryPaths.map((c) => (
          <path key={c.key} d={c.d} className="country" fill={countryFill(c.key)}>
            <title>{c.name}</title>
          </path>
        ))}

        {markers.map(({ place, x, y }) => {
          const labelW = textWidth(place.name) + 16;
          return (
          <g
            key={place.id}
            className={`marker ${place.status}`}
            transform={`translate(${x} ${y}) scale(${scale})`}
            role="button"
            tabIndex={0}
            aria-label={`${place.name}${place.country ? `, ${countryRu(place.country)}` : ''} — открыть`}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={() => onOpen(place)}
            onKeyDown={(e) => openOnKey(e, place)}
            onMouseEnter={() => setHovered(place.id)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(place.id)}
            onBlur={() => setHovered(null)}
          >
            <circle className="pulse" r="9" />
            <circle className="dot" r="6" />
            <text className="pin-icon" textAnchor="middle" dy="3.5">
              {place.status === 'visited' ? '★' : '✈'}
            </text>
            {hovered === place.id && (
              <g className="label" transform="translate(0 -16)">
                <rect x={-labelW / 2} y={-14} width={labelW} height={20} rx={10} />
                <text textAnchor="middle" dy={0}>
                  {place.name}
                </text>
              </g>
            )}
          </g>
          );
        })}
      </svg>

      <div className="map-controls">
        <button type="button" onClick={() => zoom(1.5)} aria-label="Приблизить">＋</button>
        <button type="button" onClick={() => zoom(1 / 1.5)} aria-label="Отдалить">−</button>
        <button type="button" onClick={() => setView({ x: 0, y: 0, w: W })} aria-label="Сбросить">⟳</button>
      </div>
    </div>
  );
}
