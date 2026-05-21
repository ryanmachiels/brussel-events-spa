// Entry point van de applicatie.
// In volgende stappen komen hier filters, kaart, favorieten enz. bij.
import './css/style.css';
import { fetchPlaces } from './js/api.js';
import { localizeAll, renderList } from './js/ui.js';

const LANG = 'nl'; // taalswitcher volgt in stap 8

const app = document.querySelector('#app');

app.innerHTML = `
  <header class="app-header">
    <h1>Brussel Events</h1>
    <p>Culturele, toeristische en evenementlocaties uit de Brussel Open Data API.</p>
  </header>
  <main class="app-main">
    <p id="status" class="status">Data laden…</p>
    <section id="results" class="results" aria-live="polite"></section>
  </main>
`;

const status = document.querySelector('#status');
const results = document.querySelector('#results');

// .then / .catch om het Promise-resultaat van fetchPlaces te verwerken.
fetchPlaces()
  .then(({ items, fromCache }) => {
    const places = localizeAll(items, LANG);
    const bron = fromCache ? 'cache' : 'API';
    status.textContent = `${places.length} locaties geladen (bron: ${bron}).`;
    renderList(places, results);
  })
  .catch((error) => {
    status.textContent = `Er ging iets mis: ${error.message}`;
  });
