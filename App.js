import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme  } from '@react-navigation/native';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import AppNavigator from './navigation/AppNavigator';
import {
  PaperProvider,
  MD3LightTheme,
  adaptNavigationTheme,
} from 'react-native-paper';
const { LightTheme } = adaptNavigationTheme({
  reactNavigationLight: DefaultTheme,
});

export default function App() {
  return (
    <PaperProvider theme={MD3LightTheme}>
    <View style={styles.container}>
      {/* hides status bar completely */}
      <StatusBar hidden />
      <NavigationContainer>
        <AuthProvider>
          <CartProvider>
            <AppNavigator />
          </CartProvider>
        </AuthProvider>
      </NavigationContainer>
    </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // IMPORTANT: no paddingTop here (removes the white gap)
  },
});
