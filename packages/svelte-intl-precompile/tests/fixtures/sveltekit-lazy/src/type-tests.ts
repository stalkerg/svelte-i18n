import { catalogs, loaders, type Locale, type MessageValuesFor } from '$locales';
import { createI18n, type MessageKey } from '@stalkerg/svelte-icu';

const locale: Locale = 'en';
const key: MessageKey = 'greeting';
const values: MessageValuesFor<'greeting'> = { name: 'TypeScript' };
const i18n = createI18n({ locale, fallbackLocale: 'en', messages: catalogs, loaders });

i18n(key, values);
i18n('language');
i18n('language', {});
i18n('items', { count: 2 });
void i18n.setLocale('ja');

// @ts-expect-error Unknown locale generated from no locale file.
const invalidLocale: Locale = 'fr';
// @ts-expect-error Unknown message key.
i18n('missing');
// @ts-expect-error Interpolated values are required.
i18n('greeting');
// @ts-expect-error The required interpolation name is missing.
i18n('greeting', {});
// @ts-expect-error Plural values must be numeric.
i18n('items', { count: 'two' });
// @ts-expect-error Static messages reject unknown values.
i18n('language', { unexpected: true });
// @ts-expect-error The redundant alpha.1 `.t` alias was removed.
i18n.t('greeting', { name: 'Alias' });
// @ts-expect-error Locale transitions are restricted to generated locales.
void i18n.setLocale('fr');

void invalidLocale;
