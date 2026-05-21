// Entry point van de applicatie.
// Houdt de UI-state bij (zoekterm, filters, sortering, taal, view) en
// hertekent de actieve weergave telkens de state verandert.
import './css/style.css';
import { fetchPlaces } from './js/api.js';
import {
  localizeAll,
  renderList,
  renderEmpty,
  buildTableSkeleton,
  appendRows,
  openModal,
} from './js/ui.js';
import {
  filterPlaces,
  sortPlaces,
  getCategories,
  getZips,
  debounce,
} from './js/filters.js';
import { initMap, renderMarkers } from './js/map.js';
import { toggleFavorite, isFavorite } from './js/favorites.js';
import { createInfiniteScroll } from './js/observer.js';
import {
  getTheme,
  setTheme,
  applyTheme,
  getLang,
  setLang,
  getFilterState,
  saveFilterState,
} from './js/preferences.js';

const app = document.querySelector('#app');

app.innerHTML = `
  <header class="app-header">
    <div class="app-header__titles">
      <h1>Brussel Events</h1>
      <p>Culturele, toeristische en evenementlocaties uit de Brussel Open Data API.</p>
    </div>
    <div class="app-header__actions">
      <select id="lang" class="control" aria-label="Taal">
        <option value="nl">NL</option>
        <option value="fr">FR</option>
      </select>
      <button id="theme-toggle" class="control" type="button">🌙</button>
    </div>
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
  lang: document.querySelector('#lang'),
  themeToggle: document.querySelector('#theme-toggle'),
};

const state = {
  rawItems: [], // ruwe API-records (om bij taalwissel te hertalen)
  allPlaces: [],
  lang: 'nl',
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

// Bewaart de huidige filter-state zodat ze bij een herbezoek hersteld wordt.
const persistFilters = () => {
  saveFilterState({
    search: state.search,
    category: state.category,
    zip: state.zip,
    sortKey: state.sortKey,
    sortDir: state.sortDir,
    view: state.view,
  });
};

// Houdt de actieve infinite-scroll-controller bij zodat we hem kunnen opruimen.
let scrollController = null;

// Rendert de lijstweergave met infinite scroll (IntersectionObserver).
const renderInfiniteList = (places) => {
  els.results.textContent = '';

  if (places.length === 0) {
    renderEmpty(els.results, 'Geen locaties gevonden.');
    return;
  }

  const { table, tbody } = buildTableSkeleton();
  const sentinel = document.createElement('div');
  sentinel.className = 'scroll-sentinel';
  els.results.append(table, sentinel);

  scrollController = createInfiniteScroll({
    items: places,
    sentinel,
    appendBatch: (batch) => appendRows(tbody, batch),
    onProgress: (shown, total) => {
      sentinel.textContent = shown >= total ? '' : 'Meer laden tijdens het scrollen…';
      els.status.textContent = `${shown} van ${total} getoonde locaties geladen.`;
    },
  });
};

// Past de huidige filters + sortering toe en hertekent de actieve view.
const update = () => {
  // Vorige observer opruimen om geheugenlekken te vermijden.
  if (scrollController) {
    scrollController.destroy();
    scrollController = null;
  }

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
    renderInfiniteList(sorted);
  }

  persistFilters();
};

// Markeert de actieve view-knop.
const applyViewButtons = (view) => {
  els.viewList.classList.toggle('is-active', view === 'list');
  els.viewMap.classList.toggle('is-active', view === 'map');
  els.viewFav.classList.toggle('is-active', view === 'favorites');
};

// Wisselt tussen lijst-, kaart- en favorietenweergave.
const setView = (view) => {
  state.view = view;
  applyViewButtons(view);
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

// --- Voorkeuren: thema -----------------------------------------------------
const updateThemeButton = (theme) => {
  els.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  els.themeToggle.setAttribute(
    'aria-label',
    theme === 'dark' ? 'Schakel naar licht thema' : 'Schakel naar donker thema',
  );
};

els.themeToggle.addEventListener('click', () => {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  updateThemeButton(next);
});

// --- Voorkeuren: taal ------------------------------------------------------
// Categorie-namen verschillen per taal, dus we hertalen de places, herbouwen
// de categorie-dropdown en resetten de categorie-filter.
els.lang.addEventListener('change', (event) => {
  state.lang = event.target.value;
  setLang(state.lang);
  state.allPlaces = localizeAll(state.rawItems, state.lang);
  state.category = '';
  fillSelect(els.category, getCategories(state.allPlaces), 'Alle categorieën');
  update();
});

// Bestaat de waarde als optie in de select? (leeg = "alle" mag altijd)
const optionExists = (select, value) =>
  value === '' || [...select.options].some((option) => option.value === value);

// Herstel de voorkeuren vóór de data binnenkomt.
applyTheme(getTheme());
updateThemeButton(getTheme());
state.lang = getLang();
els.lang.value = state.lang;

const savedFilters = getFilterState();
if (savedFilters) {
  Object.assign(state, savedFilters);
  els.search.value = state.search;
  els.sortKey.value = state.sortKey;
  els.sortDir.textContent = state.sortDir === 'asc' ? '▲ Oplopend' : '▼ Aflopend';
  applyViewButtons(state.view);
}

// .then / .catch om het Promise-resultaat van fetchPlaces te verwerken.
fetchPlaces()
  .then(({ items }) => {
    state.rawItems = items;
    state.allPlaces = localizeAll(items, state.lang);
    fillSelect(els.category, getCategories(state.allPlaces), 'Alle categorieën');
    fillSelect(els.zip, getZips(state.allPlaces), 'Alle postcodes');

    // Herstel de bewaarde filter-selecties als ze nog geldig zijn.
    if (optionExists(els.category, state.category)) {
      els.category.value = state.category;
    } else {
      state.category = '';
    }
    if (optionExists(els.zip, state.zip)) {
      els.zip.value = state.zip;
    } else {
      state.zip = '';
    }

    update();
  })
  .catch((error) => {
    els.status.textContent = `Er ging iets mis: ${error.message}`;
  });
