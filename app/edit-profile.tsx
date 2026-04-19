import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Platform, useWindowDimensions, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { HapticPressable } from '@/components/ui/HapticPressable';

const AVATAR_COLORS = [
  '#E50914', '#FFD700', '#4FC3F7', '#81C784',
  '#FF7043', '#BA68C8', '#FF8A65', '#64B5F6',
];

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { currentUser, updateProfile } = useAuthStore();
  
  const [name, setName] = useState(currentUser?.display_name || '');
  const [pin, setPin] = useState(currentUser?.pin || '');
  const [selectedColor, setSelectedColor] = useState(currentUser?.avatar_color || AVATAR_COLORS[0]);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !currentUser) return;
    setIsSaving(true);
    
    // Convert empty pin to null properly
    const finalPin = pin.trim().length === 4 ? pin : null;
    
    await updateProfile(currentUser.id, {
      display_name: name.trim(),
      pin: finalPin,
      avatar_color: selectedColor,
    });
    
    setIsSaving(false);
    router.back();
  };

  const isDesktop = Platform.OS === 'web' && width > 768;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <HapticPressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </HapticPressable>
        <Text style={styles.title}>Editar Perfil</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { 
        maxWidth: isDesktop ? 600 : '100%', 
        alignSelf: isDesktop ? 'center' : 'auto',
        width: '100%' 
      }]}>
        
        {/* Preview Avatar */}
        <View style={styles.avatarPreviewContainer}>
          <View style={[styles.avatarPreview, { backgroundColor: selectedColor }]}>
             <Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase() || 'B'}</Text>
          </View>
        </View>

        {/* Input Name */}
        <View style={styles.fieldSection}>
          <Text style={styles.label}>Nombre a mostrar</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholderTextColor={Colors.textTertiary}
            autoCorrect={false}
          />
        </View>

        {/* Input PIN */}
        <View style={styles.fieldSection}>
          <Text style={styles.label}>PIN de Acceso (Opcional, 4 dígitos)</Text>
          <TextInput
            style={styles.input}
            value={pin}
            onChangeText={(t) => setPin(t.replace(/[^0-9]/g, '').slice(0, 4))}
            placeholderTextColor={Colors.textTertiary}
            keyboardType="number-pad"
            secureTextEntry={false}
            placeholder="Dejar vacío sin PIN"
          />
        </View>

        {/* Color Palette */}
        <View style={styles.fieldSection}>
          <Text style={styles.label}>Color del Avatar</Text>
          <View style={styles.colorRow}>
            {AVATAR_COLORS.map(c => (
              <HapticPressable key={c} onPress={() => setSelectedColor(c)}>
                <View style={[styles.colorSwatch, { backgroundColor: c }, selectedColor === c && styles.colorSelected]} />
              </HapticPressable>
            ))}
          </View>
        </View>

        <Button
          title="Guardar Cambios"
          onPress={handleSave}
          disabled={isSaving || !name.trim()}
          loading={isSaving}
          style={styles.saveBtn}
        />
        
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backButton: { marginRight: Spacing.lg },
  title: { ...Typography.h2, color: Colors.textPrimary },
  content: { padding: Spacing.xl, paddingBottom: 100 },
  avatarPreviewContainer: { alignItems: 'center', marginBottom: Spacing.xxl },
  avatarPreview: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { ...Typography.hero, fontSize: 60, color: Colors.textPrimary },
  fieldSection: { marginBottom: Spacing.xl },
  label: { ...Typography.label, color: Colors.textSecondary, marginBottom: Spacing.sm },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, color: Colors.textPrimary, paddingHorizontal: Spacing.md,
    height: 52, ...Typography.body, ...Platform.select({ web: { outlineStyle: 'none' } as any }),
  },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  colorSwatch: { width: 48, height: 48, borderRadius: 24, borderWidth: 3, borderColor: 'transparent' },
  colorSelected: { borderColor: Colors.textPrimary },
  saveBtn: { marginTop: Spacing.xl }
});
