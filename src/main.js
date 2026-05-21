// Entry point van de applicatie.
// Houdt de UI-state bij (zoekterm, filters, sortering, taal, view) en
// hertekent de actieve weergave telkens de state verandert.
import './css/style.css';
import { fetchPlaces } from './js/api.js';
import {
  localizeAll,
  renderEmpty,
  renderSkeleton,
  buildTableSkeleton,
  appendRows,
  buildCardGrid,
  appendCards,
  openModal,
  setOnFavoriteChange,
  setFavButtonState,
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
  iconMoon,
  iconSun,
  iconGrid,
  iconList,
  iconArrowUp,
  iconArrowDown,
} from './js/icons.js';
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
    <section class="toolbar">
      <div class="view-switch" role="tablist" aria-label="Weergave">
        <button id="view-list" class="view-btn is-active" type="button">Lijst</button>
        <button id="view-map" class="view-btn" type="button">Kaart</button>
        <button id="view-fav" class="view-btn" type="button">Favorieten</button>
      </div>
      <div class="layout-switch" aria-label="Indeling van de lijst">
        <button id="layout-grid" class="icon-btn is-active" type="button" aria-label="Rasterweergave"></button>
        <button id="layout-table" class="icon-btn" type="button" aria-label="Tabelweergave"></button>
      </div>
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
  layoutGrid: document.querySelector('#layout-grid'),
  layoutTable: document.querySelector('#layout-table'),
  lang: document.querySelector('#lang'),
  themeToggle: document.querySelector('#theme-toggle'),
};

// SVG-iconen op de icoonknoppen zetten.
els.layoutGrid.innerHTML = iconGrid;
els.layoutTable.innerHTML = iconList;

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
  layout: 'grid', // 'grid' | 'table'
};

// Vult een <select> met opties (createElement i.p.v. innerHTML zodat
// waarden met speciale tekens veilig zijn — geen XSS-risico).
const fillSelect = (select, values, allLabel) => {
  select.textContent = '';
  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = allLabel;
  select.appendChild(allOption);

  // for...of om elke filterwaarde als <option> toe te voegen.
  for (const value of values) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }
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
    layout: state.layout,
  });
};

// Rendert de sorteer-richting-knop (SVG-pijl + label).
const updateSortDirButton = () => {
  const asc = state.sortDir === 'asc';
  els.sortDir.innerHTML = `${asc ? iconArrowUp : iconArrowDown}<span>${asc ? 'Oplopend' : 'Aflopend'}</span>`;
};

// Houdt de actieve infinite-scroll-controller bij zodat we hem kunnen opruimen.
let scrollController = null;

// Rendert een lijst met infinite scroll (IntersectionObserver), in de gekozen
// indeling: tabel (rijen) of raster (kaarten).
const renderInfiniteList = (places, emptyMessage) => {
  els.results.textContent = '';

  if (places.length === 0) {
    renderEmpty(els.results, emptyMessage);
    els.status.textContent = `0 van ${state.allPlaces.length} locaties.`;
    return;
  }

  let appendBatch;
  if (state.layout === 'table') {
    const { table, tbody } = buildTableSkeleton();
    els.results.appendChild(table);
    appendBatch = (batch) => appendRows(tbody, batch);
  } else {
    const grid = buildCardGrid();
    els.results.appendChild(grid);
    appendBatch = (batch) => appendCards(grid, batch);
  }

  const sentinel = document.createElement('div');
  sentinel.className = 'scroll-sentinel';
  els.results.appendChild(sentinel);

  scrollController = createInfiniteScroll({
    items: places,
    sentinel,
    appendBatch,
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
  // De indeling-schakelaar is enkel relevant bij lijst/favorieten.
  els.layoutGrid.parentElement.hidden = state.view === 'map';

  if (state.view === 'map') {
    initMap(els.map);
    const shown = renderMarkers(sorted, openModal);
    els.status.textContent = `${shown} van ${state.allPlaces.length} locaties op de kaart (locaties zonder coördinaten worden niet getoond).`;
  } else if (state.view === 'favorites') {
    const favorites = sorted.filter((place) => isFavorite(place.id));
    renderInfiniteList(favorites, 'Nog geen favorieten — klik op een hartje in de lijst.');
  } else {
    renderInfiniteList(sorted, 'Geen locaties gevonden.');
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

// Markeert de actieve indeling-knop (raster/tabel).
const applyLayoutButtons = (layout) => {
  els.layoutGrid.classList.toggle('is-active', layout === 'grid');
  els.layoutTable.classList.toggle('is-active', layout === 'table');
};

const setLayout = (layout) => {
  state.layout = layout;
  applyLayoutButtons(layout);
  update();
};

els.layoutGrid.addEventListener('click', () => setLayout('grid'));
els.layoutTable.addEventListener('click', () => setLayout('table'));

// Na het opslaan van een notitie (= favoriet) verversen we de lijst/hartjes.
setOnFavoriteChange(update);

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
  updateSortDirButton();
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

// Opent de detail-modal voor het aangeklikte item (rij of kaart).
const openItem = (target) => {
  const item = target.closest('[data-id]');
  if (!item) return;
  const place = state.allPlaces.find((entry) => String(entry.id) === item.dataset.id);
  if (place) openModal(place);
};

els.results.addEventListener('click', (event) => {
  const favButton = event.target.closest('.fav-btn');
  if (favButton) {
    const nowFav = toggleFavorite(favButton.dataset.fav);
    setFavButtonState(favButton, nowFav);
    // In de favorietenweergave verdwijnt een item dat je uit favorieten haalt.
    if (state.view === 'favorites') update();
    return;
  }
  if (event.target.closest('a')) return; // links binnen het item gewoon laten werken
  openItem(event.target);
});

els.results.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  if (!event.target.matches('[data-id]')) return; // enkel het item zelf (rij/kaart)
  event.preventDefault(); // voorkom scrollen bij spatie
  openItem(event.target);
});

// --- Voorkeuren: thema -----------------------------------------------------
const updateThemeButton = (theme) => {
  // In dark mode tonen we een zon (om naar licht te schakelen), en omgekeerd.
  els.themeToggle.innerHTML = theme === 'dark' ? iconSun : iconMoon;
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
}
updateSortDirButton();
applyViewButtons(state.view);
applyLayoutButtons(state.layout);

// Toon skeleton-placeholders terwijl de data laadt.
renderSkeleton(els.results);

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
