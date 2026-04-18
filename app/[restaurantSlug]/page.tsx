import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MapPin, UtensilsCrossed, CalendarDays, ExternalLink, Activity } from 'lucide-react';

export const revalidate = 0;
export const dynamic = "force-dynamic";

async function getRestaurant(slug: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dineflow.pro';
  const res = await fetch(`${baseUrl}/api/restaurant/${slug}`, { cache: 'no-store' });
  if (!res.ok) {
    if (res.status === 404 || res.status === 403) return null;
    throw new Error('Failed to fetch restaurant');
  }
  return res.json();
}

export default async function RestaurantDetailsPage(props: { params: Promise<{ restaurantSlug: string }> }) {
  const params = await props.params;
  let slug = params.restaurantSlug;

  if (slug.startsWith('%40')) slug = slug.substring(3);
  else if (slug.startsWith('@')) slug = slug.substring(1);
  else return notFound();

  const restaurant = await getRestaurant(slug);

  if (!restaurant) {
    return notFound();
  }

  const config = restaurant.landingPageConfig || {
    theme: {
      primaryColor: "#059669",
      backgroundColor: "#f8fafc",
      buttonStyle: "solid",
      cardStyle: "rounded",
    },
    layout: {
      showTakeaway: true,
      showBookTable: true,
      showTrackOrder: false,
    },
    cta: {
      takeawayText: "View Menu & Order",
      bookingText: "Book a Table",
      trackOrderText: "Track Order",
    },
  };

  const borderRadiusClass = config.theme.cardStyle === "rounded" ? "rounded-3xl" : "rounded-none";
  const buttonRadiusClass = config.theme.cardStyle === "rounded" ? "rounded-2xl" : "rounded-none";

  const getButtonStyles = () => {
    if (config.theme.buttonStyle === "gradient") {
      return { background: `linear-gradient(135deg, ${config.theme.primaryColor}dd, ${config.theme.primaryColor})`, color: 'white', border: 'none' };
    }
    if (config.theme.buttonStyle === "outline") {
      return { background: 'transparent', borderColor: config.theme.primaryColor, borderWidth: '2px', color: config.theme.primaryColor };
    }
    return { backgroundColor: config.theme.primaryColor, color: 'white', border: 'none' };
  };

  return (
    <div className="min-h-screen flex flex-col items-center" style={{ backgroundColor: config.theme.backgroundColor }}>
      {/* Hero Section */}
      <div className="w-full h-[35vh] sm:h-[45vh] relative" style={{ background: `linear-gradient(to bottom right, ${config.theme.primaryColor}E6, ${config.theme.primaryColor})` }}>
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Content wrapper */}
      <div className="w-full max-w-3xl px-4 sm:px-6 -mt-24 z-10 pb-20">
        <div className={`bg-white shadow-xl p-6 sm:p-10 text-center border-slate-100 border ${borderRadiusClass}`}>
          {/* Logo */}
          <div className="mx-auto w-32 h-32 rounded-full border-4 border-white shadow-lg flex items-center justify-center mb-6 overflow-hidden -mt-20 shrink-0" style={{ backgroundColor: config.theme.backgroundColor }}>
            {restaurant.logo ? (
              <img src={restaurant.logo} alt={restaurant.name} className="w-full h-full object-cover" />
            ) : (
              <UtensilsCrossed className="w-12 h-12 opacity-70" style={{ color: config.theme.primaryColor }} />
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-2 truncate">
            {restaurant.name}
          </h1>

          <div className="flex items-center justify-center text-slate-500 mb-8 gap-1.5 text-sm font-medium opacity-80">
            <MapPin className="w-4 h-4 shrink-0" />
            <span>{restaurant.address || 'Location unavailable'}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">

            {config.layout.showTakeaway && (
              <Link
                href={`/@${slug}/takeaway`}
                className={`flex flex-col items-center p-6 transition-all group shadow-sm hover:shadow-md ${buttonRadiusClass}`}
                style={getButtonStyles()}
              >
                <UtensilsCrossed className="w-8 h-8 mb-3 opacity-90 transition-colors" />
                <span className="font-bold text-lg">{config.cta.takeawayText}</span>
              </Link>
            )}

            {config.layout.showBookTable && (
              <Link
                href={`/@${slug}/booking`}
                className={`flex flex-col items-center p-6 transition-all group shadow-sm hover:shadow-md ${buttonRadiusClass}`}
                style={getButtonStyles()}
              >
                <CalendarDays className="w-8 h-8 mb-3 opacity-90 transition-colors" />
                <span className="font-bold text-lg">{config.cta.bookingText}</span>
              </Link>
            )}

            {config.layout.showTrackOrder && (
              <Link
                href={`/@${slug}/track`}
                className={`flex flex-col items-center p-6 transition-all group shadow-sm hover:shadow-md ${buttonRadiusClass}`}
                style={getButtonStyles()}
              >
                <Activity className="w-8 h-8 mb-3 opacity-90 transition-colors" />
                <span className="font-bold text-lg">{config.cta.trackOrderText}</span>
              </Link>
            )}

          </div>
        </div>

        {/* Footer info */}
        {restaurant.phoneNumber && (
          <p className="text-center text-slate-400 font-medium text-sm mt-10 opacity-70">
            Need help? Call us at {restaurant.phoneNumber}
          </p>
        )}
      </div>
    </div>
  );
}
