import { headers } from "next/headers";

async function getRestaurantAndMenu(slug: string) {
  const headersList = headers();
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