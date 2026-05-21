# Brussel Events — Interactieve SPA met Brussel Open Data

> Single-page webapplicatie (vanilla JS) voor het vak **Advanced Web**.
> Verken culturele, toeristische en evenementlocaties in Brussel: bekijk ze in
> een lijst en op een kaart, filter/zoek/sorteer, en bewaar favorieten met een
> persoonlijke notitie.

Gebouwd met **Vite** + **vanilla JavaScript (ES modules)** + **vanilla CSS**.
Geen front-end framework, geen CSS-framework. De kaart gebruikt de **Leaflet**-
library met OpenStreetMap-tegels.

## Functionaliteiten

- **Lijstweergave** met 6 kolommen (naam, categorie, gemeente, adres, postcode, website), met een **raster/tabel-toggle**.
- **Kaartweergave** (Leaflet + OpenStreetMap): markers per locatie, popup met link naar de details.
- **Detail-modal** met alle beschikbare velden (contact, links, toegankelijkheid, coördinaten, datums).
- **Filteren** op categorie en postcode, **zoeken** op naam/adres (gedebounced, 300 ms) en **sorteren** (naam, postcode, publicatiedatum, oplopend/aflopend).
- **Favorieten** (hartje per item) met aparte "Favorieten"-weergave, bewaard in LocalStorage.
- **Persoonlijke notitie** bij een favoriet, met formuliervalidatie (verplicht + max. 200 tekens).
- **Voorkeuren** die bewaard blijven tussen sessies: licht/donker thema, taal (NL/FR) en de laatste filter-state.
- **Infinite scroll** via de IntersectionObserver API (rijen laden in batches tijdens het scrollen).
- **API-caching** in LocalStorage met een TTL van 1 uur.
- **Responsive** (mobile-first): op telefoon klapt de tabel om naar kaartjes.

## Screenshots



| Lijstweergave | Kaartweergave | Detail + notitie |
| --- | --- | --- |
| `![Lijst](screenshots/lijst.png)` | `![Kaart](screenshots/kaart.png)` | `![Detail](screenshots/detail.png)` |

## Gebruikte API

- **Portaal:** Brussel Open Data — https://opendata.brussels.be/
- **Dataset:** _Lieux culturels, touristiques et événementiels recensés par Visit.Brussels_
  (id: `lieux_culturels_touristiques_evenementiels_visitbrussels_vbx`, ~598 records, drietalig NL/FR/EN).
- **Endpoint (records, geverifieerd):**
  ```
  https://opendata.brussels.be/api/explore/v2.1/catalog/datasets/lieux_culturels_touristiques_evenementiels_visitbrussels_vbx/records?limit=100
  ```
- API-documentatie: OpenDataSoft Explore API v2.1 — https://help.opendatasoft.com/apis/ods-explore-v2/

## Verplichte technieken → bestand:lijnnummer

| Techniek | Locatie(s) in de code |
| --- | --- |
| DOM: selecteren (`querySelector`) | `src/main.js:46`, `src/main.js:93–108` |
| DOM: manipuleren (`createElement`, `classList`, `textContent`) | `src/js/ui.js:95–97` (`classList` + `innerHTML` in `setFavButtonState`); `src/js/ui.js:107`, `src/js/ui.js:127–138` (`createElement`/`textContent`); `src/main.js:237` (`classList`) |
| DOM: events (`addEventListener`) | `src/main.js:249–251`, `src/main.js:272`; `src/js/ui.js:331` (submit) |
| Constanten (`const`) | `src/js/api.js:18–28` (en doorheen het hele project) |
| Template literals | `src/js/api.js:23` (URL); `src/main.js:200` |
| Iteratie (`forEach`, `for...of`) | `forEach`: `src/js/ui.js:126`, `src/js/ui.js:165` — `for...of`: `src/main.js:138` |
| Array-methodes (`map`, `filter`, `reduce`, `sort`, `find`, `some`) | `map`: `src/js/ui.js:91` · `filter`: `src/js/filters.js:32` · `reduce`: `src/js/filters.js:7` · `sort`: `src/js/filters.js:55` · `find`: `src/main.js:315` · `some`: `src/js/filters.js:38` |
| Arrow functions | `src/js/filters.js:6`, `src/js/filters.js:53` (en overal) |
| Ternary operator | `src/main.js:296`; `src/js/filters.js:56` |
| Callback functions | `src/js/filters.js:61` (`debounce`), gebruikt in `src/main.js:274`; `src/js/observer.js:38` |
| Promises (`.then` / `.catch`) | `src/main.js:392`, `src/main.js:412` |
| Async / await | `src/js/api.js:41`, `src/js/api.js:49`, `src/js/api.js:55` |
| Observer API (`IntersectionObserver`) | `src/js/observer.js:38` |
| Fetch | `src/js/api.js:49` |
| JSON parsing en weergeven | `src/js/api.js:55` (`response.json()`); `src/js/storage.js:20`, `src/js/storage.js:36` |
| Formuliervalidatie | `src/js/validation.js:7` (`validateNote`); `src/js/ui.js:331` (submit-handler) |
| LocalStorage | `src/js/storage.js:20`, `src/js/storage.js:32`, `src/js/storage.js:39` |

> Lijnnummers verwijzen naar de staat van de code bij het inleveren; kleine
> afwijkingen kunnen voorkomen als er nadien nog gewijzigd wordt.

## Installatie

Vereist: **Node.js 18+** (ontwikkeld op Node 24).

```bash
npm install
npm run dev
```

De dev-server draait standaard op http://localhost:5173.

Productie-build maken en bekijken:

```bash
npm run build
npm run preview
```

## Projectstructuur

```
/
├── index.html
├── package.json
├── vite.config.js
├── README.md
└── src/
    ├── main.js              # entry point: state, events, view-logica
    ├── css/
    │   └── style.css
    └── js/
        ├── api.js           # fetch + LocalStorage-caching met TTL
        ├── ui.js            # lijst-rendering, favoriet-hartje, detail-modal
        ├── map.js           # Leaflet-kaart met markers
        ├── filters.js       # filter / zoek / sorteer + debounce
        ├── storage.js       # LocalStorage-helpers (JSON + TTL)
        ├── favorites.js     # favorieten + notities
        ├── preferences.js   # thema + taal + filter-state
        ├── observer.js      # IntersectionObserver (infinite scroll)
        ├── validation.js    # formuliervalidatie
        └── icons.js         # gedeelde inline-SVG-iconen
```

## Gebruikte bronnen

- OpenDataSoft Explore API v2.1 — https://help.opendatasoft.com/apis/ods-explore-v2/
- Leaflet documentatie — https://leafletjs.com/reference.html
- OpenStreetMap (kaarttegels) — https://www.openstreetmap.org/
- MDN Web Docs (Fetch, IntersectionObserver, `<dialog>`, LocalStorage) — https://developer.mozilla.org/
- Vite documentatie — https://vite.dev/
- Leaflet + bundler marker-icon fix — https://github.com/Leaflet/Leaflet/issues/4968

## AI-chatlog

Dit project is mee opgebouwd met behulp van **Claude Code (Anthropic)**.


