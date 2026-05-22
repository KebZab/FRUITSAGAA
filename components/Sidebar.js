import React from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal,
  TouchableWithoutFeedback,
} from 'react-native';

const PINK = '#dd2a7b';
const PURPLE = '#7C3AED';
const BLUE = '#0095F6';
const GREEN = '#10B981';

function NavItem({ emoji, label, onPress, color = '#333', bg = '#f5f5f5' }) {
  return (
    <Pressable
      style={[styles.navItem, { backgroundColor: bg }]}
      onPress={onPress}
    >
      <Text style={styles.navEmoji}>{emoji}</Text>
      <Text style={[styles.navLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

export default function Sidebar({
  visible,
  onClose,
  isAdmin,
  userName,
  onHome,
  onShop,
  onMyOrders,
  onAdminOrders,
  onAdminUsers,
  onUsersManagement,
  onUsersManagementModal,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.drawer}>

              {/* Header */}
              <View style={styles.drawerHeader}>
                <View style={[styles.avatar, { backgroundColor: isAdmin ? PURPLE : PINK }]}>
                  <Text style={styles.avatarText}>
                    {(userName?.[0] ?? '?').toUpperCase()}
                  </Text>
                </View>
                <View style={styles.headerInfo}>
                  <Text style={styles.headerName} numberOfLines={1}>{userName}</Text>
                  <View style={[styles.roleBadge, { backgroundColor: isAdmin ? '#EDE9FE' : '#FFE4EE' }]}>
                    <Text style={[styles.roleText, { color: isAdmin ? PURPLE : PINK }]}>
                      {isAdmin ? '🛡️ Admin' : '👤 User'}
                    </Text>
                  </View>
                </View>
                <Pressable onPress={onClose} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </Pressable>
              </View>

              <View style={styles.divider} />

              {/* Navigation */}
              <View style={styles.navSection}>
                {isAdmin ? (
                  <>
                    <Text style={styles.sectionLabel}>ADMIN</Text>
                    <NavItem
                      emoji="🛠️"
                      label="Order Dashboard"
                      onPress={onAdminOrders}
                      color={PURPLE}
                      bg="#EDE9FE"
                    />
                    <NavItem
                      emoji="👥"
                      label="Manage Users"
                      onPress={onAdminUsers}
                      color={PURPLE}
                      bg="#EDE9FE"
                    />
                  </>
                ) : (
                  <>
                    <Text style={styles.sectionLabel}>SHOP</Text>
                    <NavItem
                      emoji="🏠"
                      label="Home"
                      onPress={onHome}
                      color="#333"
                      bg="#f5f5f5"
                    />
                    <NavItem
                      emoji="🛒"
                      label="Browse Fruits"
                      onPress={onShop}
                      color={PINK}
                      bg="#FFF0F5"
                    />
                    <NavItem
                      emoji="📋"
                      label="My Orders"
                      onPress={onMyOrders}
                      color={BLUE}
                      bg="#EFF8FF"
                    />
                  </>
                )}
              </View>

            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    flexDirection: 'row',
  },
  drawer: {
    width: 280,
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingBottom: 32,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 16,
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 20 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  roleBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 3,
  },
  roleText: { fontSize: 11, fontWeight: '700' },
  closeBtn: { padding: 6 },
  closeBtnText: { fontSize: 16, color: '#bbb', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginBottom: 12 },
  navSection: { paddingHorizontal: 14, gap: 6 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#bbb',
    letterSpacing: 1.2,
    paddingHorizontal: 6,
    marginBottom: 2,
    marginTop: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  navEmoji: { fontSize: 18 },
  navLabel: { fontSize: 14, fontWeight: '600' },
});