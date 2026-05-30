// navigation/AppNavigator.js
import React, { useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import FruitShopScreen from '../screens/FruitShopScreen';
import UserOrdersScreen from '../screens/UserOrdersScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import AdminUsersScreen from '../screens/AdminUsersScreen';
import InventoryDashboardScreen from '../screens/InventoryDashboardScreen';
import AddressManagementScreen from '../screens/AddressManagementScreen';

import { AuthContext } from '../contexts/AuthContext';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useContext(AuthContext);
  const initialAppRoute =
    user?.role === 'admin'
      ? 'AdminDashboard'
      : user?.role === 'inventory'
      ? 'InventoryDashboard'
      : 'Home';

  if (loading) {
    return null; // or a loading screen
  }

  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      key={`app-${initialAppRoute}`}
      screenOptions={{ headerShown: false }}
      initialRouteName={initialAppRoute}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="FruitShop" component={FruitShopScreen} />
      <Stack.Screen name="UserOrders" component={UserOrdersScreen} />
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
      <Stack.Screen name="InventoryDashboard" component={InventoryDashboardScreen} />
      <Stack.Screen name="AddressManagement" component={AddressManagementScreen} />
    </Stack.Navigator>
  );
}