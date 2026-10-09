import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { usePlaces } from '../PlacesContext';
import Modal from '../components/Modal';
import CitiesInput from '../components/CitiesInput';
import { formatRange, today } from '../components/PlaceCard';
import { countryRu } from '../countries';
import type { Status } from '../types';

// key={id}: при переходе на другое место состояние формы и окна сбрасывается,
// а не «протекает» из предыдущего места
export default function PlacePage() {
  const { id = '' } = useParams();
  return <PlaceDetails key={id} id={id} />;
}

function PlaceDetails({ id }: { id: string }) {
  const navigate = useNavigate();
  const { places, loading, updatePlace, deletePlace, uploadPhotos, deletePhoto } = usePlaces();
  const place = places.find((p) => p.id === id);

  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', country: '', cities: [] as string[], date: '', dateTo: '', description: '', status: 'visited' as Status,
  });
  const [formError, setFormError] = useState('');

  if (loading) return <p className="empty">Загрузка…</p>;
  if (!place) {
    return (
      <p className="empty">
        Место не найдено. <Link to="/">На карту</Link>
      </p>
    );
  }

  const startEdit = () => {
    setForm({
      name: place.name,
      country: countryRu(place.country),
      cities: place.cities,
      date: place.date,
      dateTo: place.dateTo,
      description: place.description,
      status: place.status,
    });
    setFormError('');
    setEditing(true);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || saving) return;
    const dated = form.status === 'visited';
    if (dated && form.dateTo && (!form.date || form.dateTo < form.date)) {
      setFormError(form.date ? 'Дата «до» не может быть раньше даты «с»' : 'Укажите дату «с»');
      return;
    }
    setFormError('');
    setSaving(true);
    const ok = await updatePlace(place.id, {
      ...form,
      cities: form.cities.map((c) => c.trim()).filter(Boolean),
      date: dated ? form.date : '',
      dateTo: dated ? form.dateTo : '',
    });
    setSaving(false);
    if (ok) setEditing(false); // при ошибке остаёмся в форме, чтобы не потерять правки
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    await uploadPhotos(place.id, Array.from(files));
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const remove = async () => {
    if (!window.confirm(`Удалить «${place.name}» вместе с фотографиями?`)) return;
    if (await deletePlace(place.id)) navigate(place.status === 'visited' ? '/visited' : '/planned');
  };

  const visited = place.status === 'visited';

  return (
    <>
      <Link to={visited ? '/visited' : '/planned'} className="back">← Назад к списку</Link>

      {/* Поля формы лежат в разных секциях, поэтому связаны с формой через атрибут form */}
      {editing && <form id="edit-place" onSubmit={save} />}

      <section className={`place-hero ${visited ? 'visited-hero' : 'planned-hero'}`}>
        {editing ? (
          <div className="edit-form">
            <input
              form="edit-place" aria-label="Название" placeholder="Название" required maxLength={200}
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              form="edit-place" aria-label="Страна" placeholder="Страна" maxLength={100}
              value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}
            />
            <select
              form="edit-place" aria-label="Статус"
              value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}
            >
              <option value="visited">✅ Побывал</option>
              <option value="planned">✈️ Хочу посетить</option>
            </select>
            {form.status === 'visited' && (
              <>
                <input
                  form="edit-place" type="date" aria-label="Дата посещения с" max={form.dateTo || undefined}
                  value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
                <input
                  form="edit-place" type="date" aria-label="Дата посещения до" min={form.date || undefined}
                  disabled={!form.date}
                  value={form.dateTo} onChange={(e) => setForm({ ...form, dateTo: e.target.value })}
                />
              </>
            )}
            <CitiesInput form="edit-place" cities={form.cities} onChange={(cities) => setForm({ ...form, cities })} />
            {formError && <p className="form-error" role="alert">{formError}</p>}
          </div>
        ) : (
          <>
            <span className="badge">{visited ? '✅ Побывал' : '✈️ В планах'}</span>
            <h1>{place.name}</h1>
            <p>{[countryRu(place.country), formatRange(place.date, place.dateTo)].filter(Boolean).join(' · ')}</p>
            {place.cities.length > 0 && <p>🏙 {place.cities.join(', ')}</p>}
          </>
        )}
      </section>

      <section className="panel">
        <h2>📝 Описание</h2>
        {editing ? (
          <textarea
            form="edit-place" aria-label="Описание" rows={5} maxLength={5000}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Расскажи об этом месте…"
          />
        ) : (
          <p className="description">{place.description || 'Описания пока нет. Нажми «Изменить», чтобы добавить.'}</p>
        )}
        <p className="muted">📍 {place.lat.toFixed(3)}°, {place.lng.toFixed(3)}°</p>

        <div className="actions">
          {editing ? (
            <>
              <button key="save" type="submit" form="edit-place" className="btn primary" disabled={saving}>
                {saving ? 'Сохраняю…' : 'Сохранить'}
              </button>
              <button type="button" className="btn ghost" onClick={() => setEditing(false)}>Отмена</button>
            </>
          ) : (
            <>
              {/* key: иначе React переиспользует эту кнопку как «Сохранить», и тот же клик сразу отправит форму */}
              <button key="edit" type="button" className="btn primary" onClick={startEdit}>✏️ Изменить</button>
              {!visited && (
                <button
                  type="button"
                  className="btn accent"
                  onClick={() => updatePlace(place.id, { status: 'visited', date: today() })}
                >
                  ✅ Я здесь побывал!
                </button>
              )}
              <button type="button" className="btn ghost" onClick={remove}>🗑 Удалить</button>
            </>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>📷 Фотографии ({place.photos.length})</h2>
          <button type="button" className="btn accent" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? 'Загружаю…' : '＋ Добавить фото'}
          </button>
          <input
            ref={fileRef} type="file" multiple hidden aria-label="Выбрать фотографии"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => onFiles(e.target.files)}
          />
        </div>

        {place.photos.length === 0 ? (
          <p className="empty small">Фотографий пока нет 📸</p>
        ) : (
          <div className="gallery">
            {place.photos.map((url, i) => (
              <figure key={url}>
                <button
                  type="button" className="photo-open"
                  aria-label={`Открыть фото ${i + 1} из ${place.photos.length}`}
                  onClick={() => setLightbox(url)}
                >
                  <img src={url} alt={`${place.name}, фото ${i + 1}`} loading="lazy" />
                </button>
                <button
                  type="button"
                  className="photo-del"
                  aria-label={`Удалить фото ${i + 1}`}
                  onClick={() => window.confirm('Удалить фото?') && deletePhoto(place.id, url)}
                >
                  ✕
                </button>
              </figure>
            ))}
          </div>
        )}
      </section>

      {lightbox && (
        <Modal className="lightbox" label="Просмотр фотографии" onClose={() => setLightbox(null)}>
          <img src={lightbox} alt={place.name} />
          <button type="button" className="lightbox-close" aria-label="Закрыть" onClick={() => setLightbox(null)}>
            ✕
          </button>
        </Modal>
      )}
    </>
  );
}
