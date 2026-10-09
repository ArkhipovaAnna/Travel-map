import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Modal from './Modal';
import CitiesInput from './CitiesInput';
import { usePlaces } from '../PlacesContext';
import { COUNTRY_NAMES } from '../countries';
import type { NewPlace, Status } from '../types';

interface Props {
  /** Координаты клика по карте. Без них (кнопка «Добавить») точку берём по выбранной стране. */
  lat?: number;
  lng?: number;
  country?: string;
  onSave: (place: NewPlace) => Promise<void>;
  onClose: () => void;
}

export default function AddPlaceModal({ lat, lng, country = '', onSave, onClose }: Props) {
  // Окно открыто поверх страницы, поэтому ошибку сохранения показываем прямо в нём
  const { notice, clearNotice } = usePlaces();
  useEffect(() => clearNotice(), [clearNotice]); // не показываем в новом окне старую ошибку
  const manual = lat === undefined || lng === undefined;
  const [name, setName] = useState('');
  const [countryName, setCountryName] = useState(country);
  const [cities, setCities] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>('visited');
  const [date, setDate] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    clearNotice();
    setError('');

    const cityList = cities.map((c) => c.trim()).filter(Boolean);
    // Название можно не вводить: тогда это перечень городов или сама страна
    const title = name.trim() || cityList.join(', ') || countryName.trim();
    if (!title) {
      setError('Укажите название, город или страну');
      return;
    }
    if (status === 'visited' && dateTo && (!date || dateTo < date)) {
      setError(date ? 'Дата «до» не может быть раньше даты «с»' : 'Укажите дату «с»');
      return;
    }

    setSaving(true);
    try {
      let point = manual ? null : { lat, lng };
      if (manual) {
        // Карта нужна только здесь, поэтому подгружаем её данные по требованию
        const { countryCenter } = await import('../countryGeo');
        point = countryCenter(countryName);
        if (!point) {
          setError('Выберите страну из списка — по ней ставится метка на карте');
          return;
        }
      }
      await onSave({
        name: title,
        country: countryName,
        lat: point!.lat,
        lng: point!.lng,
        cities: cityList,
        status,
        date: status === 'visited' ? date : '',
        dateTo: status === 'visited' && date ? dateTo : '',
        description,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} label="Новое место">
      <form className="modal" onSubmit={submit}>
        <h2>📍 Новое место</h2>

        <div className="status-toggle">
          <button
            type="button"
            className={status === 'visited' ? 'active visited' : ''}
            aria-pressed={status === 'visited'}
            onClick={() => setStatus('visited')}
          >
            ✅ Уже был
          </button>
          <button
            type="button"
            className={status === 'planned' ? 'active planned' : ''}
            aria-pressed={status === 'planned'}
            onClick={() => setStatus('planned')}
          >
            ✈️ Хочу посетить
          </button>
        </div>

        <label>
          Страна
          <input
            list="country-options" value={countryName} onChange={(e) => setCountryName(e.target.value)}
            maxLength={100} required={manual} autoFocus placeholder="Начните вводить название"
          />
        </label>
        <datalist id="country-options">
          {COUNTRY_NAMES.map((c) => <option key={c} value={c} />)}
        </datalist>

        <CitiesInput cities={cities} onChange={setCities} />

        <label>
          Название (необязательно)
          <input
            value={name} onChange={(e) => setName(e.target.value)} maxLength={200}
            placeholder="По умолчанию — города или страна"
          />
        </label>

        {status === 'visited' && (
          <div className="date-range">
            <label>
              Дата посещения с
              <input
                type="date" value={date} max={dateTo || undefined}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label>
              до
              <input
                type="date" value={dateTo} min={date || undefined} disabled={!date}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </label>
          </div>
        )}
        <label>
          Описание
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Впечатления, заметки, планы…"
            maxLength={5000}
          />
        </label>

        {(error || notice) && <p className="form-error" role="alert">{error || notice}</p>}

        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Отмена</button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Сохраняю…' : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
