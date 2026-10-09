import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from './api';
import type { NewPlace, Place, PlaceUpdate } from './types';

// Мутации не бросают исключений: при ошибке показывают уведомление (notice)
// и возвращают null / false, а вызывающий код смотрит на результат.
interface PlacesState {
  places: Place[];
  loading: boolean;
  /** Ошибка начальной загрузки списка (с кнопкой «Повторить») */
  error: string | null;
  /** Ошибка последнего действия пользователя */
  notice: string | null;
  clearNotice: () => void;
  reload: () => void;
  addPlace: (place: NewPlace) => Promise<Place | null>;
  updatePlace: (id: string, patch: PlaceUpdate) => Promise<boolean>;
  deletePlace: (id: string) => Promise<boolean>;
  uploadPhotos: (id: string, files: File[]) => Promise<boolean>;
  deletePhoto: (id: string, url: string) => Promise<boolean>;
}

const PlacesContext = createContext<PlacesState | null>(null);

export function PlacesProvider({ children }: { children: ReactNode }) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .list()
      .then((list) => !cancelled && setPlaces(list))
      .catch(() => !cancelled && setError('Не удалось связаться с сервером. Запущен ли он?'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const clearNotice = useCallback(() => setNotice(null), []);

  const replace = useCallback((place: Place) => {
    setPlaces((prev) => prev.map((p) => (p.id === place.id ? place : p)));
  }, []);

  const run = useCallback(async <T,>(action: () => Promise<T>): Promise<T | null> => {
    try {
      return await action();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Что-то пошло не так');
      return null;
    }
  }, []);

  const value = useMemo<PlacesState>(
    () => ({
      places,
      loading,
      error,
      notice,
      clearNotice,
      reload,
      addPlace: (data) =>
        run(async () => {
          const place = await api.create(data);
          setPlaces((prev) => [...prev, place]);
          return place;
        }),
      updatePlace: async (id, patch) => {
        const place = await run(() => api.update(id, patch));
        if (place) replace(place);
        return place !== null;
      },
      deletePlace: async (id) => {
        const done = await run(async () => {
          await api.remove(id);
          return true;
        });
        if (done) setPlaces((prev) => prev.filter((p) => p.id !== id));
        return done === true;
      },
      uploadPhotos: async (id, files) => {
        const place = await run(() => api.uploadPhotos(id, files));
        if (place) replace(place);
        return place !== null;
      },
      deletePhoto: async (id, url) => {
        const place = await run(() => api.removePhoto(id, url));
        if (place) replace(place);
        return place !== null;
      },
    }),
    [places, loading, error, notice, clearNotice, reload, replace, run],
  );

  return <PlacesContext.Provider value={value}>{children}</PlacesContext.Provider>;
}

export function usePlaces() {
  const ctx = useContext(PlacesContext);
  if (!ctx) throw new Error('usePlaces должен использоваться внутри PlacesProvider');
  return ctx;
}
