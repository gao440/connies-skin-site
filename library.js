(() => {
  const form = document.querySelector('[data-library-filters]');
  const grid = document.querySelector('[data-product-grid]');
  if (!form || !grid) return;
  const cards = [...grid.querySelectorAll('[data-product]')];
  const status = document.querySelector('[data-result-count]');
  const empty = document.querySelector('[data-empty-results]');
  const fields = ['q', 'brand', 'category', 'ingredient', 'sort'];
  const normalize = value => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });
  const readURL = () => {
    const params = new URLSearchParams(location.search);
    for (const key of fields) {
      const field = form.elements.namedItem(key);
      const value = params.get(key) || '';
      field.value = field.tagName === 'SELECT' && ![...field.options].some(option => option.value === value) ? '' : value;
    }
  };
  const apply = (saveURL = true) => {
    const values = Object.fromEntries(fields.map(key => [key, form.elements.namedItem(key).value]));
    const words = normalize(values.q).split(/\s+/).filter(Boolean);
    let count = 0;
    const sorted = [...cards].sort((a, b) => {
      const first = values.sort === 'name' ? a.dataset.name : `${a.dataset.brand} ${a.dataset.name}`;
      const second = values.sort === 'name' ? b.dataset.name : `${b.dataset.brand} ${b.dataset.name}`;
      return collator.compare(first, second);
    });
    for (const card of sorted) {
      const match = words.every(word => normalize(card.dataset.search).includes(word)) &&
        (!values.brand || card.dataset.brand === values.brand) &&
        (!values.category || card.dataset.category === values.category) &&
        (!values.ingredient || card.dataset.ingredients.split('|').includes(values.ingredient));
      card.hidden = !match;
      if (match) count++;
      grid.append(card);
    }
    status.textContent = `${count} of ${cards.length} products`;
    empty.hidden = count !== 0;
    if (saveURL) {
      const url = new URL(location.href);
      for (const key of fields) {
        if (values[key]) url.searchParams.set(key, values[key]);
        else url.searchParams.delete(key);
      }
      history.replaceState(null, '', url);
    }
  };
  form.hidden = false;
  readURL();
  apply(false);
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', () => apply());
  form.addEventListener('change', () => apply());
  form.addEventListener('reset', () => {
    // Reset the live values before filtering; the browser's default reset follows the event.
    for (const key of fields) form.elements.namedItem(key).value = '';
    apply();
  });
  window.addEventListener('popstate', () => { readURL(); apply(false); });
})();
