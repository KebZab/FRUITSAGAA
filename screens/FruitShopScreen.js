// screens/FruitShopScreen.js - UPDATED VERSION
import React, { useState, useContext, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Alert, Platform, Modal, FlatList, Dimensions, ActivityIndicator,
} from 'react-native';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import Fruit3DViewer from '../components/Fruit3DViewerSimple';
import {
  subscribeFruits,
  validateStockForOrder,
} from '../services/fruitService';
import {
  fetchUserAddresses,
  getDefaultAddress,
} from '../services/addressService';
import {
  createOrder,
} from '../services/orderService';

const PINK = '#dd2a7b';

function SideMenu({ visible, onClose, navigation, onLogout, userRole }) {
  if (!visible) return null;
  
  const baseMenuItems = [
    { icon: '🏠', label: 'Home',      screen: 'Home' },
    { icon: '🛒', label: 'Shop',      screen: 'FruitShop' },
    { icon: '📋', label: 'My Orders', screen: 'UserOrders' },
    { icon: '👤', label: 'Profile',   screen: 'Profile' },
  ];

  const menuItems = userRole === 'inventory'
    ? [
        { icon: '📦', label: 'Inventory', screen: 'InventoryDashboard' },
        ...baseMenuItems,
      ]
    : baseMenuItems;

  return (
    <>
      <View style={menu.sidebar}>
        <View style={menu.brand}>
          <Text style={menu.brandEmoji}>🍓</Text>
          <Text style={menu.brandName}>FreshSaga</Text>
        </View>
        <View style={menu.divider} />
        {menuItems.map((item) => (
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

// ─── Stock Badge Component ──────────────────────────────────────────────────
function StockBadge({ fruit }) {
  if (!fruit.isAvailable) {
    return <Text style={styles.outOfStock}>Out of Stock</Text>;
  }
  if (fruit.stock <= 10) {
    return <Text style={styles.lowStock}>⚠️ Low Stock</Text>;
  }
  return null;
}

export default function FruitShopScreen({ navigation }) {
  const { user, signOut } = useContext(AuthContext);

  const [menuOpen, setMenuOpen] = useState(false);
  const [fruits, setFruits] = useState([]);
  const [fruitsLoading, setFruitsLoading] = useState(true);
  const [cart, setCart] = useState({});
  const [cartVisible, setCartVisible] = useState(false);
  const [addressVisible, setAddressVisible] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);

  // ── Subscribe to real-time fruit updates ─────────────────────────────────
  useEffect(() => {
    const unsubscribe = subscribeFruits((data) => {
      setFruits(data);
      setFruitsLoading(false);
    });
    return unsubscribe;
  }, []);

  // ── Fetch user addresses ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    fetchUserAddresses(user.uid).then((data) => {
      setAddresses(data);
      // Set default address as selected
      const defaultAddr = data.find((a) => a.isDefault);
      setSelectedAddress(defaultAddr || data[0] || null);
    });
  }, [user?.uid]);

  const notify = (title, msg) => {
    if (Platform.OS === 'web') window.alert(`${title}: ${msg}`);
    else Alert.alert(title, msg);
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
  };

  // ── Get fruit by ID ──────────────────────────────────────────────────────
  const getFruitById = (id) => fruits.find((f) => f.id === id);

  // ── Add to cart only if available ────────────────────────────────────────
  const addToCart = (fruitId) => {
    const fruit = getFruitById(fruitId);
    if (!fruit || !fruit.isAvailable) {
      notify('Unavailable', `${fruit?.name || 'Fruit'} is not available`);
      return;
    }
    if (fruit.stock <= 0) {
      notify('Out of Stock', `${fruit.name} is out of stock`);
      return;
    }
    setCart((prev) => ({ ...prev, [fruitId]: (prev[fruitId] || 0) + 1 }));
  };

  const removeFromCart = (fruitId) =>
    setCart((prev) => {
      const next = { ...prev };
      if (next[fruitId] > 1) next[fruitId]--;
      else delete next[fruitId];
      return next;
    });

  const cartItems = fruits
    .filter((f) => cart[f.id] > 0 && f.isAvailable)
    .map((f) => ({
      ...f,
      qty: cart[f.id],
      subtotal: cart[f.id] * f.price,
    }));

  const cartTotal = cartItems.reduce((sum, i) => sum + i.subtotal, 0);
  const cartCount = Object.values(cart).reduce((sum, v) => sum + v, 0);

  // ── Place order with address validation ──────────────────────────────────
  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      notify('Empty Cart', 'Add some fruits before ordering!');
      return;
    }

    if (!selectedAddress) {
      notify('No Address', 'Please select a delivery address');
      return;
    }

    setOrdering(true);
    try {
      // Validate stock before placing order
      const validation = await validateStockForOrder(
        cartItems.map((item) => ({
          fruitId: item.id,
          fruitName: item.name,
          quantity: item.qty,
        }))
      );

      if (!validation.valid) {
        notify('Stock Error', validation.message);
        setOrdering(false);
        return;
      }

      // Create order with delivery address and price-at-purchase
      const orderId = await createOrder({
        uid: user.uid,
        userEmail: user.email,
        userName: user.name,
        items: cartItems.map(({ id, name, emoji, qty, price, subtotal }) => ({
          fruitId: id,
          fruitName: name,
          emoji,
          quantity: qty,
          priceAtPurchase: price, // Save price at time of purchase
          subtotal,
        })),
        totalAmount: cartTotal,
        deliveryAddress: {
          fullName: selectedAddress.fullName,
          phoneNumber: selectedAddress.phoneNumber,
          streetAddress: selectedAddress.streetAddress,
          barangay: selectedAddress.barangay,
          city: selectedAddress.city,
          province: selectedAddress.province,
          postalCode: selectedAddress.postalCode,
        },
      });

      setCart({});
      setCartVisible(false);
      setAddressVisible(false);
      Alert.alert('Order Placed! 🎉', 'Order #' + orderId + '\nTrack it in My Orders.', [
        { text: 'View Orders', onPress: () => navigation.navigate('UserOrders') },
        { text: 'Keep Shopping', style: 'cancel' },
      ]);
    } catch (err) {
      notify('Order Failed', err.message);
    } finally {
      setOrdering(false);
    }
  };

  const featuredFruit = fruits[featuredIndex] || {};
  const featuredQty = cart[featuredFruit.id] || 0;

  const handlePrevFruit = () => {
    if (fruits.length === 0) return;
    setFeaturedIndex((prev) => (prev === 0 ? fruits.length - 1 : prev - 1));
  };

  const handleNextFruit = () => {
    if (fruits.length === 0) return;
    setFeaturedIndex((prev) => (prev === fruits.length - 1 ? 0 : prev + 1));
  };

  const renderFruit = useCallback(({ item }) => {
    const qty = cart[item.id] || 0;
    const isAvailable = item.isAvailable && item.stock > 0;

    return (
      <View style={[styles.fruitCard, !isAvailable && styles.fruitCardDisabled]}>
        <View style={styles.fruitEmojiWrap}>
          <Text style={styles.fruitEmoji}>{item.emoji}</Text>
        </View>
        <Text style={styles.fruitName}>{item.name}</Text>
        <Text style={styles.fruitDesc} numberOfLines={1}>{item.description || 'Fresh fruit'}</Text>
        <StockBadge fruit={item} />
        <Text style={styles.fruitPrice}>₱{item.price}</Text>

        {!isAvailable ? (
          <View style={styles.addBtn}>
            <Text style={styles.addBtnText}>Unavailable</Text>
          </View>
        ) : qty === 0 ? (
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
  }, [cart, fruits]);

  return (
    <View style={styles.root}>
      <SideMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        navigation={navigation}
        onLogout={handleLogout}
        userRole={user?.role}
      />

      {/* TOP BAR */}
      <View style={styles.topBar}>
        <Pressable style={styles.menuBtn} onPress={() => setMenuOpen(true)}>
          <View style={styles.hamburgerLine} />
          <View style={[styles.hamburgerLine, { width: 16 }]} />
          <View style={styles.hamburgerLine} />
        </Pressable>

        <View style={styles.topCenter}>
          <Text style={styles.pageTitle}>Fresh Fruits!</Text>
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

      {fruitsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PINK} />
        </View>
      ) : fruits.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateEmoji}>🍎</Text>
          <Text style={styles.emptyStateText}>No fruits available</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* FEATURED FRUIT SECTION */}
          <View style={styles.featuredContainer}>
            <View style={styles.fruitNavRow}>
              <Pressable
                style={({ pressed }) => [styles.navArrow, pressed && styles.navArrowPressed]}
                onPress={handlePrevFruit}
              >
                <Text style={styles.arrowText}>‹</Text>
              </Pressable>

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

            <Text style={styles.featuredName}>{featuredFruit.name}</Text>

            <View style={styles.featuredButtonsRow}>
              {!featuredFruit.isAvailable || featuredFruit.stock <= 0 ? (
                <View style={[styles.addFeaturedBtn, styles.addFeaturedBtnDisabled]}>
                  <Text style={styles.addFeaturedBtnText}>Out of Stock</Text>
                </View>
              ) : featuredQty === 0 ? (
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
              data={fruits}
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
      )}

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
                    <Text style={styles.cartItemPrice}>₱{item.priceAtPurchase}</Text>
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

            {addresses.length === 0 ? (
              <Pressable
                style={[styles.orderBtn, styles.orderBtnDisabled]}
                onPress={() => {
                  setCartVisible(false);
                  navigation.navigate('AddressManagement');
                }}
              >
                <Text style={styles.orderBtnText}>📍 Add Delivery Address</Text>
              </Pressable>
            ) : (
              <>
                <Pressable
                  style={styles.addressSelector}
                  onPress={() => setAddressVisible(true)}
                >
                  <Text style={styles.addressSelectorText}>
                    📍 {selectedAddress?.label || 'Select Address'}
                  </Text>
                  <Text style={styles.addressSelectorArrow}>›</Text>
                </Pressable>

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
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ADDRESS SELECTOR MODAL */}
      <Modal visible={addressVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.addressModalContent}>
            <Text style={styles.modalTitle}>Select Delivery Address</Text>
            {addresses.map((addr) => (
              <Pressable
                key={addr.id}
                style={[
                  styles.addressOption,
                  selectedAddress?.id === addr.id && styles.addressOptionSelected,
                ]}
                onPress={() => {
                  setSelectedAddress(addr);
                  setAddressVisible(false);
                }}
              >
                <View style={styles.addressOptionDot}>
                  {selectedAddress?.id === addr.id && <Text style={styles.addressOptionDotInner}>●</Text>}
                </View>
                <View style={styles.addressOptionContent}>
                  <Text style={styles.addressOptionLabel}>{addr.label}</Text>
                  <Text style={styles.addressOptionText}>{addr.fullName}</Text>
                  <Text style={styles.addressOptionText} numberOfLines={1}>
                    {addr.streetAddress}, {addr.city}
                  </Text>
                </View>
              </Pressable>
            ))}
            <Pressable
              style={[styles.modalBtn, styles.modalBtnCancel]}
              onPress={() => setAddressVisible(false)}
            >
              <Text style={styles.modalBtnText}>Close</Text>
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

  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  emptyStateContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  emptyStateEmoji: {
    fontSize: 60, marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16, fontWeight: '600', color: '#999',
  },

  scrollContent: { paddingBottom: 100 },

  featuredContainer: {
    paddingHorizontal: 16, paddingVertical: 24,
  },
  fruitNavRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20,
  },
  navArrow: {
    width: 50, height: 50, borderRadius: 12, backgroundColor: '#E0E7FF',
    justifyContent: 'center', alignItems: 'center',
  },
  navArrowPressed: { backgroundColor: '#C7D2FE' },
  arrowText: { fontSize: 32, fontWeight: '800', color: '#6B46C1' },
  fruitDisplayWrapper: {
    flex: 1, marginHorizontal: 12, justifyContent: 'center', alignItems: 'center', minHeight: 280,
  },
  featuredName: {
    fontSize: 20, fontWeight: '900', color: '#1a1a1a', textAlign: 'center', marginBottom: 16,
  },
  featuredButtonsRow: { marginBottom: 12 },
  addFeaturedBtn: {
    backgroundColor: PINK, paddingVertical: 14, borderRadius: 28, alignItems: 'center',
    shadowColor: PINK, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  addFeaturedBtnDisabled: { backgroundColor: '#F9A8D4' },
  addFeaturedBtnPressed: { opacity: 0.85 },
  addFeaturedBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  featuredQtyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFF0F7', borderRadius: 28, paddingHorizontal: 8, paddingVertical: 6,
  },
  featuredQtyBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  featuredQtyBtnText: { fontSize: 20, color: PINK, fontWeight: '700' },
  featuredQtyNum: { fontWeight: '800', fontSize: 16, color: '#1a1a1a', minWidth: 30, textAlign: 'center' },
  checkCartBtn: {
    backgroundColor: '#f3f4f6', paddingVertical: 12, borderRadius: 20, alignItems: 'center',
    borderWidth: 2, borderColor: PINK,
  },
  checkCartBtnPressed: { backgroundColor: '#f9fafb' },
  checkCartBtnText: { color: PINK, fontWeight: '800', fontSize: 15 },

  listSection: { paddingHorizontal: 8 },

  cartButton: { position: 'relative', padding: 4 },
  cartEmoji: {
    fontSize: 20, fontWeight: '800', color: '#fff', backgroundColor: PINK,
    width: 40, height: 40, borderRadius: 20, textAlign: 'center', lineHeight: 40,
  },
  cartBadge: {
    position: 'absolute', top: 0, right: 0, backgroundColor: '#FCD34D', borderRadius: 10,
    minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
  },
  cartBadgeText: { color: '#1a1a1a', fontSize: 10, fontWeight: '800' },

  listContent: { paddingHorizontal: 8, paddingBottom: 20 },
  row: { justifyContent: 'space-between', marginBottom: 12 },

  fruitCard: {
    backgroundColor: '#fff', padding: 14, borderRadius: 20, flex: 0.48, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  fruitCardDisabled: { opacity: 0.6 },
  fruitEmojiWrap: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF0F7',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  fruitEmoji: { fontSize: 32 },
  fruitName: { fontWeight: '800', fontSize: 13, color: '#1a1a1a', marginBottom: 2 },
  fruitDesc: { fontSize: 10, color: '#9CA3AF', textAlign: 'center', marginBottom: 2 },
  fruitPrice: { fontWeight: '900', color: PINK, fontSize: 15, marginBottom: 10 },
  lowStock: { fontSize: 11, color: '#F59E0B', fontWeight: '600', marginBottom: 4 },
  outOfStock: { fontSize: 11, color: '#EF4444', fontWeight: '600', marginBottom: 4 },

  addBtn: {
    backgroundColor: PINK, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20,
    width: '100%', alignItems: 'center',
  },
  addBtnPressed: { opacity: 0.8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  qtyRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF0F7', borderRadius: 20,
    paddingHorizontal: 4, width: '100%', justifyContent: 'space-between',
  },
  qtyBtn: { padding: 8 },
  qtyBtnText: { fontSize: 18, color: PINK, fontWeight: '700' },
  qtyNum: { fontWeight: '800', fontSize: 15, color: '#1a1a1a' },

  fab: {
    position: 'absolute', bottom: 24, left: 24, right: 24,
    backgroundColor: PINK, borderRadius: 28, paddingVertical: 16, alignItems: 'center',
    shadowColor: PINK, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  fabText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  modalBg: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: '80%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB',
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  modalClose: { fontSize: 18, color: '#9CA3AF', padding: 4 },

  emptyCart: { alignItems: 'center', paddingVertical: 40 },
  emptyCartEmoji: { fontSize: 40, marginBottom: 10 },
  emptyCartText: { color: '#9CA3AF', fontSize: 14 },

  cartList: { maxHeight: 280, paddingHorizontal: 24 },
  cartItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F9FAFB',
  },
  cartItemEmoji: { fontSize: 26, marginRight: 12 },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontWeight: '700', fontSize: 14, color: '#1a1a1a' },
  cartItemPrice: { fontWeight: '800', color: PINK, fontSize: 14 },
  cartQtyRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 16,
    marginHorizontal: 8,
  },
  cartQtyBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  cartQtyBtnText: { fontSize: 16, color: PINK, fontWeight: '700' },
  cartQtyNum: { fontWeight: '800', fontSize: 14, minWidth: 20, textAlign: 'center' },

  cartFooter: {
    paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  cartTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
  },
  cartTotalLabel: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  cartTotalAmount: { fontSize: 22, fontWeight: '900', color: '#1a1a1a' },

  addressSelector: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8, marginBottom: 12,
  },
  addressSelectorText: { fontSize: 13, fontWeight: '600', color: '#333', flex: 1 },
  addressSelectorArrow: { fontSize: 16, color: PINK, fontWeight: '700' },

  orderBtn: {
    backgroundColor: PINK, borderRadius: 20, paddingVertical: 16, alignItems: 'center',
    shadowColor: PINK, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  orderBtnDisabled: { backgroundColor: '#F9A8D4', shadowOpacity: 0 },
  orderBtnPressed: { opacity: 0.85 },
  orderBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  addressModalContent: {
    backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '85%', maxWidth: 400,
    maxHeight: '80%',
  },
  addressOption: {
    flexDirection: 'row', alignItems: 'flex-start', padding: 12, marginVertical: 8,
    borderRadius: 8, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#eee',
  },
  addressOptionSelected: {
    backgroundColor: '#FFF0F7', borderColor: PINK,
  },
  addressOptionDot: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#ddd',
    justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 2,
  },
  addressOptionDotInner: { color: PINK, fontSize: 12 },
  addressOptionContent: { flex: 1 },
  addressOptionLabel: { fontWeight: '700', fontSize: 13, color: PINK, marginBottom: 4 },
  addressOptionText: { fontSize: 12, color: '#666', marginVertical: 2 },

  modalBtn: {
    paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 16,
  },
  modalBtnCancel: { backgroundColor: '#eee' },
  modalBtnText: { fontWeight: '600', color: '#333' },
});
