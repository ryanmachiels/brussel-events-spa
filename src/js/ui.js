// ui.js — DOM rendering van de lijst-view (tabel met 6 kolommen).
// De detail-modal volgt in stap 5.

const FALLBACK = '—';

// De 6 kolommen van de lijstweergave (sleutel = veld op het genormaliseerde
// place-object, label = kolomkop).
const COLUMNS = [
  { key: 'name', label: 'Naam' },
  { key: 'category', label: 'Categorie' },
  { key: 'municipality', label: 'Gemeente' },
  { key: 'address', label: 'Adres' },
  { key: 'zip', label: 'Postcode' },
  { key: 'website', label: 'Website' },
];

// Kies de eerste bruikbare waarde uit de meegegeven taalvarianten. De dataset
// is hoofdzakelijk tweetalig (NL/FR); lege velden of "?" (= onbekend) slaan
// we over en vervangen we door een streepje.
const pick = (...values) => {
  const found = values.find((value) => {
    const text = `${value ?? ''}`.trim();
    return text !== '' && text !== '?';
  });
  return found ? `${found}`.trim() : FALLBACK;
};

// Maakt van een (mogelijk protocol-loze) URL een geldige href.
const toHref = (url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

// Maakt van een (taal)veld een opgeschoonde array. Categorie-velden zijn in
// de dataset arrays (bv. ["Livemuziek", "Culturele agenda"]); we verwijderen
// lege en "?" waarden.
const cleanArray = (value) =>
  (Array.isArray(value) ? value : value ? [value] : [])
    .map((item) => `${item}`.trim())
    .filter((item) => item !== '' && item !== '?');

// Zet een ruwe API-record om naar een genormaliseerd, getaald "place"-object.
// lang bepaalt welke taalvariant voorrang krijgt; de andere taal dient als
// fallback. Het ruwe record blijft beschikbaar via .raw voor de detail-modal.
export const localizePlace = (record, lang = 'nl') => {
  const nlFirst = lang === 'nl';
  const geo = record.add_geo_point_2 ?? null;

  const localized = (nlValue, frValue) =>
    nlFirst ? pick(nlValue, frValue) : pick(frValue, nlValue);

  // Categorieën als opgeschoonde array (voor filteren in stap 4), met fallback
  // naar de andere taal wanneer de gekozen taal leeg is.
  const nlCats = cleanArray(record.visit_category_nl_multi);
  const frCats = cleanArray(record.visit_category_fr_multi);
  const primaryCats = nlFirst ? nlCats : frCats;
  const fallbackCats = nlFirst ? frCats : nlCats;
  const categories = primaryCats.length ? primaryCats : fallbackCats;

  return {
    id: record.id,
    name: localized(record.translations_nl_name, record.translations_fr_name),
    categories,
    category: categories.length ? categories.join(', ') : FALLBACK,
    municipality: localized(record.add_municipality_nl, record.add_municipality_fr),
    address: localized(
      record.translations_nl_address_line1,
      record.translations_fr_address_line1,
    ),
    zip: pick(record.translations_fr_address_zip),
    website: pick(record.translations_fr_website),
    // Onderstaande velden worden in latere stappen gebruikt (modal, kaart, sort).
    phone: pick(record.translations_fr_phone_contact, record.translations_fr_phone_booking),
    email: pick(record.translations_fr_email),
    publishedAt: record.published_at ?? null,
    lat: geo ? geo.lat : null,
    lon: geo ? geo.lon : null,
    raw: record,
  };
};

// Normaliseert een volledige lijst records (array-methode map).
export const localizeAll = (records, lang = 'nl') =>
  records.map((record) => localizePlace(record, lang));

// Bouwt één tabelrij voor een place.
const buildRow = (place) => {
  const row = document.createElement('tr');
  row.dataset.id = place.id;
  row.tabIndex = 0; // focusbaar zodat de rij ook met toetsenbord te openen is

  COLUMNS.forEach((col) => {
    const cell = document.createElement('td');
    cell.dataset.label = col.label; // gebruikt voor responsive stacking (stap 11)

    if (col.key === 'website' && place.website !== FALLBACK) {
      const link = document.createElement('a');
      link.href = toHref(place.website);
      link.textContent = 'Website';
      link.target = '_blank';
      link.rel = 'noopener';
      cell.appendChild(link);
    } else {
      cell.textContent = place[col.key];
    }

    row.appendChild(cell);
  });

  return row;
};

// Rendert de lijst van places als tabel in de gegeven container.
export const renderList = (places, container) => {
  container.textContent = ''; // bestaande inhoud wissen

  if (places.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'Geen locaties gevonden.';
    container.appendChild(empty);
    return;
  }

  const table = document.createElement('table');
  table.className = 'places-table';

  // Kolomkoppen via template literal.
  const thead = document.createElement('thead');
  thead.innerHTML = `<tr>${COLUMNS.map((col) => `<th>${col.label}</th>`).join('')}</tr>`;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  places.forEach((place) => tbody.appendChild(buildRow(place)));
  table.appendChild(tbody);

  container.appendChild(table);
};

// --- Detail-modal --------------------------------------------------------

// Formatteert een ISO-datum naar een leesbare Nederlandse datum.
const formatDate = (iso) => {
  if (!iso) return FALLBACK;
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? FALLBACK
    : new Intl.DateTimeFormat('nl-BE', { dateStyle: 'long' }).format(date);
};

// Voegt een rij (label + waarde) toe aan de definitielijst. Lege of onbekende
// waarden worden overgeslagen. Met een href wordt de waarde een veilige link.
const addRow = (dl, label, text, href = null) => {
  if (!text || text === FALLBACK) return;
  const dt = document.createElement('dt');
  dt.textContent = label;
  const dd = document.createElement('dd');
  if (href) {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = text;
    link.target = '_blank';
    link.rel = 'noopener';
    dd.appendChild(link);
  } else {
    dd.textContent = text;
  }
  dl.append(dt, dd);
};

// Vult de modal met alle beschikbare velden van een place.
const fillDetail = (body, place) => {
  body.textContent = '';
  const raw = place.raw;

  const title = document.createElement('h2');
  title.id = 'modal-title';
  title.textContent = place.name;
  body.appendChild(title);

  // Categorieën als "chips".
  if (place.categories.length) {
    const chips = document.createElement('div');
    chips.className = 'chips';
    place.categories.forEach((category) => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = category;
      chips.appendChild(chip);
    });
    body.appendChild(chips);
  }

  const dl = document.createElement('dl');
  dl.className = 'detail';

  const fullAddress = [place.address, `${place.zip} ${place.municipality}`.trim()]
    .filter((part) => part && part !== FALLBACK)
    .join(', ');

  const phoneHref =
    place.phone !== FALLBACK ? `tel:${place.phone.replace(/\s+/g, '')}` : null;
  const emailHref = place.email !== FALLBACK ? `mailto:${place.email}` : null;
  const websiteHref = place.website !== FALLBACK ? toHref(place.website) : null;

  const facebook = pick(raw.facebook_link);
  const maps = pick(raw.google_maps);
  const streetView = pick(raw.google_street_view);
  const accessibility = pick(raw.pmr_nl, raw.pmr_fr);

  addRow(dl, 'Adres', fullAddress);
  addRow(dl, 'Telefoon', place.phone, phoneHref);
  addRow(dl, 'E-mail', place.email, emailHref);
  addRow(dl, 'Website', place.website, websiteHref);
  addRow(dl, 'Facebook', facebook !== FALLBACK ? 'Bekijk op Facebook' : FALLBACK, toHref(facebook));
  addRow(dl, 'Google Maps', maps !== FALLBACK ? 'Open in Google Maps' : FALLBACK, maps !== FALLBACK ? maps : null);
  addRow(dl, 'Street View', streetView !== FALLBACK ? 'Open Street View' : FALLBACK, streetView !== FALLBACK ? streetView : null);
  addRow(dl, 'Toegankelijkheid', accessibility);
  addRow(dl, 'Coördinaten', place.lat && place.lon ? `${place.lat}, ${place.lon}` : FALLBACK);
  addRow(dl, 'Gepubliceerd', formatDate(place.publishedAt));
  addRow(dl, 'Laatst bijgewerkt', formatDate(raw.last_updated_at));

  body.appendChild(dl);
};

// De modal wordt één keer aangemaakt en hergebruikt.
let dialog = null;

const buildDialog = () => {
  const el = document.createElement('dialog');
  el.className = 'modal';
  el.setAttribute('aria-labelledby', 'modal-title');
  el.innerHTML = `
    <button class="modal__close" type="button" aria-label="Sluiten">&times;</button>
    <div class="modal__body"></div>
  `;
  // Sluiten via de knop.
  el.querySelector('.modal__close').addEventListener('click', () => el.close());
  // Sluiten bij klik op de achtergrond (buiten de inhoud).
  el.addEventListener('click', (event) => {
    if (event.target === el) el.close();
  });
  document.body.appendChild(el);
  return el;
};

// Opent de detail-modal voor een place. Escape sluit automatisch (native dialog).
export const openModal = (place) => {
  if (!dialog) dialog = buildDialog();
  fillDetail(dialog.querySelector('.modal__body'), place);
  dialog.showModal();
};
