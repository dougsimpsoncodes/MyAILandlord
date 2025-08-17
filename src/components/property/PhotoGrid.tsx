import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Photo } from '../../types/photo';

interface PhotoGridProps {
  photos: Photo[];
  onPhotoPress: (photo: Photo, index: number) => void;
  onPhotoDelete: (index: number) => void;
  onPhotoReorder?: (fromIndex: number, toIndex: number) => void;
  maxPhotos: number;
  emptyStateText: string;
  showDeleteButton?: boolean;
  numColumns?: number;
  style?: any;
}

const { width: screenWidth } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 8;

export const PhotoGrid: React.FC<PhotoGridProps> = ({
  photos,
  onPhotoPress,
  onPhotoDelete,
  onPhotoReorder,
  maxPhotos,
  emptyStateText,
  showDeleteButton = true,
  numColumns = 2,
  style,
}) => {
  const itemWidth = (screenWidth - GRID_PADDING * 2 - GRID_GAP * (numColumns - 1)) / numColumns;
  const itemHeight = itemWidth * 0.75; // 4:3 aspect ratio

  const handleDeletePress = (index: number) => {
    const photo = photos[index];
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onPhotoDelete(index),
        },
      ]
    );
  };

  const renderPhoto = ({ item: photo, index }: { item: Photo; index: number }) => (
    <TouchableOpacity
      style={[
        styles.photoContainer,
        {
          width: itemWidth,
          height: itemHeight,
          marginRight: (index + 1) % numColumns === 0 ? 0 : GRID_GAP,
          marginBottom: GRID_GAP,
        },
      ]}
      onPress={() => onPhotoPress(photo, index)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: photo.uri }}
        style={styles.photoImage}
        resizeMode="cover"
      />
      
      {/* Photo overlay with controls */}
      <View style={styles.photoOverlay}>
        {/* Photo number indicator */}
        <View style={styles.photoNumber}>
          <Text style={styles.photoNumberText}>{index + 1}</Text>
        </View>

        {/* Delete button */}
        {showDeleteButton && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeletePress(index)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Photo info */}
      <View style={styles.photoInfo}>
        <Text style={styles.photoSize}>
          {(photo.fileSize / 1024 / 1024).toFixed(1)}MB
        </Text>
        {photo.compressed && (
          <View style={styles.compressedBadge}>
            <Text style={styles.compressedText}>Compressed</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Ionicons name="images-outline" size={48} color="#ADB5BD" />
      <Text style={styles.emptyStateText}>{emptyStateText}</Text>
      <Text style={styles.emptyStateHint}>
        Photos will appear here as you add them
      </Text>
    </View>
  );

  const renderPhotosCount = () => (
    <View style={styles.photosCountContainer}>
      <Text style={styles.photosCountText}>
        {photos.length} of {maxPhotos} photos
      </Text>
      {photos.length >= 3 && (
        <View style={styles.completeBadge}>
          <Ionicons name="checkmark-circle" size={16} color="#28A745" />
          <Text style={styles.completeText}>Complete</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      {renderPhotosCount()}
      
      {photos.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={photos}
          renderItem={renderPhoto}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false} // Disable scroll since this will be in a ScrollView
        />
      )}

      {/* Reorder hint */}
      {photos.length > 1 && onPhotoReorder && (
        <View style={styles.reorderHintContainer}>
          <Ionicons name="swap-vertical" size={16} color="#6C757D" />
          <Text style={styles.reorderHintText}>
            Tap and hold to reorder photos
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  photosCountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  photosCountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FFF9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  completeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#28A745',
  },
  gridContainer: {
    paddingBottom: 16,
  },
  photoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 8,
  },
  photoNumber: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: 'rgba(220, 53, 69, 0.9)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoSize: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  compressedBadge: {
    backgroundColor: 'rgba(40, 167, 69, 0.9)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  compressedText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '500',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6C757D',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateHint: {
    fontSize: 14,
    color: '#ADB5BD',
    textAlign: 'center',
    lineHeight: 20,
  },
  reorderHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  reorderHintText: {
    fontSize: 12,
    color: '#6C757D',
    fontStyle: 'italic',
  },
});

export default PhotoGrid;