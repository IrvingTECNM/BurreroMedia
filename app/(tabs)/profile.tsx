/**
 * Profile Screen — User Profile & Settings
 *
 * Shows user info, stats, and configuration options.
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { useProvidersStore } from '@/stores/providersStore';
import { supabase } from '@/lib/supabase';

interface SettingItemProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}

function SettingItem({ icon, label, value, onPress, danger }: SettingItemProps) {
  return (
    <Pressable onPress={onPress} style={styles.settingItem}>
      <View style={[styles.settingIcon, danger && styles.settingIconDanger]}>
        <Ionicons
          name={icon as any}
          size={20}
          color={danger ? Colors.error : Colors.textSecondary}
        />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, danger && { color: Colors.error }]}>
          {label}
        </Text>
        {value && <Text style={styles.settingValue}>{value}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { currentUser, logout } = useAuthStore();

  const { data: stats } = useQuery({
    queryKey: ['profileStats', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return { movies: 0, tv: 0, recommendations: 0 };
      
      const [moviesRes, tvRes, recsRes] = await Promise.all([
        supabase.from('watching_progress').select('*', { count: 'exact', head: true }).eq('user_id', currentUser.id).eq('media_type', 'movie'),
        supabase.from('watching_progress').select('*', { count: 'exact', head: true }).eq('user_id', currentUser.id).eq('media_type', 'tv'),
        supabase.from('recommendations').select('*', { count: 'exact', head: true }).eq('from_user', currentUser.id)
      ]);

      return {
        movies: moviesRes.count || 0,
        tv: tvRes.count || 0,
        recommendations: recsRes.count || 0,
      };
    },
    enabled: !!currentUser?.id,
  });

  const isDesktop = Platform.OS === 'web' && width >= 768;
  const desktopNavHeight = 64;
  const contentMaxWidth = Platform.OS === 'web' && width > 800 ? 800 : '100%';
  const alignSelf = Platform.OS === 'web' && width > 800 ? 'center' : 'auto';

  return (
    <ScrollView
      style={[
        styles.container,
        { paddingTop: isDesktop ? insets.top + desktopNavHeight : insets.top }
      ]}
      contentContainerStyle={[styles.content, { maxWidth: contentMaxWidth, width: '100%', alignSelf: alignSelf as any }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text style={styles.headerTitle}>Perfil</Text>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={[styles.avatar, { backgroundColor: currentUser?.avatar_color || Colors.primary }]}>
          <Text style={styles.avatarText}>
            {currentUser?.display_name?.charAt(0).toUpperCase() || 'B'}
          </Text>
        </View>
        <Text style={styles.displayName}>{currentUser?.display_name || 'Usuario'}</Text>
        <Text style={styles.username}>@{currentUser?.username || 'usuario'}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats?.movies || 0}</Text>
          <Text style={styles.statLabel}>Películas</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats?.tv || 0}</Text>
          <Text style={styles.statLabel}>Series</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats?.recommendations || 0}</Text>
          <Text style={styles.statLabel}>Recomendaciones</Text>
        </View>
      </View>

      {/* Settings */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Configuración</Text>
        <View style={styles.settingsCard}>
          <SettingItem 
            icon="extension-puzzle-outline" 
            label="Proveedores" 
            value={`${useProvidersStore().installedProviders.length + 1} activo(s)`} 
            onPress={() => router.push('/providers')} 
          />
          <SettingItem icon="language-outline" label="Idioma" value="Español (MX)" onPress={() => alert('Próximamente')} />
          <SettingItem icon="notifications-outline" label="Notificaciones" onPress={() => alert('Próximamente')} />
        </View>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Cuenta</Text>
        <View style={styles.settingsCard}>
          <SettingItem icon="information-circle-outline" label="Acerca de" value="v1.0.0" />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 120,
  },
  headerTitle: {
    ...Typography.h1,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.glow,
  },
  avatarText: {
    ...Typography.hero,
    color: Colors.textPrimary,
  },
  displayName: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  username: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  settingsSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.label,
    color: Colors.textTertiary,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  settingsCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    minHeight: 52,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  settingIconDanger: {
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  settingValue: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: 2,
  },
});
