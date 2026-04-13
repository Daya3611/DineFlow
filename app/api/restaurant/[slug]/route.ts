import { NextResponse } from 'next/server';
import { db } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function GET(request: Request, props: { params: Promise<{ slug: string }> }) {
  try {
    const params = await props.params;
    let slug = params.slug;
    
    // Clean up '@' or encoded '%40' prefix if the request included it
    if (slug.startsWith('%40')) slug = slug.substring(3);
    else if (slug.startsWith('@')) slug = slug.substring(1);

    if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

    const q = query(collection(db, 'restaurants'), where('customSlug', '==', slug));
    const snap = await getDocs(q);
    
    let docObj;
    if (snap.empty) {
      // Check if it's being accessed via raw restaurant ID instead of custom slug
      const { getDoc, doc } = await import('firebase/firestore');
      const fallbackSnap = await getDoc(doc(db, 'restaurants', slug));
      if (!fallbackSnap.exists()) {
        return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
      }
      docObj = fallbackSnap;
    } else {
      docObj = snap.docs[0];
    }
    
    const data = docObj.data();


    return NextResponse.json({
      id: docObj.id,
      name: data.name,
      address: data.address,
      phoneNumber: data.phoneNumber,
      email: data.email,
      logo: data.logo,
      plan: data.plan,
      subscriptionStatus: data.subscriptionStatus,
      upiId: data.upiId
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
