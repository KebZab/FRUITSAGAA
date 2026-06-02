import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { collection, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const EMPTY_ADDRESS = {
  label: '',
  recipientName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  province: '',
  postalCode: '',
  instructions: '',
};

export default function AddressFormModal({
  visible,
  onClose,
  onSaved,
  userId,
  editAddress,
  defaultAddressId,
}) {
  const [form, setForm] = useState(EMPTY_ADDRESS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editAddress) {
      setForm({
        label: editAddress.label || '',
        recipientName: editAddress.recipientName || '',
        phone: editAddress.phone || '',
        addressLine1: editAddress.addressLine1 || '',
        addressLine2: editAddress.addressLine2 || '',
        city: editAddress.city || '',
        province: editAddress.province || '',
        postalCode: editAddress.postalCode || '',
        instructions: editAddress.instructions || '',
      });
    } else {
      setForm(EMPTY_ADDRESS);
    }
  }, [editAddress, visible]);

  const notify = (title, msg) => {
    if (Platform.OS === 'web') window.alert(`${title}: ${msg}`);
    else Alert.alert(title, msg);
  };

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!userId) {
      notify('Missing User', 'Please sign in again and try saving the address.');
      return;
    }

    const label = form.label.trim();
    const recipientName = form.recipientName.trim();
    const phone = form.phone.trim();
    const addressLine1 = form.addressLine1.trim();
    const city = form.city.trim();
    const province = form.province.trim();
    const postalCode = form.postalCode.trim();

    if (!label || !recipientName || !phone || !addressLine1 || !city || !province || !postalCode) {
      notify('Missing Fields', 'Please complete all required address fields.');
      return;
    }

    setSaving(true);
    try {
      const addressCollection = collection(db, 'users_basic', userId, 'addresses');
      const addressRef = editAddress?.id
        ? doc(addressCollection, editAddress.id)
        : doc(addressCollection);

      const payload = {
        label,
        recipientName,
        phone,
        addressLine1,
        addressLine2: form.addressLine2.trim(),
        city,
        province,
        postalCode,
        instructions: form.instructions.trim(),
        updatedAt: new Date().toISOString(),
        createdAt: editAddress?.createdAt || new Date().toISOString(),
      };

      if (editAddress?.id) {
        await updateDoc(addressRef, payload);
      } else {
        const batch = writeBatch(db);
        batch.set(addressRef, payload);

        if (!defaultAddressId) {
          const userRef = doc(db, 'users_basic', userId);
          batch.update(userRef, { defaultAddressId: addressRef.id });
        }

        await batch.commit();
      }

      onSaved?.(addressRef.id);
      onClose?.();
    } catch (error) {
      notify('Save Failed', error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={styles.backdrop}>
        <Pressable onPress={() => {}} style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{editAddress ? 'Edit Address' : 'Add Address'}</Text>
              <Text style={styles.subtitle}>Save it once and reuse it on future orders.</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
            <TextInput
              placeholder="Label e.g. Home, Office"
              placeholderTextColor="#9CA3AF"
              value={form.label}
              onChangeText={(value) => updateField('label', value)}
              style={styles.input}
            />
            <TextInput
              placeholder="Recipient name"
              placeholderTextColor="#9CA3AF"
              value={form.recipientName}
              onChangeText={(value) => updateField('recipientName', value)}
              style={styles.input}
            />
            <TextInput
              placeholder="Mobile number"
              placeholderTextColor="#9CA3AF"
              value={form.phone}
              onChangeText={(value) => updateField('phone', value)}
              keyboardType="phone-pad"
              style={styles.input}
            />
            <TextInput
              placeholder="Street / Building / House no."
              placeholderTextColor="#9CA3AF"
              value={form.addressLine1}
              onChangeText={(value) => updateField('addressLine1', value)}
              style={styles.input}
            />
            <TextInput
              placeholder="Apartment / Landmark (optional)"
              placeholderTextColor="#9CA3AF"
              value={form.addressLine2}
              onChangeText={(value) => updateField('addressLine2', value)}
              style={styles.input}
            />

            <View style={styles.row}>
              <TextInput
                placeholder="City"
                placeholderTextColor="#9CA3AF"
                value={form.city}
                onChangeText={(value) => updateField('city', value)}
                style={[styles.input, styles.half]}
              />
              <TextInput
                placeholder="Province"
                placeholderTextColor="#9CA3AF"
                value={form.province}
                onChangeText={(value) => updateField('province', value)}
                style={[styles.input, styles.half]}
              />
            </View>

            <TextInput
              placeholder="Postal code"
              placeholderTextColor="#9CA3AF"
              value={form.postalCode}
              onChangeText={(value) => updateField('postalCode', value)}
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              placeholder="Delivery instructions (optional)"
              placeholderTextColor="#9CA3AF"
              value={form.instructions}
              onChangeText={(value) => updateField('instructions', value)}
              style={[styles.input, styles.textArea]}
              multiline
            />
          </ScrollView>

          <View style={styles.footer}>
            <Pressable onPress={onClose} style={[styles.btn, styles.btnCancel]}>
              <Text style={styles.btnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSave} style={[styles.btn, styles.btnSave]} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSaveText}>Save Address</Text>}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 18,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
  subtitle: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  closeText: { color: '#374151', fontWeight: '800' },
  form: { paddingBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    backgroundColor: '#FAFAFA',
    color: '#111827',
    fontSize: 14,
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  half: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancel: { backgroundColor: '#F3F4F6' },
  btnCancelText: { color: '#374151', fontWeight: '700' },
  btnSave: { backgroundColor: '#dd2a7b' },
  btnSaveText: { color: '#fff', fontWeight: '800' },
});