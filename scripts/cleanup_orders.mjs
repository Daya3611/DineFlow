import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// To run this script, you need a service-account.json file in the root
// You can get it from Firebase Console -> Project Settings -> Service Accounts -> Generate new private key
// Then rename it to service-account.json

let app;
try {
  const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
  app = initializeApp({
    credential: cert(serviceAccount)
  });
} catch (error) {
  console.error("Error loading service-account.json. Please ensure it exists in the root directory.");
  process.exit(1);
}

const db = getFirestore(app);

async function cleanupOrders() {
  console.log("Starting order cleanup...");
  
  const ordersRef = db.collection('orders');
  const snapshot = await ordersRef.get();
  
  if (snapshot.empty) {
    console.log("No orders found.");
    return;
  }

  const tableGroups = {};

  snapshot.forEach(doc => {
    const data = doc.data();
    const key = `${data.restaurantId}_${data.tableNumber}`;
    if (!tableGroups[key]) {
      tableGroups[key] = [];
    }
    tableGroups[key].push({ id: doc.id, ...data });
  });

  const batch = db.batch();
  let count = 0;

  for (const key in tableGroups) {
    const orders = tableGroups[key];
    // Sort by createdAt descending
    orders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    // For each table, only the latest unpaid order should be active
    let activeFound = false;
    
    for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        let shouldBeActive = false;
        
        if (!activeFound && order.status !== 'paid') {
            shouldBeActive = true;
            activeFound = true;
        }

        const updates = {};
        if (order.isActive !== shouldBeActive) {
            updates.isActive = shouldBeActive;
        }
        if (shouldBeActive && !order.sessionId) {
            updates.sessionId = `sess_recovered_${Date.now()}`;
        }
        
        if (Object.keys(updates).length > 0) {
            batch.update(ordersRef.doc(order.id), updates);
            count++;
        }
    }
  }

  if (count > 0) {
    await batch.commit();
    console.log(`Successfully updated ${count} orders.`);
  } else {
    console.log("No orders needed updating.");
  }
}

cleanupOrders().catch(console.error);
