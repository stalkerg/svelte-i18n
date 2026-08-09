import { getContext, hasContext, setContext } from 'svelte';
import { createI18n, I18n } from './i18n.svelte.js';
import type { I18nOptions } from './types/index.js';

const I18N_CONTEXT = Symbol('precompile-intl-runtime.I18n');

type I18nProviderInput = I18nOptions | I18n | (() => I18nOptions | I18n);

export function provideI18n(input: I18nProviderInput): I18n {
  const options = typeof input === 'function' ? input() : input;
  const i18n = options instanceof I18n ? options : createI18n(options);
  setContext(I18N_CONTEXT, i18n);
  return i18n;
}

export function useI18n(): I18n {
  if (!hasContext(I18N_CONTEXT)) {
    throw new Error(
      '[precompile-intl-runtime] No I18n instance found. Call provideI18n() in an ancestor component.',
    );
  }
  return getContext<I18n>(I18N_CONTEXT);
}

export function hasI18n(): boolean {
  return hasContext(I18N_CONTEXT);
}
