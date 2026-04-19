/**
 * Login Screen — Profile Selection
 *
 * Netflix-style "Who's watching?" profile selection grid.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { HapticPressable } from '@/components/ui/HapticPressable';
import { Button } from '@/components/ui/Button';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { allProfiles, loadProfiles, login, isLoading } = useAuthStore();

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const handleProfileSelect = (profileId: string, hasPin: boolean) => {
    if (hasPin) {
      setSelectedProfileId(profileId);
      setPin('');
      setPinError(false);
      setShowPinModal(true);
    } else {
      handleLogin(profileId);
    }
  };

  const handleLogin = async (profileId: string, inputPin?: string) => {
    const success = await login(profileId, inputPin);
    if (success) {
      setShowPinModal(false);
      router.replace('/(tabs)');
    } else if (inputPin) {
      setPinError(true);
      setPin('');
    }
  };

  const handlePinSubmit = () => {
    if (selectedProfileId && pin.length === 4) {
      handleLogin(selectedProfileId, pin);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Text style={styles.logo}>BurreroMedia</Text>
      </View>

      {/* Profile Selection */}
      <View style={[styles.content, { 
        maxWidth: Platform.OS === 'web' && width > 800 ? 800 : '100%', 
        alignSelf: Platform.OS === 'web' && width > 800 ? 'center' : 'auto',
        width: '100%' 
      }]}>
        <Text style={styles.title}>¿Quién está viendo ahora?</Text>

        {isLoading ? (
          <Text style={styles.loadingText}>Cargando perfiles...</Text>
        ) : (
          <ScrollView style={{ width: '100%', maxHeight: 400 }} contentContainerStyle={styles.gridContent}>
            <View style={styles.gridRow}>
              {[...allProfiles, { id: 'add_new', isAddButton: true }].map((item: any) => {
                if (item.isAddButton) {
                  return (
                    <HapticPressable
                      key={item.id}
                      style={styles.profileContainer}
                      onPress={() => router.push('/(auth)/create-profile')}
                    >
                      <View style={[styles.avatar, styles.addAvatar]}>
                        <Ionicons name="add" size={48} color={Colors.textPrimary} />
                      </View>
                      <Text style={styles.profileName}>Agregar perfil</Text>
                    </HapticPressable>
                  );
                }

                return (
                  <HapticPressable
                    key={item.id}
                    style={styles.profileContainer}
                    onPress={() => handleProfileSelect(item.id, !!item.pin)}
                  >
                    <View style={[styles.avatar, { backgroundColor: item.avatar_color }, Shadows.md]}>
                      <Text style={styles.avatarLetter}>
                        {item.display_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.profileName} numberOfLines={1}>
                      {item.display_name}
                    </Text>
                    {item.pin && (
                      <Ionicons
                        name="lock-closed"
                        size={14}
                        color={Colors.textTertiary}
                        style={styles.lockIcon}
                      />
                    )}
                  </HapticPressable>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>

      {/* PIN Modal */}
      <Modal visible={showPinModal} animationType={Platform.OS === 'web' ? 'fade' : 'slide'} transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalOverlay, { 
            justifyContent: Platform.OS === 'web' && width > 600 ? 'center' : 'flex-end',
            paddingHorizontal: Platform.OS === 'web' ? Spacing.xl : 0 
          }]}
        >
          <View style={[styles.modalContent, {
            maxWidth: Platform.OS === 'web' && width > 600 ? 400 : '100%',
            alignSelf: Platform.OS === 'web' && width > 600 ? 'center' : 'auto',
            width: '100%',
            borderRadius: Platform.OS === 'web' && width > 600 ? BorderRadius.xl : undefined,
            borderBottomLeftRadius: Platform.OS === 'web' && width > 600 ? BorderRadius.xl : 0,
            borderBottomRightRadius: Platform.OS === 'web' && width > 600 ? BorderRadius.xl : 0,
          }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ingresa tu PIN</Text>
              <Ionicons
                name="close"
                size={24}
                color={Colors.textTertiary}
                onPress={() => setShowPinModal(false)}
                style={styles.closeIcon}
              />
            </View>

            <TextInput
              style={[styles.pinInput, pinError && styles.pinInputError]}
              value={pin}
              onChangeText={(text) => {
                const newPin = text.replace(/[^0-9]/g, '').slice(0, 4);
                setPin(newPin);
                setPinError(false);
                if (newPin.length === 4 && selectedProfileId) {
                  // Validate automatically
                  handleLogin(selectedProfileId, newPin);
                }
              }}
              keyboardType="number-pad"
              secureTextEntry
              autoFocus
              maxLength={4}
              placeholder="••••"
              placeholderTextColor={Colors.textTertiary}
            />

            {pinError && <Text style={styles.errorText}>PIN incorrecto</Text>}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  logo: {
    ...Typography.h2,
    color: Colors.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: 100, // Offset for visual balance
  },
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.xxxl,
    textAlign: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  gridContent: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.xl,
    width: '100%',
  },
  profileContainer: {
    alignItems: 'center',
    width: 100,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  addAvatar: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  avatarLetter: {
    ...Typography.hero,
    fontSize: 48,
    color: Colors.textPrimary,
  },
  profileName: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  lockIcon: {
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  closeIcon: {
    position: 'absolute',
    right: 0,
    padding: Spacing.sm,
  },
  pinInput: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Typography.h2,
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 10,
    marginBottom: Spacing.sm,
  },
  pinInputError: {
    borderWidth: 1,
    borderColor: Colors.error,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  submitButton: {
    marginTop: Spacing.md,
  },
});
