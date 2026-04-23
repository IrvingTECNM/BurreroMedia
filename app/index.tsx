/**
 * Root Index — Entry Redirect
 *
 * Redirects to login if not authenticated, or to tabs if authenticated.
 * No hydration gate needed — authStore is immediately available.
 */
import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
