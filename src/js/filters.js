// filters.js — filter-, zoek- en sorteerlogica + een debounce-helper.
// Alle functies werken op genormaliseerde place-objecten (zie ui.js) en
// muteren de oorspronkelijke array niet.

// Unieke, alfabetisch gesorteerde categorieën uit alle places (reduce + Set).
export const getCategories = (places) => {
  const set = places.reduce((acc, place) => {
    place.categories.forEach((category) => acc.add(category));
    return acc;
  }, new Set());
  return [...set].sort((a, b) => a.localeCompare(b, 'nl'));
};

// Unieke postcodes (locatie-filter). De dataset speelt zich volledig op het
// grondgebied van de Stad Brussel af, dus "gemeente" is overal gelijk;
// de postcode (1000, 1020, …) geeft wél een bruikbaar locatie-onderscheid.
export const getZips = (places) => {
  const set = places.reduce((acc, place) => {
    if (place.zip && place.zip !== '—') acc.add(place.zip);
    return acc;
  }, new Set());
  return [...set].sort((a, b) => a.localeCompare(b, 'nl', { numeric: true }));
};

// Filtert op zoekterm (naam of adres), categorie en postcode.
export const filterPlaces = (
  places,
  { search = '', category = '', zip = '' } = {},
) => {
  const query = search.trim().toLowerCase();

  return places.filter((place) => {
    const matchesSearch =
      query === '' ||
      place.name.toLowerCase().includes(query) ||
      place.address.toLowerCase().includes(query);
    const matchesCategory =
      category === '' || place.categories.some((cat) => cat === category);
    const matchesZip = zip === '' || place.zip === zip;

    return matchesSearch && matchesCategory && matchesZip;
  });
};

// Vergelijkingsfuncties per sorteersleutel.
const comparators = {
  name: (a, b) => a.name.localeCompare(b.name, 'nl'),
  zip: (a, b) => a.zip.localeCompare(b.zip, 'nl', { numeric: true }),
  published: (a, b) => new Date(a.publishedAt) - new Date(b.publishedAt),
};

// Sorteert een kopie van de array. dir: 'asc' | 'desc'.
export const sortPlaces = (places, key = 'name', dir = 'asc') => {
  const compare = comparators[key] ?? comparators.name;
  const sorted = [...places].sort(compare);
  return dir === 'desc' ? sorted.reverse() : sorted;
};

// Debounce: voert fn pas uit nadat er `delay` ms lang geen nieuwe aanroep
// meer was (callback + closure). Gebruikt om de zoekfunctie te vertragen.
export const debounce = (fn, delay = 300) => {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};
