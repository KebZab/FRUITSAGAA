// screens/FruitShopScreen.js
import React, { useState, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator,
  Alert, Platform, Modal, FlatList,
} from 'react-native';
import { AuthContext } from '../contexts/AuthContext';
import { CartContext } from '../contexts/CartContext';
import { db } from '../firebaseConfig';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import Sidebar from '../components/Sidebar';
import Fruit3DViewer from '../components/Fruit3DViewerSimple';
import AddressFormModal from '../components/AddressFormModal';
import { FRUITS, FRUIT_MAP, INVENTORY_COLLECTION } from '../data/fruitCatalog';

const PINK = '#dd2a7b';

function formatAddress(address) {
  if (!address) return '';
  const cityLine = [address.city, address.province, address.postalCode].filter(Boolean).join(', ');
  return [
    address.label,
    address.recipientName,
    address.phone,
    address.addressLine1,
    address.addressLine2,
    cityLine,
    address.instructions,
  ].filter((item) => item && item.trim()).join('\n');
}

export default function FruitShopScreen({ navigation }) {
  const { user, signOut } = useContext(AuthContext);
  const { cart, setCart, clearCart, cartReady } = useContext(CartContext);
  const userRole = user?.role || 'user';
  const canOrder = userRole !== 'inventoryChecker';

  const [menuOpen, setMenuOpen] = useState(false);
  const [inventory, setInventory] = useState({});
  const [cartVisible, setCartVisible] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [addresses, setAddresses] = useState([]);
  const [defaultAddressId, setDefaultAddressId] = useState(null);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [addressLoading, setAddressLoading] = useState(true);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  const loadAddresses = useCallback(async () => {
    if (!user?.uid) return;

    setAddressLoading(true);
    try {
      const [userSnap, addressesSnap] = await Promise.all([
        getDoc(doc(db, 'users_basic', user.uid)),
        getDocs(collection(db, 'users_basic', user.uid, 'addresses')),
      ]);

      const fetchedAddresses = addressesSnap.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .sort((a, b) => {
          if (a.label && b.label) return a.label.localeCompare(b.label);
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        });

      const nextDefault = userSnap.exists() ? userSnap.data()?.defaultAddressId || null : null;
      setDefaultAddressId(nextDefault);
      setAddresses(fetchedAddresses);
      setSelectedAddressId((current) => {
        if (current && fetchedAddresses.some((item) => item.id === current)) return current;
        return nextDefault || fetchedAddresses[0]?.id || null;
      });
    } catch (error) {
      console.log('loadAddresses error:', error);
    } finally {
      setAddressLoading(false);
    }
  }, [user?.uid]);

  React.useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  React.useEffect(() => {
    if (addresses.length === 0) {
      if (selectedAddressId !== null) setSelectedAddressId(null);
      return;
    }

    const selectedExists = addresses.some((item) => item.id === selectedAddressId);
    if (!selectedExists) {
      setSelectedAddressId(defaultAddressId || addresses[0].id);
    }
  }, [addresses, defaultAddressId, selectedAddressId]);

  React.useEffect(() => {
    let unsubscribe = null;
    let mounted = true;

    const seedInventory = async () => {
      const snap = await getDocs(collection(db, INVENTORY_COLLECTION));
      const existingById = new Map(snap.docs.map((d) => [d.id, d.data() || {}]));

      await Promise.all(
        FRUITS.map((fruit) => {
          const existing = existingById.get(fruit.id);
          return setDoc(doc(db, INVENTORY_COLLECTION, fruit.id), {
            fruitId: fruit.id,
            name: fruit.name,
            emoji: fruit.emoji,
            price: fruit.price,
            unit: fruit.unit,
            description: fruit.description,
            stock: Number(existing?.stock ?? fruit.defaultStock ?? 0),
            updatedAt: new Date().toISOString(),
          });
        })
      );
    };

    const start = async () => {
      try {
        await seedInventory();
        unsubscribe = onSnapshot(collection(db, INVENTORY_COLLECTION), (snap) => {
          const next = {};
          snap.docs.forEach((d) => {
            next[d.id] = Number(d.data()?.stock ?? FRUIT_MAP[d.id]?.defaultStock ?? 0);
          });
          if (!mounted) return;
          setInventory(next);
        });
      } catch (error) {
        console.log('shop inventory load error:', error);
      }
    };

    start();
    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const notify = (title, msg) => {
    if (Platform.OS === 'web') window.alert(`${title}: ${msg}`);
    else Alert.alert(title, msg);
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
    // Navigator will automatically switch to Login screen when user becomes null
  };

  const selectedAddress = addresses.find((item) => item.id === selectedAddressId) || null;

  const openAddAddressModal = () => {
    setEditingAddress(null);
    setAddressModalVisible(true);
  };

  const handleAddressSaved = async (savedAddressId) => {
    await loadAddresses();
    if (savedAddressId) setSelectedAddressId(savedAddressId);
    setEditingAddress(null);
  };

  const handleSetDefaultAddress = async (addressId) => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, 'users_basic', user.uid), { defaultAddressId: addressId });
      setDefaultAddressId(addressId);
      setSelectedAddressId(addressId);
    } catch (error) {
      notify('Could not set default', error.message);
    }
  };

  const getAvailableStock = useCallback(
    (fruitId) => Number(inventory[fruitId] ?? FRUIT_MAP[fruitId]?.defaultStock ?? 0),
    [inventory]
  );

  const addToCart = (fruitId) => {
    if (!canOrder) {
      notify('Read Only', 'Inventory checker can only view available fruits.');
      return;
    }

    const available = getAvailableStock(fruitId);
    const current = cart[fruitId] || 0;

    if (current >= available) {
      const fruit = FRUIT_MAP[fruitId];
      notify('Out of Stock', `${fruit?.name || 'This fruit'} only has ${available} available.`);
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

  const cartItems = FRUITS.filter((f) => cart[f.id] > 0).map((f) => ({
    ...f, qty: cart[f.id], subtotal: cart[f.id] * f.price, available: getAvailableStock(f.id),
  }));

  const cartTotal = cartItems.reduce((sum, i) => sum + i.subtotal, 0);
  const cartCount = Object.values(cart).reduce((sum, v) => sum + v, 0);

  const handlePlaceOrder = async () => {
    if (!canOrder) {
      notify('Read Only', 'Inventory checker cannot place orders.');
      return;
    }

    if (cartItems.length === 0) {
      notify('Empty Cart', 'Add some fruits before ordering!');
      return;
    }

    if (!selectedAddress) {
      notify('Missing Address', 'Add or select a delivery address before placing the order.');
      return;
    }

    setOrdering(true);
    try {
      await runTransaction(db, async (transaction) => {
        const inventorySnapshot = {};

        for (const item of cartItems) {
          const fruitRef = doc(db, INVENTORY_COLLECTION, item.id);
          const fruitSnap = await transaction.get(fruitRef);
          const available = fruitSnap.exists()
            ? Number(fruitSnap.data()?.stock ?? 0)
            : Number(FRUIT_MAP[item.id]?.defaultStock ?? 0);

          if (available < item.qty) {
            throw new Error(`${item.name} only has ${available} left.`);
          }

          inventorySnapshot[item.id] = {
            ref: fruitRef,
            available,
            next: available - item.qty,
          };
        }

        const orderRef = doc(collection(db, 'orders'));
        transaction.set(orderRef, {
          userId: user.uid,
          userEmail: user.email,
          userName: user.name,
          items: cartItems.map(({ id, name, emoji, qty, price, subtotal }) => ({
            fruitId: id, name, emoji, qty, price, subtotal,
          })),
          total: cartTotal,
          status: 'pending',
          createdAt: new Date().toISOString(),
          deliveryAddress: {
            addressId: selectedAddress.id,
            label: selectedAddress.label || '',
            recipientName: selectedAddress.recipientName || '',
            phone: selectedAddress.phone || '',
            addressLine1: selectedAddress.addressLine1 || '',
            addressLine2: selectedAddress.addressLine2 || '',
            city: selectedAddress.city || '',
            province: selectedAddress.province || '',
            postalCode: selectedAddress.postalCode || '',
            instructions: selectedAddress.instructions || '',
            formatted: formatAddress(selectedAddress),
          },
        });

        Object.values(inventorySnapshot).forEach(({ ref, available, next }) => {
          transaction.set(ref, {
            fruitId: ref.id,
            name: FRUIT_MAP[ref.id]?.name || ref.id,
            emoji: FRUIT_MAP[ref.id]?.emoji || '🍎',
            price: FRUIT_MAP[ref.id]?.price ?? 0,
            unit: FRUIT_MAP[ref.id]?.unit || '',
            description: FRUIT_MAP[ref.id]?.description || '',
            stock: next,
            updatedAt: new Date().toISOString(),
            updatedBy: user.uid,
            previousStock: available,
          }, { merge: true });
        });
      });
      clearCart();
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
  const featuredAvailable = getAvailableStock(featuredFruit.id);

  if (!cartReady) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={PINK} />
        <Text style={styles.loadingText}>Loading your cart...</Text>
      </View>
    );
  }

  const handlePrevFruit = () => {
    setFeaturedIndex((prev) => (prev === 0 ? FRUITS.length - 1 : prev - 1));
  };

  const handleNextFruit = () => {
    setFeaturedIndex((prev) => (prev === FRUITS.length - 1 ? 0 : prev + 1));
  };

  const renderFruit = useCallback(({ item }) => {
    const qty = cart[item.id] || 0;
    const available = getAvailableStock(item.id);
    return (
      <View style={styles.fruitCard}>
        <View style={styles.fruitEmojiWrap}>
          <Text style={styles.fruitEmoji}>{item.emoji}</Text>
        </View>
        <Text style={styles.fruitName}>{item.name}</Text>
        {item.unit ? <Text style={styles.fruitUnit}>{item.unit}</Text> : null}
        <Text style={styles.fruitPrice}>₱{item.price}</Text>
        <Text style={styles.stockText}>Available: {available}</Text>

        {qty === 0 && available === 0 ? (
          <View style={styles.soldOutBadge}>
            <Text style={styles.soldOutText}>Sold out</Text>
          </View>
        ) : !canOrder ? (
          <View style={styles.inventoryStockBadge}>
            <Text style={styles.inventoryStockBadgeText}>{available} available</Text>
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
            <Pressable style={[styles.qtyBtn, qty >= available && styles.qtyBtnDisabled]} onPress={() => addToCart(item.id)} disabled={qty >= available}>
              <Text style={styles.qtyBtnText}>+</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }, [cart, getAvailableStock]);

  return (
    <View style={styles.root}>
      <AddressFormModal
        visible={addressModalVisible}
        onClose={() => {
          setAddressModalVisible(false);
          setEditingAddress(null);
        }}
        onSaved={handleAddressSaved}
        userId={user?.uid}
        editAddress={editingAddress}
        defaultAddressId={defaultAddressId}
      />

      <Sidebar
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        isAdmin={false}
        role={userRole}
        userName={user?.name || 'Guest'}
        onHome={() => {
          setMenuOpen(false);
          navigation.navigate('Home');
        }}
        onShop={() => {
          setMenuOpen(false);
          navigation.navigate('FruitShop');
        }}
        onMyOrders={() => {
          setMenuOpen(false);
          navigation.navigate('UserOrders');
        }}
        onAdminOrders={() => {}}
        onAdminUsers={() => {}}
        onInventoryDashboard={() => {
          setMenuOpen(false);
          navigation.navigate('InventoryDashboard');
        }}
        onUsersManagement={() => {}}
        onUsersManagementModal={() => {}}
      />

      {/* TOP BAR */}
      <View style={styles.topBar}>
        <Pressable style={styles.menuBtn} onPress={() => setMenuOpen(true)}>
          <View style={styles.hamburgerLine} />
          <View style={[styles.hamburgerLine, { width: 16 }]} />
          <View style={styles.hamburgerLine} />
        </Pressable>

        <View style={styles.topCenter}>
          <Text style={styles.pageTitle}>Fruit Shop</Text>
        </View>

        {canOrder ? (
          <Pressable style={styles.cartButton} onPress={() => setCartVisible(true)}>
            <Text style={styles.cartEmoji}>FC</Text>
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            )}
          </Pressable>
        ) : null}
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
          <View style={styles.featuredStockWrap}>
            <View style={styles.featuredStockPill}>
              <Text style={styles.featuredStockLabel}>Available</Text>
              <Text style={styles.featuredStockValue}>{featuredAvailable}</Text>
            </View>
          </View>

          {/* FEATURED FRUIT BUTTONS */}
          <View style={styles.featuredButtonsRow}>
            {canOrder && featuredQty === 0 && featuredAvailable === 0 ? (
              <View style={styles.soldOutBadge}>
                <Text style={styles.soldOutText}>Sold out</Text>
              </View>
            ) : canOrder && featuredQty === 0 ? (
              <Pressable
                style={({ pressed }) => [styles.addFeaturedBtn, pressed && styles.addFeaturedBtnPressed]}
                onPress={() => addToCart(featuredFruit.id)}
              >
                <Text style={styles.addFeaturedBtnText}>
                  Add {featuredFruit.name} to Cart →
                </Text>
              </Pressable>
            ) : canOrder ? (
              <View style={styles.featuredQtyRow}>
                <Pressable
                  style={styles.featuredQtyBtn}
                  onPress={() => removeFromCart(featuredFruit.id)}
                >
                  <Text style={styles.featuredQtyBtnText}>−</Text>
                </Pressable>
                <Text style={styles.featuredQtyNum}>{featuredQty}</Text>
                <Pressable
                  style={[styles.featuredQtyBtn, featuredQty >= featuredAvailable && styles.qtyBtnDisabled]}
                  onPress={() => addToCart(featuredFruit.id)}
                  disabled={featuredQty >= featuredAvailable}
                >
                  <Text style={styles.featuredQtyBtnText}>+</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {canOrder ? (
            <Pressable
              style={({ pressed }) => [styles.checkCartBtn, pressed && styles.checkCartBtnPressed]}
              onPress={() => setCartVisible(true)}
            >
              <Text style={styles.checkCartBtnText}>Check Cart</Text>
            </Pressable>
          ) : null}
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
      {canOrder && cartCount > 0 && (
        <Pressable style={styles.fab} onPress={() => setCartVisible(true)}>
          <Text style={styles.fabText}>🛍️  View Cart  ·  ₱{cartTotal}</Text>
        </Pressable>
      )}

      {/* CART MODAL */}
      <Modal visible={canOrder && cartVisible} transparent animationType="slide" onRequestClose={() => setCartVisible(false)}>
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
              <View style={styles.addressSection}>
                <View style={styles.addressSectionHeader}>
                  <Text style={styles.addressSectionTitle}>Delivery Address</Text>
                  <Pressable onPress={openAddAddressModal} style={({ pressed }) => [styles.addressMiniAction, pressed && styles.addressMiniActionPressed]}>
                    <Text style={styles.addressMiniActionText}>+ Add</Text>
                  </Pressable>
                </View>

                {addressLoading ? (
                  <View style={styles.addressLoadingRow}>
                    <ActivityIndicator color={PINK} />
                    <Text style={styles.addressLoadingText}>Loading saved addresses…</Text>
                  </View>
                ) : addresses.length === 0 ? (
                  <View style={styles.addressEmptyCard}>
                    <Text style={styles.addressEmptyEmoji}>📍</Text>
                    <Text style={styles.addressEmptyText}>No saved addresses yet.</Text>
                    <Pressable style={styles.addressEmptyBtn} onPress={openAddAddressModal}>
                      <Text style={styles.addressEmptyBtnText}>Add address</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.addressChoices}>
                    {addresses.map((address) => {
                      const isSelected = address.id === selectedAddressId;
                      const isDefault = address.id === defaultAddressId;
                      return (
                        <Pressable
                          key={address.id}
                          onPress={() => setSelectedAddressId(address.id)}
                          style={({ pressed }) => [
                            styles.addressChoiceCard,
                            isSelected && styles.addressChoiceCardSelected,
                            pressed && styles.addressChoiceCardPressed,
                          ]}
                        >
                          <View style={styles.addressChoiceTopRow}>
                            <View style={styles.addressChoiceTitleRow}>
                              <View style={[styles.addressRadio, isSelected && styles.addressRadioSelected]}>
                                {isSelected ? <View style={styles.addressRadioDot} /> : null}
                              </View>
                              <Text style={styles.addressChoiceLabel}>{address.label || 'Saved address'}</Text>
                              {isDefault ? <Text style={styles.addressDefaultTag}>Default</Text> : null}
                            </View>
                            <View style={styles.addressChoiceActions}>
                              {!isDefault ? (
                                <Pressable onPress={() => handleSetDefaultAddress(address.id)}>
                                  <Text style={styles.addressChoiceActionText}>Set default</Text>
                                </Pressable>
                              ) : null}
                              <Pressable
                                onPress={() => {
                                  setEditingAddress(address);
                                  setAddressModalVisible(true);
                                }}
                              >
                                <Text style={styles.addressChoiceActionText}>Edit</Text>
                              </Pressable>
                            </View>
                          </View>
                          <Text style={styles.addressChoiceSummary}>{formatAddress(address)}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>

              <View style={styles.cartItemsSection}>
                {cartItems.map((item) => (
                  <View key={item.id} style={styles.cartItem}>
                    <Text style={styles.cartItemEmoji}>{item.emoji}</Text>
                    <View style={styles.cartItemInfo}>
                      <Text style={styles.cartItemName}>{item.name}</Text>
                      {item.unit ? <Text style={styles.cartItemUnit}>{item.unit}</Text> : null}
                    </View>
                    <View style={styles.cartQtyRow}>
                      <Pressable style={styles.cartQtyBtn} onPress={() => removeFromCart(item.id)}>
                        <Text style={styles.cartQtyBtnText}>−</Text>
                      </Pressable>
                      <Text style={styles.cartQtyNum}>{item.qty}</Text>
                      <Pressable style={[styles.cartQtyBtn, item.qty >= item.available && styles.qtyBtnDisabled]} onPress={() => addToCart(item.id)} disabled={item.qty >= item.available}>
                        <Text style={styles.cartQtyBtnText}>+</Text>
                      </Pressable>
                    </View>
                    <Text style={styles.cartItemPrice}>₱{item.subtotal}</Text>
                  </View>
                ))}
              </View>
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

// ─── Screen Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF8FC' },
  loadingWrap: {
    flex: 1,
    backgroundColor: '#FFF8FC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },

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
  readOnlyPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  readOnlyPillText: {
    color: '#047857',
    fontWeight: '800',
    fontSize: 12,
  },
  inventoryStockBadge: {
    marginTop: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  inventoryStockBadgeText: {
    color: '#047857',
    fontWeight: '900',
    fontSize: 12,
  },

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
  fruitUnit: { fontSize: 10, color: '#D1D5DB', marginBottom: 4 },
  fruitPrice: { fontWeight: '900', color: '#dd2a7b', fontSize: 15, marginBottom: 10 },
  stockText: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 8,
    fontWeight: '700',
  },

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
  qtyBtnDisabled: { opacity: 0.45 },

  featuredStockWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  featuredStockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#DCFCE7',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  featuredStockLabel: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '700',
  },
  featuredStockValue: {
    color: '#065F46',
    fontSize: 20,
    fontWeight: '900',
    minWidth: 24,
    textAlign: 'center',
  },
  featuredStockHint: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  soldOutBadge: {
    alignSelf: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  soldOutText: {
    color: '#B91C1C',
    fontWeight: '800',
    fontSize: 12,
  },
  inventoryModeCard: {
    width: '100%',
    backgroundColor: '#FFF1F7',
    borderWidth: 1,
    borderColor: '#F9A8D4',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  inventoryModeTitle: {
    color: '#DB2777',
    fontWeight: '900',
    fontSize: 13,
    marginBottom: 4,
  },
  inventoryModeText: {
    color: '#9D174D',
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  inventoryStatusPill: {
    alignSelf: 'center',
    marginTop: 2,
    backgroundColor: '#FFF1F7',
    borderWidth: 1,
    borderColor: '#F9A8D4',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  inventoryStatusPillText: {
    color: '#DB2777',
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'center',
  },

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
  addressSection: {
    paddingBottom: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  addressSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addressSectionTitle: { fontSize: 14, fontWeight: '800', color: '#1a1a1a' },
  addressMiniAction: {
    backgroundColor: '#FFF0F7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  addressMiniActionPressed: { opacity: 0.8 },
  addressMiniActionText: { color: PINK, fontWeight: '800', fontSize: 11 },
  addressLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  addressLoadingText: { marginLeft: 8, color: '#6B7280', fontSize: 12 },
  addressEmptyCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 18,
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  addressEmptyEmoji: { fontSize: 30, marginBottom: 8 },
  addressEmptyText: { color: '#6B7280', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  addressEmptyBtn: {
    backgroundColor: PINK,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addressEmptyBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  addressChoices: { gap: 10 },
  addressChoiceCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#fff',
  },
  addressChoiceCardSelected: {
    borderColor: '#dd2a7b',
    backgroundColor: '#FFF8FC',
  },
  addressChoiceCardPressed: { opacity: 0.92 },
  addressChoiceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  addressChoiceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  addressRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressRadioSelected: { borderColor: '#dd2a7b' },
  addressRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#dd2a7b',
  },
  addressChoiceLabel: { fontSize: 14, fontWeight: '800', color: '#1a1a1a' },
  addressDefaultTag: {
    backgroundColor: '#DCFCE7',
    color: '#15803D',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  addressChoiceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  addressChoiceActionText: { fontSize: 11, fontWeight: '800', color: PINK },
  addressChoiceSummary: { marginTop: 10, fontSize: 12, color: '#4B5563', lineHeight: 18 },

  cartItemsSection: {
    paddingTop: 4,
  },
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
