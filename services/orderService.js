// services/orderService.js
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { decreaseStock, validateStockForOrder } from './fruitService';

const ORDERS_COLLECTION = 'orders';

// ─── Fetch orders for a user ────────────────────────────────────────────────
export const fetchUserOrders = async (uid) => {
  try {
    const q = query(
      collection(db, ORDERS_COLLECTION),
      where('uid', '==', uid)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return [];
  }
};

// ─── Fetch all orders (admin view) ──────────────────────────────────────────
export const fetchAllOrders = async () => {
  try {
    const snap = await getDocs(collection(db, ORDERS_COLLECTION));
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching all orders:', error);
    return [];
  }
};

// ─── Create order with validation ────────────────────────────────────────────
export const createOrder = async (orderData) => {
  try {
    // Validate stock before creating order
    const validation = await validateStockForOrder(orderData.items);
    if (!validation.valid) {
      throw new Error(validation.message);
    }
    
    // Create order
    const docRef = await addDoc(collection(db, ORDERS_COLLECTION), {
      ...orderData,
      status: 'pending',
      createdAt: new Date(),
    });
    
    // Decrease stock for each item
    for (const item of orderData.items) {
      await decreaseStock(item.fruitId, item.quantity);
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

// ─── Update order status (admin) ────────────────────────────────────────────
export const updateOrderStatus = async (orderId, newStatus) => {
  try {
    const docRef = doc(db, ORDERS_COLLECTION, orderId);
    await updateDoc(docRef, { status: newStatus });
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
};

// ─── Real-time listener for user orders ─────────────────────────────────────
export const subscribeUserOrders = (uid, callback) => {
  const q = query(
    collection(db, ORDERS_COLLECTION),
    where('uid', '==', uid)
  );
  
  const unsubscribe = onSnapshot(
    q,
    (snap) => {
      const orders = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(orders);
    },
    (error) => {
      console.error('Error subscribing to user orders:', error);
      callback([]);
    }
  );
  
  return unsubscribe;
};

// ─── Real-time listener for all orders (admin) ──────────────────────────────
export const subscribeAllOrders = (callback) => {
  const unsubscribe = onSnapshot(
    collection(db, ORDERS_COLLECTION),
    (snap) => {
      const orders = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(orders);
    },
    (error) => {
      console.error('Error subscribing to all orders:', error);
      callback([]);
    }
  );
  
  return unsubscribe;
};
