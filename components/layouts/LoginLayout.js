import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginLayout({ children }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f7f7' }} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1, padding: 16, justifyContent: 'center', gap: 12 }}>
      {children}
      </View>
    </SafeAreaView>
  );
}
