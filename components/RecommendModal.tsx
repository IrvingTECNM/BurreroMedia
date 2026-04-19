/**
 * Recommend Modal — Send recommendations to friends
 *
 * Allows users to select friends and send a movie/series recommendation
 * with an optional message. Saves to Supabase 'recommendations' table.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '@/stores/authStore';
import { useSocialStore } from '@/stores/socialStore';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { HapticPressable } from '@/components/ui/HapticPressable';

interface RecommendModalProps {
  visible: boolean;
  onClose: () => void;
  tmdbId: string;
  mediaType: 'movie' | 'tv';
  mediaTitle: string;
}

export function RecommendModal({ visible, onClose, tmdbId, mediaType, mediaTitle }: RecommendModalProps) {
  const { allProfiles, currentUser } = useAuthStore();
  const { sendRecommendation } = useSocialStore();
  
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Filter out the current user from the list of friends
  const friends = allProfiles.filter(p => p.id !== currentUser?.id && p.id !== 'add_new');

  // Reset state when opened
  useEffect(() => {
    if (visible) {
      setSelectedFriends(new Set());
      setMessage('');
      setIsSending(false);
    }
  }, [visible]);

  const toggleFriend = (id: string) => {
    const newSelected = new Set(selectedFriends);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedFriends(newSelected);
  };

  const handleSend = async () => {
    if (!currentUser || selectedFriends.size === 0) return;
    
    setIsSending(true);
    
    // Send to each selected friend
    const promises = Array.from(selectedFriends).map(friendId => 
      sendRecommendation({
        fromUserId: currentUser.id,
        toUserId: friendId,
        tmdbId,
        mediaType,
        message: message.trim() || undefined,
      })
    );
    
    await Promise.all(promises);
    setIsSending(false);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <BlurView
          intensity={40}
          tint="dark"
          style={StyleSheet.absoluteFillObject}
        />
        
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Recomendar</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {mediaTitle}
            </Text>
            <HapticPressable style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </HapticPressable>
          </View>

          {/* Message Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Mensaje (Opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Te va a encantar esta peli..."
              placeholderTextColor={Colors.textTertiary}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={140}
              autoCorrect={false}
            />
          </View>

          {/* Friends List */}
          <View style={styles.friendsContainer}>
            <Text style={styles.label}>¿A quién se la recomiendas?</Text>
            {friends.length === 0 ? (
              <Text style={styles.noFriendsText}>
                No hay otros perfiles creados para recomendar.
              </Text>
            ) : (
              <FlatList
                data={friends}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.friendsList}
                renderItem={({ item }) => {
                  const isSelected = selectedFriends.has(item.id);
                  return (
                    <Pressable
                      style={[styles.friendItem, isSelected && styles.friendItemSelected]}
                      onPress={() => toggleFriend(item.id)}
                    >
                      <View style={[styles.avatar, { backgroundColor: item.avatar_color }]}>
                        <Text style={styles.avatarLetter}>
                          {item.display_name.charAt(0).toUpperCase()}
                        </Text>
                        {isSelected && (
                          <View style={styles.checkBadge}>
                            <Ionicons name="checkmark" size={12} color={Colors.surface} />
                          </View>
                        )}
                      </View>
                      <Text style={styles.friendName} numberOfLines={1}>
                        {item.display_name}
                      </Text>
                    </Pressable>
                  );
                }}
              />
            )}
          </View>

          {/* Action */}
          <Button
            title={`Enviar Recomendación (${selectedFriends.size})`}
            onPress={handleSend}
            disabled={selectedFriends.size === 0 || isSending}
            loading={isSending}
            fullWidth
            icon={<Ionicons name="paper-plane" size={18} color={Colors.textPrimary} />}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    position: 'relative',
  },
  title: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  subtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: Spacing.sm,
  },
  inputContainer: {
    marginBottom: Spacing.xl,
  },
  label: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Typography.body,
    color: Colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },
  friendsContainer: {
    marginBottom: Spacing.xl,
  },
  friendsList: {
    gap: Spacing.md,
    marginTop: Spacing.sm,
    paddingRight: Spacing.xl,
  },
  friendItem: {
    alignItems: 'center',
    width: 70,
    opacity: 0.5,
  },
  friendItemSelected: {
    opacity: 1,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    position: 'relative',
  },
  checkBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  avatarLetter: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  friendName: {
    ...Typography.caption,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  noFriendsText: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    fontStyle: 'italic',
    marginTop: Spacing.sm,
  },
});
