// screens/ProfileScreen.js
import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { AuthContext } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import { collection, deleteDoc, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import AddressFormModal from '../components/AddressFormModal';

const PINK = '#dd2a7b';

function formatAddress(address) {
  const lineTwoParts = [address.city, address.province, address.postalCode].filter(Boolean);
  const lines = [
    address.addressLine1,
    address.addressLine2,
    lineTwoParts.join(', '),
    address.instructions,
  ].filter((item) => item && item.trim());

  return lines.join('\n');
}

// ─── Info Row ────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Text style={styles.infoIcon}>{icon}</Text>
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function ProfileScreen({ navigation }) {
  const { user, signOut } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const userRole = user?.role || 'user';
  const isAdmin = userRole === 'admin';
  const isInventoryChecker = userRole === 'inventoryChecker';
  const isCustomer = !isAdmin && !isInventoryChecker;
  const [addresses, setAddresses] = useState([]);
  const [defaultAddressId, setDefaultAddressId] = useState(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [savingDefaultId, setSavingDefaultId] = useState(null);
  const [deletingAddressId, setDeletingAddressId] = useState(null);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
    // Navigator will automatically switch to Login screen when user becomes null
  };

  useEffect(() => {
    if (!user?.uid || !isCustomer) {
      setAddresses([]);
      setDefaultAddressId(null);
      setLoadingAddresses(false);
      return;
    }

    let mounted = true;

    const loadAddresses = async () => {
      setLoadingAddresses(true);
      try {
        const userRef = doc(db, 'users_basic', user.uid);
        const [userSnap, addressesSnap] = await Promise.all([
          getDoc(userRef),
          getDocs(collection(db, 'users_basic', user.uid, 'addresses')),
        ]);

        if (!mounted) return;

        setDefaultAddressId(userSnap.exists() ? userSnap.data()?.defaultAddressId || null : null);
        setAddresses(
          addressesSnap.docs
            .map((item) => ({ id: item.id, ...item.data() }))
            .sort((a, b) => {
              if (a.label && b.label) return a.label.localeCompare(b.label);
              return (b.createdAt || '').localeCompare(a.createdAt || '');
            })
        );
      } catch (error) {
        console.log('loadAddresses error:', error);
      } finally {
        if (mounted) setLoadingAddresses(false);
      }
    };

    loadAddresses();

    return () => {
      mounted = false;
    };
  }, [isCustomer, user?.uid]);

  const reloadAddresses = async () => {
    if (!user?.uid || !isCustomer) return;

    try {
      const userRef = doc(db, 'users_basic', user.uid);
      const [userSnap, addressesSnap] = await Promise.all([
        getDoc(userRef),
        getDocs(collection(db, 'users_basic', user.uid, 'addresses')),
      ]);

      setDefaultAddressId(userSnap.exists() ? userSnap.data()?.defaultAddressId || null : null);
      setAddresses(
        addressesSnap.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .sort((a, b) => {
            if (a.label && b.label) return a.label.localeCompare(b.label);
            return (b.createdAt || '').localeCompare(a.createdAt || '');
          })
      );
    } catch (error) {
      console.log('reloadAddresses error:', error);
    }
  };

  const handleAddressSaved = async () => {
    await reloadAddresses();
  };

  const handleSetDefault = async (addressId) => {
    if (!user?.uid || !isCustomer) return;
    setSavingDefaultId(addressId);
    try {
      await updateDoc(doc(db, 'users_basic', user.uid), { defaultAddressId: addressId });
      setDefaultAddressId(addressId);
    } catch (error) {
      Alert.alert('Could not set default', error.message);
    } finally {
      setSavingDefaultId(null);
    }
  };

  const handleDeleteAddress = (address) => {
    if (!user?.uid || !isCustomer) return;

    const confirmDelete = async () => {
      setDeletingAddressId(address.id);
      try {
        await deleteDoc(doc(db, 'users_basic', user.uid, 'addresses', address.id));

        const nextAddresses = addresses.filter((item) => item.id !== address.id);
        const nextDefault = defaultAddressId === address.id ? nextAddresses[0]?.id || null : defaultAddressId;

        await updateDoc(doc(db, 'users_basic', user.uid), { defaultAddressId: nextDefault });
        setDefaultAddressId(nextDefault);
        setAddresses(nextAddresses);
      } catch (error) {
        Alert.alert('Delete failed', error.message);
      } finally {
        setDeletingAddressId(null);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete ${address.label || 'this address'}?`)) {
        confirmDelete();
      }
      return;
    }

    Alert.alert('Delete address?', `Remove ${address.label || 'this address'} from saved addresses?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: confirmDelete },
    ]);
  };

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
        isAdmin={isAdmin}
        role={userRole}
        userName={user?.name || 'User'}
        onHome={() => {
          setMenuOpen(false);
          navigation.navigate(isAdmin ? 'AdminDashboard' : isInventoryChecker ? 'InventoryDashboard' : 'Home');
        }}
        onAdminOrders={() => {
          setMenuOpen(false);
          navigation.navigate('AdminDashboard');
        }}
        onAdminUsers={() => {
          setMenuOpen(false);
          navigation.navigate('AdminUsers');
        }}
        onInventoryDashboard={() => {
          setMenuOpen(false);
          navigation.navigate('InventoryDashboard');
        }}
        onShop={() => {
          setMenuOpen(false);
          navigation.navigate('FruitShop');
        }}
        onMyOrders={() => {
          setMenuOpen(false);
          navigation.navigate('UserOrders');
        }}
      />

      {/* TOP BAR */}
      <View style={styles.topBar}>
        <Pressable style={styles.menuBtn} onPress={() => setMenuOpen(true)}>
          <View style={styles.hamburgerLine} />
          <View style={[styles.hamburgerLine, { width: 16 }]} />
          <View style={styles.hamburgerLine} />
        </Pressable>
        <View style={styles.topCenter}>
          <Text style={styles.pageTitle}>Profile 👤</Text>
        </View>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* AVATAR CARD */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarRing}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          </View>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
          <View style={styles.memberBadge}>
            <Text style={styles.memberBadgeText}>🌿 Active Member</Text>
          </View>
        </View>

        {/* ACCOUNT INFO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Info</Text>
          <View style={styles.card}>
            <InfoRow icon="👤" label="Full Name" value={user?.name} />
            <View style={styles.cardDivider} />
            <InfoRow icon="✉️"  label="Email"     value={user?.email} />
            <View style={styles.cardDivider} />
            <InfoRow icon="🆔" label="User ID"   value={user?.uid} />
          </View>
        </View>

        {isCustomer ? (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Delivery Addresses</Text>
              <Pressable
                style={({ pressed }) => [styles.addAddressBtn, pressed && styles.addAddressBtnPressed]}
                onPress={() => {
                  setEditingAddress(null);
                  setAddressModalVisible(true);
                }}
              >
                <Text style={styles.addAddressBtnText}>+ Add</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              {loadingAddresses ? (
                <View style={styles.addressLoading}>
                  <ActivityIndicator color={PINK} />
                  <Text style={styles.addressLoadingText}>Loading addresses...</Text>
                </View>
              ) : addresses.length === 0 ? (
                <View style={styles.emptyAddressState}>
                  <Text style={styles.emptyAddressEmoji}>📍</Text>
                  <Text style={styles.emptyAddressTitle}>No saved addresses yet</Text>
                  <Text style={styles.emptyAddressText}>
                    Add one here or during checkout so you can reuse it next time.
                  </Text>
                  <Pressable
                    style={styles.addFirstAddressBtn}
                    onPress={() => {
                      setEditingAddress(null);
                      setAddressModalVisible(true);
                    }}
                  >
                    <Text style={styles.addFirstAddressBtnText}>Add your first address</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.addressList}>
                  {addresses.map((address) => {
                    const isDefault = address.id === defaultAddressId;
                    const isBusy = savingDefaultId === address.id || deletingAddressId === address.id;

                    return (
                      <View key={address.id} style={styles.addressCard}>
                        <View style={styles.addressCardTopRow}>
                          <View style={styles.addressLabelRow}>
                            <Text style={styles.addressLabel}>{address.label || 'Saved address'}</Text>
                            {isDefault ? (
                              <View style={styles.defaultBadge}>
                                <Text style={styles.defaultBadgeText}>Default</Text>
                              </View>
                            ) : null}
                          </View>
                          <View style={styles.addressActionRow}>
                            {!isDefault ? (
                              <Pressable
                                onPress={() => handleSetDefault(address.id)}
                                disabled={isBusy}
                                style={({ pressed }) => [styles.addressActionBtn, pressed && styles.addressActionBtnPressed]}
                              >
                                <Text style={styles.addressActionText}>Set default</Text>
                              </Pressable>
                            ) : null}
                            <Pressable
                              onPress={() => {
                                setEditingAddress(address);
                                setAddressModalVisible(true);
                              }}
                              style={({ pressed }) => [styles.addressActionBtn, pressed && styles.addressActionBtnPressed]}
                            >
                              <Text style={styles.addressActionText}>Edit</Text>
                            </Pressable>
                            <Pressable
                              onPress={() => handleDeleteAddress(address)}
                              disabled={isBusy}
                              style={({ pressed }) => [styles.addressActionBtn, pressed && styles.addressActionBtnPressed]}
                            >
                              <Text style={styles.addressDeleteText}>
                                {deletingAddressId === address.id ? 'Removing...' : 'Delete'}
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                        <Text style={styles.addressSummary}>{formatAddress(address)}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        ) : null}

        {isCustomer ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              <Pressable
                style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
                onPress={() => navigation.navigate('FruitShop')}
              >
                <Text style={styles.actionEmoji}>🛒</Text>
                <Text style={styles.actionLabel}>Shop</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
                onPress={() => navigation.navigate('UserOrders')}
              >
                <Text style={styles.actionEmoji}>📋</Text>
                <Text style={styles.actionLabel}>My Orders</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
                onPress={() => navigation.navigate('Home')}
              >
                <Text style={styles.actionEmoji}>🏠</Text>
                <Text style={styles.actionLabel}>Home</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* SIGN OUT */}
        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [styles.signOutBtn, pressed && styles.signOutBtnPressed]}
            onPress={handleLogout}
          >
            <Text style={styles.signOutIcon}>🚪</Text>
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

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

  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },

  avatarCard: {
    backgroundColor: '#fff', borderRadius: 24, paddingVertical: 32,
    alignItems: 'center', marginBottom: 24,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 14, elevation: 4,
  },
  avatarRing: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 3, borderColor: PINK,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14, padding: 3,
  },
  avatarCircle: {
    flex: 1, width: '100%', borderRadius: 50,
    backgroundColor: '#FFF0F7',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitials: { fontSize: 30, fontWeight: '900', color: PINK },
  userName: { fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginBottom: 4 },
  userEmail: { fontSize: 13, color: '#9CA3AF', marginBottom: 14 },
  memberBadge: {
    backgroundColor: '#F0FDF4', paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: '#BBF7D0',
  },
  memberBadgeText: { fontSize: 12, color: '#16A34A', fontWeight: '600' },

  section: { marginBottom: 20 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#9CA3AF',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginLeft: 4,
  },

  card: {
    backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  cardDivider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 52 },

  addAddressBtn: {
    backgroundColor: '#FFF0F7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  addAddressBtnPressed: { opacity: 0.8 },
  addAddressBtnText: { color: PINK, fontWeight: '800', fontSize: 12 },

  addressLoading: { alignItems: 'center', paddingVertical: 14 },
  addressLoadingText: { marginTop: 8, color: '#6B7280', fontSize: 12 },
  emptyAddressState: { alignItems: 'center', paddingVertical: 14 },
  emptyAddressEmoji: { fontSize: 32, marginBottom: 8 },
  emptyAddressTitle: { fontSize: 15, fontWeight: '800', color: '#1a1a1a' },
  emptyAddressText: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 6, marginBottom: 12 },
  addFirstAddressBtn: {
    backgroundColor: PINK,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addFirstAddressBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  addressList: { gap: 12 },
  addressCard: {
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#FCFCFD',
  },
  addressCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  addressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  addressLabel: { fontSize: 15, fontWeight: '800', color: '#111827' },
  defaultBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  defaultBadgeText: { color: '#15803D', fontSize: 11, fontWeight: '800' },
  addressActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  addressActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  addressActionBtnPressed: { opacity: 0.8 },
  addressActionText: { fontSize: 11, fontWeight: '700', color: '#374151' },
  addressDeleteText: { fontSize: 11, fontWeight: '700', color: '#DC2626' },
  addressSummary: { marginTop: 10, fontSize: 12, color: '#4B5563', lineHeight: 18 },

  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  infoIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#FFF0F7', justifyContent: 'center', alignItems: 'center',
    marginRight: 14,
  },
  infoIcon: { fontSize: 16 },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#1a1a1a', fontWeight: '600' },

  actionsGrid: { flexDirection: 'row', gap: 12 },
  actionCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 20,
    paddingVertical: 18, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  actionCardPressed: { backgroundColor: '#FFF0F7' },
  actionEmoji: { fontSize: 26, marginBottom: 6 },
  actionLabel: { fontSize: 12, fontWeight: '700', color: '#1a1a1a' },

  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFF0F7', borderRadius: 20,
    paddingVertical: 16, gap: 8,
    borderWidth: 1, borderColor: '#FCE7F3',
  },
  signOutBtnPressed: { backgroundColor: '#FCE7F3' },
  signOutIcon: { fontSize: 18 },
  signOutText: { fontSize: 15, fontWeight: '700', color: PINK },
});
