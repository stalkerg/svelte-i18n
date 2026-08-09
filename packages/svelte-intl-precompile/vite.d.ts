import type { Plugin } from 'vite';

export type LocaleTransformer = (
  content: string,
  options: { filename: string; basename: string; extname: string },
) => string | PromiseLike<string>;

export interface SvelteI18nPluginOptions {
  locales: string;
  prefix?: string;
  mode?: 'eager' | 'lazy';
  /** Generated declaration path relative to Vite root. Set to false to disable. */
  types?: string | false;
  exclude?: RegExp | ((filename: string) => boolean);
  transformers?: Record<string, LocaleTransformer>;
}

export function transformCode(code: string, options?: Record<string, unknown>): string;

export default function svelteI18n(options: SvelteI18nPluginOptions): Plugin;

/** @deprecated Use the object form instead. */
export default function svelteI18n(
  localesRoot: string,
  prefixOrOptions?: string | Omit<SvelteI18nPluginOptions, 'locales'>,
): Plugin;
