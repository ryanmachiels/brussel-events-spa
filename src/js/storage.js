// storage.js — generieke LocalStorage helpers met JSON-serialisatie en een
// optionele TTL (time-to-live). Alle modules (cache, favorieten, voorkeuren)
// gebruiken deze helpers zodat de opslaglogica op één plek staat.

// Alle keys krijgen een prefix zodat we niet botsen met andere apps op
// dezelfde origin.
const NAMESPACE = 'brussel-events';

const buildKey = (key) => `${NAMESPACE}:${key}`;

// Sla een waarde op als JSON. Met een TTL (in ms) bewaren we een wrapper
// { data, expiresAt } zodat we bij het lezen kunnen controleren of de
// cache nog geldig is. Zonder TTL blijft de waarde permanent bewaard.
export const saveToStorage = (key, value, ttlMs = null) => {
  const payload = {
    data: value,
    expiresAt: ttlMs ? Date.now() + ttlMs : null,
  };
  try {
    localStorage.setItem(buildKey(key), JSON.stringify(payload));
    return true;
  } catch (error) {
    // bv. opslagquota overschreden of LocalStorage geblokkeerd (private mode)
    console.warn(`Kon "${key}" niet opslaan in LocalStorage:`, error);
    return false;
  }
};

// Lees een waarde terug. Geeft null terug als de key niet bestaat of als de
// TTL verlopen is (de verlopen entry wordt dan meteen opgeruimd).
export const loadFromStorage = (key) => {
  const raw = localStorage.getItem(buildKey(key));
  if (raw === null) return null;

  try {
    const payload = JSON.parse(raw);
    const isExpired = payload.expiresAt !== null && Date.now() > payload.expiresAt;
    if (isExpired) {
      localStorage.removeItem(buildKey(key));
      return null;
    }
    return payload.data;
  } catch (error) {
    console.warn(`Kon "${key}" niet lezen uit LocalStorage:`, error);
    return null;
  }
};

export const removeFromStorage = (key) => {
  localStorage.removeItem(buildKey(key));
};
