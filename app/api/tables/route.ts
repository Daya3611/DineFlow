import { NextResponse } from 'next/server';
import { db } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    if (!restaurantId) return NextResponse.json({ error: 'restaurantId required' }, { status: 400 });

    const q = query(collection(db, 'tables'), where('restaurantId', '==', restaurantId));
    const tablesSnap = await getDocs(q);
    
    // Return minimal required data
    const tables = tablesSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        tableNumber: data.tableNumber,
        status: data.status || 'free',
        capacity: data.capacity,
      };
    });

    return NextResponse.json(tables);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
