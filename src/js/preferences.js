// preferences.js — persistente gebruikersvoorkeuren: thema (light/dark),
// taal (NL/FR) en de laatste filter-state. Alles via LocalStorage.
import { loadFromStorage, saveToStorage } from './storage.js';

const THEME_KEY = 'theme';
const LANG_KEY = 'lang';
const FILTERS_KEY = 'filter-state';

// --- Thema ---------------------------------------------------------------
export const getTheme = () => loadFromStorage(THEME_KEY) ?? 'light';

// Past het thema toe via een data-attribuut waarop de CSS reageert.
export const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
};

export const setTheme = (theme) => {
  saveToStorage(THEME_KEY, theme);
  applyTheme(theme);
};

// --- Taal ----------------------------------------------------------------
export const getLang = () => loadFromStorage(LANG_KEY) ?? 'nl';
export const setLang = (lang) => saveToStorage(LANG_KEY, lang);

// --- Filter-state --------------------------------------------------------
export const getFilterState = () => loadFromStorage(FILTERS_KEY) ?? null;
export const saveFilterState = (filterState) =>
  saveToStorage(FILTERS_KEY, filterState);
