import { Suspense, lazy, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AddPlaceModal from '../components/AddPlaceModal';
import { usePlaces } from '../PlacesContext';
import { countryKey } from '../countries';

// Карта тянет за собой d3-geo и данные стран (~100 КБ), поэтому грузим её отдельным куском
const WorldMap = lazy(() => import('../components/WorldMap'));

type Filter = 'all' | 'visited' | 'planned';
type Pick = { lat?: number; lng?: number; country?: string };

export default function HomePage() {
  const { places, loading, addPlace } = usePlaces();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [pick, setPick] = useState<Pick | null>(null);

  const visited = places.filter((p) => p.status === 'visited');
  const planned = places.filter((p) => p.status === 'planned');
  const countries = new Set(visited.map((p) => countryKey(p.country)).filter(Boolean));
  const shown = filter === 'all' ? places : filter === 'visited' ? visited : planned;

  return (
    <>
      <section className="hero">
        <h1>Куда занесла тебя дорога?</h1>
        <p>Кликни по карте, чтобы отметить место. Колесо мыши — масштаб, перетаскивание — перемещение.</p>
      </section>

      <section className="stats">
        <div className="stat s1"><b>{visited.length}</b><span>мест посещено</span></div>
        <div className="stat s2"><b>{countries.size}</b><span>стран</span></div>
        <div className="stat s3"><b>{planned.length}</b><span>в планах</span></div>
      </section>

      <div className="filters">
        {(['all', 'visited', 'planned'] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={filter === f ? 'chip active' : 'chip'}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? '🌐 Все' : f === 'visited' ? '⭐ Побывал' : '✈️ В планах'}
          </button>
        ))}
        <button type="button" className="chip add-chip" onClick={() => setPick({})}>
          ＋ Добавить
        </button>
      </div>

      {loading ? (
        <p className="empty">Загружаю карту…</p>
      ) : (
        <Suspense fallback={<p className="empty">Загружаю карту…</p>}>
          <WorldMap places={shown} onPick={setPick} onOpen={(p) => navigate(`/place/${p.id}`)} />
        </Suspense>
      )}

      {pick && (
        <AddPlaceModal
          {...pick}
          onClose={() => setPick(null)}
          onSave={async (data) => {
            const place = await addPlace(data);
            // при ошибке addPlace вернёт null и покажет уведомление; форму оставляем открытой
            if (!place) return;
            setPick(null);
            navigate(`/place/${place.id}`);
          }}
        />
      )}
    </>
  );
}
