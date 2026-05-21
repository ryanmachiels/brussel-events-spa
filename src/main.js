// Entry point van de applicatie.
// Houdt de UI-state bij (zoekterm, filters, sortering) en hertekent de lijst
// telkens de state verandert. Kaart, favorieten en voorkeuren komen later.
import './css/style.css';
import { fetchPlaces } from './js/api.js';
import { localizeAll, renderList } from './js/ui.js';
import {
  filterPlaces,
  sortPlaces,
  getCategories,
  getZips,
  debounce,
} from './js/filters.js';

const LANG = 'nl'; // taalswitcher volgt in stap 8

const app = document.querySelector('#app');

app.innerHTML = `
  <header class="app-header">
    <h1>Brussel Events</h1>
    <p>Culturele, toeristische en evenementlocaties uit de Brussel Open Data API.</p>
  </header>
  <main class="app-main">
    <section class="controls" aria-label="Filters en sortering">
      <input id="search" class="control" type="search" placeholder="Zoek op naam of adres…" />
      <select id="filter-category" class="control" aria-label="Filter op categorie"></select>
      <select id="filter-zip" class="control" aria-label="Filter op postcode"></select>
      <select id="sort-key" class="control" aria-label="Sorteer op">
        <option value="name">Sorteer: naam</option>
        <option value="zip">Sorteer: postcode</option>
        <option value="published">Sorteer: publicatiedatum</option>
      </select>
      <button id="sort-dir" class="control" type="button">▲ Oplopend</button>
      <button id="reset" class="control" type="button">Reset</button>
    </section>
    <p id="status" class="status">Data laden…</p>
    <section id="results" class="results" aria-live="polite"></section>
  </main>
`;

const els = {
  search: document.querySelector('#search'),
  category: document.querySelector('#filter-category'),
  zip: document.querySelector('#filter-zip'),
  sortKey: document.querySelector('#sort-key'),
  sortDir: document.querySelector('#sort-dir'),
  reset: document.querySelector('#reset'),
  status: document.querySelector('#status'),
  results: document.querySelector('#results'),
};

const state = {
  allPlaces: [],
  search: '',
  category: '',
  zip: '',
  sortKey: 'name',
  sortDir: 'asc',
};

// Vult een <select> met opties (createElement i.p.v. innerHTML zodat
// waarden met speciale tekens veilig zijn — geen XSS-risico).
const fillSelect = (select, values, allLabel) => {
  select.textContent = '';
  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = allLabel;
  select.appendChild(allOption);

  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
};

// Past de huidige filters + sortering toe en hertekent de lijst.
const update = () => {
  const filtered = filterPlaces(state.allPlaces, state);
  const sorted = sortPlaces(filtered, state.sortKey, state.sortDir);
  renderList(sorted, els.results);
  els.status.textContent = `${sorted.length} van ${state.allPlaces.length} locaties getoond.`;
};

// Zoeken is gedebounced (300 ms) zodat we niet bij elke toetsaanslag filteren.
els.search.addEventListener(
  'input',
  debounce((event) => {
    state.search = event.target.value;
    update();
  }, 300),
);

els.category.addEventListener('change', (event) => {
  state.category = event.target.value;
  update();
});

els.zip.addEventListener('change', (event) => {
  state.zip = event.target.value;
  update();
});

els.sortKey.addEventListener('change', (event) => {
  state.sortKey = event.target.value;
  update();
});

els.sortDir.addEventListener('click', () => {
  state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
  els.sortDir.textContent = state.sortDir === 'asc' ? '▲ Oplopend' : '▼ Aflopend';
  update();
});

els.reset.addEventListener('click', () => {
  state.search = '';
  state.category = '';
  state.zip = '';
  els.search.value = '';
  els.category.value = '';
  els.zip.value = '';
  update();
});

// .then / .catch om het Promise-resultaat van fetchPlaces te verwerken.
fetchPlaces()
  .then(({ items }) => {
    state.allPlaces = localizeAll(items, LANG);
    fillSelect(els.category, getCategories(state.allPlaces), 'Alle categorieën');
    fillSelect(els.zip, getZips(state.allPlaces), 'Alle postcodes');
    update();
  })
  .catch((error) => {
    els.status.textContent = `Er ging iets mis: ${error.message}`;
  });
