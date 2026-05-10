import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Alert, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useDownloadStore, DownloadItem } from '@/stores/downloadStore';
import { downloadManager } from '@/lib/downloadManager';
import { HapticPressable } from '@/components/ui/HapticPressable';
import { getImageUrl } from '@/lib/tmdb';

export default function DownloadsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const downloadsMap = useDownloadStore((state) => state.downloads);
  const downloads = Object.values(downloadsMap).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.headerTitle}>Mis Descargas</Text>
      
      {downloads.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color={Colors.textTertiary} />
          <Text style={styles.emptyText}>No tienes descargas aún.</Text>
          <Text style={styles.emptySubtext}>
            Descarga tus películas y series favoritas para verlas sin conexión.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {downloads.map((item) => (
            <DownloadRow key={item.id} item={item} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function DownloadRow({ item }: { item: DownloadItem }) {
  const router = useRouter();
  
  const handlePress = () => {
    if (item.state === 'completed' && item.localUri) {
      router.push({
        pathname: '/player',
        params: {
          url: item.localUri,
          title: item.title,
          tmdbId: item.mediaId,
          mediaType: item.type,
        }
      });
    }
  };

  const handleAction = () => {
    if (item.state === 'downloading') {
      downloadManager.pauseDownload(item.id);
    } else if (item.state === 'paused' || item.state === 'error') {
      downloadManager.resumeDownload(item.id);
    }
  };

  const handleDelete = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('¿Eliminar esta descarga?')) {
        downloadManager.cancelDownload(item.id);
      }
    } else {
      Alert.alert(
        'Eliminar descarga',
        '¿Estás seguro que deseas eliminar este archivo?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: () => downloadManager.cancelDownload(item.id) }
        ]
      );
    }
  };

  const isCompleted = item.state === 'completed';
  const isDownloading = item.state === 'downloading';
  
  return (
    <HapticPressable 
      onPress={handlePress}
      style={styles.downloadItem}
      disabled={!isCompleted}
    >
      <Image
        source={{ uri: item.posterPath ? getImageUrl(item.posterPath, 'w342') : 'https://via.placeholder.com/342x513' }}
        style={styles.poster}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.subtitle}>
          {item.serverName} · {item.type === 'movie' ? 'Película' : 'Serie'}
        </Text>
        
        {/* Status text */}
        <Text style={[styles.statusText, { color: isCompleted ? Colors.success : (item.state === 'error' ? Colors.error : Colors.textSecondary) }]}>
          {item.state === 'completed' && 'Descargado'}
          {item.state === 'downloading' && `Descargando... ${(item.progress * 100).toFixed(1)}%`}
          {item.state === 'paused' && 'Pausado'}
          {item.state === 'error' && 'Error al descargar'}
          {item.state === 'idle' && 'Esperando...'}
        </Text>

        {/* Progress bar */}
        {!isCompleted && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${item.progress * 100}%` }]} />
          </View>
        )}
      </View>

      <View style={styles.actionsContainer}>
        {!isCompleted && (
          <HapticPressable onPress={handleAction} style={styles.actionButton}>
            <Ionicons 
              name={isDownloading ? 'pause-circle' : 'play-circle'} 
              size={32} 
              color={Colors.primary} 
            />
          </HapticPressable>
        )}
        
        <HapticPressable onPress={handleDelete} style={styles.actionButton}>
          <Ionicons name="trash-outline" size={24} color={Colors.error} />
        </HapticPressable>
      </View>
    </HapticPressable>
  );
}

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerTitle: {
    ...Typography.h1,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: isTablet ? '10%' : Spacing.md,
    paddingBottom: 120,
    gap: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    ...Typography.body,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    maxWidth: 300,
  },
  downloadItem: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  poster: {
    width: 60,
    height: 90,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceLight,
  },
  infoContainer: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'center',
  },
  title: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontSize: 16,
    marginBottom: 2,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 2,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  actionButton: {
    padding: Spacing.xs,
  },
});
