import { redirect } from 'next/navigation';
import { db } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export default async function RedirectOldBookPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const legacySlug = params.slug;

  let finalSlug = legacySlug;
  
  // Is this an ID or a custom slug? If it's a customSlug we just redirect.
  // If it's an ID, we might want to resolve if they have a custom slug now.
  const rQ = query(collection(db, 'restaurants'), where('customSlug', '==', legacySlug));
  const rSnap = await getDocs(rQ);

  if (rSnap.empty) {
    const docSnap = await getDoc(doc(db, 'restaurants', legacySlug));
    if (docSnap.exists() && docSnap.data().customSlug) {
      finalSlug = docSnap.data().customSlug;
    }
  }

  redirect(`/@${finalSlug}/booking`);
}
