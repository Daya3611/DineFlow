import { NextResponse } from 'next/server';
import { db } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    const timeRange = searchParams.get('timeRange') || '7d';

    if (!restaurantId) return NextResponse.json({ error: 'restaurantId required' }, { status: 400 });

    const [menusSnap, tablesSnap, ordersSnap] = await Promise.all([
      getDocs(query(collection(db, 'menus'), where('restaurantId', '==', restaurantId))),
      getDocs(query(collection(db, 'tables'), where('restaurantId', '==', restaurantId))),
      getDocs(query(collection(db, 'orders'), where('restaurantId', '==', restaurantId)))
    ]);

    const menuCount = menusSnap.size;
    const tables = tablesSnap.docs.map(doc => doc.data());
    const orders = ordersSnap.docs.map(doc => doc.data());

    // Stats calculations
    const now = Date.now();
    const days = timeRange === "6m" ? 180 : timeRange === "30d" ? 30 : 7;
    const cutoff = now - days * 86400000;
    const prevCutoff = cutoff - days * 86400000;

    const current = orders.filter((o) => o.createdAt >= cutoff);
    const previous = orders.filter((o) => o.createdAt >= prevCutoff && o.createdAt < cutoff);

    const totalRevenue = current.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const totalOrders = current.length;
    const prevRevenue = previous.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const prevOrders = previous.length;

    const grouped: Record<string, { rev: number; cnt: number }> = {};
    const itemCounts: Record<string, { name: string; count: number; rev: number }> = {};

    current.forEach((o) => {
      const date = new Date(o.createdAt);
      const key =
        timeRange === "6m"
          ? date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
          : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (!grouped[key]) grouped[key] = { rev: 0, cnt: 0 };
      grouped[key].rev += o.totalAmount || 0;
      grouped[key].cnt += 1;
      (o.items || []).forEach((item: any) => {
        if (!itemCounts[item.id])
          itemCounts[item.id] = { name: item.name, count: 0, rev: 0 };
        itemCounts[item.id].count += item.quantity;
        itemCounts[item.id].rev += item.price * item.quantity;
      });
    });

    const generated: { date: string; revenue: number; orders: number }[] = [];
    if (timeRange === "6m") {
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        generated.push({ date: key, revenue: grouped[key]?.rev || 0, orders: grouped[key]?.cnt || 0 });
      }
    } else {
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        generated.push({ date: key, revenue: grouped[key]?.rev || 0, orders: grouped[key]?.cnt || 0 });
      }
    }

    const freeTables = tables.filter((t: any) => !t.status || t.status === "free").length;
    const occTables = tables.filter((t: any) => t.status === "occupied").length;
    const resTables = tables.filter((t: any) => t.status === "reserved").length;

    return NextResponse.json({
      chartData: generated,
      totalRevenue,
      totalOrders,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      popularItems: Object.values(itemCounts).sort((a, b) => b.count - a.count).slice(0, 5),
      prevRevenue,
      prevOrders,
      menuCount,
      tablesSummary: {
        total: tables.length,
        free: freeTables,
        occupied: occTables,
        reserved: resTables
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
