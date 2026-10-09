import { Link } from 'react-router-dom';
import PlaceCard from '../components/PlaceCard';
import { usePlaces } from '../PlacesContext';

export default function VisitedPage() {
  const { places, loading } = usePlaces();
  const visited = places
    .filter((p) => p.status === 'visited')
    .sort((a, b) => (b.date || b.createdAt).localeCompare(a.date || a.createdAt));

  return (
    <>
      <section className="hero visited-hero">
        <h1>⭐ Места, где я побывал</h1>
        <p>{visited.length ? `Всего приключений: ${visited.length}` : 'Пока пусто — самое время отправиться в путь!'}</p>
      </section>

      {loading ? (
        <p className="empty">Загрузка…</p>
      ) : visited.length === 0 ? (
        <p className="empty">
          Нет отмеченных мест. <Link to="/">Отметь первое на карте</Link> 🗺️
        </p>
      ) : (
        <div className="grid">
          {visited.map((p) => (
            <PlaceCard key={p.id} place={p} />
          ))}
        </div>
      )}
    </>
  );
}
