import type { Locale } from '$locales';
import type { LayoutServerLoad } from './$types';

export const load = (({ request, url }) => {
  const requested =
    url.searchParams.get('locale') ?? request.headers.get('accept-language')?.split(',')[0];
  const locale: Locale = requested?.toLowerCase().startsWith('ja') ? 'ja' : 'en';
  return { locale };
}) satisfies LayoutServerLoad;
