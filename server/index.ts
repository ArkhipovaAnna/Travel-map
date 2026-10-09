import express from 'express';
import type { ErrorRequestHandler } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// DATA_DIR / UPLOADS_DIR можно переопределить (так делают тесты, чтобы не трогать настоящие данные)
const DATA_DIR = process.env.DATA_DIR ?? path.join(__dirname, 'data');
const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(__dirname, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'places.json');
const DB_BACKUP = `${DB_FILE}.bak`;
const PORT = Number(process.env.PORT) || 3001;
// Нет авторизации, поэтому по умолчанию слушаем только этот компьютер, а не всю сеть
const HOST = process.env.HOST ?? '127.0.0.1';

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]');

type Status = 'visited' | 'planned';

interface Place {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  /** Города в рамках страны (может быть пусто) */
  cities: string[];
  status: Status;
  /** Начало поездки (YYYY-MM-DD) или '' */
  date: string;
  /** Конец поездки (YYYY-MM-DD) или ''; не раньше date */
  dateTo: string;
  description: string;
  photos: string[];
  createdAt: string;
}

const MAX_NAME = 200;
const MAX_COUNTRY = 100;
const MAX_DESCRIPTION = 5000;
const MAX_CITIES = 20;
const MAX_CITY = 100;

const parseFile = (file: string): Place[] => JSON.parse(fs.readFileSync(file, 'utf-8'));

// Если основной файл повреждён, пробуем восстановиться из копии
const readPlaces = (): Place[] => {
  let places: Place[];
  try {
    places = parseFile(DB_FILE);
  } catch (err) {
    if (!fs.existsSync(DB_BACKUP)) throw err;
    console.error('places.json повреждён, читаю резервную копию');
    places = parseFile(DB_BACKUP);
  }
  // Записи, созданные до появления городов и конца интервала, дополняем значениями по умолчанию
  return places.map((p) => ({ ...p, cities: p.cities ?? [], dateTo: p.dateTo ?? '' }));
};

// Пишем во временный файл и переименовываем: обрыв посреди записи не оставит обрезанный JSON
const writePlaces = (places: Place[]) => {
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(places, null, 2));
  if (fs.existsSync(DB_FILE)) fs.copyFileSync(DB_FILE, DB_BACKUP);
  fs.renameSync(tmp, DB_FILE);
};

const isStatus = (v: unknown): v is Status => v === 'visited' || v === 'planned';
const isDate = (v: unknown): v is string => typeof v === 'string' && (v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v));
const isCoord = (v: unknown, limit: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= limit;

// Список городов: массив строк; пустые отбрасываем. null — если формат неверный
const parseCities = (v: unknown): string[] | null => {
  if (!Array.isArray(v) || v.length > MAX_CITIES) return null;
  if (!v.every((c) => typeof c === 'string' && c.trim().length <= MAX_CITY)) return null;
  return v.map((c: string) => c.trim()).filter(Boolean);
};
// Интервал дат: конец не раньше начала и не бывает без начала
const isRange = (date: string, dateTo: string) => dateTo === '' || (date !== '' && dateTo >= date);

class UploadError extends Error {}

// Тип файла и расширение выбираем сами: заголовок Content-Type и имя файла присылает клиент,
// им нельзя верить (иначе можно загрузить .html или .svg со скриптом и выполнить его на нашем origin).
const IMAGE_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${IMAGE_EXT[file.mimetype]}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    file.mimetype in IMAGE_EXT
      ? cb(null, true)
      : cb(new UploadError('Можно загружать только JPG, PNG, WebP и GIF')),
});

const removeUpload = (url: string) => {
  const file = path.join(UPLOADS_DIR, path.basename(url));
  fs.rm(file, { force: true }, () => {});
};

export const app = express();
app.use(express.json());
app.use(
  '/uploads',
  express.static(UPLOADS_DIR, {
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  }),
);

app.get('/api/places', (_req, res) => {
  res.json(readPlaces());
});

app.post('/api/places', (req, res) => {
  const { name, country, lat, lng, status, date, dateTo, cities, description } = req.body ?? {};
  if (typeof name !== 'string' || !name.trim() || !isCoord(lat, 90) || !isCoord(lng, 180)) {
    res.status(400).json({ error: 'name, lat и lng обязательны (lat ≤ 90, lng ≤ 180)' });
    return;
  }
  if (
    name.trim().length > MAX_NAME ||
    (typeof country === 'string' && country.length > MAX_COUNTRY) ||
    (typeof description === 'string' && description.length > MAX_DESCRIPTION) ||
    (date !== undefined && !isDate(date)) ||
    (dateTo !== undefined && !isDate(dateTo)) ||
    (cities !== undefined && !parseCities(cities))
  ) {
    res.status(400).json({ error: 'Слишком длинный текст, неверный формат даты или список городов' });
    return;
  }
  if (!isRange(date ?? '', dateTo ?? '')) {
    res.status(400).json({ error: 'Дата «до» не может быть раньше даты «с»' });
    return;
  }
  const place: Place = {
    id: crypto.randomUUID(),
    name: name.trim(),
    country: typeof country === 'string' ? country.trim() : '',
    lat,
    lng,
    cities: cities === undefined ? [] : parseCities(cities)!,
    status: isStatus(status) ? status : 'visited',
    date: typeof date === 'string' ? date : '',
    dateTo: typeof dateTo === 'string' ? dateTo : '',
    description: typeof description === 'string' ? description : '',
    photos: [],
    createdAt: new Date().toISOString(),
  };
  const places = readPlaces();
  places.push(place);
  writePlaces(places);
  res.status(201).json(place);
});

app.get('/api/places/:id', (req, res) => {
  const place = readPlaces().find((p) => p.id === req.params.id);
  if (!place) {
    res.status(404).json({ error: 'Не найдено' });
    return;
  }
  res.json(place);
});

app.put('/api/places/:id', (req, res) => {
  const places = readPlaces();
  const place = places.find((p) => p.id === req.params.id);
  if (!place) {
    res.status(404).json({ error: 'Не найдено' });
    return;
  }
  const { name, country, status, date, dateTo, cities, description } = req.body ?? {};
  if (
    (typeof name === 'string' && name.trim().length > MAX_NAME) ||
    (typeof country === 'string' && country.length > MAX_COUNTRY) ||
    (typeof description === 'string' && description.length > MAX_DESCRIPTION) ||
    (date !== undefined && !isDate(date)) ||
    (dateTo !== undefined && !isDate(dateTo)) ||
    (cities !== undefined && !parseCities(cities))
  ) {
    res.status(400).json({ error: 'Слишком длинный текст, неверный формат даты или список городов' });
    return;
  }
  const nextDate = typeof date === 'string' ? date : place.date;
  // Если начало стёрли (или место стало «планом»), конец без начала не оставляем
  const nextDateTo = typeof dateTo === 'string' ? dateTo : nextDate === '' ? '' : place.dateTo;
  if (!isRange(nextDate, nextDateTo)) {
    res.status(400).json({ error: 'Дата «до» не может быть раньше даты «с»' });
    return;
  }
  if (typeof name === 'string' && name.trim()) place.name = name.trim();
  if (typeof country === 'string') place.country = country.trim();
  if (isStatus(status)) place.status = status;
  place.date = nextDate;
  place.dateTo = nextDateTo;
  if (cities !== undefined) place.cities = parseCities(cities)!;
  if (typeof description === 'string') place.description = description;
  writePlaces(places);
  res.json(place);
});

app.delete('/api/places/:id', (req, res) => {
  const places = readPlaces();
  const place = places.find((p) => p.id === req.params.id);
  if (!place) {
    res.status(404).json({ error: 'Не найдено' });
    return;
  }
  place.photos.forEach(removeUpload);
  writePlaces(places.filter((p) => p.id !== place.id));
  res.status(204).end();
});

app.post('/api/places/:id/photos', upload.array('photos', 20), (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const places = readPlaces();
  const place = places.find((p) => p.id === req.params.id);
  if (!place) {
    files.forEach((f) => removeUpload(f.filename));
    res.status(404).json({ error: 'Не найдено' });
    return;
  }
  if (files.length === 0) {
    res.status(400).json({ error: 'Файлы не выбраны' });
    return;
  }
  place.photos.push(...files.map((f) => `/uploads/${f.filename}`));
  writePlaces(places);
  res.json(place);
});

app.delete('/api/places/:id/photos', (req, res) => {
  const url = req.body?.url;
  const places = readPlaces();
  const place = places.find((p) => p.id === req.params.id);
  if (!place || typeof url !== 'string' || !place.photos.includes(url)) {
    res.status(404).json({ error: 'Не найдено' });
    return;
  }
  place.photos = place.photos.filter((p) => p !== url);
  removeUpload(url);
  writePlaces(places);
  res.json(place);
});

// Все ошибки отдаём как JSON, чтобы клиент мог показать понятное сообщение
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof UploadError) {
    res.status(400).json({ error: err.message });
  } else if (err instanceof multer.MulterError) {
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    res.status(tooBig ? 413 : 400).json({
      error: tooBig ? 'Файл слишком большой (максимум 15 МБ)' : 'Не удалось загрузить файлы',
    });
  } else if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Некорректный JSON' });
  } else {
    console.error(err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
app.use(errorHandler);

// Слушаем порт только при запуске файла напрямую (при импорте из тестов — нет)
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  app.listen(PORT, HOST, () => {
    console.log(`API сервер: http://${HOST}:${PORT}`);
  });
}
