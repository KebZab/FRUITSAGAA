import React from 'react';
import { View, Text } from 'react-native';

export default function LoginLayout({ children }) {
  return (
    <View style={{ flex: 1, padding: 16, justifyContent: 'center', gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Login</Text>
      {children}
    </View>
  );
}
