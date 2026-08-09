import { error } from '@sveltejs/kit';
import { catalogs, loaders } from '$locales';
import type { LayoutLoad } from './$types';

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export const load: LayoutLoad = async ({ data }) => {
  const eagerCatalog = catalogs[data.locale];
  const loader = loaders[data.locale];
  if (!eagerCatalog && !loader) error(404, `Unknown locale: ${data.locale}`);

  // Make concurrent SSR complete out of order so request isolation is exercised.
  await delay(data.locale === 'en' ? 40 : 5);
  return {
    locale: data.locale,
    catalog: eagerCatalog ?? (await loader()),
  };
};
