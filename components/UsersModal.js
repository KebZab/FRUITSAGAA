import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, FlatList } from 'react-native';
import { db } from '../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

export default function UsersModal({ visible, onClose }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!visible) return;
    const loadUsers = async () => {
      try {
      const snap = await getDocs(collection(db, 'users_basic'));
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setUsers(list);
      } catch (e) {
        console.error('failed to load users', e);
      }
    };
    loadUsers();
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.45)', // darker IG overlay
          justifyContent: 'center',
          padding: 16,
        }}
      >
        {/* modal card */}
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 18,
            padding: 18,
            maxHeight: '80%',

            // Instagram-like soft 3D floating card
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.15,
            shadowRadius: 16,
            elevation: 12,
          }}
        >
          {/* header */}
          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: '#262626',
              marginBottom: 12,
            }}
          >
            Users Management
          </Text>

          {/* list */}
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View
                style={{
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F0F0F0',
                }}
              >
                <Text style={{ color: '#262626', fontWeight: '500' }}>
                  {item.username}
                </Text>
                <Text style={{ color: '#8E8E8E', fontSize: 12 }}>
                  {item.email}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <Text style={{ color: '#8E8E8E' }}>
                No users found
              </Text>
            }
          />

          {/* close button */}
          <Pressable
            onPress={onClose}
            style={{
              marginTop: 14,
              padding: 12,
              backgroundColor: '#0095F6', // Instagram blue
              borderRadius: 10,

              // subtle button depth
              shadowColor: '#0095F6',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 6,
              elevation: 5,
            }}
          >
            <Text
              style={{
                color: 'white',
                textAlign: 'center',
                fontWeight: '600',
              }}
            >
              Close
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}