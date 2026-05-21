// Entry point van de applicatie.
// In volgende stappen worden hier de modules (ui, map, filters, ...)
// geïmporteerd en aan elkaar geknoopt. Voorlopig halen we de data op als
// smoke-test; de echte lijst-/kaart-view volgt in stap 3 en verder.
import './css/style.css';
import { fetchPlaces } from './js/api.js';

const app = document.querySelector('#app');

app.innerHTML = `
  <header class="app-header">
    <h1>Brussel Events</h1>
    <p>Culturele, toeristische en evenementlocaties uit de Brussel Open Data API.</p>
  </header>
  <main class="app-main">
    <p id="status">Data laden…</p>
  </main>
`;

const status = document.querySelector('#status');

// .then / .catch om het Promise-resultaat van fetchPlaces te verwerken.
fetchPlaces()
  .then(({ items, fromCache }) => {
    const bron = fromCache ? 'cache' : 'API';
    status.textContent = `${items.length} locaties geladen (bron: ${bron}).`;
  })
  .catch((error) => {
    status.textContent = `Er ging iets mis: ${error.message}`;
  });
