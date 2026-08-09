import { useI18n } from './context.js';
import type { I18n } from './i18n.svelte.js';
import type { Locale } from './types/index.js';

export interface DocumentLanguageOptions {
  /** Convert an application locale to the BCP 47 value written to `<html lang>`. */
  readonly map?: (locale: Locale) => string;
}

/**
 * Keep the browser document's `<html lang>` attribute in sync with an i18n
 * instance. Call this during component initialization. Svelte effects do not
 * run during server rendering, so SSR applications must still render their
 * initial `lang` value in the HTML template or server hook.
 */
export function syncDocumentLanguage(
  i18n: I18n = useI18n(),
  options: DocumentLanguageOptions = {},
): void {
  $effect(() => {
    document.documentElement.lang = options.map?.(i18n.locale) ?? i18n.locale;
  });
}
