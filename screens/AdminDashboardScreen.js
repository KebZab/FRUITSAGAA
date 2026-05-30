// screens/AdminDashboardScreen.js
import React, { useState, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Modal, ActivityIndicator, RefreshControl, Platform, Alert,
} from 'react-native';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import MainLayout from '../components/layouts/AppLayout';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:   { label: 'Pending',   emoji: '⏳', color: '#F59E0B', bg: '#FEF3C7' },
  confirmed: { label: 'Confirmed', emoji: '✅', color: '#3B82F6', bg: '#DBEAFE' },
  preparing: { label: 'Preparing', emoji: '👨‍🍳', color: '#8B5CF6', bg: '#EDE9FE' },
  ready:     { label: 'Ready',     emoji: '📦', color: '#10B981', bg: '#D1FAE5' },
  delivered: { label: 'Delivered', emoji: '🎉', color: '#6B7280', bg: '#F3F4F6' },
  cancelled: { label: 'Cancelled', emoji: '❌', color: '#EF4444', bg: '#FEE2E2' },
};

const NEXT_STATUS = {
  pending:   'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready:     'delivered',
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG);

// ─── Order Card ───────────────────────────────────────────────────────────────
function AdminOrderCard({ order, onUpdateStatus }) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const nextStatus = NEXT_STATUS[order.status];

  const date = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-PH', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—';

  const handleAdvance = async () => {
    if (!nextStatus) return;
    setUpdating(true);
    await onUpdateStatus(order.id, nextStatus);
    setUpdating(false);
  };

  const handleCancel = async () => {
    const doCancel = async () => {
      setUpdating(true);
      await onUpdateStatus(order.id, 'cancelled');
      setUpdating(false);
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Cancel order #${order.id.slice(-6).toUpperCase()}?`)) doCancel();
    } else {
      Alert.alert('Cancel Order', 'Are you sure?', [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: doCancel },
      ]);
    }
  };

  return (
    <View style={s.card}>
      <Pressable style={s.cardHeader} onPress={() => setExpanded(!expanded)}>
        <View style={s.cardLeft}>
          <Text style={s.orderId}>#{order.id.slice(-6).toUpperCase()}</Text>
          <Text style={s.userName}>{order.userName || order.userEmail}</Text>
          <Text style={s.orderDate}>{date}</Text>
        </View>
        <View style={s.cardRight}>
          <View style={[s.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Text style={[s.statusText, { color: statusCfg.color }]}>
              {statusCfg.emoji} {statusCfg.label}
            </Text>
          </View>
          <Text style={s.totalPill}>₱{order.total}</Text>
          <Text style={s.chevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </Pressable>

      {expanded && (
        <View style={s.expandedSection}>
          <View style={s.divider} />

          {/* Customer Info */}
          <Text style={s.sectionLabel}>Customer Information</Text>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Name:</Text>
            <Text style={s.infoValue}>{order.userName || '—'}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Email:</Text>
            <Text style={s.infoValue}>{order.userEmail || '—'}</Text>
          </View>

          {/* Delivery Address */}
          {order.deliveryAddress && (
            <>
              <Text style={s.sectionLabel}>Delivery Address</Text>
              <View style={s.addressBox}>
                <Text style={s.addressName}>{order.deliveryAddress.fullName}</Text>
                <Text style={s.addressPhone}>📞 {order.deliveryAddress.phoneNumber}</Text>
                <Text style={s.addressText}>{order.deliveryAddress.streetAddress}</Text>
                <Text style={s.addressText}>{order.deliveryAddress.barangay}, {order.deliveryAddress.city}</Text>
                <Text style={s.addressText}>{order.deliveryAddress.province} {order.deliveryAddress.postalCode}</Text>
              </View>
            </>
          )}

          {/* Items */}
          <Text style={s.sectionLabel}>Items</Text>
          {(order.items || []).map((item, i) => (
            <View key={i} style={s.itemRow}>
              <Text style={s.itemEmoji}>{item.emoji}</Text>
              <Text style={s.itemName}>{item.fruitName || item.name}</Text>
              <Text style={s.itemQty}>×{item.quantity || item.qty}</Text>
              <Text style={s.itemSubtotal}>₱{item.subtotal}</Text>
            </View>
          ))}

          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Order Total</Text>
            <Text style={s.totalAmount}>₱{order.total}</Text>
          </View>

          {/* Actions */}
          {order.status !== 'delivered' && order.status !== 'cancelled' && (
            <View style={s.actionsRow}>
              {nextStatus && (
                <Pressable
                  style={[s.advanceBtn, updating && { opacity: 0.6 }]}
                  onPress={handleAdvance}
                  disabled={updating}
                >
                  {updating
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.advanceBtnText}>
                        Mark as {STATUS_CONFIG[nextStatus].emoji} {STATUS_CONFIG[nextStatus].label}
                      </Text>
                  }
                </Pressable>
              )}
              <Pressable
                style={[s.cancelBtn, updating && { opacity: 0.6 }]}
                onPress={handleCancel}
                disabled={updating}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AdminDashboardScreen({ navigation }) {
  const { user, signOut } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'orders'));
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
  }, []);

  React.useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const onRefresh = () => { setRefreshing(true); fetchOrders(true); };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { status: newStatus });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch (e) {
      console.log('updateStatus error:', e);
    }
  };

  const filteredOrders = filterStatus === 'all'
    ? orders
    : orders.filter((o) => o.status === filterStatus);

  // Stats
  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    active: orders.filter((o) => ['confirmed','preparing','ready'].includes(o.status)).length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
  };

  return (
    <MainLayout title="Admin" navigation={navigation} name={user?.name}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#dd2a7b" />}
      >
        <View style={s.container}>
          {/* Header */}
          <View style={s.headerRow}>
            <View>
              <Text style={s.pageTitle}>Admin Panel 🛠️</Text>
              <Text style={s.pageSubtitle}>Manage all fruit orders</Text>
            </View>
            <View style={s.headerBtns}>
              <Pressable
                style={s.usersBtn}
                onPress={() => navigation.navigate('AdminUsers')}
              >
                <Text style={s.usersBtnText}>👥 Users</Text>
              </Pressable>
            </View>
          </View>

          {/* Stats */}
          <View style={s.statsRow}>
            {[
              { label: 'Total', value: stats.total, color: '#6366F1' },
              { label: 'Pending', value: stats.pending, color: '#F59E0B' },
              { label: 'Active', value: stats.active, color: '#8B5CF6' },
              { label: 'Done', value: stats.delivered, color: '#10B981' },
            ].map((stat) => (
              <View key={stat.label} style={[s.statCard, { borderTopColor: stat.color }]}>
                <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Filter Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll}>
            <View style={s.filterRow}>
              <Pressable
                style={[s.chip, filterStatus === 'all' && s.chipActive]}
                onPress={() => setFilterStatus('all')}
              >
                <Text style={[s.chipText, filterStatus === 'all' && s.chipTextActive]}>
                  All ({orders.length})
                </Text>
              </Pressable>
              {ALL_STATUSES.map((status) => {
                const cfg = STATUS_CONFIG[status];
                const count = orders.filter((o) => o.status === status).length;
                return (
                  <Pressable
                    key={status}
                    style={[
                      s.chip,
                      filterStatus === status && { ...s.chipActive, backgroundColor: cfg.bg },
                    ]}
                    onPress={() => setFilterStatus(status)}
                  >
                    <Text style={[
                      s.chipText,
                      filterStatus === status && { color: cfg.color, fontWeight: '700' },
                    ]}>
                      {cfg.emoji} {cfg.label} ({count})
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* Orders List */}
          {loading ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color="#dd2a7b" />
            </View>
          ) : filteredOrders.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>📭</Text>
              <Text style={s.emptyText}>No orders here</Text>
            </View>
          ) : (
            <View style={s.orderList}>
              {filteredOrders.map((order) => (
                <AdminOrderCard
                  key={order.id}
                  order={order}
                  onUpdateStatus={handleUpdateStatus}
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
const BLUE = '#0095F6';

const s = StyleSheet.create({
  container: { padding: 16, paddingBottom: 24 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a1a' },
  pageSubtitle: { fontSize: 13, color: '#888', marginTop: 2 },
  headerBtns: { flexDirection: 'row', gap: 8 },
  usersBtn: {
    backgroundColor: '#F3E8FF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  usersBtnText: { color: '#7C3AED', fontWeight: '700', fontSize: 13 },

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

  filterScroll: { marginBottom: 14 },
  filterRow: { flexDirection: 'row', gap: 8, paddingRight: 16 },
  chip: {
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: '#FEE2E2' },
  chipText: { fontSize: 12, color: '#666' },
  chipTextActive: { color: PINK, fontWeight: '700' },

  center: { paddingTop: 60, alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#999' },
  orderList: { gap: 10 },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 14,
  },
  cardLeft: { flex: 1 },
  orderId: { fontSize: 15, fontWeight: '800', color: '#1a1a1a' },
  userName: { fontSize: 13, color: '#555', marginTop: 1 },
  orderDate: { fontSize: 11, color: '#bbb', marginTop: 1 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  totalPill: { fontSize: 14, fontWeight: '800', color: PINK },
  chevron: { fontSize: 11, color: '#bbb' },

  expandedSection: { paddingHorizontal: 14, paddingBottom: 14 },
  divider: { height: 1, backgroundColor: '#f5f5f5', marginBottom: 12 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#888', marginBottom: 8 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f9f9f9',
  },
  infoLabel: { fontSize: 12, fontWeight: '600', color: '#888' },
  infoValue: { fontSize: 12, color: '#333', flex: 1, textAlign: 'right' },
  addressBox: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: PINK,
    marginBottom: 12,
  },
  addressName: { fontSize: 13, fontWeight: '700', color: '#1a1a1a', marginBottom: 6 },
  addressPhone: { fontSize: 12, color: '#666', marginBottom: 4 },
  addressText: { fontSize: 12, color: '#666', lineHeight: 16, marginVertical: 2 },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  itemEmoji: { fontSize: 18, marginRight: 8 },
  itemName: { flex: 1, fontSize: 13, color: '#333' },
  itemQty: { fontSize: 13, color: '#888', marginRight: 12 },
  itemSubtotal: { fontSize: 13, fontWeight: '700', color: '#1a1a1a', minWidth: 50, textAlign: 'right' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
    paddingTop: 8,
    marginTop: 6,
    marginBottom: 12,
  },
  totalLabel: { fontSize: 13, color: '#888' },
  totalAmount: { fontSize: 15, fontWeight: '800', color: PINK },
  actionsRow: { flexDirection: 'row', gap: 8 },
  advanceBtn: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  advanceBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cancelBtn: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 13 },
});