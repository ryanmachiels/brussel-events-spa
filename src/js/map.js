// map.js — Leaflet-kaart met OpenStreetMap-tegels en markers per locatie.
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Vite-fix: Leaflet verwijst standaard naar marker-afbeeldingen via relatieve
// paden die een bundler niet terugvindt. We importeren de afbeeldingen zodat
// Vite er geldige URL's van maakt en koppelen ze aan het standaard-icoon.
// Bron: https://github.com/Leaflet/Leaflet/issues/4968
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const BRUSSELS_CENTER = [50.8466, 4.3528];

let map = null;
let markerLayer = null;

// Maakt de kaart één keer aan in de gegeven container.
export const initMap = (container) => {
  if (map) return map;

  map = L.map(container).setView(BRUSSELS_CENTER, 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap-bijdragers',
    maxZoom: 19,
  }).addTo(map);
  markerLayer = L.layerGroup().addTo(map);

  return map;
};

// Tekent markers voor alle places met geldige coördinaten. onSelect wordt
// aangeroepen (callback) wanneer de "Details"-knop in een popup wordt geklikt.
export const renderMarkers = (places, onSelect) => {
  if (!map || !markerLayer) return 0;

  // Kaart kan verborgen zijn geweest (andere view) → grootte herberekenen,
  // anders renderen de tegels grijs.
  map.invalidateSize();
  markerLayer.clearLayers();

  const located = places.filter(
    (place) => place.lat !== null && place.lon !== null,
  );

  located.forEach((place) => {
    const marker = L.marker([place.lat, place.lon]);

    // Popup-inhoud via createElement zodat de knop een eigen click-handler heeft.
    const popup = document.createElement('div');
    popup.className = 'map-popup';

    const title = document.createElement('strong');
    title.textContent = place.name;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'map-popup__button';
    button.textContent = 'Details';
    button.addEventListener('click', () => onSelect(place));

    popup.append(title, document.createElement('br'), button);
    marker.bindPopup(popup);
    markerLayer.addLayer(marker);
  });

  // Pas de zoom/positie aan zodat alle markers in beeld komen.
  if (located.length) {
    const bounds = located.map((place) => [place.lat, place.lon]);
    map.fitBounds(bounds, { padding: [30, 30] });
  }

  return located.length;
};
