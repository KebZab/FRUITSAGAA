// screens/FruitShopScreen.js
import React, { useState, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Alert, Platform, Modal, FlatList, Dimensions,
} from 'react-native';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import { addDoc, collection } from 'firebase/firestore';
import Fruit3DViewer from '../components/Fruit3DViewerSimple';

// ─── Fruit catalogue ────────────────────────────────────────────────────────
const FRUITS = [
  { id: 'apple',      name: 'Apple',       emoji: '🍎', price: 25,  unit: 'per pc',   description: 'Crisp & sweet red apple' },
  { id: 'banana',     name: 'Banana',      emoji: '🍌', price: 12,  unit: 'per pc',   description: 'Ripe Lakatan banana' },
  { id: 'mango',      name: 'Mango',       emoji: '🥭', price: 40,  unit: 'per pc',   description: 'Sweet Philippine carabao mango' },
  { id: 'strawberry', name: 'Strawberry',  emoji: '🍓', price: 90,  unit: 'per 250g', description: 'Fresh Baguio strawberries' },
  { id: 'grapes',     name: 'Grapes',      emoji: '🍇', price: 120, unit: 'per 500g', description: 'Seedless green grapes' },
  { id: 'watermelon', name: 'Watermelon',  emoji: '🍉', price: 60,  unit: 'per kg',   description: 'Chilled seedless watermelon' },
  { id: 'orange',     name: 'Orange',      emoji: '🍊', price: 30,  unit: 'per pc',   description: 'Juicy navel orange' },
  { id: 'pineapple',  name: 'Pineapple',   emoji: '🍍', price: 55,  unit: 'per pc',   description: 'Sweet Tagaytay pineapple' },
  { id: 'blueberry',  name: 'Blueberry',   emoji: '🫐', price: 150, unit: 'per 250g', description: 'Imported fresh blueberries' },
  { id: 'lemon',      name: 'Lemon',       emoji: '🍋', price: 35,  unit: 'per pc',   description: 'Ripe native lemon' },
];

const PINK = '#dd2a7b';

function SideMenu({ visible, onClose, navigation, onLogout }) {
  if (!visible) return null;
  return (
    <>
      <View style={menu.sidebar}>
        <View style={menu.brand}>
        <Text style={menu.brandEmoji}>🍓</Text>
          <Text style={menu.brandName}>FreshSaga</Text>
        </View>
        <View style={menu.divider} />
        {[
          { icon: '🏠', label: 'Home',      screen: 'Home' },
          { icon: '🛒', label: 'Shop',      screen: 'FruitShop' },
          { icon: '📋', label: 'My Orders', screen: 'UserOrders' },
          { icon: '👤', label: 'Profile',   screen: 'Profile' },
        ].map((item) => (
          <Pressable
            key={item.screen}
            style={({ pressed }) => [menu.item, pressed && menu.itemPressed]}
            onPress={() => { onClose(); navigation.navigate(item.screen); }}
          >
            <Text style={menu.itemIcon}>{item.icon}</Text>
            <Text style={menu.itemLabel}>{item.label}</Text>
          </Pressable>
        ))}
        <View style={menu.spacer} />
        <View style={menu.divider} />
        <Pressable
          style={({ pressed }) => [menu.logoutBtn, pressed && menu.logoutPressed]}
          onPress={onLogout}
        >
          <Text style={menu.logoutIcon}>🚪</Text>
          <Text style={menu.logoutText}>Sign Out</Text>
        </Pressable>
      </View>
      <Pressable style={menu.overlay} onPress={onClose} />
    </>
  );
}

export default function FruitShopScreen({ navigation }) {
  const { user, signOut } = useContext(AuthContext);

  const [menuOpen, setMenuOpen] = useState(false);
  const [cart, setCart] = useState({});
  const [cartVisible, setCartVisible] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [featuredIndex, setFeaturedIndex] = useState(0);

  const notify = (title, msg) => {
    if (Platform.OS === 'web') window.alert(`${title}: ${msg}`);
    else Alert.alert(title, msg);
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
    // Navigator will automatically switch to Login screen when user becomes null
  };

  const addToCart = (fruitId) =>
    setCart((prev) => ({ ...prev, [fruitId]: (prev[fruitId] || 0) + 1 }));

  const removeFromCart = (fruitId) =>
    setCart((prev) => {
      const next = { ...prev };
      if (next[fruitId] > 1) next[fruitId]--;
      else delete next[fruitId];
      return next;
    });

  const cartItems = FRUITS.filter((f) => cart[f.id] > 0).map((f) => ({
    ...f, qty: cart[f.id], subtotal: cart[f.id] * f.price,
  }));

  const cartTotal = cartItems.reduce((sum, i) => sum + i.subtotal, 0);
  const cartCount = Object.values(cart).reduce((sum, v) => sum + v, 0);

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      notify('Empty Cart', 'Add some fruits before ordering!');
      return;
    }
    setOrdering(true);
    try {
      await addDoc(collection(db, 'orders'), {
        userId: user.uid,
        userEmail: user.email,
        userName: user.name,
        items: cartItems.map(({ id, name, emoji, qty, price, subtotal }) => ({
          fruitId: id, name, emoji, qty, price, subtotal,
        })),
        total: cartTotal,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      setCart({});
      setCartVisible(false);
      Alert.alert('Order Placed! 🎉', 'Track it in My Orders.', [
        { text: 'View Orders', onPress: () => navigation.navigate('UserOrders') },
        { text: 'Keep Shopping', style: 'cancel' },
      ]);
    } catch (err) {
      notify('Order Failed', err.message);
    } finally {
      setOrdering(false);
    }
  };

  const featuredFruit = FRUITS[featuredIndex];
  const featuredQty = cart[featuredFruit.id] || 0;

  const handlePrevFruit = () => {
    setFeaturedIndex((prev) => (prev === 0 ? FRUITS.length - 1 : prev - 1));
  };

  const handleNextFruit = () => {
    setFeaturedIndex((prev) => (prev === FRUITS.length - 1 ? 0 : prev + 1));
  };

  const renderFruit = useCallback(({ item }) => {
    const qty = cart[item.id] || 0;
    return (
      <View style={styles.fruitCard}>
        <View style={styles.fruitEmojiWrap}>
          <Text style={styles.fruitEmoji}>{item.emoji}</Text>
        </View>
        <Text style={styles.fruitName}>{item.name}</Text>
        <Text style={styles.fruitDesc} numberOfLines={1}>{item.description}</Text>
        <Text style={styles.fruitUnit}>{item.unit}</Text>
        <Text style={styles.fruitPrice}>₱{item.price}</Text>

        {qty === 0 ? (
          <Pressable
            style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
            onPress={() => addToCart(item.id)}
          >
            <Text style={styles.addBtnText}>+ Add</Text>
          </Pressable>
        ) : (
          <View style={styles.qtyRow}>
            <Pressable style={styles.qtyBtn} onPress={() => removeFromCart(item.id)}>
              <Text style={styles.qtyBtnText}>−</Text>
            </Pressable>
            <Text style={styles.qtyNum}>{qty}</Text>
            <Pressable style={styles.qtyBtn} onPress={() => addToCart(item.id)}>
              <Text style={styles.qtyBtnText}>+</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }, [cart]);

  return (
    <View style={styles.root}>
      <SideMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        navigation={navigation}
        onLogout={handleLogout}
      />

      {/* TOP BAR */}
      <View style={styles.topBar}>
        <Pressable style={styles.menuBtn} onPress={() => setMenuOpen(true)}>
          <View style={styles.hamburgerLine} />
          <View style={[styles.hamburgerLine, { width: 16 }]} />
          <View style={styles.hamburgerLine} />
        </Pressable>

        <View style={styles.topCenter}>
          <Text style={styles.pageTitle}>Fusion Fruit Studio!</Text>
        </View>

        <Pressable style={styles.cartButton} onPress={() => setCartVisible(true)}>
          <Text style={styles.cartEmoji}>FC</Text>
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* FEATURED FRUIT SECTION */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.featuredContainer}>
          {/* FRUIT NAVIGATION ARROWS */}
          <View style={styles.fruitNavRow}>
            <Pressable
              style={({ pressed }) => [styles.navArrow, pressed && styles.navArrowPressed]}
              onPress={handlePrevFruit}
            >
              <Text style={styles.arrowText}>‹</Text>
            </Pressable>

            {/* 3D MODEL PLACEHOLDER */}
            <View style={styles.fruitDisplayWrapper}>
              <Fruit3DViewer 
                fruitId={featuredFruit.id}
                emoji={featuredFruit.emoji}
                style={{ width: '100%', height: 320 }}
              />
            </View>

            <Pressable
              style={({ pressed }) => [styles.navArrow, pressed && styles.navArrowPressed]}
              onPress={handleNextFruit}
            >
              <Text style={styles.arrowText}>›</Text>
            </Pressable>
          </View>

          {/* FEATURED FRUIT INFO */}
          <Text style={styles.featuredName}>
            {featuredFruit.name} (Size: Large)
          </Text>

          {/* FEATURED FRUIT BUTTONS */}
          <View style={styles.featuredButtonsRow}>
            {featuredQty === 0 ? (
              <Pressable
                style={({ pressed }) => [styles.addFeaturedBtn, pressed && styles.addFeaturedBtnPressed]}
                onPress={() => addToCart(featuredFruit.id)}
              >
                <Text style={styles.addFeaturedBtnText}>
                  Add {featuredFruit.name} to Cart →
                </Text>
              </Pressable>
            ) : (
              <View style={styles.featuredQtyRow}>
                <Pressable
                  style={styles.featuredQtyBtn}
                  onPress={() => removeFromCart(featuredFruit.id)}
                >
                  <Text style={styles.featuredQtyBtnText}>−</Text>
                </Pressable>
                <Text style={styles.featuredQtyNum}>{featuredQty}</Text>
                <Pressable
                  style={styles.featuredQtyBtn}
                  onPress={() => addToCart(featuredFruit.id)}
                >
                  <Text style={styles.featuredQtyBtnText}>+</Text>
                </Pressable>
              </View>
            )}
          </View>

          <Pressable
            style={({ pressed }) => [styles.checkCartBtn, pressed && styles.checkCartBtnPressed]}
            onPress={() => setCartVisible(true)}
          >
            <Text style={styles.checkCartBtnText}>Check Cart</Text>
          </Pressable>
        </View>

        {/* FRUIT LIST SECTION */}
        <View style={styles.listSection}>
          <FlatList
            data={FRUITS}
            keyExtractor={(item) => item.id}
            renderItem={renderFruit}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
          />
        </View>
      </ScrollView>

      {/* CART FAB */}
      {cartCount > 0 && (
        <Pressable style={styles.fab} onPress={() => setCartVisible(true)}>
          <Text style={styles.fabText}>🛍️  View Cart  ·  ₱{cartTotal}</Text>
        </Pressable>
      )}

      {/* CART MODAL */}
      <Modal visible={cartVisible} transparent animationType="slide" onRequestClose={() => setCartVisible(false)}>
        <Pressable style={styles.modalBg} onPress={() => setCartVisible(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.handle} />

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Your Cart 🛍️</Text>
            <Pressable onPress={() => setCartVisible(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>

          {cartItems.length === 0 ? (
            <View style={styles.emptyCart}>
              <Text style={styles.emptyCartEmoji}>🧺</Text>
              <Text style={styles.emptyCartText}>Your cart is empty</Text>
            </View>
          ) : (
            <ScrollView style={styles.cartList} showsVerticalScrollIndicator={false}>
              {cartItems.map((item) => (
                <View key={item.id} style={styles.cartItem}>
                  <Text style={styles.cartItemEmoji}>{item.emoji}</Text>
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName}>{item.name}</Text>
                    <Text style={styles.cartItemUnit}>{item.unit}</Text>
                  </View>
                  <View style={styles.cartQtyRow}>
                    <Pressable style={styles.cartQtyBtn} onPress={() => removeFromCart(item.id)}>
                      <Text style={styles.cartQtyBtnText}>−</Text>
                    </Pressable>
                    <Text style={styles.cartQtyNum}>{item.qty}</Text>
                    <Pressable style={styles.cartQtyBtn} onPress={() => addToCart(item.id)}>
                      <Text style={styles.cartQtyBtnText}>+</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.cartItemPrice}>₱{item.subtotal}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.cartFooter}>
            <View style={styles.cartTotalRow}>
              <Text style={styles.cartTotalLabel}>Total</Text>
              <Text style={styles.cartTotalAmount}>₱{cartTotal}</Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.orderBtn,
                (ordering || cartItems.length === 0) && styles.orderBtnDisabled,
                pressed && styles.orderBtnPressed,
              ]}
              onPress={handlePlaceOrder}
              disabled={ordering || cartItems.length === 0}
            >
              <Text style={styles.orderBtnText}>
                {ordering ? 'Placing Order…' : '🎉  Place Order'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Menu Styles ─────────────────────────────────────────────────────────────
const menu = StyleSheet.create({
  overlay: {
    position: 'absolute', left: 270, right: 0, top: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 9,
  },
  sidebar: {
    position: 'absolute', top: 0, left: 0, bottom: 0, width: 270,
    backgroundColor: '#fff', paddingTop: Platform.OS === 'ios' ? 56 : 32,
    paddingHorizontal: 20, paddingBottom: 32, zIndex: 10,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 15,
  },
  brand: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  brandEmoji: { fontSize: 28, marginRight: 10 },
  brandName: { fontSize: 20, fontWeight: '800', color: PINK },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 16 },
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4,
  },
  itemPressed: { backgroundColor: '#FFF0F7' },
  itemIcon: { fontSize: 18, marginRight: 14, width: 24 },
  itemLabel: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  spacer: { flex: 1 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 12,
    backgroundColor: '#FFF0F7', borderRadius: 12,
  },
  logoutPressed: { backgroundColor: '#FCE7F3' },
  logoutIcon: { fontSize: 18, marginRight: 14 },
  logoutText: { fontSize: 15, fontWeight: '700', color: PINK },
});

// ─── Screen Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF8FC' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 32, paddingBottom: 8,
  },
  menuBtn: { gap: 5, padding: 4 },
  hamburgerLine: { width: 22, height: 2.5, backgroundColor: '#1a1a1a', borderRadius: 4 },
  topCenter: { flex: 1, alignItems: 'center' },
  pageTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },

  scrollContent: { paddingBottom: 100 },

  // ─── FEATURED FRUIT SECTION ────
  featuredContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  fruitNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  navArrow: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navArrowPressed: {
    backgroundColor: '#C7D2FE',
  },
  arrowText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#6B46C1',
  },
  fruitDisplayWrapper: {
    flex: 1,
    marginHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 280,
  },
  modelPlaceholder: {
    width: '100%',
    height: 280,
    backgroundColor: '#F3E8FF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D8B4FE',
  },
  modelPlaceholderEmoji: {
    fontSize: 80,
    marginBottom: 12,
  },
  modelPlaceholderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B46C1',
    marginBottom: 8,
  },
  modelPlaceholderHint: {
    fontSize: 11,
    color: '#9F7AEA',
    textAlign: 'center',
    lineHeight: 16,
  },
  featuredName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 16,
  },
  featuredButtonsRow: {
    marginBottom: 12,
  },
  addFeaturedBtn: {
    backgroundColor: '#dd2a7b',
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: 'center',
    shadowColor: '#dd2a7b',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  addFeaturedBtnPressed: {
    opacity: 0.85,
  },
  addFeaturedBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  featuredQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F7',
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  featuredQtyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  featuredQtyBtnText: {
    fontSize: 20,
    color: '#dd2a7b',
    fontWeight: '700',
  },
  featuredQtyNum: {
    fontWeight: '800',
    fontSize: 16,
    color: '#1a1a1a',
    minWidth: 30,
    textAlign: 'center',
  },
  checkCartBtn: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#dd2a7b',
  },
  checkCartBtnPressed: {
    backgroundColor: '#f9fafb',
  },
  checkCartBtnText: {
    color: '#dd2a7b',
    fontWeight: '800',
    fontSize: 15,
  },

  // ─── LIST SECTION ────
  listSection: {
    paddingHorizontal: 8,
  },

  cartButton: { position: 'relative', padding: 4 },
  cartEmoji: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    backgroundColor: '#dd2a7b',
    width: 40,
    height: 40,
    borderRadius: 20,
    textAlign: 'center',
    lineHeight: 40,
  },
  cartBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: '#FCD34D', borderRadius: 10,
    minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: { color: '#1a1a1a', fontSize: 10, fontWeight: '800' },

  listContent: { paddingHorizontal: 8, paddingBottom: 20 },
  row: { justifyContent: 'space-between', marginBottom: 12 },

  fruitCard: {
    backgroundColor: '#fff', padding: 14, borderRadius: 20,
    flex: 0.48, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  fruitEmojiWrap: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#FFF0F7', justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  fruitEmoji: { fontSize: 32 },
  fruitName: { fontWeight: '800', fontSize: 13, color: '#1a1a1a', marginBottom: 2 },
  fruitDesc: { fontSize: 10, color: '#9CA3AF', textAlign: 'center', marginBottom: 2 },
  fruitUnit: { fontSize: 10, color: '#D1D5DB', marginBottom: 4 },
  fruitPrice: { fontWeight: '900', color: '#dd2a7b', fontSize: 15, marginBottom: 10 },

  addBtn: {
    backgroundColor: '#dd2a7b', paddingVertical: 8, paddingHorizontal: 20,
    borderRadius: 20, width: '100%', alignItems: 'center',
  },
  addBtnPressed: { opacity: 0.8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  qtyRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF0F7', borderRadius: 20, paddingHorizontal: 4,
    width: '100%', justifyContent: 'space-between',
  },
  qtyBtn: { padding: 8 },
  qtyBtnText: { fontSize: 18, color: '#dd2a7b', fontWeight: '700' },
  qtyNum: { fontWeight: '800', fontSize: 15, color: '#1a1a1a' },

  fab: {
    position: 'absolute', bottom: 24, left: 24, right: 24,
    backgroundColor: '#dd2a7b', borderRadius: 28, paddingVertical: 16,
    alignItems: 'center', shadowColor: '#dd2a7b', shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  fabText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  modalBg: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: '80%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB',
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  modalClose: { fontSize: 18, color: '#9CA3AF', padding: 4 },

  emptyCart: { alignItems: 'center', paddingVertical: 40 },
  emptyCartEmoji: { fontSize: 40, marginBottom: 10 },
  emptyCartText: { color: '#9CA3AF', fontSize: 14 },

  cartList: { maxHeight: 280, paddingHorizontal: 24 },
  cartItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F9FAFB',
  },
  cartItemEmoji: { fontSize: 26, marginRight: 12 },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontWeight: '700', fontSize: 14, color: '#1a1a1a' },
  cartItemUnit: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  cartQtyRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 16, marginHorizontal: 8,
  },
  cartQtyBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  cartQtyBtnText: { fontSize: 16, color: '#dd2a7b', fontWeight: '700' },
  cartQtyNum: { fontWeight: '800', fontSize: 14, minWidth: 20, textAlign: 'center' },
  cartItemPrice: { fontWeight: '800', color: '#dd2a7b', fontSize: 14, minWidth: 50, textAlign: 'right' },

  cartFooter: {
    paddingHorizontal: 24, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  cartTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14,
  },
  cartTotalLabel: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  cartTotalAmount: { fontSize: 22, fontWeight: '900', color: '#1a1a1a' },

  orderBtn: {
    backgroundColor: '#dd2a7b', borderRadius: 20, paddingVertical: 16,
    alignItems: 'center', shadowColor: '#dd2a7b', shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  orderBtnDisabled: { backgroundColor: '#F9A8D4', shadowOpacity: 0 },
  orderBtnPressed: { opacity: 0.85 },
  orderBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});