// contexts/AuthContext.js
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../firebaseConfig';
import { signOut as firebaseSignOut } from 'firebase/auth';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const verifyUserSession = useCallback(async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        return parsedUser;
      } else {
        setUser(null);
        return null;
      }
    } catch (error) {
      console.error('Error checking user session:', error);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    verifyUserSession();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') verifyUserSession();
    });

    if (Platform.OS === 'web') {
      window.addEventListener('focus', verifyUserSession);
      window.addEventListener('storage', verifyUserSession);
    }

    return () => {
      subscription.remove();
      if (Platform.OS === 'web') {
        window.removeEventListener('focus', verifyUserSession);
        window.removeEventListener('storage', verifyUserSession);
      }
    };
  }, [verifyUserSession]);

  const signIn = async (userData) => {
    // userData must include: uid, email, name, role ('admin' | 'inventoryChecker' | 'user')
    setUser(userData);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
  };

  const signOut = async () => {
    try {
      // Sign out from Firebase
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Firebase signOut error:', error);
    }
    // Clear local state and storage
    setUser(null);
    await AsyncStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signOut, verifyUserSession, loading }}>
      {children}
    </AuthContext.Provider>
  );
}