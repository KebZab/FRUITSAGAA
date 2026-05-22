import React from 'react';
import { View, Text, Pressable } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function Header({ title, onPressMenu, onPressUser, isMenuOpen }) {
  return (
    <View
      style={{
        height: 60,
        backgroundColor: '#FFFFFF', // Instagram clean white header

        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,

        // soft 3D shadow like Instagram UI
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 5,
        borderBottomWidth: 0.5,
        borderBottomColor: '#E6E6E6',
      }}
    >
      {/* left menu */}
      <Pressable onPress={onPressMenu} style={{ padding: 8 }}>
        <MaterialIcons
          name={isMenuOpen ? "menu-open" : "menu"}
          size={26}
          color="#262626" // Instagram dark gray icon
        />
      </Pressable>

      {/* title */}
      <Text
        style={{
          flex: 1,
          textAlign: 'center',
          fontSize: 18,
          fontWeight: '700',
          color: '#262626', // Instagram dark text
        }}
      >
        {title}
      </Text>

      {/* right user icon */}
      <Pressable onPress={onPressUser} style={{ padding: 8 }}>
        <FontAwesome
          name="user-circle"
          size={26}
          color="#262626"
        />
      </Pressable>
    </View>
  );
}