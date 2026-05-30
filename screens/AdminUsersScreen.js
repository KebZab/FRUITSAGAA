// screens/AdminUsersScreen.js
import React, { useState, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Modal, TextInput, ActivityIndicator, Alert, Platform,
  RefreshControl,
} from 'react-native';
import MainLayout from '../components/layouts/AppLayout';
import { AuthContext } from '../contexts/AuthContext';
import { db, auth } from '../firebaseConfig';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

// ─── User Card ────────────────────────────────────────────────────────────────
function UserCard({ u, currentUserId, onToggleDisable, onChangeRole }) {
  const [toggling, setToggling] = useState(false);
  const isSelf = u.id === currentUserId;
  const role = u.role || 'user';
  const isAdmin = role === 'admin';
  const isInventoryChecker = role === 'inventoryChecker';
  const nextRole = role === 'user' ? 'inventoryChecker' : role === 'inventoryChecker' ? 'admin' : 'user';

  const handleToggle = async () => {
    if (isSelf) {
      const msg = "You can't disable your own account.";
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Not Allowed', msg);
      return;
    }
    const action = u.disabled ? 'enable' : 'disable';
    const doToggle = async () => {
      setToggling(true);
      await onToggleDisable(u.id, !u.disabled);
      setToggling(false);
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} "${u.firstname} ${u.lastname}"?`)) doToggle();
    } else {
      Alert.alert(
        `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
        `Are you sure you want to ${action} this account?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: action.charAt(0).toUpperCase() + action.slice(1), style: action === 'disable' ? 'destructive' : 'default', onPress: doToggle },
        ],
      );
    }
  };

  const handleRoleToggle = async () => {
    if (isSelf) return;
    const newRole = nextRole;
    const doChange = async () => {
      setToggling(true);
      await onChangeRole(u.id, newRole);
      setToggling(false);
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Change "${u.firstname}"'s role to ${newRole}?`)) doChange();
    } else {
      Alert.alert('Change Role', `Set role to "${newRole}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: doChange },
      ]);
    }
  };

  return (
    <View style={[card.container, u.disabled && card.containerDisabled]}>
      {/* Avatar + Info */}
      <View style={card.leftSection}>
        <View style={[card.avatar, isAdmin && card.avatarAdmin, isInventoryChecker && card.avatarInventory, u.disabled && card.avatarDisabled]}>
          <Text style={card.avatarText}>
            {(u.firstname?.[0] || u.email?.[0] || '?').toUpperCase()}
          </Text>
        </View>
        <View style={card.info}>
          <View style={card.nameRow}>
            <Text style={[card.name, u.disabled && card.nameDisabled]}>
              {u.firstname} {u.lastname}
            </Text>
            {isSelf && <View style={card.selfBadge}><Text style={card.selfText}>You</Text></View>}
          </View>
          <Text style={card.email} numberOfLines={1}>{u.email}</Text>
          <View style={card.badgeRow}>
            <View style={[
              card.roleBadge,
              isAdmin ? card.roleBadgeAdmin : isInventoryChecker ? card.roleBadgeInventory : card.roleBadgeUser,
            ]}>
              <Text style={[
                card.roleText,
                isAdmin ? card.roleTextAdmin : isInventoryChecker ? card.roleTextInventory : card.roleTextUser,
              ]}>
                {isAdmin ? '🛡️ Admin' : isInventoryChecker ? '📦 Inventory' : '👤 User'}
              </Text>
            </View>
            {u.disabled && (
              <View style={card.disabledBadge}>
                <Text style={card.disabledBadgeText}>🚫 Disabled</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Actions */}
      {!isSelf && (
        <View style={card.actions}>
          <Pressable
            style={[
              card.actionBtn,
              u.disabled ? card.enableBtn : card.disableBtn,
              toggling && { opacity: 0.6 },
            ]}
            onPress={handleToggle}
            disabled={toggling}
          >
            {toggling
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={card.actionBtnText}>{u.disabled ? 'Enable' : 'Disable'}</Text>
            }
          </Pressable>
          <Pressable
            style={[card.roleBtn, toggling && { opacity: 0.6 }]}
            onPress={handleRoleToggle}
            disabled={toggling}
          >
            <Text style={card.roleBtnText}>
              {`→ ${nextRole === 'admin' ? 'Admin' : nextRole === 'inventoryChecker' ? 'Inventory' : 'User'}`}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AdminUsersScreen({ navigation }) {
  const { user: currentUser } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all'); // 'all' | 'admin' | 'inventoryChecker' | 'user'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'active' | 'disabled'

  const fetchUsers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users_basic'));
      const fetched = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.firstname || '').localeCompare(b.firstname || ''));
      setUsers(fetched);
    } catch (e) {
      console.log('fetchUsers error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const onRefresh = () => { setRefreshing(true); fetchUsers(true); };

  const handleToggleDisable = async (userId, disabled) => {
    try {
      const userRef = doc(db, 'users_basic', userId);
      await updateDoc(userRef, { disabled });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, disabled } : u))
      );
    } catch (e) {
      console.log('toggleDisable error:', e);
    }
  };

  const handleChangeRole = async (userId, role) => {
    try {
      const userRef = doc(db, 'users_basic', userId);
      await updateDoc(userRef, { role });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role } : u))
      );
    } catch (e) {
      console.log('changeRole error:', e);
    }
  };

  // Filter + Search
  const filteredUsers = users.filter((u) => {
    const fullName = `${u.firstname || ''} ${u.lastname || ''} ${u.email || ''}`.toLowerCase();
    const matchSearch = search.trim() === '' || fullName.includes(search.toLowerCase());
    const userRole = u.role || 'user';
    const matchRole = filterRole === 'all' || userRole === filterRole;
    const matchStatus = filterStatus === 'all'
      || (filterStatus === 'active' && !u.disabled)
      || (filterStatus === 'disabled' && u.disabled);
    return matchSearch && matchRole && matchStatus;
  });

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === 'admin').length,
    inventory: users.filter((u) => u.role === 'inventoryChecker').length,
    disabled: users.filter((u) => u.disabled).length,
    active: users.filter((u) => !u.disabled).length,
  };

  return (
    <MainLayout title="Users" navigation={navigation} name={currentUser?.name}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#dd2a7b" />}
      >
        <View style={s.container}>
          {/* Header */}
          <View style={s.headerRow}>
            <View>
              <Text style={s.pageTitle}>User Management 👥</Text>
              <Text style={s.pageSubtitle}>View and manage accounts</Text>
            </View>
            <Pressable style={s.backBtn} onPress={() => navigation.navigate('AdminDashboard')}>
              <Text style={s.backBtnText}>← Orders</Text>
            </Pressable>
          </View>

          {/* Stats */}
          <View style={s.statsRow}>
            {[
              { label: 'Total', value: stats.total, color: '#6366F1' },
              { label: 'Admins', value: stats.admins, color: '#8B5CF6' },
              { label: 'Inventory', value: stats.inventory, color: '#10B981' },
              { label: 'Active', value: stats.active, color: '#10B981' },
              { label: 'Disabled', value: stats.disabled, color: '#EF4444' },
            ].map((stat) => (
              <View key={stat.label} style={[s.statCard, { borderTopColor: stat.color }]}>
                <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Search */}
          <View style={s.searchWrapper}>
            <Text style={s.searchIcon}>🔍</Text>
            <TextInput
              placeholder="Search by name or email..."
              placeholderTextColor="#bbb"
              value={search}
              onChangeText={setSearch}
              style={s.searchInput}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <Text style={s.clearBtn}>✕</Text>
              </Pressable>
            )}
          </View>

          {/* Filter Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
            <View style={s.chipRow}>
              {/* Role filter */}
              {['all', 'admin', 'inventoryChecker', 'user'].map((r) => (
                <Pressable
                  key={`role-${r}`}
                  style={[s.chip, filterRole === r && s.chipActive]}
                  onPress={() => setFilterRole(r)}
                >
                  <Text style={[s.chipText, filterRole === r && s.chipTextActive]}>
                    {r === 'all'
                      ? '👤 All Roles'
                      : r === 'admin'
                        ? '🛡️ Admins'
                        : r === 'inventoryChecker'
                          ? '📦 Inventory'
                          : '👤 Users'}
                  </Text>
                </Pressable>
              ))}
              <View style={s.chipDivider} />
              {/* Status filter */}
              {['all', 'active', 'disabled'].map((st) => (
                <Pressable
                  key={`status-${st}`}
                  style={[s.chip, filterStatus === st && s.chipActive]}
                  onPress={() => setFilterStatus(st)}
                >
                  <Text style={[s.chipText, filterStatus === st && s.chipTextActive]}>
                    {st === 'all' ? '🌐 All Status' : st === 'active' ? '✅ Active' : '🚫 Disabled'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* User List */}
          {loading ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color="#dd2a7b" />
            </View>
          ) : filteredUsers.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>🔍</Text>
              <Text style={s.emptyText}>No users found</Text>
            </View>
          ) : (
            <View style={s.userList}>
              {filteredUsers.map((u) => (
                <UserCard
                  key={u.id}
                  u={u}
                  currentUserId={currentUser?.uid}
                  onToggleDisable={handleToggleDisable}
                  onChangeRole={handleChangeRole}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </MainLayout>
  );
}

const PINK = '#dd2a7b';
const PURPLE = '#7C3AED';

const s = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a1a' },
  pageSubtitle: { fontSize: 13, color: '#888', marginTop: 2 },
  backBtn: {
    backgroundColor: '#EDE9FE',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backBtnText: { color: PURPLE, fontWeight: '700', fontSize: 13 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 3,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2 },

  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 10, color: '#1a1a1a' },
  clearBtn: { fontSize: 14, color: '#bbb', padding: 4 },

  chipScroll: { marginBottom: 14 },
  chipRow: { flexDirection: 'row', gap: 8, paddingRight: 16, alignItems: 'center' },
  chip: { backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { backgroundColor: '#FEE2E2' },
  chipText: { fontSize: 12, color: '#666' },
  chipTextActive: { color: PINK, fontWeight: '700' },
  chipDivider: { width: 1, height: 20, backgroundColor: '#e5e5e5', marginHorizontal: 4 },

  center: { paddingTop: 60, alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#999' },
  userList: { gap: 10 },
});

const card = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  containerDisabled: { backgroundColor: '#fafafa', opacity: 0.8 },
  leftSection: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#0095F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarAdmin: { backgroundColor: PURPLE },
  avatarInventory: { backgroundColor: '#10B981' },
  avatarDisabled: { backgroundColor: '#d1d5db' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  nameDisabled: { color: '#9ca3af' },
  selfBadge: { backgroundColor: '#DBEAFE', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  selfText: { fontSize: 10, color: '#3B82F6', fontWeight: '700' },
  email: { fontSize: 12, color: '#888', marginTop: 1 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 5, flexWrap: 'wrap' },
  roleBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  roleBadgeAdmin: { backgroundColor: '#EDE9FE' },
  roleBadgeInventory: { backgroundColor: '#DCFCE7' },
  roleBadgeUser: { backgroundColor: '#F3F4F6' },
  roleText: { fontSize: 11, fontWeight: '600' },
  roleTextAdmin: { color: PURPLE },
  roleTextInventory: { color: '#10B981' },
  roleTextUser: { color: '#6B7280' },
  disabledBadge: { backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  disabledBadgeText: { fontSize: 11, color: '#EF4444', fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  disableBtn: { backgroundColor: '#FEE2E2' },
  enableBtn: { backgroundColor: '#D1FAE5' },
  actionBtnText: { fontWeight: '700', fontSize: 13, color: '#1a1a1a' },
  roleBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  roleBtnText: { fontWeight: '700', fontSize: 13, color: '#6B7280' },
});