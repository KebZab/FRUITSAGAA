// services/fruitService.js
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

const FRUITS_COLLECTION = 'fruits';

// ─── Fetch all available fruits ─────────────────────────────────────────────
export const fetchFruits = async () => {
  try {
    const q = query(
      collection(db, FRUITS_COLLECTION),
      where('isAvailable', '==', true)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching fruits:', error);
    return [];
  }
};

// ─── Fetch all fruits (admin/inventory view, includes unavailable) ────────
export const fetchAllFruits = async () => {
  try {
    const snap = await getDocs(collection(db, FRUITS_COLLECTION));
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching all fruits:', error);
    return [];
  }
};

// ─── Get single fruit by ID ─────────────────────────────────────────────────
export const getFruitById = async (fruitId) => {
  try {
    const docRef = doc(db, FRUITS_COLLECTION, fruitId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return {
        id: snap.id,
        ...snap.data(),
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching fruit:', error);
    return null;
  }
};

// ─── Create new fruit (Inventory Manager) ───────────────────────────────────
export const createFruit = async (fruitData) => {
  try {
    const docRef = await addDoc(collection(db, FRUITS_COLLECTION), {
      ...fruitData,
      createdAt: new Date(),
      isAvailable: true,
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating fruit:', error);
    throw error;
  }
};

// ─── Update fruit (Inventory Manager) ────────────────────────────────────────
export const updateFruit = async (fruitId, updates) => {
  try {
    const docRef = doc(db, FRUITS_COLLECTION, fruitId);
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error('Error updating fruit:', error);
    throw error;
  }
};

// ─── Delete fruit (Inventory Manager) ────────────────────────────────────────
export const deleteFruit = async (fruitId) => {
  try {
    const docRef = doc(db, FRUITS_COLLECTION, fruitId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting fruit:', error);
    throw error;
  }
};

// ─── Update stock (after order) ──────────────────────────────────────────────
export const decreaseStock = async (fruitId, quantity) => {
  try {
    const docRef = doc(db, FRUITS_COLLECTION, fruitId);
    const snap = await getDoc(docRef);
    
    if (!snap.exists()) {
      throw new Error('Fruit not found');
    }
    
    const currentStock = snap.data().stock || 0;
    const newStock = Math.max(0, currentStock - quantity);
    const isAvailable = newStock > 0;
    
    await updateDoc(docRef, {
      stock: newStock,
      isAvailable,
    });
    
    return newStock;
  } catch (error) {
    console.error('Error decreasing stock:', error);
    throw error;
  }
};

// ─── Increase stock (manual adjustment by inventory manager) ──────────────────
export const increaseStock = async (fruitId, quantity) => {
  try {
    const docRef = doc(db, FRUITS_COLLECTION, fruitId);
    const snap = await getDoc(docRef);
    
    if (!snap.exists()) {
      throw new Error('Fruit not found');
    }
    
    const currentStock = snap.data().stock || 0;
    const newStock = currentStock + quantity;
    
    await updateDoc(docRef, {
      stock: newStock,
      isAvailable: newStock > 0,
    });
    
    return newStock;
  } catch (error) {
    console.error('Error increasing stock:', error);
    throw error;
  }
};

// ─── Update fruit availability ──────────────────────────────────────────────
export const setFruitAvailability = async (fruitId, isAvailable) => {
  try {
    const docRef = doc(db, FRUITS_COLLECTION, fruitId);
    await updateDoc(docRef, { isAvailable });
  } catch (error) {
    console.error('Error updating fruit availability:', error);
    throw error;
  }
};

// ─── Real-time listener for all available fruits ────────────────────────────
export const subscribeFruits = (callback) => {
  const q = query(
    collection(db, FRUITS_COLLECTION),
    where('isAvailable', '==', true)
  );
  
  const unsubscribe = onSnapshot(
    q,
    (snap) => {
      const fruits = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(fruits);
    },
    (error) => {
      console.error('Error subscribing to fruits:', error);
      callback([]);
    }
  );
  
  return unsubscribe;
};

// ─── Real-time listener for all fruits (inventory view) ─────────────────────
export const subscribeAllFruits = (callback) => {
  const unsubscribe = onSnapshot(
    collection(db, FRUITS_COLLECTION),
    (snap) => {
      const fruits = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(fruits);
    },
    (error) => {
      console.error('Error subscribing to all fruits:', error);
      callback([]);
    }
  );
  
  return unsubscribe;
};

// ─── Validate stock before checkout ──────────────────────────────────────────
export const validateStockForOrder = async (items) => {
  try {
    for (const item of items) {
      const fruit = await getFruitById(item.fruitId);
      if (!fruit) {
        return { valid: false, message: `${item.fruitName} is no longer available` };
      }
      if (fruit.stock < item.quantity) {
        return { 
          valid: false, 
          message: `Insufficient stock for ${item.fruitName}. Only ${fruit.stock} available.`,
          fruitId: item.fruitId,
        };
      }
    }
    return { valid: true };
  } catch (error) {
    console.error('Error validating stock:', error);
    return { valid: false, message: 'Error checking stock availability' };
  }
};
