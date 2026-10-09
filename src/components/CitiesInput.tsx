interface Props {
  cities: string[];
  onChange: (cities: string[]) => void;
  /** Атрибут form для полей, лежащих вне своей формы (страница редактирования) */
  form?: string;
}

const MAX_CITIES = 20;

/** Список городов одной страны: одно поле на город, можно добавлять и удалять. */
export default function CitiesInput({ cities, onChange, form }: Props) {
  const rows = cities.length ? cities : [''];
  const set = (i: number, v: string) => onChange(rows.map((c, j) => (j === i ? v : c)));

  return (
    <fieldset className="cities">
      <legend>Города</legend>
      {rows.map((city, i) => (
        <div className="city-row" key={i}>
          <input
            form={form} aria-label={`Город ${i + 1}`} placeholder="Например, Париж" maxLength={100}
            value={city} onChange={(e) => set(i, e.target.value)}
          />
          {rows.length > 1 && (
            <button
              type="button" className="btn ghost" aria-label={`Убрать город ${i + 1}`}
              onClick={() => onChange(rows.filter((_, j) => j !== i))}
            >
              ✕
            </button>
          )}
        </div>
      ))}
      {rows.length < MAX_CITIES && (
        <button type="button" className="btn ghost add-city" onClick={() => onChange([...rows, ''])}>
          ＋ Ещё город
        </button>
      )}
    </fieldset>
  );
}
