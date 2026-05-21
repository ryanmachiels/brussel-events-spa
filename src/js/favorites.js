// favorites.js — beheert favoriete locaties in LocalStorage.
// Favorieten worden bewaard als een map { [id]: { note } }; zo kan stap 10
// (een notitie per favoriet) er later moeiteloos bij zonder datamigratie.
import { loadFromStorage, saveToStorage } from './storage.js';

const FAVORITES_KEY = 'favorites';

const loadFavorites = () => loadFromStorage(FAVORITES_KEY) ?? {};
const persist = (favorites) => saveToStorage(FAVORITES_KEY, favorites);

// IDs van alle favorieten (als strings).
export const getFavoriteIds = () => Object.keys(loadFavorites());

// Is de gegeven locatie een favoriet?
export const isFavorite = (id) => `${id}` in loadFavorites();

// Voegt toe of verwijdert; geeft de nieuwe favoriet-status terug.
export const toggleFavorite = (id) => {
  const favorites = loadFavorites();
  const key = `${id}`;
  const nowFavorite = !(key in favorites);

  if (nowFavorite) {
    favorites[key] = { note: '' };
  } else {
    delete favorites[key];
  }

  persist(favorites);
  return nowFavorite;
};

// De persoonlijke notitie bij een favoriet.
export const getNote = (id) => loadFavorites()[`${id}`]?.note ?? '';

// Bewaart een notitie. Een locatie met een notitie wordt automatisch favoriet.
export const setNote = (id, note) => {
  const favorites = loadFavorites();
  const key = `${id}`;
  const existing = favorites[key] ?? { note: '' };
  favorites[key] = { ...existing, note };
  persist(favorites);
};
