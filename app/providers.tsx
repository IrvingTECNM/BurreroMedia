import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Platform, useWindowDimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useProvidersStore } from '@/stores/providersStore';
import { Button } from '@/components/ui/Button';
import { HapticPressable } from '@/components/ui/HapticPressable';

export default function ProvidersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  
  const [url, setUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const { installedProviders, installProvider, uninstallProvider, isLoading } = useProvidersStore();

  const handleInstall = async () => {
    if (!url.trim()) return;
    if (!url.startsWith('http')) {
      setErrorMsg('La URL debe comenzar con http:// o https://');
      return;
    }
    
    setErrorMsg('');
    const { success, error } = await installProvider(url.trim());
    if (success) {
      setUrl('');
    } else {
      setErrorMsg(error || '');
    }
  };

  const isDesktop = Platform.OS === 'web' && width > 768;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <HapticPressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </HapticPressable>
        <Text style={styles.title}>Gestor de Proveedores</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { 
        maxWidth: isDesktop ? 800 : '100%', 
        alignSelf: isDesktop ? 'center' : 'auto',
        width: '100%' 
      }]}>
        
        {/* Install Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Añadir Addon (Stremio Compatible)</Text>
          <Text style={styles.description}>
            Pega la URL del 'manifest.json' de un proveedor de la comunidad para instalarlo y desbloquear más fuentes de video.
          </Text>
          
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="https://ejemplo.com/manifest.json"
              placeholderTextColor={Colors.textTertiary}
              value={url}
              onChangeText={(text) => { setUrl(text); setErrorMsg(''); }}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            <Button
              title="Instalar"
              onPress={handleInstall}
              disabled={isLoading || url.length < 5}
              style={{ minWidth: 100 }}
              loading={isLoading}
            />
          </View>
          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
        </View>

        {/* Installed Providers List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instalados ({installedProviders.length + 1})</Text>
          
          {/* Demo Provider (Built-in) */}
          <View style={styles.providerCard}>
            <View style={styles.providerIconContainer}>
              <Text style={{fontSize: 24}}>🎬</Text>
            </View>
            <View style={styles.providerInfo}>
              <Text style={styles.providerName}>Demo Provider</Text>
              <Text style={styles.providerUrl}>Local (Integrado)</Text>
            </View>
            <View style={styles.badgeBuiltin}>
              <Text style={styles.badgeText}>De Serie</Text>
            </View>
          </View>

          {/* User Installed */}
          {installedProviders.map((p) => (
            <View key={p.id} style={styles.providerCard}>
              <View style={styles.providerIconContainer}>
                {p.icon ? (
                  <Text style={{fontSize: 24}}>📦</Text> // Fallback if image fails or string given
                ) : (
                  <Ionicons name="extension-puzzle-outline" size={24} color={Colors.primary} />
                )}
              </View>
              <View style={styles.providerInfo}>
                <Text style={styles.providerName}>{p.name} <Text style={styles.versionTag}>v{p.version}</Text></Text>
                <Text style={styles.providerUrl} numberOfLines={1}>{p.url}</Text>
              </View>
              <HapticPressable 
                onPress={() => uninstallProvider(p.id)}
                style={styles.uninstallBtn}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
              </HapticPressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    marginRight: Spacing.lg,
  },
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  content: {
    padding: Spacing.xl,
    paddingBottom: 100,
  },
  section: {
    marginBottom: Spacing.xxxl,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  description: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
    ...Platform.select({ web: { outlineStyle: 'none' } as any }),
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    marginTop: Spacing.sm,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  providerIconContainer: {
    width: 48, height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  versionTag: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  providerUrl: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  badgeBuiltin: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  uninstallBtn: {
    padding: Spacing.sm,
  },
});
