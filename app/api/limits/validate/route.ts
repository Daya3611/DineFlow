import { NextResponse } from 'next/server';
import { getPlanLimits } from '@/lib/plans';
import { db } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const { restaurantId, feature } = await request.json();
    
    if (!restaurantId || !feature) {
      return NextResponse.json({ allowed: false, error: 'restaurantId and feature are required' }, { status: 400 });
    }

    const restaurantDoc = await getDoc(doc(db, 'restaurants', restaurantId));
    if (!restaurantDoc.exists()) {
      return NextResponse.json({ allowed: false, error: 'Restaurant not found' }, { status: 404 });
    }
    
    const plan = restaurantDoc.data().plan || 'basic';
    const planLimits = getPlanLimits(plan);

    if (feature === 'tables') {
      const q = query(collection(db, 'tables'), where('restaurantId', '==', restaurantId));
      const snap = await getDocs(q);
      
      if (snap.size >= planLimits.tableLimit) {
        return NextResponse.json({ 
          allowed: false, 
          error: `Table limit reached. You can only have up to ${planLimits.tableLimit} tables on the ${planLimits.name}. Upgrade to add more.` 
        }, { status: 403 });
      }
    } else if (feature === 'menus') {
      const q = query(collection(db, 'menus'), where('restaurantId', '==', restaurantId));
      const snap = await getDocs(q);
      
      if (snap.size >= planLimits.menuLimit) {
        return NextResponse.json({ 
          allowed: false, 
          error: `Menu limit reached. You can only have up to ${planLimits.menuLimit} items on the ${planLimits.name}. Upgrade to add more.` 
        }, { status: 403 });
      }
    } else if (feature === 'multiOutlet') {
       if (!planLimits.multiOutlet) {
         return NextResponse.json({ 
           allowed: false, 
           error: 'Multi-outlet is only available in the Premium plan.' 
         }, { status: 403 });
       }
    } else if (feature === 'analytics') {
       const requestedLevel = (await request.clone().json().catch(() => ({}))).requestedLevel || 'basic';
       
       if (requestedLevel === 'full' && planLimits.analytics !== 'full') {
          return NextResponse.json({ allowed: false, error: 'Full analytics requires Premium plan.' }, { status: 403 });
       }
       if (requestedLevel === 'advanced' && planLimits.analytics === 'basic') {
          return NextResponse.json({ allowed: false, error: 'Advanced analytics requires Pro or Premium plan.' }, { status: 403 });
       }
    } else {
      return NextResponse.json({ allowed: false, error: 'Unknown feature' }, { status: 400 });
    }

    return NextResponse.json({ allowed: true });
  } catch (error: any) {
    return NextResponse.json({ allowed: false, error: error.message }, { status: 500 });
  }
}
