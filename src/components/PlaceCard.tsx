import { Link } from 'react-router-dom';
import type { Place } from '../types';
import { countryRu } from '../countries';

// «YYYY-MM-DD» парсится как UTC-полночь, поэтому и форматируем в UTC —
// иначе в часовых поясах западнее UTC дата сдвигалась бы на день назад.
export const formatDate = (date: string) =>
  date
    ? new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    : '';

/** «1 июня 2026 — 5 июня 2026» для интервала; одна дата, если конца нет. */
export const formatRange = (from: string, to: string) =>
  from && to && to !== from ? `${formatDate(from)} — ${formatDate(to)}` : formatDate(from);

/** Сегодняшняя дата в формате YYYY-MM-DD по местному времени (toISOString дал бы дату по UTC). */
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Stable gradient per place so cards without photos still look lively
const gradient = (id: string) => {
  const hue = [...id].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return `linear-gradient(135deg, hsl(${hue} 80% 65%), hsl(${(hue + 60) % 360} 85% 60%))`;
};

interface Props {
  place: Place;
  children?: React.ReactNode;
}

export default function PlaceCard({ place, children }: Props) {
  const cover = place.photos[0];
  return (
    <article className="card">
      <Link to={`/place/${place.id}`} className="card-cover" style={cover ? undefined : { background: gradient(place.id) }}>
        {cover ? <img src={cover} alt={place.name} loading="lazy" /> : <span>{place.status === 'visited' ? '🏝️' : '🧳'}</span>}
        {place.photos.length > 1 && <em className="photo-count">📷 {place.photos.length}</em>}
      </Link>
      <div className="card-body">
        <h3>
          <Link to={`/place/${place.id}`}>{place.name}</Link>
        </h3>
        <p className="muted">
          {[countryRu(place.country), formatRange(place.date, place.dateTo)].filter(Boolean).join(' · ') || 'Без даты'}
        </p>
        {place.cities.length > 0 && <p className="muted">🏙 {place.cities.join(', ')}</p>}
        {place.description && <p className="card-desc">{place.description}</p>}
        {children}
      </div>
    </article>
  );
}
