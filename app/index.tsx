/**
 * Root Index — Entry Redirect
 *
 * Bypasses profile selection and redirects directly to the main app.
 * Profile loading happens in the background via _layout.tsx.
 */
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(tabs)" />;
}
