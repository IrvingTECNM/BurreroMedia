/**
 * Tabs Layout — Bottom Tab Navigation
 *
 * Netflix-style bottom tab bar with blur effect (glassmorphism),
 * custom icons, and active state indicators.
 */
import React from 'react';
import { StyleSheet, View, Platform, useWindowDimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Colors, Spacing } from '@/constants/theme';
import { TopNavigationBar } from '@/components/TopNavigationBar';

function TabBarBackground() {
  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: 'rgba(10, 10, 15, 0.85)',
            borderTopWidth: 1,
            borderTopColor: Colors.border,
            borderRadius: 999, // Pill shape inheritance
          },
        ]}
      />
    );
  }
  return (
    <BlurView
      intensity={80}
      tint="dark"
      style={[
        StyleSheet.absoluteFill,
        {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: Colors.border,
          borderRadius: Platform.OS === 'web' ? 999 : 0,
        },
      ]}
    />
  );
}

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  // Using 768px as the responsive breakpoint for Tablet/Desktop UI
  const isDesktop = Platform.OS === 'web' && width >= 768;

  return (
    <View style={{ flex: 1 }}>
      {isDesktop && <TopNavigationBar />}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textTertiary,
          tabBarStyle: isDesktop ? { display: 'none' } : [
            styles.tabBar
          ],
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarBackground: () => <TabBarBackground />,
        }}
      >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Buscar',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="watchlist"
        options={{
          title: 'Mi Lista',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bookmark" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="downloads"
        options={{
          title: 'Descargas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cloud-download" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: 'Social',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.sm,
    paddingTop: Spacing.sm,
  },
  tabBarWebPill: {
    maxWidth: 600,
    alignSelf: 'center',
    left: 'auto',
    right: 'auto',
    marginBottom: Spacing.xl,
    borderRadius: 999,
    height: 70,
    paddingBottom: Spacing.sm,
    // Add glowing border/shadow for premium glassmorphism
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});
