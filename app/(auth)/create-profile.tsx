/**
 * Create Profile Screen
 *
 * Screen to add a new profile to the shared account.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { HapticPressable } from '@/components/ui/HapticPressable';

const AVATAR_COLORS = [
  '#E50914', '#FFD700', '#4FC3F7', '#81C784',
  '#FF7043', '#BA68C8', '#FF8A65', '#64B5F6',
];

export default function CreateProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { createProfile } = useAuthStore();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFormValid = displayName.trim() && username.trim() && (pin.length === 0 || pin.length === 4);

  const handleCreate = async () => {
    if (!isFormValid) return;

    setIsLoading(true);
    setError(null);

    const { success, error: authError } = await createProfile({
      display_name: displayName.trim(),
      username: username.trim(),
      pin: pin.length === 4 ? pin : undefined,
      avatar_color: selectedColor,
    });

    setIsLoading(false);

    if (success) {
      router.back();
    } else {
      setError(authError || 'Hubo un error al crear el perfil');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <HapticPressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={Colors.textPrimary} />
        </HapticPressable>
        <Text style={styles.headerTitle}>Crear Perfil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Avatar Preview */}
        <View style={styles.avatarPreviewContainer}>
          <View style={[styles.avatarPreview, { backgroundColor: selectedColor }, Shadows.lg]}>
            <Text style={styles.avatarPreviewLetter}>
              {displayName ? displayName.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
        </View>

        {/* Color Picker */}
        <View style={styles.colorPicker}>
          {AVATAR_COLORS.map((color) => (
            <HapticPressable
              key={color}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                selectedColor === color && styles.colorOptionSelected,
              ]}
              onPress={() => setSelectedColor(color)}
            />
          ))}
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre (Mostrar)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Juan"
              placeholderTextColor={Colors.textTertiary}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Usuario (Único)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. juan123"
              placeholderTextColor={Colors.textTertiary}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PIN (Opcional, 4 dígitos)</Text>
            <TextInput
              style={styles.input}
              placeholder="••••"
              placeholderTextColor={Colors.textTertiary}
              value={pin}
              onChangeText={(text) => setPin(text.replace(/[^0-9]/g, '').slice(0, 4))}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
            />
            {pin.length > 0 && pin.length < 4 && (
              <Text style={styles.helperText}>El PIN debe tener 4 dígitos</Text>
            )}
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        {/* Actions */}
        <View style={[styles.actions, { paddingBottom: insets.bottom + Spacing.xl }]}>
          <Button
            title="Guardar"
            onPress={handleCreate}
            disabled={!isFormValid || isLoading}
            loading={isLoading}
            fullWidth
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  content: {
    flexGrow: 1,
    padding: Spacing.xl,
  },
  avatarPreviewContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing.md,
  },
  avatarPreview: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPreviewLetter: {
    ...Typography.hero,
    fontSize: 56,
    color: Colors.textPrimary,
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: Colors.textPrimary,
    transform: [{ scale: 1.1 }],
  },
  form: {
    gap: Spacing.lg,
  },
  inputGroup: {
    gap: Spacing.sm,
  },
  label: {
    ...Typography.label,
    color: Colors.textSecondary,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 52,
    ...Typography.body,
    color: Colors.textPrimary,
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },
  helperText: {
    ...Typography.caption,
    color: Colors.warning,
    marginTop: 4,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.error,
    textAlign: 'center',
  },
  actions: {
    marginTop: 'auto',
    paddingTop: Spacing.xxl,
  },
});
