import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { collection, doc, getDocs, onSnapshot, runTransaction, setDoc } from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import MainLayout from '../components/layouts/AppLayout';
import { FRUITS, FRUIT_MAP, INVENTORY_COLLECTION } from '../data/fruitCatalog';

const FRUIT_ORDER = FRUITS.reduce((acc, fruit, index) => {
  acc[fruit.id] = index;
  return acc;
}, {});

function InventoryCard({ fruit, onAdjust, onEdit, saving }) {
  const isLowStock = fruit.stock <= 5;

  return (
    <View style={[card.container, isLowStock && card.containerLow]}>
      <View style={card.topRow}>
        <View style={card.emojiWrap}>
          <Text style={card.emoji}>{fruit.emoji}</Text>
        </View>
        <View style={card.info}>
          <Text style={card.name}>{fruit.name}</Text>
          <Text style={card.meta}>₱{fruit.price}</Text>
        </View>
        <View style={card.stockBox}>
          <Text style={card.stockLabel}>Available</Text>
          <Text style={[card.stockValue, isLowStock && card.stockLow]}>{fruit.stock}</Text>
        </View>
      </View>

      <View style={card.actionsRow}>
        <Pressable
          style={({ pressed }) => [
            card.actionBtn,
            card.minusBtn,
            saving && card.actionBtnDisabled,
            pressed && card.actionBtnPressed,
          ]}
          onPress={() => onAdjust(fruit.id, -1)}
          disabled={saving || fruit.stock <= 0}
        >
          <Text style={card.actionBtnText}>−1</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            card.actionBtn,
            card.plusBtn,
            saving && card.actionBtnDisabled,
            pressed && card.actionBtnPressed,
          ]}
          onPress={() => onAdjust(fruit.id, 1)}
          disabled={saving}
        >
          <Text style={card.actionBtnText}>+1</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            card.actionBtn,
            card.editBtn,
            saving && card.actionBtnDisabled,
            pressed && card.actionBtnPressed,
          ]}
          onPress={() => onEdit(fruit)}
          disabled={saving}
        >
          <Text style={card.actionBtnText}>Set Qty</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function InventoryDashboardScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editFruit, setEditFruit] = useState(null);
  const [editValue, setEditValue] = useState('');

  const orderedInventory = useMemo(
    () => [...inventory].sort((a, b) => (FRUIT_ORDER[a.id] ?? 999) - (FRUIT_ORDER[b.id] ?? 999)),
    [inventory]
  );

  const seedInventory = useCallback(async () => {
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
          updatedBy: user?.uid || null,
        });
      })
    );
  }, [user?.uid]);

  useEffect(() => {
    let unsubscribe = null;
    let mounted = true;

    const start = async () => {
      setLoading(true);
      try {
        await seedInventory();
        unsubscribe = onSnapshot(collection(db, INVENTORY_COLLECTION), (snap) => {
          const next = snap.docs.map((d) => {
            const data = d.data() || {};
            const fruit = FRUIT_MAP[d.id] || {};
            return {
              id: d.id,
              fruitId: data.fruitId || d.id,
              name: data.name || fruit.name || d.id,
              emoji: data.emoji || fruit.emoji || '🍎',
              price: data.price ?? fruit.price ?? 0,
              unit: data.unit ?? fruit.unit ?? '',
              description: data.description || fruit.description || '',
              stock: Number(data.stock ?? fruit.defaultStock ?? 0),
              updatedAt: data.updatedAt || null,
            };
          });
          if (!mounted) return;
          setInventory(next);
          setLoading(false);
          setRefreshing(false);
        });
      } catch (error) {
        console.log('inventory load error:', error);
        if (!mounted) return;
        setLoading(false);
        setRefreshing(false);
      }
    };

    start();

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [seedInventory]);

  const onRefresh = () => {
    setRefreshing(true);
  };

  const adjustStock = async (fruitId, delta) => {
    const fruit = inventory.find((item) => item.id === fruitId) || FRUIT_MAP[fruitId];
    if (!fruit) return;

    setSavingId(fruitId);
    try {
      await runTransaction(db, async (transaction) => {
        const ref = doc(db, INVENTORY_COLLECTION, fruitId);
        const snap = await transaction.get(ref);
        const current = snap.exists()
          ? Number(snap.data().stock ?? 0)
          : Number(fruit.defaultStock ?? 0);
        const next = current + delta;

        if (next < 0) {
          throw new Error('Stock cannot go below zero.');
        }

        transaction.set(ref, {
          fruitId,
          name: fruit.name,
          emoji: fruit.emoji,
          price: fruit.price,
          unit: fruit.unit,
          description: fruit.description,
          stock: next,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.uid || null,
        }, { merge: true });
      });
    } catch (error) {
      Alert.alert('Inventory Update Failed', error.message);
    } finally {
      setSavingId(null);
    }
  };

  const openEditModal = (fruit) => {
    setEditFruit(fruit);
    setEditValue(String(fruit.stock ?? 0));
    setEditOpen(true);
  };

  const saveExactStock = async () => {
    if (!editFruit) return;

    const parsed = Number.parseInt(editValue, 10);
    if (!Number.isInteger(parsed) || parsed < 0) {
      Alert.alert('Invalid Quantity', 'Enter a whole number that is zero or greater.');
      return;
    }

    setSavingId(editFruit.id);
    try {
      await runTransaction(db, async (transaction) => {
        const ref = doc(db, INVENTORY_COLLECTION, editFruit.id);
        transaction.set(ref, {
          fruitId: editFruit.id,
          name: editFruit.name,
          emoji: editFruit.emoji,
          price: editFruit.price,
          unit: editFruit.unit,
          description: editFruit.description,
          stock: parsed,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.uid || null,
        }, { merge: true });
      });
      setEditOpen(false);
      setEditFruit(null);
      setEditValue('');
    } catch (error) {
      Alert.alert('Inventory Update Failed', error.message);
    } finally {
      setSavingId(null);
    }
  };

  const stats = useMemo(() => {
    const total = orderedInventory.reduce((sum, item) => sum + item.stock, 0);
    const lowStock = orderedInventory.filter((item) => item.stock <= 5).length;
    const outOfStock = orderedInventory.filter((item) => item.stock === 0).length;
    return { total, lowStock, outOfStock };
  }, [orderedInventory]);

  return (
    <MainLayout title="Inventory" navigation={navigation} name={user?.name}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#dd2a7b" />}
      >
        <View style={s.container}>
          <View style={s.heroBanner}>
            <View style={s.heroCopy}>
              <Text style={s.pageTitle}>Inventory Dashboard 📦</Text>
              <Text style={s.pageSubtitle}>Track and adjust fruit quantities</Text>
            </View>
          </View>

          <View style={s.statsRow}>
            <View style={[s.statCard, { backgroundColor: '#FFF0F7' }]}>
              <Text style={[s.statValue, { color: '#dd2a7b' }]}>{stats.total}</Text>
              <Text style={s.statLabel}>Total Units</Text>
            </View>
            <View style={[s.statCard, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[s.statValue, { color: '#F59E0B' }]}>{stats.lowStock}</Text>
              <Text style={s.statLabel}>Low Stock</Text>
            </View>
            <View style={[s.statCard, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[s.statValue, { color: '#EF4444' }]}>{stats.outOfStock}</Text>
              <Text style={s.statLabel}>Out of Stock</Text>
            </View>
          </View>

          {loading ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color="#dd2a7b" />
            </View>
          ) : orderedInventory.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>🧺</Text>
              <Text style={s.emptyText}>No inventory found</Text>
            </View>
          ) : (
            <View style={s.list}>
              {orderedInventory.map((fruit) => (
                <InventoryCard
                  key={fruit.id}
                  fruit={fruit}
                  onAdjust={adjustStock}
                  onEdit={openEditModal}
                  saving={savingId === fruit.id}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={() => setEditOpen(false)}>
        <Pressable style={modal.backdrop} onPress={() => setEditOpen(false)}>
          <Pressable style={modal.card} onPress={() => {}}>
            <Text style={modal.title}>Set exact stock</Text>
            <Text style={modal.subtitle}>
              {editFruit ? `${editFruit.emoji} ${editFruit.name}` : 'Selected fruit'}
            </Text>

            <TextInput
              value={editValue}
              onChangeText={setEditValue}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor="#9CA3AF"
              style={modal.input}
            />

            <View style={modal.actions}>
              <Pressable style={[modal.btn, modal.cancelBtn]} onPress={() => setEditOpen(false)}>
                <Text style={modal.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[modal.btn, modal.saveBtn, savingId === editFruit?.id && { opacity: 0.7 }]}
                onPress={saveExactStock}
                disabled={savingId === editFruit?.id}
              >
                {savingId === editFruit?.id ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={modal.saveText}>Save</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </MainLayout>
  );
}

const card = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FCE7F3',
    elevation: 3,
    shadowColor: '#dd2a7b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  containerLow: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emojiWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFF0F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 24 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '800', color: '#111827' },
  meta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  stockBox: {
    alignItems: 'flex-end',
    minWidth: 72,
  },
  stockLabel: { fontSize: 10, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.6 },
  stockValue: { fontSize: 24, fontWeight: '900', color: '#dd2a7b' },
  stockLow: { color: '#F59E0B' },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  minusBtn: { backgroundColor: '#FEF2F2' },
  plusBtn: { backgroundColor: '#FFF0F7' },
  editBtn: { backgroundColor: '#FCE7F3' },
  actionBtnText: { fontSize: 14, fontWeight: '800', color: '#111827' },
  actionBtnDisabled: { opacity: 0.55 },
  actionBtnPressed: { opacity: 0.85 },
});

const modal = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 4, marginBottom: 14 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#F3F4F6' },
  saveBtn: { backgroundColor: '#dd2a7b' },
  cancelText: { color: '#374151', fontWeight: '800' },
  saveText: { color: '#fff', fontWeight: '800' },
});

const s = StyleSheet.create({
  container: { padding: 16, paddingBottom: 24, backgroundColor: '#FFF8FC', minHeight: '100%' },
  heroBanner: {
    backgroundColor: '#dd2a7b',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#dd2a7b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 5,
  },
  heroCopy: { flex: 1, paddingRight: 12 },
  heroEmoji: { fontSize: 46, marginLeft: 8 },
  pageTitle: { fontSize: 24, fontWeight: '900', color: '#fff' },
  pageSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4, lineHeight: 17 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1,
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2, fontWeight: '700' },
  center: { paddingTop: 60, alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#999' },
  list: { gap: 10 },
});
