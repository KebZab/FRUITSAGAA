import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from './AuthContext';

export const CartContext = createContext({
  cart: {},
  setCart: () => {},
  clearCart: () => {},
  cartReady: false,
});

function getCartStorageKey(userId) {
  return `cart:${userId}`;
}

export function CartProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [cart, setCartState] = useState({});
  const [cartReady, setCartReady] = useState(false);

  useEffect(() => {
    let active = true;

    const loadCart = async () => {
      if (!user?.uid) {
        if (!active) return;
        setCartState({});
        setCartReady(true);
        return;
      }

      setCartReady(false);
      try {
        const storedCart = await AsyncStorage.getItem(getCartStorageKey(user.uid));
        if (!active) return;
        setCartState(storedCart ? JSON.parse(storedCart) : {});
      } catch (error) {
        console.error('Error loading cart:', error);
        if (active) setCartState({});
      } finally {
        if (active) setCartReady(true);
      }
    };

    loadCart();

    return () => {
      active = false;
    };
  }, [user?.uid]);

  const setCart = useCallback((nextValue) => {
    setCartState((prev) => (
      typeof nextValue === 'function' ? nextValue(prev) : nextValue
    ));
  }, []);

  const clearCart = useCallback(() => {
    setCartState({});
  }, []);

  useEffect(() => {
    if (!cartReady || !user?.uid) return;

    const persistCart = async () => {
      try {
        await AsyncStorage.setItem(getCartStorageKey(user.uid), JSON.stringify(cart));
      } catch (error) {
        console.error('Error saving cart:', error);
      }
    };

    persistCart();
  }, [cart, cartReady, user?.uid]);

  return (
    <CartContext.Provider value={{ cart, setCart, clearCart, cartReady }}>
      {children}
    </CartContext.Provider>
  );
}
