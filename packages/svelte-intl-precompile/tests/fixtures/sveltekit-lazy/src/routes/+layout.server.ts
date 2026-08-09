import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ request, url }) => {
  const requested =
    url.searchParams.get('locale') ?? request.headers.get('accept-language')?.split(',')[0];
  return { locale: requested?.toLowerCase().startsWith('ja') ? 'ja' : 'en' };
};
