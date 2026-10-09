import { geoArea, geoCentroid } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { Topology } from 'topojson-specification';
import worldData from 'world-atlas/countries-110m.json';
import { countryEn } from './countries';

const topology = worldData as unknown as Topology;
const features = (feature(topology, topology.objects.countries) as unknown as FeatureCollection<
  Geometry,
  { name: string }
>).features;

/**
 * Точка для маркера страны, выбранной из списка (без клика по карте).
 * У стран из нескольких частей (США, Россия…) берём центр самой большой части,
 * чтобы маркер не попадал в океан между ними.
 */
export function countryCenter(ruName: string): { lat: number; lng: number } | null {
  const en = countryEn(ruName);
  const f = features.find((x) => x.properties.name === en);
  if (!f) return null;
  let target: Feature = f;
  if (f.geometry.type === 'MultiPolygon') {
    const biggest = f.geometry.coordinates
      .map((coordinates): Feature => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates } }))
      .reduce((a, b) => (geoArea(b) > geoArea(a) ? b : a));
    target = biggest;
  }
  const [lng, lat] = geoCentroid(target);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}
