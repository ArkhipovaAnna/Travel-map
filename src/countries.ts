// Карта (world-atlas) отдаёт названия стран по-английски, а интерфейс русский.
// Переводим при отметке места и при показе, чтобы «Vietnam» и «Вьетнам» не считались разными странами.
const RU: Record<string, string> = {
  Afghanistan: 'Афганистан', Albania: 'Албания', Algeria: 'Алжир', Angola: 'Ангола', Antarctica: 'Антарктида',
  Argentina: 'Аргентина', Armenia: 'Армения', Australia: 'Австралия', Austria: 'Австрия', Azerbaijan: 'Азербайджан',
  Bahamas: 'Багамы', Bangladesh: 'Бангладеш', Belarus: 'Беларусь', Belgium: 'Бельгия', Belize: 'Белиз',
  Benin: 'Бенин', Bhutan: 'Бутан', Bolivia: 'Боливия', 'Bosnia and Herz.': 'Босния и Герцеговина',
  Botswana: 'Ботсвана', Brazil: 'Бразилия', Brunei: 'Бруней', Bulgaria: 'Болгария', 'Burkina Faso': 'Буркина-Фасо',
  Burundi: 'Бурунди', Cambodia: 'Камбоджа', Cameroon: 'Камерун', Canada: 'Канада',
  'Central African Rep.': 'Центральноафриканская Республика', Chad: 'Чад', Chile: 'Чили', China: 'Китай',
  Colombia: 'Колумбия', Congo: 'Республика Конго', 'Costa Rica': 'Коста-Рика', "Côte d'Ivoire": 'Кот-д’Ивуар',
  Croatia: 'Хорватия', Cuba: 'Куба', Cyprus: 'Кипр', Czechia: 'Чехия', 'Dem. Rep. Congo': 'ДР Конго',
  Denmark: 'Дания', Djibouti: 'Джибути', 'Dominican Rep.': 'Доминиканская Республика', Ecuador: 'Эквадор',
  Egypt: 'Египет', 'El Salvador': 'Сальвадор', 'Eq. Guinea': 'Экваториальная Гвинея', Eritrea: 'Эритрея',
  Estonia: 'Эстония', eSwatini: 'Эсватини', Ethiopia: 'Эфиопия', 'Falkland Is.': 'Фолклендские острова',
  Fiji: 'Фиджи', Finland: 'Финляндия', France: 'Франция', 'Fr. S. Antarctic Lands': 'Французские Южные территории',
  Gabon: 'Габон', Gambia: 'Гамбия', Georgia: 'Грузия', Germany: 'Германия', Ghana: 'Гана', Greece: 'Греция',
  Greenland: 'Гренландия', Guatemala: 'Гватемала', Guinea: 'Гвинея', 'Guinea-Bissau': 'Гвинея-Бисау',
  Guyana: 'Гайана', Haiti: 'Гаити', Honduras: 'Гондурас', Hungary: 'Венгрия', Iceland: 'Исландия',
  India: 'Индия', Indonesia: 'Индонезия', Iran: 'Иран', Iraq: 'Ирак', Ireland: 'Ирландия', Israel: 'Израиль',
  Italy: 'Италия', Jamaica: 'Ямайка', Japan: 'Япония', Jordan: 'Иордания', Kazakhstan: 'Казахстан',
  Kenya: 'Кения', Kosovo: 'Косово', Kuwait: 'Кувейт', Kyrgyzstan: 'Киргизия', Laos: 'Лаос', Latvia: 'Латвия',
  Lebanon: 'Ливан', Lesotho: 'Лесото', Liberia: 'Либерия', Libya: 'Ливия', Lithuania: 'Литва',
  Luxembourg: 'Люксембург', Macedonia: 'Северная Македония', Madagascar: 'Мадагаскар', Malawi: 'Малави',
  Malaysia: 'Малайзия', Mali: 'Мали', Mauritania: 'Мавритания', Mexico: 'Мексика', Moldova: 'Молдова',
  Mongolia: 'Монголия', Montenegro: 'Черногория', Morocco: 'Марокко', Mozambique: 'Мозамбик',
  Myanmar: 'Мьянма', Namibia: 'Намибия', Nepal: 'Непал', Netherlands: 'Нидерланды',
  'New Caledonia': 'Новая Каледония', 'New Zealand': 'Новая Зеландия', Nicaragua: 'Никарагуа', Niger: 'Нигер',
  Nigeria: 'Нигерия', 'N. Cyprus': 'Северный Кипр', 'North Korea': 'Северная Корея', Norway: 'Норвегия',
  Oman: 'Оман', Pakistan: 'Пакистан', Palestine: 'Палестина', Panama: 'Панама',
  'Papua New Guinea': 'Папуа — Новая Гвинея', Paraguay: 'Парагвай', Peru: 'Перу', Philippines: 'Филиппины',
  Poland: 'Польша', Portugal: 'Португалия', 'Puerto Rico': 'Пуэрто-Рико', Qatar: 'Катар', Romania: 'Румыния',
  Russia: 'Россия', Rwanda: 'Руанда', 'S. Sudan': 'Южный Судан', 'Saudi Arabia': 'Саудовская Аравия',
  Senegal: 'Сенегал', Serbia: 'Сербия', 'Sierra Leone': 'Сьерра-Леоне', Slovakia: 'Словакия',
  Slovenia: 'Словения', 'Solomon Is.': 'Соломоновы Острова', Somalia: 'Сомали', Somaliland: 'Сомалиленд',
  'South Africa': 'ЮАР', 'South Korea': 'Южная Корея', Spain: 'Испания', 'Sri Lanka': 'Шри-Ланка',
  Sudan: 'Судан', Suriname: 'Суринам', Sweden: 'Швеция', Switzerland: 'Швейцария', Syria: 'Сирия',
  Taiwan: 'Тайвань', Tajikistan: 'Таджикистан', Tanzania: 'Танзания', Thailand: 'Таиланд',
  'Timor-Leste': 'Восточный Тимор', Togo: 'Того', 'Trinidad and Tobago': 'Тринидад и Тобаго', Tunisia: 'Тунис',
  Turkey: 'Турция', Turkmenistan: 'Туркмения', Uganda: 'Уганда', Ukraine: 'Украина',
  'United Arab Emirates': 'ОАЭ', 'United Kingdom': 'Великобритания',
  'United States of America': 'США', Uruguay: 'Уругвай', Uzbekistan: 'Узбекистан', Vanuatu: 'Вануату',
  Venezuela: 'Венесуэла', Vietnam: 'Вьетнам', 'W. Sahara': 'Западная Сахара', Yemen: 'Йемен',
  Zambia: 'Замбия', Zimbabwe: 'Зимбабве',
};

/** Русское название страны; незнакомые строки (введённые вручную) возвращаются как есть. */
export const countryRu = (name: string) => RU[name.trim()] ?? name.trim();

/** Список русских названий стран для подсказок в форме. */
export const COUNTRY_NAMES = Object.values(RU).sort((a, b) => a.localeCompare(b, 'ru'));

/** Английское название страны (как в данных карты) по русскому; неизвестное возвращается как есть. */
export const countryEn = (name: string) => {
  const ru = countryRu(name);
  return Object.keys(RU).find((en) => RU[en] === ru) ?? ru;
};

/** Ключ для подсчёта уникальных стран: без учёта языка и регистра. */
export const countryKey = (name: string) => countryRu(name).toLowerCase();
