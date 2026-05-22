import React from 'react';
import { View, Text, Pressable } from 'react-native';

export default function UserMenu({ visible, onClose, onProfile, onLogout }) {
  if (!visible) return null;

  return (
    <Pressable
      onPress={onClose}
      style={{
        position: 'absolute',
        top: 56,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: 10,
          right: 14,
          width: 170,

          backgroundColor: '#FFFFFF', // Instagram clean white
          borderRadius: 14,

          borderWidth: 1,
          borderColor: '#E6E6E6',

          // soft 3D floating effect
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.12,
          shadowRadius: 10,
          elevation: 8,

          overflow: 'hidden',
        }}
      >
        <Pressable
          onPress={onProfile}
          style={{
            padding: 13,
            backgroundColor: '#fff',
          }}
        >
          <Text style={{ color: '#262626', fontWeight: '500' }}>
            Profile
          </Text>
        </Pressable>

        <View style={{ height: 1, backgroundColor: '#F0F0F0' }} />

        <Pressable
          onPress={onLogout}
          style={{
            padding: 13,
            backgroundColor: '#fff',
          }}
        >
          <Text style={{ color: '#ED4956', fontWeight: '600' }}>
            Logout
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}