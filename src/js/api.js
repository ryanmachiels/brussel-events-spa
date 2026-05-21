// api.js — ophalen van data uit de Brussel Open Data API met caching in
// LocalStorage (TTL van 1 uur), zodat herbezoek snel is en we de API ontzien.
//
// Gekozen dataset (geverifieerd via de catalogus-API van opendata.brussels.be):
//   "Lieux culturels, touristiques et événementiels recensés par Visit.Brussels"
//   -> drietalig (NL/FR/EN), met categorie, gemeente en geo-coördinaten.
// Docs: OpenDataSoft Explore API v2.1
//   https://help.opendatasoft.com/apis/ods-explore-v2/

import { saveToStorage, loadFromStorage } from './storage.js';

const DATASET_ID =
  'lieux_culturels_touristiques_evenementiels_visitbrussels_vbx';
const BASE_URL = 'https://opendata.brussels.be/api/explore/v2.1';
const RECORD_LIMIT = 100; // API-maximum per call; ruim boven de vereiste 20
const FETCH_TIMEOUT_MS = 10000;

const CACHE_KEY = 'places';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 uur

// Bouwt de records-URL voor de gekozen dataset.
const buildUrl = () =>
  `${BASE_URL}/catalog/datasets/${DATASET_ID}/records?limit=${RECORD_LIMIT}`;

// Promise-gebaseerde timeout: race de fetch tegen een timer zodat een trage
// API de applicatie niet eindeloos laat hangen.
const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('Time-out bij het ophalen van data')),
        ms,
      ),
    ),
  ]);

// Haalt de locaties op. Eerst kijken we in de cache; alleen bij een lege of
// verlopen cache doen we een echte network fetch. Met forceRefresh = true
// negeren we de cache (bv. voor een handmatige "vernieuwen"-knop).
export const fetchPlaces = async ({ forceRefresh = false } = {}) => {
  if (!forceRefresh) {
    const cached = loadFromStorage(CACHE_KEY);
    if (cached) {
      return { items: cached, fromCache: true };
    }
  }

  const response = await withTimeout(fetch(buildUrl()), FETCH_TIMEOUT_MS);
  if (!response.ok) {
    throw new Error(`API-fout: ${response.status} ${response.statusText}`);
  }

  // JSON parsen en de records uit de response halen.
  const json = await response.json();
  const items = json.results;

  saveToStorage(CACHE_KEY, items, CACHE_TTL_MS);
  return { items, fromCache: false };
};
