// services/addressService.js
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

const ADDRESSES_COLLECTION = 'user_addresses';

// ─── Fetch all addresses for a user ──────────────────────────────────────────
export const fetchUserAddresses = async (uid) => {
  try {
    const q = query(
      collection(db, ADDRESSES_COLLECTION),
      where('uid', '==', uid)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching addresses:', error);
    return [];
  }
};

// ─── Get default address for a user ──────────────────────────────────────────
export const getDefaultAddress = async (uid) => {
  try {
    const q = query(
      collection(db, ADDRESSES_COLLECTION),
      where('uid', '==', uid),
      where('isDefault', '==', true)
    );
    const snap = await getDocs(q);
    if (snap.docs.length > 0) {
      return {
        id: snap.docs[0].id,
        ...snap.docs[0].data(),
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching default address:', error);
    return null;
  }
};

// ─── Create new address ──────────────────────────────────────────────────────
export const createAddress = async (uid, addressData) => {
  try {
    // If this is the first address or marked as default, set isDefault to true
    const addresses = await fetchUserAddresses(uid);
    const isDefault = addressData.isDefault || addresses.length === 0;
    
    // If marking as default, unset other defaults
    if (isDefault && addresses.length > 0) {
      for (const addr of addresses) {
        if (addr.isDefault) {
          await updateDoc(doc(db, ADDRESSES_COLLECTION, addr.id), { isDefault: false });
        }
      }
    }
    
    const docRef = await addDoc(collection(db, ADDRESSES_COLLECTION), {
      uid,
      ...addressData,
      isDefault,
      createdAt: new Date(),
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating address:', error);
    throw error;
  }
};

// ─── Update address ─────────────────────────────────────────────────────────
export const updateAddress = async (addressId, updates) => {
  try {
    const docRef = doc(db, ADDRESSES_COLLECTION, addressId);
    
    // If marking as default, unset other defaults
    if (updates.isDefault) {
      const snap = await getDoc(docRef);
      const uid = snap.data().uid;
      
      const q = query(
        collection(db, ADDRESSES_COLLECTION),
        where('uid', '==', uid),
        where('isDefault', '==', true)
      );
      const otherDefaults = await getDocs(q);
      
      for (const doc of otherDefaults.docs) {
        if (doc.id !== addressId) {
          await updateDoc(doc.ref, { isDefault: false });
        }
      }
    }
    
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error('Error updating address:', error);
    throw error;
  }
};

// ─── Delete address ─────────────────────────────────────────────────────────
export const deleteAddress = async (addressId) => {
  try {
    const docRef = doc(db, ADDRESSES_COLLECTION, addressId);
    const snap = await getDoc(docRef);
    const wasDefault = snap.data().isDefault;
    const uid = snap.data().uid;
    
    await deleteDoc(docRef);
    
    // If deleted address was default, set first remaining as default
    if (wasDefault) {
      const addresses = await fetchUserAddresses(uid);
      if (addresses.length > 0) {
        await updateAddress(addresses[0].id, { isDefault: true });
      }
    }
  } catch (error) {
    console.error('Error deleting address:', error);
    throw error;
  }
};

// ─── Set address as default ──────────────────────────────────────────────────
export const setDefaultAddress = async (uid, addressId) => {
  try {
    const q = query(
      collection(db, ADDRESSES_COLLECTION),
      where('uid', '==', uid)
    );
    const snap = await getDocs(q);
    
    // Unset all defaults
    for (const doc of snap.docs) {
      if (doc.id !== addressId) {
        await updateDoc(doc.ref, { isDefault: false });
      }
    }
    
    // Set selected as default
    await updateDoc(doc(db, ADDRESSES_COLLECTION, addressId), { isDefault: true });
  } catch (error) {
    console.error('Error setting default address:', error);
    throw error;
  }
};

// ─── Real-time listener for user addresses ───────────────────────────────────
export const subscribeUserAddresses = (uid, callback) => {
  const q = query(
    collection(db, ADDRESSES_COLLECTION),
    where('uid', '==', uid)
  );
  
  const unsubscribe = onSnapshot(
    q,
    (snap) => {
      const addresses = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(addresses);
    },
    (error) => {
      console.error('Error subscribing to addresses:', error);
      callback([]);
    }
  );
  
  return unsubscribe;
};
