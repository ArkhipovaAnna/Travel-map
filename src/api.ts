import type { NewPlace, Place, PlaceUpdate } from './types';

export class ApiError extends Error {}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError('Нет связи с сервером. Он запущен?');
  }
  if (!res.ok) {
    // сервер присылает { error: '...' } — показываем его текст, если он есть
    const body = await res.json().catch(() => null);
    throw new ApiError(typeof body?.error === 'string' ? body.error : `Ошибка запроса: ${res.status}`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const api = {
  list: () => request<Place[]>('/api/places'),
  create: (place: NewPlace) => request<Place>('/api/places', json('POST', place)),
  update: (id: string, patch: PlaceUpdate) =>
    request<Place>(`/api/places/${id}`, json('PUT', patch)),
  remove: (id: string) => request<void>(`/api/places/${id}`, { method: 'DELETE' }),
  uploadPhotos: (id: string, files: File[]) => {
    const form = new FormData();
    files.forEach((f) => form.append('photos', f));
    return request<Place>(`/api/places/${id}/photos`, { method: 'POST', body: form });
  },
  removePhoto: (id: string, url: string) =>
    request<Place>(`/api/places/${id}/photos`, json('DELETE', { url })),
};
