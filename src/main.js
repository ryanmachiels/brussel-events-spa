// Entry point van de applicatie.
// Houdt de UI-state bij (zoekterm, filters, sortering) en hertekent de lijst
// telkens de state verandert. Kaart, favorieten en voorkeuren komen later.
import './css/style.css';
import { fetchPlaces } from './js/api.js';
import { localizeAll, renderList, openModal } from './js/ui.js';
import {
  filterPlaces,
  sortPlaces,
  getCategories,
  getZips,
  debounce,
} from './js/filters.js';
import { initMap, renderMarkers } from './js/map.js';
import { toggleFavorite, isFavorite } from './js/favorites.js';

const LANG = 'nl'; // taalswitcher volgt in stap 8

const app = document.querySelector('#app');

app.innerHTML = `
  <header class="app-header">
    <h1>Brussel Events</h1>
    <p>Culturele, toeristische en evenementlocaties uit de Brussel Open Data API.</p>
  </header>
  <main class="app-main">
    <section class="view-switch" role="tablist" aria-label="Weergave">
      <button id="view-list" class="view-btn is-active" type="button">Lijst</button>
      <button id="view-map" class="view-btn" type="button">Kaart</button>
      <button id="view-fav" class="view-btn" type="button">♥ Favorieten</button>
    </section>
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
    <div id="map" class="map" hidden></div>
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
  map: document.querySelector('#map'),
  viewList: document.querySelector('#view-list'),
  viewMap: document.querySelector('#view-map'),
  viewFav: document.querySelector('#view-fav'),
};

const state = {
  allPlaces: [],
  search: '',
  category: '',
  zip: '',
  sortKey: 'name',
  sortDir: 'asc',
  view: 'list', // 'list' | 'map' | 'favorites'
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

// Past de huidige filters + sortering toe en hertekent de actieve view.
const update = () => {
  const filtered = filterPlaces(state.allPlaces, state);
  const sorted = sortPlaces(filtered, state.sortKey, state.sortDir);

  els.results.hidden = state.view === 'map';
  els.map.hidden = state.view !== 'map';

  if (state.view === 'map') {
    initMap(els.map);
    const shown = renderMarkers(sorted, openModal);
    els.status.textContent = `${shown} van ${state.allPlaces.length} locaties op de kaart (locaties zonder coördinaten worden niet getoond).`;
  } else if (state.view === 'favorites') {
    const favorites = sorted.filter((place) => isFavorite(place.id));
    renderList(favorites, els.results);
    els.status.textContent = favorites.length
      ? `${favorites.length} favoriet(en) getoond.`
      : 'Nog geen favorieten — klik op een ♡ in de lijst.';
  } else {
    renderList(sorted, els.results);
    els.status.textContent = `${sorted.length} van ${state.allPlaces.length} locaties getoond.`;
  }
};

// Wisselt tussen lijst-, kaart- en favorietenweergave.
const setView = (view) => {
  state.view = view;
  els.viewList.classList.toggle('is-active', view === 'list');
  els.viewMap.classList.toggle('is-active', view === 'map');
  els.viewFav.classList.toggle('is-active', view === 'favorites');
  update();
};

els.viewList.addEventListener('click', () => setView('list'));
els.viewMap.addEventListener('click', () => setView('map'));
els.viewFav.addEventListener('click', () => setView('favorites'));

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

// Opent de detail-modal voor de aangeklikte rij (event-delegatie).
const openRow = (target) => {
  const row = target.closest('tr[data-id]');
  if (!row) return;
  const place = state.allPlaces.find((item) => String(item.id) === row.dataset.id);
  if (place) openModal(place);
};

// Werkt het uiterlijk van een hartje bij na een toggle.
const refreshFavButton = (button, nowFav) => {
  button.classList.toggle('is-fav', nowFav);
  button.textContent = nowFav ? '♥' : '♡';
  button.setAttribute('aria-pressed', String(nowFav));
  button.setAttribute(
    'aria-label',
    nowFav ? 'Verwijder uit favorieten' : 'Voeg toe aan favorieten',
  );
};

els.results.addEventListener('click', (event) => {
  const favButton = event.target.closest('.fav-btn');
  if (favButton) {
    const nowFav = toggleFavorite(favButton.dataset.fav);
    refreshFavButton(favButton, nowFav);
    // In de favorietenweergave verdwijnt een rij die je uit favorieten haalt.
    if (state.view === 'favorites') update();
    return;
  }
  if (event.target.closest('a')) return; // links binnen de rij gewoon laten werken
  openRow(event.target);
});

els.results.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  if (!event.target.matches('tr[data-id]')) return; // enkel de rij zelf
  event.preventDefault(); // voorkom scrollen bij spatie
  openRow(event.target);
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
