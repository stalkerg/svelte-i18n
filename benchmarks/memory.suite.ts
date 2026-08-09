import { createI18n, type Catalogs } from '../packages/precompile-intl-runtime/src/index.js';

const messages: Catalogs = {
  en: Object.freeze(
    Object.fromEntries(
      Array.from({ length: 20 }, (_, index) => [`message.${index}`, `Message ${index}`]),
    ),
  ),
};

export function createInstances(count: number, translate: boolean): unknown[] {
  return Array.from({ length: count }, () => {
    const instance = createI18n({
      locale: 'en',
      messages,
      warnOnMissingMessages: false,
    });
    if (translate) {
      for (let index = 0; index < 20; index += 1) instance.t(`message.${index}`);
    }
    return instance;
  });
}
