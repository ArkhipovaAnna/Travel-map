import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

// Тесты работают с временными папками, настоящие данные не затрагиваются
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'travel-map-test-'));
process.env.DATA_DIR = path.join(tmp, 'data');
process.env.UPLOADS_DIR = path.join(tmp, 'uploads');

let server: Server;
let base: string;

before(async () => {
  const { app } = await import('./index');
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => {
  server.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

const post = (url: string, body: unknown) =>
  fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

const createPlace = async () => {
  const res = await post('/api/places', { name: 'Париж', lat: 48.85, lng: 2.35 });
  assert.equal(res.status, 201);
  return (await res.json()) as { id: string; photos: string[] };
};

const upload = (id: string, name: string, type: string, content = 'x') => {
  const form = new FormData();
  form.append('photos', new Blob([content], { type }), name);
  return fetch(`${base}/api/places/${id}/photos`, { method: 'POST', body: form });
};

describe('places', () => {
  it('создаёт место и обрезает пробелы в названии', async () => {
    const res = await post('/api/places', { name: '  Рим ', lat: 41.9, lng: 12.5 });
    assert.equal(res.status, 201);
    assert.equal(((await res.json()) as { name: string }).name, 'Рим');
  });

  it('отклоняет пустое название и координаты вне диапазона', async () => {
    assert.equal((await post('/api/places', { name: ' ', lat: 0, lng: 0 })).status, 400);
    assert.equal((await post('/api/places', { name: 'A', lat: 91, lng: 0 })).status, 400);
    assert.equal((await post('/api/places', { name: 'A', lat: 0, lng: 181 })).status, 400);
    assert.equal((await post('/api/places', { name: 'A', lat: '1', lng: 0 })).status, 400);
  });

  it('отклоняет неверную дату', async () => {
    assert.equal((await post('/api/places', { name: 'A', lat: 0, lng: 0, date: 'вчера' })).status, 400);
  });

  it('сохраняет несколько городов и интервал дат', async () => {
    const res = await post('/api/places', {
      name: 'Италия', country: 'Италия', lat: 42, lng: 12,
      cities: [' Рим ', '', 'Милан'], date: '2026-06-01', dateTo: '2026-06-10',
    });
    assert.equal(res.status, 201);
    const place = (await res.json()) as { id: string; cities: string[]; date: string; dateTo: string };
    assert.deepEqual(place.cities, ['Рим', 'Милан']);
    assert.equal(place.dateTo, '2026-06-10');

    const put = await fetch(`${base}/api/places/${place.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cities: ['Флоренция'], dateTo: '2026-06-05' }),
    });
    assert.equal(put.status, 200);
    const updated = (await put.json()) as { cities: string[]; dateTo: string };
    assert.deepEqual(updated.cities, ['Флоренция']);
    assert.equal(updated.dateTo, '2026-06-05');
  });

  it('отклоняет интервал, где «до» раньше «с» или «с» не указано', async () => {
    const base_ = { name: 'A', lat: 0, lng: 0 };
    assert.equal((await post('/api/places', { ...base_, date: '2026-06-10', dateTo: '2026-06-01' })).status, 400);
    assert.equal((await post('/api/places', { ...base_, dateTo: '2026-06-01' })).status, 400);
    assert.equal((await post('/api/places', { ...base_, cities: 'Рим' })).status, 400);
    assert.equal((await post('/api/places', { ...base_, cities: [1] })).status, 400);
  });

  it('старые записи без городов отдаются с пустыми значениями', async () => {
    const place = await createPlace();
    const got = (await (await fetch(`${base}/api/places/${place.id}`)).json()) as { cities: string[]; dateTo: string };
    assert.deepEqual(got.cities, []);
    assert.equal(got.dateTo, '');
  });

  it('отвечает JSON-ошибкой на битый JSON', async () => {
    const res = await fetch(base + '/api/places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{oops',
    });
    assert.equal(res.status, 400);
    assert.ok(((await res.json()) as { error: string }).error);
  });

  it('хранит резервную копию и не оставляет временный файл', async () => {
    await createPlace();
    await createPlace();
    const dir = process.env.DATA_DIR!;
    assert.ok(fs.existsSync(path.join(dir, 'places.json.bak')));
    assert.ok(!fs.existsSync(path.join(dir, 'places.json.tmp')));
  });
});

describe('загрузка фото', () => {
  it('принимает png и сохраняет расширение по типу файла', async () => {
    const place = await createPlace();
    const res = await upload(place.id, 'photo.png', 'image/png');
    assert.equal(res.status, 200);
    const updated = (await res.json()) as { photos: string[] };
    assert.match(updated.photos[0], /^\/uploads\/[0-9a-f-]+\.png$/);

    const file = await fetch(base + updated.photos[0]);
    assert.equal(file.status, 200);
    assert.equal(file.headers.get('x-content-type-options'), 'nosniff');
  });

  it('не позволяет выдать html за картинку через имя файла', async () => {
    const place = await createPlace();
    const res = await upload(place.id, 'evil.html', 'image/png', '<script>alert(1)</script>');
    assert.equal(res.status, 200);
    const [url] = ((await res.json()) as { photos: string[] }).photos;
    assert.match(url, /\.png$/);
  });

  it('отклоняет SVG и не-картинки', async () => {
    const place = await createPlace();
    assert.equal((await upload(place.id, 'a.svg', 'image/svg+xml', '<svg/>')).status, 400);
    assert.equal((await upload(place.id, 'a.html', 'text/html', '<b>')).status, 400);
    assert.deepEqual(fs.readdirSync(process.env.UPLOADS_DIR!).filter((f) => /svg|html/.test(f)), []);
  });

  it('удаляет фото вместе с файлом', async () => {
    const place = await createPlace();
    const [url] = ((await (await upload(place.id, 'a.jpg', 'image/jpeg')).json()) as { photos: string[] }).photos;
    const res = await fetch(`${base}/api/places/${place.id}/photos`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    assert.equal(res.status, 200);
    await new Promise((r) => setTimeout(r, 100));
    assert.ok(!fs.existsSync(path.join(process.env.UPLOADS_DIR!, path.basename(url))));
  });
});
