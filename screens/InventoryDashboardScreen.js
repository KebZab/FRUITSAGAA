// screens/InventoryDashboardScreen.js
import React, { useState, useContext, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Modal, TextInput, Alert, Platform, ActivityIndicator,
  FlatList, RefreshControl,
} from 'react-native';
import { AuthContext } from '../contexts/AuthContext';
import {
  fetchAllFruits,
  createFruit,
  updateFruit,
  deleteFruit,
  setFruitAvailability,
  increaseStock,
  decreaseStock,
  subscribeAllFruits,
} from '../services/fruitService';
import MainLayout from '../components/layouts/AppLayout';

const PINK = '#dd2a7b';
const LOW_STOCK_THRESHOLD = 10;

// ─── Stock Warning Badge ────────────────────────────────────────────────────
function StockWarningBadge({ stock }) {
  if (stock > LOW_STOCK_THRESHOLD) return null;
  return (
    <View style={styles.warningBadge}>
      <Text style={styles.warningText}>⚠️ Low Stock</Text>
    </View>
  );
}

// ─── Fruit Item Card ────────────────────────────────────────────────────────
function FruitItemCard({ fruit, onEdit, onDelete, onToggleAvailability, onUpdateStock, onUpdatePrice }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.fruitCard}>
      <Pressable
        style={styles.cardHeader}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.cardTitle}>
          <Text style={styles.fruitName}>{fruit.name}</Text>
          {!fruit.isAvailable && <Text style={styles.unavailableTag}>Unavailable</Text>}
          <StockWarningBadge stock={fruit.stock} />
        </View>
        <Text style={styles.expandIcon}>{expanded ? '▼' : '▶'}</Text>
      </Pressable>

      {expanded && (
        <View style={styles.cardContent}>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Price:</Text>
            <Text style={styles.value}>₱{fruit.price}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Stock:</Text>
            <Text style={styles.value}>{fruit.stock} units</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Available:</Text>
            <Text style={styles.value}>{fruit.isAvailable ? '✅ Yes' : '❌ No'}</Text>
          </View>

          <View style={styles.buttonGroup}>
            <Pressable
              style={[styles.btn, styles.btnEdit]}
              onPress={() => onEdit(fruit)}
            >
              <Text style={styles.btnText}>✏️ Edit</Text>
            </Pressable>

            <Pressable
              style={[styles.btn, styles.btnStock]}
              onPress={() => onUpdateStock(fruit)}
            >
              <Text style={styles.btnText}>📦 Stock</Text>
            </Pressable>

            <Pressable
              style={[styles.btn, styles.btnPrice]}
              onPress={() => onUpdatePrice(fruit)}
            >
              <Text style={styles.btnText}>💰 Price</Text>
            </Pressable>

            <Pressable
              style={[styles.btn, fruit.isAvailable ? styles.btnDisable : styles.btnEnable]}
              onPress={() => onToggleAvailability(fruit)}
            >
              <Text style={styles.btnText}>{fruit.isAvailable ? '🚫 Disable' : '✅ Enable'}</Text>
            </Pressable>

            <Pressable
              style={[styles.btn, styles.btnDelete]}
              onPress={() => onDelete(fruit)}
            >
              <Text style={styles.btnText}>🗑️ Delete</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────
export default function InventoryDashboardScreen({ navigation }) {
  const { user, signOut } = useContext(AuthContext);
  const [fruits, setFruits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  // ── Modal states ─────────────────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);

  const [editingFruit, setEditingFruit] = useState(null);
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formStock, setFormStock] = useState('');
  const [stockAmount, setStockAmount] = useState('');
  const [priceAmount, setPriceAmount] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Subscribe to real-time updates ───────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeAllFruits((data) => {
      setFruits(data.sort((a, b) => a.name.localeCompare(b.name)));
      setLoading(false);
      setRefreshing(false);
    });
    return unsubscribe;
  }, []);

  // ── Add Fruit ────────────────────────────────────────────────────────────
  const handleAddFruit = async () => {
    if (!formName.trim() || !formPrice.trim() || !formStock.trim()) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setSaving(true);
    try {
      await createFruit({
        name: formName,
        price: parseFloat(formPrice),
        stock: parseInt(formStock),
        image: '',
        isAvailable: true,
      });
      setShowAddModal(false);
      setFormName('');
      setFormPrice('');
      setFormStock('');
      Alert.alert('Success', 'Fruit added successfully');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Edit Fruit ───────────────────────────────────────────────────────────
  const handleEditFruit = async () => {
    if (!formName.trim() || !formPrice.trim() || !formStock.trim()) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setSaving(true);
    try {
      await updateFruit(editingFruit.id, {
        name: formName,
        price: parseFloat(formPrice),
        stock: parseInt(formStock),
      });
      setShowEditModal(false);
      setEditingFruit(null);
      setFormName('');
      setFormPrice('');
      setFormStock('');
      Alert.alert('Success', 'Fruit updated successfully');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Update Stock ─────────────────────────────────────────────────────────
  const handleUpdateStock = async () => {
    if (!stockAmount.trim()) {
      Alert.alert('Error', 'Please enter amount');
      return;
    }

    const amount = parseInt(stockAmount);
    setSaving(true);
    try {
      if (amount > 0) {
        await increaseStock(editingFruit.id, amount);
        Alert.alert('Success', `Stock increased by ${amount}`);
      } else if (amount < 0) {
        await decreaseStock(editingFruit.id, Math.abs(amount));
        Alert.alert('Success', `Stock decreased by ${Math.abs(amount)}`);
      }
      setShowStockModal(false);
      setEditingFruit(null);
      setStockAmount('');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Update Price ────────────────────────────────────────────────────────
  const handleUpdatePrice = async () => {
    if (!priceAmount.trim()) {
      Alert.alert('Error', 'Please enter price');
      return;
    }

    setSaving(true);
    try {
      await updateFruit(editingFruit.id, {
        price: parseFloat(priceAmount),
      });
      setShowPriceModal(false);
      setEditingFruit(null);
      setPriceAmount('');
      Alert.alert('Success', 'Price updated successfully');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle Availability ──────────────────────────────────────────────────
  const handleToggleAvailability = async (fruit) => {
    Alert.alert(
      'Confirm',
      `${fruit.isAvailable ? 'Disable' : 'Enable'} this fruit?`,
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await setFruitAvailability(fruit.id, !fruit.isAvailable);
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  // ── Delete Fruit ─────────────────────────────────────────────────────────
  const handleDeleteFruit = (fruit) => {
    Alert.alert(
      'Delete Fruit',
      `Are you sure you want to delete ${fruit.name}?`,
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFruit(fruit.id);
              Alert.alert('Success', 'Fruit deleted');
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  // ── Modal Handlers ───────────────────────────────────────────────────────
  const openEditModal = (fruit) => {
    setEditingFruit(fruit);
    setFormName(fruit.name);
    setFormPrice(fruit.price.toString());
    setFormStock(fruit.stock.toString());
    setShowEditModal(true);
  };

  const openStockModal = (fruit) => {
    setEditingFruit(fruit);
    setStockAmount('');
    setShowStockModal(true);
  };

  const openPriceModal = (fruit) => {
    setEditingFruit(fruit);
    setPriceAmount(fruit.price.toString());
    setShowPriceModal(true);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllFruits().then((data) => {
      setFruits(data.sort((a, b) => a.name.localeCompare(b.name)));
      setRefreshing(false);
    });
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <MainLayout
      user={user}
      menuVisible={menuVisible}
      onMenuToggle={() => setMenuVisible(!menuVisible)}
      onMenuClose={() => setMenuVisible(false)}
      onNavigate={(screen) => {
        setMenuVisible(false);
        navigation.navigate(screen);
      }}
      onLogout={handleLogout}
      currentRole="inventory"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Inventory Manager</Text>
          <Pressable
            style={styles.addBtn}
            onPress={() => {
              setFormName('');
              setFormPrice('');
              setFormStock('');
              setShowAddModal(true);
            }}
          >
            <Text style={styles.addBtnText}>➕ Add Fruit</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={PINK} />
          </View>
        ) : (
          <FlatList
            data={fruits}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <FruitItemCard
                fruit={item}
                onEdit={openEditModal}
                onDelete={handleDeleteFruit}
                onToggleAvailability={handleToggleAvailability}
                onUpdateStock={openStockModal}
                onUpdatePrice={openPriceModal}
              />
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={PINK}
              />
            }
          />
        )}

        {/* ─── Add Fruit Modal ─── */}
        <Modal visible={showAddModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add New Fruit</Text>
              <TextInput
                style={styles.input}
                placeholder="Fruit Name"
                value={formName}
                onChangeText={setFormName}
              />
              <TextInput
                style={styles.input}
                placeholder="Price (₱)"
                value={formPrice}
                onChangeText={setFormPrice}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={styles.input}
                placeholder="Stock (units)"
                value={formStock}
                onChangeText={setFormStock}
                keyboardType="number-pad"
              />
              <View style={styles.modalButtons}>
                <Pressable
                  style={[styles.btn, styles.btnCancel]}
                  onPress={() => setShowAddModal(false)}
                >
                  <Text style={styles.btnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.btnSave]}
                  onPress={handleAddFruit}
                  disabled={saving}
                >
                  <Text style={styles.btnText}>{saving ? 'Saving...' : 'Add'}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* ─── Edit Fruit Modal ─── */}
        <Modal visible={showEditModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Fruit</Text>
              <TextInput
                style={styles.input}
                placeholder="Fruit Name"
                value={formName}
                onChangeText={setFormName}
              />
              <TextInput
                style={styles.input}
                placeholder="Price (₱)"
                value={formPrice}
                onChangeText={setFormPrice}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={styles.input}
                placeholder="Stock (units)"
                value={formStock}
                onChangeText={setFormStock}
                keyboardType="number-pad"
              />
              <View style={styles.modalButtons}>
                <Pressable
                  style={[styles.btn, styles.btnCancel]}
                  onPress={() => setShowEditModal(false)}
                >
                  <Text style={styles.btnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.btnSave]}
                  onPress={handleEditFruit}
                  disabled={saving}
                >
                  <Text style={styles.btnText}>{saving ? 'Saving...' : 'Update'}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* ─── Stock Modal ─── */}
        <Modal visible={showStockModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                Update Stock: {editingFruit?.name}
              </Text>
              <Text style={styles.stockInfo}>Current: {editingFruit?.stock} units</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount (+ to add, - to remove)"
                value={stockAmount}
                onChangeText={setStockAmount}
                keyboardType="number-pad"
              />
              <View style={styles.modalButtons}>
                <Pressable
                  style={[styles.btn, styles.btnCancel]}
                  onPress={() => setShowStockModal(false)}
                >
                  <Text style={styles.btnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.btnSave]}
                  onPress={handleUpdateStock}
                  disabled={saving}
                >
                  <Text style={styles.btnText}>{saving ? 'Updating...' : 'Update'}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* ─── Price Modal ─── */}
        <Modal visible={showPriceModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                Update Price: {editingFruit?.name}
              </Text>
              <Text style={styles.stockInfo}>Current: ₱{editingFruit?.price}</Text>
              <TextInput
                style={styles.input}
                placeholder="New Price (₱)"
                value={priceAmount}
                onChangeText={setPriceAmount}
                keyboardType="decimal-pad"
              />
              <View style={styles.modalButtons}>
                <Pressable
                  style={[styles.btn, styles.btnCancel]}
                  onPress={() => setShowPriceModal(false)}
                >
                  <Text style={styles.btnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.btnSave]}
                  onPress={handleUpdatePrice}
                  disabled={saving}
                >
                  <Text style={styles.btnText}>{saving ? 'Updating...' : 'Update'}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    backgroundColor: PINK,
    padding: 20,
    paddingTop: Platform.OS === 'web' ? 20 : 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  addBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addBtnText: {
    color: PINK,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  fruitCard: {
    backgroundColor: '#fff',
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
    borderLeftWidth: 4,
    borderLeftColor: PINK,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fafafa',
  },
  cardTitle: {
    flex: 1,
  },
  fruitName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  unavailableTag: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  expandIcon: {
    fontSize: 14,
    color: PINK,
  },
  cardContent: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  label: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  warningBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  warningText: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '600',
  },
  buttonGroup: {
    marginTop: 12,
    gap: 8,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 6,
  },
  btnEdit: {
    backgroundColor: '#3B82F6',
  },
  btnStock: {
    backgroundColor: '#8B5CF6',
  },
  btnPrice: {
    backgroundColor: '#10B981',
  },
  btnEnable: {
    backgroundColor: '#10B981',
  },
  btnDisable: {
    backgroundColor: '#EF4444',
  },
  btnDelete: {
    backgroundColor: '#F59E0B',
  },
  btnCancel: {
    backgroundColor: '#ccc',
  },
  btnSave: {
    backgroundColor: PINK,
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 14,
  },
  stockInfo: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
});
