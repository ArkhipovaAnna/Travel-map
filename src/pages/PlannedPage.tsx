import { Link } from 'react-router-dom';
import PlaceCard, { today } from '../components/PlaceCard';
import { usePlaces } from '../PlacesContext';

export default function PlannedPage() {
  const { places, loading, updatePlace, deletePlace } = usePlaces();
  const planned = places.filter((p) => p.status === 'planned');

  return (
    <>
      <section className="hero planned-hero">
        <h1>✈️ Хочу посетить</h1>
        <p>{planned.length ? `Мечтаний в списке: ${planned.length}` : 'Список мечтаний пока пуст'}</p>
      </section>

      {loading ? (
        <p className="empty">Загрузка…</p>
      ) : planned.length === 0 ? (
        <p className="empty">
          Добавь место на <Link to="/">карте</Link>, выбрав «Хочу посетить» 🧳
        </p>
      ) : (
        <div className="grid">
          {planned.map((p) => (
            <PlaceCard key={p.id} place={p}>
              <div className="card-actions">
                <button
                  className="btn primary small"
                  onClick={() => updatePlace(p.id, { status: 'visited', date: today() })}
                >
                  ✅ Я здесь побывал!
                </button>
                <button
                  className="btn ghost small"
                  onClick={() => window.confirm(`Удалить «${p.name}»?`) && deletePlace(p.id)}
                >
                  🗑
                </button>
              </div>
            </PlaceCard>
          ))}
        </div>
      )}
    </>
  );
}
