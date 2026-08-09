import {
  __plural,
  type Catalogs,
  type MessageContext,
} from '../../packages/precompile-intl-runtime/src/index.js';

export const currentSsrMessages: Catalogs = Object.freeze({
  en: Object.freeze({
    greeting: (_context: MessageContext, values) => `Hello ${values.name}`,
    items: (context: MessageContext, values) =>
      __plural(context, Number(values.count), { o: 'one item', h: 'many items' }),
  }),
});
