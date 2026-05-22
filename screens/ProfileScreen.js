// screens/ProfileScreen.js
import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { AuthContext } from '../contexts/AuthContext';

const PINK = '#dd2a7b';

// ─── Side Menu ───────────────────────────────────────────────────────────────
function SideMenu({ visible, onClose, navigation, onLogout }) {
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

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
    // Navigator will automatically switch to Login screen when user becomes null
  };

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

        {/* QUICK ACTIONS */}
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
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#9CA3AF',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 10, marginLeft: 4,
  },

  card: {
    backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  cardDivider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 52 },

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