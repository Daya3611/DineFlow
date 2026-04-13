import { notFound } from 'next/navigation';
import ClientTakeaway from './ClientTakeaway';


async function getRestaurantAndMenu(slug: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const resReq = await fetch(`${baseUrl}/api/restaurant/${slug}`, { cache: 'no-store' });
  if (!resReq.ok) {
    if (resReq.status === 404 || resReq.status === 403) return null;
    throw new Error('Failed to fetch restaurant');
  }
  const restaurant = await resReq.json();

  const menuReq = await fetch(`${baseUrl}/api/menu/${slug}`, { cache: 'no-store' });
  if (!menuReq.ok) return null;
  const menuItems = await menuReq.json();

  return { restaurant, menuItems };
}

export default async function TakeawayServerPage(props: { params: Promise<{ restaurantSlug: string }> }) {
  const params = await props.params;
  let slug = params.restaurantSlug;

  if (slug.startsWith('%40')) slug = slug.substring(3);
  else if (slug.startsWith('@')) slug = slug.substring(1);
  else return notFound();

  const data = await getRestaurantAndMenu(slug);
  if (!data) return notFound();

  return <ClientTakeaway initialRestaurant={data.restaurant} initialMenus={data.menuItems} />;
}
