import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { transformSync } from '@babel/core';
import buildICUPlugin from '@stalkerg/babel-plugin-precompile-intl';

const PACKAGE_NAME = '@stalkerg/svelte-i18n';
const intlPrecompiler = buildICUPlugin(PACKAGE_NAME);

export function transformCode(code, options = {}) {
  const result = transformSync(code, {
    ...options,
    plugins: [...(options.plugins ?? []), intlPrecompiler],
  });
  if (!result?.code) throw new Error('[svelte-i18n] Babel produced no locale output.');
  return result.code;
}

const transformScript = (content) => content;

const transformJSON = async (content) => {
  const { default: JSON5 } = await import('json5');
  return `export default ${JSON.stringify(JSON5.parse(content))}`;
};

const transformYaml = async (content, { filename }) => {
  const { load } = await import('js-yaml');
  return `export default ${JSON.stringify(load(content, { filename }))}`;
};

const standardTransformers = {
  '.js': transformScript,
  '.ts': transformScript,
  '.mjs': transformScript,
  '.json': transformJSON,
  '.json5': transformJSON,
  '.yaml': transformYaml,
  '.yml': transformYaml,
};

function normalizeOptions(localesOrOptions, prefixOrOptions) {
  if (typeof localesOrOptions === 'string') {
    const legacyOptions =
      typeof prefixOrOptions === 'string' ? { prefix: prefixOrOptions } : (prefixOrOptions ?? {});
    return { ...legacyOptions, locales: localesOrOptions };
  }
  if (!localesOrOptions?.locales) {
    throw new Error('[svelte-i18n] The Vite plugin requires a "locales" directory.');
  }
  return localesOrOptions;
}

function isWithin(root, filename) {
  const relative = path.relative(root, filename);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

/**
 * Precompile locale files and expose them through a virtual module.
 *
 * The string signature is retained temporarily for migration. New code should
 * use `svelteI18n({ locales: 'locales', mode: 'eager' })`.
 */
export default function svelteI18n(localesOrOptions, prefixOrOptions) {
  const options = normalizeOptions(localesOrOptions, prefixOrOptions);
  const {
    locales: localesRoot,
    prefix = '$locales',
    mode = 'eager',
    transformers: customTransformers,
    exclude,
  } = options;
  if (mode !== 'eager' && mode !== 'lazy') {
    throw new Error('[svelte-i18n] "mode" must be either "eager" or "lazy".');
  }

  const resolvedRoot = path.resolve(localesRoot);
  const virtualPrefix = `\0${prefix}`;
  const transformers = { ...standardTransformers, ...customTransformers };
  const excludeFile =
    typeof exclude === 'function'
      ? exclude
      : exclude instanceof RegExp
        ? (filename) => exclude.test(filename)
        : () => false;

  const toVirtualId = (publicId) => `\0${publicId}`;
  const toPublicId = (virtualId) => virtualId.slice(1);

  async function availableLocales() {
    const files = await fs.readdir(resolvedRoot);
    const found = new Set();
    for (const file of files) {
      if (excludeFile(file)) continue;
      const extension = path.extname(file);
      if (transformers[extension]) found.add(path.basename(file, extension));
    }
    return [...found].sort((left, right) => {
      const specificity = left.split('-').length - right.split('-').length;
      return specificity || left.localeCompare(right, 'en');
    });
  }

  async function loadPrefixModule() {
    const locales = await availableLocales();
    const imports = [];
    const catalogs = [];
    const loaders = [];

    for (const [index, locale] of locales.entries()) {
      const publicId = `${prefix}/${locale}`;
      if (mode === 'eager') {
        imports.push(`import __locale${index} from ${JSON.stringify(publicId)};`);
        catalogs.push(`${JSON.stringify(locale)}: __locale${index}`);
      } else {
        loaders.push(
          `${JSON.stringify(locale)}: () => import(${JSON.stringify(publicId)}).then(module => module.default)`,
        );
      }
    }

    return [
      ...imports,
      `export const availableLocales = Object.freeze(${JSON.stringify(locales)});`,
      `export const catalogs = Object.freeze({${catalogs.join(',')}});`,
      `export const loaders = Object.freeze({${loaders.join(',')}});`,
    ].join('\n');
  }

  async function transformLocale(
    content,
    {
      filename,
      extension = path.extname(filename),
      basename = path.basename(filename, extension),
      transform = transformers[extension] ?? transformScript,
    },
  ) {
    const code = await transform(content, { filename, basename, extname: extension });
    return transformCode(code, { filename });
  }

  async function findLocale(locale) {
    if (!/^[\p{L}\p{N}_-]+$/u.test(locale)) {
      throw new Error(`[svelte-i18n] Invalid locale name: ${JSON.stringify(locale)}.`);
    }
    const filebase = path.resolve(resolvedRoot, locale);
    const { default: stripBom } = await import('strip-bom');

    for (const [extension, transform] of Object.entries(transformers)) {
      const filename = filebase + extension;
      try {
        const content = await fs.readFile(filename, { encoding: 'utf8' });
        return transformLocale(stripBom(content), {
          filename,
          basename: locale,
          extension,
          transform,
        });
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
    }
    throw new Error(`[svelte-i18n] No locale file found for ${JSON.stringify(locale)}.`);
  }

  return {
    name: 'svelte-i18n',
    enforce: 'pre',

    configureServer(server) {
      const { moduleGraph, watcher, ws } = server;
      watcher.on('change', (filename) => {
        if (!isWithin(resolvedRoot, path.resolve(filename))) return;
        const locale = path.basename(filename, path.extname(filename));
        const localeModule = moduleGraph.getModuleById(`${virtualPrefix}/${locale}`);
        if (localeModule) moduleGraph.invalidateModule(localeModule);
        const prefixModule = moduleGraph.getModuleById(virtualPrefix);
        if (prefixModule) moduleGraph.invalidateModule(prefixModule);
        ws.send({ type: 'full-reload', path: '*' });
      });
    },

    resolveId(id) {
      if (id === prefix) return virtualPrefix;
      if (!id.startsWith(`${prefix}/`)) return null;
      const extension = path.extname(id);
      const normalized = extension ? id.slice(0, -extension.length) : id;
      return toVirtualId(normalized);
    },

    load(id) {
      if (id === virtualPrefix) return loadPrefixModule();
      if (!id.startsWith(`${virtualPrefix}/`)) return null;
      const publicId = toPublicId(id);
      return findLocale(publicId.slice(`${prefix}/`.length));
    },

    transform(content, id) {
      const absoluteId = path.resolve(id);
      if (!isWithin(resolvedRoot, absoluteId) || excludeFile(path.basename(id))) return null;
      const extension = path.extname(id);
      if (!transformers[extension]) return null;
      return transformLocale(content, { filename: id, extension });
    },
  };
}
