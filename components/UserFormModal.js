import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, Pressable,
  StyleSheet, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { setDoc, updateDoc, doc, collection } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function UserFormModal({ visible, onClose, onSaved, editUser }) {
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const isEditing = !!editUser;

  useEffect(() => {
    if (editUser) {
      setFirstname(editUser.firstname || '');
      setLastname(editUser.lastname || '');
      setEmail(editUser.email || '');
      setUsername(editUser.username || '');
    } else {
      setFirstname('');
      setLastname('');
      setEmail('');
      setUsername('');
    }
  }, [editUser, visible]);

  const notify = (title, msg) => {
    if (Platform.OS === 'web') window.alert(`${title}: ${msg}`);
    else Alert.alert(title, msg);
  };

  const handleSave = async () => {
    if (!firstname.trim() || !lastname.trim() || !email.trim() || !username.trim()) {
      notify('Validation', 'All fields are required.');
      return;
    }
    const data = {
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      email: email.trim(),
      username: username.trim(),
    };
    setLoading(true);
    try {
      if (isEditing) {
        const userRef = doc(db, 'users_basic', editUser.id);
        await updateDoc(userRef, data);
      } else {
        const usersRef = collection(db, 'users_basic');
        const newDocRef = doc(usersRef);
        await setDoc(newDocRef, { ...data, createdAt: new Date().toISOString() });
      }
      onSaved();
      onClose();
    } catch (e) {
      notify('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable onPress={onClose} style={styles.backdrop}>
        <Pressable onPress={() => {}} style={styles.card}>

          <Text style={styles.title}>{isEditing ? 'Edit User' : 'Add User'}</Text>

          <TextInput placeholder="First name" placeholderTextColor="#999"
            value={firstname} onChangeText={setFirstname} style={styles.input} />
          <TextInput placeholder="Last name" placeholderTextColor="#999"
            value={lastname} onChangeText={setLastname} style={styles.input} />
          <TextInput placeholder="Username" placeholderTextColor="#999"
            value={username} onChangeText={setUsername} autoCapitalize="none" style={styles.input} />
          <TextInput placeholder="Email" placeholderTextColor="#999"
            value={email} onChangeText={setEmail}
            keyboardType="email-address" autoCapitalize="none" style={styles.input} />

          <View style={styles.row}>
            <Pressable onPress={onClose} style={[styles.btn, styles.btnCancel]}>
              <Text style={styles.btnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSave} style={[styles.btn, styles.btnSave]} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnSaveText}>{isEditing ? 'Update' : 'Add'}</Text>}
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
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    elevation: 12,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#262626', marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fafafa',
    fontSize: 14,
    color: '#262626',
  },
  row: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn: { flex: 1, padding: 13, borderRadius: 10, alignItems: 'center' },
  btnCancel: { backgroundColor: '#f0f0f0' },
  btnCancelText: { color: '#555', fontWeight: '600' },
  btnSave: { backgroundColor: '#0095F6', elevation: 5 },
  btnSaveText: { color: '#fff', fontWeight: '600' },
});