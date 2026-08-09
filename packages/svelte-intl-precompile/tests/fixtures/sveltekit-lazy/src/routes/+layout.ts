import { error } from '@sveltejs/kit';
import { catalogs, loaders } from '$locales';
import type { LayoutLoad } from './$types';

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export const load = (async ({ data }) => {
  const eagerCatalog = catalogs[data.locale];
  const loader = loaders[data.locale];
  if (!eagerCatalog && !loader) error(404, `Unknown locale: ${data.locale}`);

  // Make concurrent SSR complete out of order so request isolation is exercised.
  await delay(data.locale === 'en' ? 40 : 5);
  let catalog = eagerCatalog;
  if (!catalog) {
    if (!loader) error(404, `Unknown locale: ${data.locale}`);
    catalog = await loader();
  }
  return {
    locale: data.locale,
    catalog,
  };
}) satisfies LayoutLoad;
