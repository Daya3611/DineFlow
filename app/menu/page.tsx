import { redirect } from "next/navigation";
import { db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";

export default async function RedirectOldMenuPage({ searchParams }: { searchParams: Promise<{ restaurantId?: string, table?: string }> }) {
  const params = await searchParams;
  const restaurantId = params.restaurantId;
  const table = params.table;

  if (!restaurantId) {
    // If no restaurantId, we can't redirect somewhere meaningful.
    return <div>Invalid URL. Missing Restaurant ID.</div>;
  }

  // Find the restaurant slug
  const docRef = doc(db, 'restaurants', restaurantId);
  const docSnap = await getDoc(docRef);

  let slug = restaurantId; // default fallback if no custom slug exists
  if (docSnap.exists()) {
    const data = docSnap.data();
    if (data.customSlug) {
      slug = data.customSlug;
    }
  }

  const tableQuery = table ? `?table=${table}` : '';
  
  redirect(`/@${slug}/menu${tableQuery}`);
}
