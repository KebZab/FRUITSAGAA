// screens/AddressManagementScreen.js
import React, { useState, useContext, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Modal, TextInput, Alert, Platform, ActivityIndicator,
  FlatList, RefreshControl,
} from 'react-native';
import { AuthContext } from '../contexts/AuthContext';
import {
  fetchUserAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  subscribeUserAddresses,
} from '../services/addressService';
import MainLayout from '../components/layouts/AppLayout';

const PINK = '#dd2a7b';

// ─── Address Card ───────────────────────────────────────────────────────────
function AddressCard({ address, onEdit, onDelete, onSetDefault }) {
  return (
    <View style={styles.addressCard}>
      <View style={styles.cardTop}>
        <View style={styles.labelSection}>
          <Text style={styles.label}>{address.label}</Text>
          {address.isDefault && <Text style={styles.defaultBadge}>Default</Text>}
        </View>
        <Text style={styles.name}>{address.fullName}</Text>
      </View>

      <View style={styles.addressDetails}>
        <Text style={styles.detailText}>📞 {address.phoneNumber}</Text>
        <Text style={styles.detailText}>📍 {address.streetAddress}</Text>
        <Text style={styles.detailText}>{address.barangay}, {address.city}</Text>
        <Text style={styles.detailText}>{address.province} {address.postalCode}</Text>
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.btn, styles.btnSmall, styles.btnEdit]}
          onPress={() => onEdit(address)}
        >
          <Text style={styles.btnText}>✏️ Edit</Text>
        </Pressable>

        {!address.isDefault && (
          <Pressable
            style={[styles.btn, styles.btnSmall, styles.btnDefault]}
            onPress={() => onSetDefault(address)}
          >
            <Text style={styles.btnText}>⭐ Default</Text>
          </Pressable>
        )}

        <Pressable
          style={[styles.btn, styles.btnSmall, styles.btnDelete]}
          onPress={() => onDelete(address)}
        >
          <Text style={styles.btnText}>🗑️ Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────
export default function AddressManagementScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  // ── Modal states ─────────────────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  const [formLabel, setFormLabel] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formPhoneNumber, setFormPhoneNumber] = useState('');
  const [formStreetAddress, setFormStreetAddress] = useState('');
  const [formBarangay, setFormBarangay] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formProvince, setFormProvince] = useState('');
  const [formPostalCode, setFormPostalCode] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Subscribe to real-time updates ───────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    
    setLoading(true);
    const unsubscribe = subscribeUserAddresses(user.uid, (data) => {
      // Sort with default first
      const sorted = data.sort((a, b) => {
        if (a.isDefault) return -1;
        if (b.isDefault) return 1;
        return 0;
      });
      setAddresses(sorted);
      setLoading(false);
      setRefreshing(false);
    });
    return unsubscribe;
  }, [user?.uid]);

  // ── Add Address ──────────────────────────────────────────────────────────
  const handleAddAddress = async () => {
    if (
      !formLabel.trim() ||
      !formFullName.trim() ||
      !formPhoneNumber.trim() ||
      !formStreetAddress.trim() ||
      !formBarangay.trim() ||
      !formCity.trim() ||
      !formProvince.trim() ||
      !formPostalCode.trim()
    ) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setSaving(true);
    try {
      await createAddress(user.uid, {
        label: formLabel,
        fullName: formFullName,
        phoneNumber: formPhoneNumber,
        streetAddress: formStreetAddress,
        barangay: formBarangay,
        city: formCity,
        province: formProvince,
        postalCode: formPostalCode,
        isDefault: addresses.length === 0, // First address is default
      });
      resetForm();
      setShowAddModal(false);
      Alert.alert('Success', 'Address added successfully');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Edit Address ─────────────────────────────────────────────────────────
  const handleEditAddress = async () => {
    if (
      !formLabel.trim() ||
      !formFullName.trim() ||
      !formPhoneNumber.trim() ||
      !formStreetAddress.trim() ||
      !formBarangay.trim() ||
      !formCity.trim() ||
      !formProvince.trim() ||
      !formPostalCode.trim()
    ) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setSaving(true);
    try {
      await updateAddress(editingAddress.id, {
        label: formLabel,
        fullName: formFullName,
        phoneNumber: formPhoneNumber,
        streetAddress: formStreetAddress,
        barangay: formBarangay,
        city: formCity,
        province: formProvince,
        postalCode: formPostalCode,
      });
      resetForm();
      setShowEditModal(false);
      Alert.alert('Success', 'Address updated successfully');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Set as Default ───────────────────────────────────────────────────────
  const handleSetDefault = async (address) => {
    try {
      await setDefaultAddress(user.uid, address.id);
      Alert.alert('Success', 'Default address updated');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  // ── Delete Address ───────────────────────────────────────────────────────
  const handleDeleteAddress = (address) => {
    Alert.alert(
      'Delete Address',
      `Remove ${address.label}?`,
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAddress(address.id);
              Alert.alert('Success', 'Address deleted');
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  // ── Modal Handlers ───────────────────────────────────────────────────────
  const resetForm = () => {
    setFormLabel('');
    setFormFullName('');
    setFormPhoneNumber('');
    setFormStreetAddress('');
    setFormBarangay('');
    setFormCity('');
    setFormProvince('');
    setFormPostalCode('');
  };

  const openEditModal = (address) => {
    setEditingAddress(address);
    setFormLabel(address.label);
    setFormFullName(address.fullName);
    setFormPhoneNumber(address.phoneNumber);
    setFormStreetAddress(address.streetAddress);
    setFormBarangay(address.barangay);
    setFormCity(address.city);
    setFormProvince(address.province);
    setFormPostalCode(address.postalCode);
    setShowEditModal(true);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserAddresses(user.uid).then((data) => {
      const sorted = data.sort((a, b) => {
        if (a.isDefault) return -1;
        if (b.isDefault) return 1;
        return 0;
      });
      setAddresses(sorted);
      setRefreshing(false);
    });
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
      onLogout={() => {}} // Handled by menu
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Addresses</Text>
          <Pressable
            style={styles.addBtn}
            onPress={() => {
              resetForm();
              setShowAddModal(true);
            }}
          >
            <Text style={styles.addBtnText}>➕ Add Address</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={PINK} />
          </View>
        ) : addresses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No addresses yet</Text>
            <Text style={styles.emptySubtext}>Add your first delivery address</Text>
          </View>
        ) : (
          <FlatList
            data={addresses}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <AddressCard
                address={item}
                onEdit={openEditModal}
                onDelete={handleDeleteAddress}
                onSetDefault={handleSetDefault}
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

        {/* ─── Add Address Modal ─── */}
        <Modal visible={showAddModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <ScrollView style={styles.modalScroll}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Add New Address</Text>

                <Text style={styles.inputLabel}>Label (e.g., Home, Office)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Home"
                  value={formLabel}
                  onChangeText={setFormLabel}
                />

                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Juan Dela Cruz"
                  value={formFullName}
                  onChangeText={setFormFullName}
                />

                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="09123456789"
                  value={formPhoneNumber}
                  onChangeText={setFormPhoneNumber}
                  keyboardType="phone-pad"
                />

                <Text style={styles.inputLabel}>Street Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="123 Lacson Street"
                  value={formStreetAddress}
                  onChangeText={setFormStreetAddress}
                />

                <Text style={styles.inputLabel}>Barangay</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Barangay 12"
                  value={formBarangay}
                  onChangeText={setFormBarangay}
                />

                <Text style={styles.inputLabel}>City</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Bacolod City"
                  value={formCity}
                  onChangeText={setFormCity}
                />

                <Text style={styles.inputLabel}>Province</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Negros Occidental"
                  value={formProvince}
                  onChangeText={setFormProvince}
                />

                <Text style={styles.inputLabel}>Postal Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="6100"
                  value={formPostalCode}
                  onChangeText={setFormPostalCode}
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
                    onPress={handleAddAddress}
                    disabled={saving}
                  >
                    <Text style={styles.btnText}>{saving ? 'Saving...' : 'Add'}</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* ─── Edit Address Modal ─── */}
        <Modal visible={showEditModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <ScrollView style={styles.modalScroll}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Edit Address</Text>

                <Text style={styles.inputLabel}>Label (e.g., Home, Office)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Home"
                  value={formLabel}
                  onChangeText={setFormLabel}
                />

                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Juan Dela Cruz"
                  value={formFullName}
                  onChangeText={setFormFullName}
                />

                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="09123456789"
                  value={formPhoneNumber}
                  onChangeText={setFormPhoneNumber}
                  keyboardType="phone-pad"
                />

                <Text style={styles.inputLabel}>Street Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="123 Lacson Street"
                  value={formStreetAddress}
                  onChangeText={setFormStreetAddress}
                />

                <Text style={styles.inputLabel}>Barangay</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Barangay 12"
                  value={formBarangay}
                  onChangeText={setFormBarangay}
                />

                <Text style={styles.inputLabel}>City</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Bacolod City"
                  value={formCity}
                  onChangeText={setFormCity}
                />

                <Text style={styles.inputLabel}>Province</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Negros Occidental"
                  value={formProvince}
                  onChangeText={setFormProvince}
                />

                <Text style={styles.inputLabel}>Postal Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="6100"
                  value={formPostalCode}
                  onChangeText={setFormPostalCode}
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
                    onPress={handleEditAddress}
                    disabled={saving}
                  >
                    <Text style={styles.btnText}>{saving ? 'Saving...' : 'Update'}</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  listContent: {
    padding: 16,
  },
  addressCard: {
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
  cardTop: {
    padding: 16,
    backgroundColor: '#fafafa',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  labelSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: PINK,
  },
  defaultBadge: {
    fontSize: 11,
    backgroundColor: '#FEF3C7',
    color: '#D97706',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontWeight: '600',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  addressDetails: {
    padding: 16,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
    marginVertical: 4,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSmall: {
    flex: 1,
  },
  btnEdit: {
    backgroundColor: '#3B82F6',
  },
  btnDefault: {
    backgroundColor: '#10B981',
  },
  btnDelete: {
    backgroundColor: '#EF4444',
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
    paddingVertical: 40,
  },
  modalScroll: {
    flex: 1,
    paddingHorizontal: 12,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginVertical: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
});
