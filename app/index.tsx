/**
 * Root Index — Entry Redirect
 *
 * Redirects to login if not authenticated, or to tabs if authenticated.
 * No hydration gate needed — authStore is immediately available.
 */
import React, { useEffect } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/theme';

export default function Index() {
  const { isAuthenticated, currentUser, allProfiles, loadProfiles, login, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    async function autoLogin() {
      // If already authenticated, do nothing (Redirect handles it)
      if (isAuthenticated && currentUser) return;

      // Load profiles if empty
      if (allProfiles.length === 0) {
        await loadProfiles();
      }

      // If we now have profiles, auto-login with the first one
      const latestProfiles = useAuthStore.getState().allProfiles;
      if (latestProfiles.length > 0) {
        await login(latestProfiles[0].id);
      } else {
        // No profiles exist? Force redirect to create profile
        router.replace('/(auth)/create-profile');
      }
    }

    autoLogin();
  }, [isAuthenticated, currentUser, allProfiles.length]);

  if (isAuthenticated && currentUser) {
    return <Redirect href="/(tabs)" />;
  }

  // Loading state while auto-logging in
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}
