import React from 'react';
import { Pressable, Text } from 'react-native';

export default function AppButton({ title, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        padding: 12,
        backgroundColor: '#222',
        borderRadius: 8,
      }}
    >
      <Text style={{ color: 'white', textAlign: 'center', fontWeight: '600' }}>
        {title}
      </Text>
    </Pressable>
  );
}
