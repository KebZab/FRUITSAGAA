import React, { useContext, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import { AuthContext } from '../contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   emoji: '⏳', color: '#F59E0B', bg: '#FEF3C7' },
  confirmed: { label: 'Confirmed', emoji: '✅', color: '#3B82F6', bg: '#DBEAFE' },
  preparing: { label: 'Preparing', emoji: '👨‍🍳', color: '#8B5CF6', bg: '#EDE9FE' },
  ready:     { label: 'Ready',     emoji: '📦', color: '#10B981', bg: '#D1FAE5' },
  delivered: { label: 'Delivered', emoji: '🎉', color: '#6B7280', bg: '#F3F4F6' },
  cancelled: { label: 'Cancelled', emoji: '❌', color: '#EF4444', bg: '#FEE2E2' },
};

const QUICK_ACTIONS = [
  { icon: '🛒', label: 'Shop',     screen: 'FruitShop',  bg: '#FFF0F7', color: '#dd2a7b', border: '#F9A8D4' },
  { icon: '📋', label: 'Orders',   screen: 'UserOrders', bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  { icon: '👤', label: 'Profile',  screen: 'Profile',    bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
];

function SideMenu({ visible, onClose, navigation, logout }) {
  if (!visible) return null;
  return (
    <>
      <View style={menu.sidebar}>
        {/* Brand */}
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

function AvatarMenu({ visible, onProfile, onLogout, onClose }) {
  if (!visible) return null;

  return (
    <>
      <Pressable style={menu.avatarOverlay} onPress={onClose} />
      <View style={menu.avatarMenu}>
        <Pressable
          style={({ pressed }) => [menu.avatarMenuItem, pressed && menu.avatarMenuItemPressed]}
          onPress={onProfile}
        >
          <Text style={menu.avatarMenuProfileText}>Profile</Text>
        </Pressable>
        <View style={menu.avatarMenuDivider} />
        <Pressable
          style={({ pressed }) => [menu.avatarMenuItem, pressed && menu.avatarMenuItemPressed]}
          onPress={onLogout}
        >
          <Text style={menu.avatarMenuText}>Logout</Text>
        </Pressable>
      </View>
    </>
  );
}

export default function HomeScreen({ navigation }) {
  const { user, signOut } = useContext(AuthContext);
  const [recentOrders, setRecentOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  const handleLogout = async () => {
    setMenuOpen(false);
    setAvatarMenuOpen(false);
    await signOut();
  };

  const handleProfile = () => {
    setAvatarMenuOpen(false);
    navigation.navigate('Profile');
  };

  const fetchRecent = useCallback(async () => {
    try {
      const q = query(
        collection(db, 'orders'),
        where('userId', '==', user.uid)
      );
      const snap = await getDocs(q);

      const all = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 3);

      setRecentOrders(all);
    } catch (e) {
      console.log('fetchRecent error:', e);
    } finally {
      setRefreshing(false);
    }
  }, [user.uid]);

  React.useEffect(() => { fetchRecent(); }, [fetchRecent]);

  const onRefresh = () => { setRefreshing(true); fetchRecent(); };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.name?.split(' ')[0] || 'there';
  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF8FC" />

      <SideMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        navigation={navigation}
        logout={handleLogout}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PINK} />
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* TOP BAR */}
        <View style={styles.topBar}>
          <Pressable style={styles.menuBtn} onPress={() => setMenuOpen(true)}>
            <View style={styles.hamburgerLine} />
            <View style={[styles.hamburgerLine, { width: 16 }]} />
            <View style={styles.hamburgerLine} />
          </Pressable>

          <Pressable
            style={styles.avatar}
            onPress={() => setAvatarMenuOpen((v) => !v)}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </Pressable>
        </View>

        <AvatarMenu
          visible={avatarMenuOpen}
          onProfile={handleProfile}
          onLogout={handleLogout}
          onClose={() => setAvatarMenuOpen(false)}
        />

        {/* HERO BANNER */}
        <View style={styles.heroBanner}>
          <View style={styles.heroLeft}>
            <Text style={styles.greeting}>{getGreeting()} 👋</Text>
            <Text style={styles.heroName}>{firstName}!</Text>
            <Text style={styles.heroTagline}>Farm-fresh fruits, delivered fast 🚀</Text>

            <Pressable
              style={styles.heroBtn}
              onPress={() => navigation.navigate('FruitShop')}
            >
              <Text style={styles.heroBtnText}>Shop Now →</Text>
            </Pressable>
          </View>
          <Text style={styles.heroEmoji}>🍓</Text>
        </View>

        <View style={styles.content}>
          {/* QUICK ACTIONS */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            {QUICK_ACTIONS.map((action) => (
              <Pressable
                key={action.screen}
                style={({ pressed }) => [
                  styles.actionCard,
                  { backgroundColor: action.bg, borderColor: action.border },
                  pressed && styles.actionCardPressed,
                ]}
                onPress={() => navigation.navigate(action.screen)}
              >
                <Text style={styles.actionIcon}>{action.icon}</Text>
                <Text style={[styles.actionLabel, { color: action.color }]}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* RECENT ORDERS */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <Pressable onPress={() => navigation.navigate('UserOrders')}>
              <Text style={styles.seeAll}>See all →</Text>
            </Pressable>
          </View>

          {recentOrders.length === 0 ? (
            <Pressable
              style={styles.emptyCard}
              onPress={() => navigation.navigate('FruitShop')}
            >
              <Text style={styles.emptyEmoji}>🧺</Text>
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptySubtitle}>Tap to start shopping!</Text>
            </Pressable>
          ) : (
            <View style={styles.orderList}>
              {recentOrders.map((order) => {
                const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                const date = order.createdAt
                  ? new Date(order.createdAt).toLocaleDateString('en-PH', {
                      month: 'short', day: 'numeric',
                    })
                  : '';
                return (
                  <Pressable
                    key={order.id}
                    style={styles.orderCard}
                    onPress={() => navigation.navigate('UserOrders')}
                  >
                    <View style={styles.orderCardLeft}>
                      <Text style={styles.orderId}>
                        #{order.id.slice(-6).toUpperCase()}
                      </Text>
                      <Text style={styles.orderDate}>{date}</Text>
                    </View>
                    <View style={styles.orderCardRight}>
                      <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                        <Text style={[styles.statusText, { color: cfg.color }]}>
                          {cfg.emoji} {cfg.label}
                        </Text>
                      </View>
                      <Text style={styles.orderTotal}>₱{order.total}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* CTA BANNER */}
          <Pressable
            style={styles.ctaBanner}
            onPress={() => navigation.navigate('FruitShop')}
          >
            <View>
              <Text style={styles.ctaTitle}>Browse Fresh Fruits</Text>
              <Text style={styles.ctaSub}>Order farm-fresh produce today</Text>
            </View>
            <Text style={styles.ctaEmojis}>🍍🥭🍇</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PINK = '#dd2a7b';

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
    paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: 12, marginBottom: 4,
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
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 19,
  },
  avatarMenu: {
    position: 'absolute',
    top: 72,
    right: 16,
    width: 136,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECECEC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 8,
    overflow: 'hidden',
    zIndex: 20,
  },
  avatarMenuItem: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: '#fff',
    alignItems: 'flex-start',
  },
  avatarMenuDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  avatarMenuItemPressed: {
    backgroundColor: '#FFF7F7',
  },
  avatarMenuProfileText: {
    color: '#262626',
    fontWeight: '500',
    fontSize: 15,
  },
  avatarMenuText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 15,
  },
});

// ─── Screen Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF8FC' },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 20, paddingBottom: 10,
  },
  menuBtn: { gap: 5, padding: 4 },
  hamburgerLine: { width: 22, height: 2.5, backgroundColor: '#1a1a1a', borderRadius: 4 },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: PINK, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  heroBanner: {
    backgroundColor: PINK,
    marginHorizontal: 20, borderRadius: 24,
    padding: 24, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  heroLeft: { flex: 1 },
  greeting: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500', marginBottom: 2 },
  heroName: { fontSize: 28, color: '#fff', fontWeight: '900', letterSpacing: -0.5 },
  heroTagline: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 4, marginBottom: 14 },
  heroBtn: {
    backgroundColor: '#fff', alignSelf: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  heroBtnText: { color: PINK, fontWeight: '800', fontSize: 13 },
  heroEmoji: { fontSize: 56, marginLeft: 8 },

  content: { paddingHorizontal: 20, paddingTop: 24 },

  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1a1a1a', marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 24 },
  seeAll: { color: PINK, fontWeight: '700', fontSize: 13 },

  actionsRow: { flexDirection: 'row', gap: 10 },
  actionCard: {
    flex: 1, paddingVertical: 16, paddingHorizontal: 10,
    borderRadius: 16, alignItems: 'center', borderWidth: 1.5,
  },
  actionCardPressed: { opacity: 0.75 },
  actionIcon: { fontSize: 26, marginBottom: 6 },
  actionLabel: { fontSize: 12, fontWeight: '700' },

  emptyCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 30,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#F3F4F6', borderStyle: 'dashed',
  },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#374151' },
  emptySubtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },

  orderList: { gap: 10 },
  orderCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  orderCardLeft: {},
  orderId: { fontWeight: '800', fontSize: 14, color: '#1a1a1a' },
  orderDate: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  orderCardRight: { alignItems: 'flex-end', gap: 6 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  orderTotal: { fontWeight: '800', fontSize: 15, color: PINK },

  ctaBanner: {
    marginTop: 24, backgroundColor: '#fff',
    borderRadius: 20, padding: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#FCE7F3',
    shadowColor: PINK, shadowOpacity: 0.08, shadowRadius: 12, elevation: 2,
  },
  ctaTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  ctaSub: { fontSize: 12, color: '#9CA3AF', marginTop: 3 },
  ctaEmojis: { fontSize: 32 },
});
