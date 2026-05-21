// Entry point van de applicatie.
// In volgende stappen worden hier de modules (api, ui, map, filters, ...)
// geïmporteerd en aan elkaar geknoopt. Voorlopig tonen we een placeholder
// zodat de Vite dev-server iets kan renderen.
import './css/style.css';

const app = document.querySelector('#app');
app.innerHTML = `
  <header class="app-header">
    <h1>Brussel Events</h1>
    <p>Culturele evenementen uit de Brussel Open Data API.</p>
  </header>
  <main class="app-main">
    <p>Setup voltooid — functionaliteit volgt in de volgende stappen.</p>
  </main>
`;
