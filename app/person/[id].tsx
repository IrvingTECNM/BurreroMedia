import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HapticPressable } from '@/components/ui/HapticPressable';
import { MediaCard } from '@/components/MediaCard';
import { getPersonDetails, getPersonCredits, getImageUrl } from '@/lib/tmdb';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

export default function PersonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const personId = parseInt(id || '0', 10);
  const { width } = useWindowDimensions();
  
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const { data: person, isLoading } = useQuery({
    queryKey: ['personDetails', personId],
    queryFn: () => getPersonDetails(personId),
    enabled: personId > 0,
  });

  const { data: credits, isLoading: creditsLoading } = useQuery({
    queryKey: ['personCredits', personId],
    queryFn: () => getPersonCredits(personId),
    enabled: personId > 0,
  });

  if (isLoading || !person) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Sort credits by popularity or release date
  const sortedCredits = credits?.cast?.sort((a, b) => b.vote_count - a.vote_count).slice(0, 20) || [];

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={[styles.content, { paddingTop: insets.top + (isDesktop ? 80 : 60) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.headerContainer, isDesktop && styles.headerContainerDesktop]}>
          <Image
            source={{ uri: getImageUrl(person.profile_path, 'w342') }}
            style={styles.profileImage}
            contentFit="cover"
            transition={300}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{person.name}</Text>
            <Text style={styles.metaText}>
              {person.known_for_department}
              {person.birthday ? ` • Nacimiento: ${person.birthday}` : ''}
            </Text>
            {person.place_of_birth && (
              <Text style={styles.metaText}>📍 {person.place_of_birth}</Text>
            )}
          </View>
        </View>

        {person.biography && person.biography.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Biografía</Text>
            <Text style={styles.biography}>{person.biography}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conocido Por</Text>
          {creditsLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ alignSelf: 'flex-start' }} />
          ) : sortedCredits.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.creditsRow}>
                {sortedCredits.map((item) => (
                  <View key={item.id} style={{ width: 140 }}>
                    <MediaCard item={item} size="md" />
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <Text style={styles.metaText}>No se encontraron trabajos.</Text>
          )}
        </View>
      </ScrollView>

      {/* Floating Back Button */}
      <HapticPressable
        onPress={() => router.back()}
        style={[
          styles.backButton, 
          { top: insets.top + Spacing.sm, position: Platform.OS === 'web' ? 'fixed' : 'absolute' } as any
        ]}
      >
        <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
      </HapticPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 100,
    paddingHorizontal: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  backButton: {
    position: 'absolute',
    left: Spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  headerContainerDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  profileImage: {
    width: 160,
    height: 240,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceLight,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  name: {
    ...Typography.h1,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  metaText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  biography: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  creditsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
});
