import React, { useState, useEffect, useContext } from 'react';
import { View } from 'react-native';
import Header from '../Header';
import Sidebar from '../Sidebar';
import UserMenu from '../UserMenu';
import UsersModal from '../UsersModal';
import { AuthContext } from '../../contexts/AuthContext';

export default function MainLayout({ title, navigation, children, name }) {
  const { user, signOut, verifyUserSession } = useContext(AuthContext);

  const displayName = user?.name ?? name ?? 'Guest';
  const userRole = user?.role || 'user';
  const isAdmin = userRole === 'admin';
  const isInventoryChecker = userRole === 'inventoryChecker';

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [usersModalOpen, setUsersModalOpen] = useState(false);

  useEffect(() => {
    const ensureAuthenticated = async () => {
      if (!user || !user.name) {
        const recoveredUser = await verifyUserSession();
        if (!recoveredUser) {
          navigation.replace('Login');
        }
      }
    };
    ensureAuthenticated();
  }, [user, verifyUserSession, navigation]);

  const logout = async () => {
    setUserMenuOpen(false);
    setSidebarOpen(false);
    await signOut();
    // Navigator will automatically switch to Login screen when user becomes null
  };

  return (
    <View style={{ flex: 1 }}>
      <Header
        isMenuOpen={sidebarOpen}
        title={title}
        onPressMenu={() => setSidebarOpen(!sidebarOpen)}
        onPressUser={() => setUserMenuOpen((v) => !v)}
      />

      <View style={{ flex: 1 }}>{children}</View>

      <UserMenu
        onLogout={logout}
        visible={userMenuOpen}
        onClose={() => setUserMenuOpen(false)}
      />

      <Sidebar
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isAdmin={isAdmin}
        role={userRole}
        userName={displayName}
        onHome={() => {
          setSidebarOpen(false);
          navigation.navigate(isAdmin ? 'AdminDashboard' : isInventoryChecker ? 'InventoryDashboard' : 'Home');
        }}
        // Admin-only nav
        onAdminOrders={() => {
          setSidebarOpen(false);
          navigation.navigate('AdminDashboard');
        }}
        onAdminUsers={() => {
          setSidebarOpen(false);
          navigation.navigate('AdminUsers');
        }}
        onInventoryDashboard={() => {
          setSidebarOpen(false);
          navigation.navigate('InventoryDashboard');
        }}
        // User-only nav
        onShop={() => {
          setSidebarOpen(false);
          navigation.navigate('FruitShop');
        }}
        onMyOrders={() => {
          setSidebarOpen(false);
          navigation.navigate('UserOrders');
        }}
        onUsersManagement={() => {
          setSidebarOpen(false);
          navigation.navigate('Users');
        }}
        onUsersManagementModal={() => {
          setSidebarOpen(false);
          setUsersModalOpen(true);
        }}
      />

      <UsersModal
        visible={usersModalOpen}
        onClose={() => setUsersModalOpen(false)}
      />
    </View>
  );
}