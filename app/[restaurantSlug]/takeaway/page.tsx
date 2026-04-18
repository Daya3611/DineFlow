import { headers } from "next/headers";
import { notFound } from 'next/navigation';
import ClientTakeaway from './ClientTakeaway';

async function getRestaurantAndMenu(slug: string) {
  const headersList = await headers();
  const host = headersList.get("host");

  const protocol =
    process.env.NODE_ENV === "development" ? "http" : "https";

  const baseUrl = `${protocol}://${host}`;

  // ✅ Restaurant fetch
  const resReq = await fetch(`${baseUrl}/api/restaurant/${slug}`, {
    cache: "no-store",
  });

  if (!resReq.ok) {
    if (resReq.status === 404 || resReq.status === 403) return null;
    throw new Error("Failed to fetch restaurant");
  }

  const restaurant = await resReq.json();

  // ✅ Menu fetch (FIXED)
  const menuReq = await fetch(`${baseUrl}/api/menu/${slug}`, {
    cache: "no-store",
  });

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