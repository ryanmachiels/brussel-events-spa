// icons.js — gedeelde inline-SVG-iconen (currentColor, dus ze volgen het thema).
// Strings zijn statische markup (geen gebruikersdata) en dus veilig via innerHTML.

const svg = (paths, { fill = 'none', extra = '' } = {}) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="${fill}" stroke="${fill === 'none' ? 'currentColor' : 'none'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${paths}</svg>`;

const HEART_PATH =
  '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>';

export const iconHeartOutline = svg(HEART_PATH);
export const iconHeartFilled = svg(HEART_PATH, { fill: 'currentColor' });

export const iconMoon = svg(
  '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
);
export const iconSun = svg(
  '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>',
);

export const iconGrid = svg(
  '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
);
export const iconList = svg(
  '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
);

export const iconArrowDown = svg('<path d="M12 5v14M19 12l-7 7-7-7"/>');
export const iconArrowUp = svg('<path d="M12 19V5M5 12l7-7 7 7"/>');
