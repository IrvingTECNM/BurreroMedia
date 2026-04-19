import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { HapticPressable } from './ui/HapticPressable';

export function TopNavigationBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  
  const navItems = [
    { name: 'Inicio', path: '/' },
    { name: 'Buscar', path: '/search' },
    { name: 'Mi Lista', path: '/watchlist' },
    { name: 'Social', path: '/social' },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(10, 10, 15, 0.9)', 'rgba(10, 10, 15, 0)']}
        style={StyleSheet.absoluteFillObject}
      />
      
      <View style={styles.content}>
        <View style={styles.leftSection}>
          <HapticPressable onPress={() => router.push('/')} style={styles.brandContainer}>
            <Text style={styles.brand}>BURRERO<Text style={styles.brandAccent}>MEDIA</Text></Text>
          </HapticPressable>
          
          <View style={styles.links}>
            {navItems.map((item) => {
              const isActive = pathname === item.path || (pathname === '/' && item.path === '/');
              return (
                <HapticPressable 
                  key={item.path} 
                  onPress={() => router.push(item.path as any)}
                  style={styles.navLink}
                >
                  <Text style={[styles.navText, isActive && styles.navTextActive]}>
                    {item.name}
                  </Text>
                </HapticPressable>
              );
            })}
          </View>
        </View>

        <View style={styles.rightSection}>
          <HapticPressable onPress={() => router.push('/search')} style={styles.iconButton}>
            <Ionicons name="search" size={24} color={Colors.textPrimary} />
          </HapticPressable>
          <HapticPressable onPress={() => router.push('/profile')} style={styles.profileButton}>
            <Ionicons name="person-circle" size={32} color={Colors.textPrimary} />
          </HapticPressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 80,
    zIndex: 100,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 1600,
    alignSelf: 'center',
    width: '100%',
    height: '100%',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandContainer: {
    marginRight: Spacing.xxxl,
    justifyContent: 'center',
    cursor: Platform.OS === 'web' ? 'pointer' : 'default',
  },
  brand: {
    ...Typography.h2,
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  brandAccent: {
    color: Colors.primary,
  },
  links: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  navLink: {
    paddingVertical: Spacing.sm,
  },
  navText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '500',
    transitionDuration: '0.2s',
  },
  navTextActive: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  iconButton: {
    padding: Spacing.xs,
  },
  profileButton: {
    marginLeft: Spacing.sm,
  },
});
