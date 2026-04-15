import { notFound } from 'next/navigation';
import ClientMenu from './ClientMenu';
import { headers } from 'next/headers';

async function getRestaurantAndMenu(slug: string) {
  // ✅ Build absolute URL on server
  const headersList = headers();
  const host = (await headersList).get('host');

  const protocol =
    process.env.NODE_ENV === 'development' ? 'http' : 'https';

  const baseUrl = `${protocol}://${host}`;

  // ✅ Fetch restaurant
  const resReq = await fetch(`${baseUrl}/api/restaurant/${slug}`, {
    cache: 'no-store',
  });

  if (!resReq.ok) {
    if (resReq.status === 404 || resReq.status === 403) return null;
    throw new Error('Failed to fetch restaurant');
  }

  const restaurant = await resReq.json();

  // ✅ Fetch menu
  const menuReq = await fetch(`${baseUrl}/api/menu/${slug}`, {
    cache: 'no-store',
  });

  if (!menuReq.ok) return null;

  const menuItems = await menuReq.json();

  return { restaurant, menuItems };
}

export default async function MenuServerPage(props: {
  params: Promise<{ restaurantSlug: string }>;
  searchParams: Promise<{ table?: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  let slug = params.restaurantSlug;

  // ✅ Clean slug
  if (slug.startsWith('%40')) slug = slug.substring(3);
  else if (slug.startsWith('@')) slug = slug.substring(1);
  else return notFound();

  const data = await getRestaurantAndMenu(slug);
  if (!data) return notFound();

  const table = searchParams.table || null;

  return (
    <ClientMenu
      initialRestaurant={data.restaurant}
      initialMenus={data.menuItems}
      table={table}
    />
  );
}