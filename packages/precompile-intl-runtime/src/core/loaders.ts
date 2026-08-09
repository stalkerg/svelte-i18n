import type { Catalog, LoadedCatalog, MessagesLoader } from '../types/index.js';

const sharedLoaderCache = new WeakMap<MessagesLoader, Promise<Catalog>>();

function unwrapCatalog(module: LoadedCatalog): Catalog {
  const defaultExport = module.default;
  return typeof defaultExport === 'object' && defaultExport !== null
    ? defaultExport
    : (module as Catalog);
}

/** Deduplicate immutable locale imports without retaining request-scoped state. */
export function loadCatalog(loader: MessagesLoader): Promise<Catalog> {
  const active = sharedLoaderCache.get(loader);
  if (active) return active;

  const promise = loader()
    .then(unwrapCatalog)
    .catch((error: unknown) => {
      sharedLoaderCache.delete(loader);
      throw error;
    });
  sharedLoaderCache.set(loader, promise);
  return promise;
}
