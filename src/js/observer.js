// observer.js — infinite scroll met de IntersectionObserver API.
// In plaats van alle (gefilterde) rijen in één keer te renderen, tonen we ze
// in batches: telkens de "sentinel" onderaan de lijst in beeld komt, laden we
// de volgende batch. Dat houdt de DOM licht bij grote lijsten.

const DEFAULT_PAGE_SIZE = 20;

// items       : volledige (gefilterde + gesorteerde) lijst
// sentinel    : element onderaan dat de volgende batch triggert
// appendBatch : callback die een slice items aan de DOM toevoegt
// onProgress  : callback (aantalGetoond, totaal) na elke batch
export const createInfiniteScroll = ({
  items,
  sentinel,
  appendBatch,
  pageSize = DEFAULT_PAGE_SIZE,
  onProgress,
}) => {
  let rendered = 0;

  const loadMore = () => {
    const next = items.slice(rendered, rendered + pageSize);
    appendBatch(next);
    rendered += next.length;

    if (onProgress) onProgress(rendered, items.length);

    if (rendered >= items.length) {
      observer.disconnect();
      return;
    }
    // Re-observe forceert een nieuwe intersection-check: zo blijven we laden
    // tot het scherm gevuld is (sentinel niet meer zichtbaar) of alles op is.
    observer.unobserve(sentinel);
    observer.observe(sentinel);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMore();
    },
    { rootMargin: '300px' },
  );

  loadMore(); // eerste batch meteen tonen
  observer.observe(sentinel);

  return { destroy: () => observer.disconnect() };
};
