export { createI18n, I18n } from './i18n.svelte.js';
export { hasI18n, provideI18n, useI18n } from './context.js';
export { syncDocumentLanguage } from './document.svelte.js';
export type { DocumentLanguageOptions } from './document.svelte.js';
export {
  defaultFormats,
  getDateFormatter,
  getNumberFormatter,
  getPluralRules,
  getTimeFormatter,
} from './core/formats.js';
export { getPossibleLocales } from './core/locales.js';
export { getMessageFromCatalog, lookup } from './core/lookup.js';
export * from './helpers.js';
export * from './locale-getters.js';
export type * from './types/index.js';
