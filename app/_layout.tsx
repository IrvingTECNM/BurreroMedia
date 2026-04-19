/**
 * Root Layout — App Entry Point
 *
 * Wraps the app with providers: QueryClient, ThemeProvider, fonts.
 * Dark-first theme to match the streaming app aesthetic.
 */
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';

import { queryClient } from '@/lib/query-client';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { useProvidersStore } from '@/stores/providersStore';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Custom dark theme matching our design tokens
const BurreroTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.textPrimary,
    border: Colors.border,
    notification: Colors.primary,
  },
};

export default function RootLayout() {
  const { loadProfiles } = useAuthStore();
  const { initializeProviders } = useProvidersStore();
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Load state on mount
  useEffect(() => {
    loadProfiles();
    initializeProviders();
  }, []);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={BurreroTheme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="media/[id]"
            options={{
              headerShown: false,
              animation: 'slide_from_bottom',
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="player"
            options={{
              headerShown: false,
              animation: 'fade',
              presentation: 'fullScreenModal',
            }}
          />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}


