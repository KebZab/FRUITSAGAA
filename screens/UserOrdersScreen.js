// screens/UserOrdersScreen.js
import React, { useState, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:   { label: 'Pending',   emoji: '⏳', color: '#F59E0B', bg: '#FEF3C7' },
  confirmed: { label: 'Confirmed', emoji: '✅', color: '#3B82F6', bg: '#DBEAFE' },
  preparing: { label: 'Preparing', emoji: '👨‍🍳', color: '#8B5CF6', bg: '#EDE9FE' },
  ready:     { label: 'Ready',     emoji: '📦', color: '#10B981', bg: '#D1FAE5' },
  delivered: { label: 'Delivered', emoji: '🎉', color: '#6B7280', bg: '#F3F4F6' },
  cancelled: { label: 'Cancelled', emoji: '❌', color: '#EF4444', bg: '#FEE2E2' },
};

const STATUS_STEPS = ['pending', 'confirmed', 'preparing', 'ready', 'delivered'];

const PINK = '#dd2a7b';

function formatDeliveryAddress(address) {
  if (!address) return '';

  const lines = [];

  if (address.label) lines.push(`Label: ${address.label}`);
  if (address.recipientName) lines.push(`Recipient: ${address.recipientName}`);
  if (address.phone) lines.push(`Phone: ${address.phone}`);
  if (address.addressLine1) lines.push(`Block / Street: ${address.addressLine1}`);
  if (address.addressLine2) lines.push(`Brgy / Landmark: ${address.addressLine2}`);

  const cityParts = [address.city, address.province].filter(Boolean).join(', ');
  if (cityParts) lines.push(`City / Province: ${cityParts}`);
  if (address.postalCode) lines.push(`Postal Code: ${address.postalCode}`);
  if (address.instructions) lines.push(`Instructions: ${address.instructions}`);

  return lines.join('\n');
}

// ─── Side Menu ────────────────────────────────────────────────────────────────
function SideMenu({ visible, onClose, navigation, logout }) {
  if (!visible) return null;
  return (
    <>
      <View style={menu.sidebar}>
        <View style={menu.brand}>
          <Text style={menu.brandEmoji}>🍓</Text>
          <Text style={menu.brandName}>FreshFruits</Text>
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
          onPress={logout}
        >
          <Text style={menu.logoutIcon}>🚪</Text>
          <Text style={menu.logoutText}>Sign Out</Text>
        </Pressable>
      </View>
      <Pressable style={menu.overlay} onPress={onClose} />
    </>
  );
}

// ─── Status Tracker ───────────────────────────────────────────────────────────
function StatusTracker({ status }) {
  const currentIndex = STATUS_STEPS.indexOf(status);
  if (currentIndex === -1) return null;

  return (
    <View style={tracker.container}>
      {STATUS_STEPS.map((step, i) => {
        const cfg = STATUS_CONFIG[step];
        const isActive = i <= currentIndex;
        const isCurrent = i === currentIndex;

        return (
          <React.Fragment key={step}>
            <View style={tracker.stepWrapper}>
              <View
                style={[
                  tracker.dot,
                  isActive ? { backgroundColor: cfg.color } : tracker.dotInactive,
                  isCurrent && { width: 30, height: 30, borderRadius: 15 },
                ]}
              >
                {isCurrent && <Text style={tracker.dotEmoji}>{cfg.emoji}</Text>}
              </View>
              <Text style={[tracker.stepLabel, isActive && { color: cfg.color, fontWeight: '600' }]}>
                {cfg.label}
              </Text>
            </View>
            {i < STATUS_STEPS.length - 1 && (
              <View style={[tracker.line, i < currentIndex && tracker.lineActive]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({ order }) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const deliveryAddress = order.deliveryAddress || order.deliveryAddressSnapshot || null;

  const date = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-PH', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : 'Unknown date';

  return (
    <View style={card.container}>
      <Pressable
        style={({ pressed }) => [card.header, pressed && { backgroundColor: '#FAFAFA' }]}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={card.headerLeft}>
          <Text style={card.orderId}>#{order.id.slice(-6).toUpperCase()}</Text>
          <Text style={card.orderDate}>{date}</Text>
        </View>
        <View style={card.headerRight}>
          <View style={[card.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Text style={[card.statusText, { color: statusCfg.color }]}>
              {statusCfg.emoji} {statusCfg.label}
            </Text>
          </View>
          <Text style={card.chevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </Pressable>

      {order.status !== 'cancelled' && (
        <View style={card.trackerWrapper}>
          <StatusTracker status={order.status} />
        </View>
      )}

      {expanded && (
        <View style={card.expanded}>
          <View style={card.divider} />

          {deliveryAddress ? (
            <View style={card.addressBox}>
              <Text style={card.addressTitle}>Delivery Address</Text>
              <Text style={card.addressText}>{formatDeliveryAddress(deliveryAddress)}</Text>
            </View>
          ) : null}

          <Text style={card.itemsTitle}>Items Ordered</Text>
          {(order.items || []).map((item, i) => (
            <View key={i} style={card.itemRow}>
              <Text style={card.itemEmoji}>{item.emoji}</Text>
              <Text style={card.itemName}>{item.name}</Text>
              <Text style={card.itemQty}>×{item.qty}</Text>
              <Text style={card.itemSubtotal}>₱{item.subtotal}</Text>
            </View>
          ))}
          <View style={card.totalRow}>
            <Text style={card.totalLabel}>Total</Text>
            <Text style={card.totalAmount}>₱{order.total}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function UserOrdersScreen({ navigation }) {
  const { user, signOut } = useContext(AuthContext);

  const [menuOpen, setMenuOpen] = useState(false);
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
  };

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const q = query(
        collection(db, 'orders'),
        where('userId', '==', user.uid)
      );
      const snap = await getDocs(q);

      const fetched = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setOrders(fetched);
    } catch (e) {
      console.log('fetchOrders error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user.uid]);

  React.useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const onRefresh = () => { setRefreshing(true); fetchOrders(true); };

  return (
    <View style={styles.root}>
      <SideMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        navigation={navigation}
        logout={handleLogout}
      />

      {/* TOP BAR */}
      <View style={styles.topBar}>
        <Pressable style={styles.menuBtn} onPress={() => setMenuOpen(true)}>
          <View style={styles.hamburgerLine} />
          <View style={[styles.hamburgerLine, { width: 16 }]} />
          <View style={styles.hamburgerLine} />
        </Pressable>

        <Text style={styles.pageTitle}>My Orders 📋</Text>

        <Pressable
          style={styles.newOrderBtn}
          onPress={() => navigation.navigate('FruitShop')}
        >
          <Text style={styles.newOrderText}>+ New</Text>
        </Pressable>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PINK} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={PINK} />
            <Text style={styles.loadingText}>Loading orders…</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🧺</Text>
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySubtitle}>
              Go to the shop and order fresh fruits!
            </Text>
            <Pressable
              style={styles.goShopBtn}
              onPress={() => navigation.navigate('FruitShop')}
            >
              <Text style={styles.goShopBtnText}>Browse Fruits</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.orderList}>
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Menu Styles ──────────────────────────────────────────────────────────────
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
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 32, paddingBottom: 16,
  },
  menuBtn: { gap: 5, padding: 4 },
  hamburgerLine: { width: 22, height: 2.5, backgroundColor: '#1a1a1a', borderRadius: 4 },
  pageTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  newOrderBtn: {
    backgroundColor: '#2563EB', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  newOrderText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  center: { paddingTop: 80, alignItems: 'center' },
  loadingText: { color: '#9CA3AF', marginTop: 12, fontSize: 13 },

  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 60, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginBottom: 24 },
  goShopBtn: {
    backgroundColor: PINK, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 20,
    shadowColor: PINK, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  goShopBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  orderList: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
});

// ─── Card Styles ──────────────────────────────────────────────────────────────
const card = StyleSheet.create({
  container: {
    backgroundColor: '#fff', borderRadius: 20,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    padding: 16, borderRadius: 20,
  },
  headerLeft: { flex: 1 },
  orderId: { fontWeight: '800', fontSize: 15, color: '#1a1a1a' },
  orderDate: { fontSize: 11, color: '#9CA3AF', marginTop: 3 },
  headerRight: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },
  chevron: { fontSize: 11, color: '#CBD5E1' },

  trackerWrapper: { paddingHorizontal: 16, paddingBottom: 16 },

  expanded: { paddingHorizontal: 16, paddingBottom: 16 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 12 },
  addressBox: {
    backgroundColor: '#FFF8FC',
    borderWidth: 1,
    borderColor: '#FCE7F3',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  addressTitle: { fontSize: 12, fontWeight: '800', color: PINK, marginBottom: 6 },
  addressText: { fontSize: 12, color: '#4B5563', lineHeight: 18 },
  itemsTitle: { fontWeight: '800', fontSize: 13, color: '#374151', marginBottom: 10 },

  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F9FAFB',
  },
  itemEmoji: { fontSize: 20, marginRight: 10 },
  itemName: { flex: 1, fontSize: 13, color: '#374151' },
  itemQty: { fontSize: 12, color: '#9CA3AF', marginRight: 12 },
  itemSubtotal: { fontWeight: '700', fontSize: 13, color: '#1a1a1a' },

  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  totalLabel: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  totalAmount: { fontSize: 18, fontWeight: '900', color: PINK },
});

// ─── Tracker Styles ───────────────────────────────────────────────────────────
const tracker = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center' },
  stepWrapper: { alignItems: 'center', width: 52 },
  dot: {
    width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  dotInactive: { backgroundColor: '#E5E7EB' },
  dotEmoji: { fontSize: 12 },
  stepLabel: { fontSize: 9, color: '#CBD5E1', textAlign: 'center' },
  line: { flex: 1, height: 2, backgroundColor: '#E5E7EB', marginBottom: 14 },
  lineActive: { backgroundColor: '#10B981' },
});