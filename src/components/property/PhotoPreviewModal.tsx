import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Alert,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Photo } from '../../types/photo';

interface PhotoPreviewModalProps {
  photo: Photo | null;
  visible: boolean;
  onClose: () => void;
  onDelete: () => void;
  onReplace: () => void;
  photoIndex?: number;
  totalPhotos?: number;
  canNavigate?: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const PhotoPreviewModal: React.FC<PhotoPreviewModalProps> = ({
  photo,
  visible,
  onClose,
  onDelete,
  onReplace,
  photoIndex,
  totalPhotos,
  canNavigate = false,
  onNext,
  onPrevious,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showControls, setShowControls] = useState(true);

  if (!photo) return null;

  const handleDelete = () => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete();
            onClose();
          },
        },
      ]
    );
  };

  const handleReplace = () => {
    Alert.alert(
      'Replace Photo',
      'Choose how you\'d like to replace this photo.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Take New Photo',
          onPress: () => {
            onReplace();
            onClose();
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: () => {
            onReplace();
            onClose();
          },
        },
      ]
    );
  };

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatTimestamp = (date: Date): string => {
    return date.toLocaleString();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <StatusBar hidden={!showControls} />
      <View style={styles.container}>
        {/* Header Controls */}
        {showControls && (
          <SafeAreaView style={styles.headerContainer}>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>

              {photoIndex !== undefined && totalPhotos !== undefined && (
                <View style={styles.photoCounter}>
                  <Text style={styles.photoCounterText}>
                    {photoIndex + 1} of {totalPhotos}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleReplace}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="camera" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        )}

        {/* Main Image Container */}
        <TouchableOpacity
          style={styles.imageContainer}
          onPress={toggleControls}
          activeOpacity={1}
        >
          {/* Navigation arrows */}
          {canNavigate && showControls && onPrevious && photoIndex! > 0 && (
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonLeft]}
              onPress={onPrevious}
            >
              <Ionicons name="chevron-back" size={32} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            minimumZoomScale={1}
            maximumZoomScale={3}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            <Image
              source={{ uri: photo.uri }}
              style={[
                styles.image,
                {
                  width: screenWidth,
                  height: (photo.height / photo.width) * screenWidth,
                  maxHeight: screenHeight * 0.8,
                },
              ]}
              resizeMode="contain"
              onLoad={() => setImageLoaded(true)}
            />
          </ScrollView>

          {canNavigate && showControls && onNext && photoIndex! < totalPhotos! - 1 && (
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonRight]}
              onPress={onNext}
            >
              <Ionicons name="chevron-forward" size={32} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {!imageLoaded && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Footer Controls & Info */}
        {showControls && (
          <SafeAreaView style={styles.footerContainer}>
            <View style={styles.photoInfo}>
              <View style={styles.infoRow}>
                <Ionicons name="resize" size={16} color="#FFFFFF" />
                <Text style={styles.infoText}>
                  {photo.width} × {photo.height}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="document" size={16} color="#FFFFFF" />
                <Text style={styles.infoText}>
                  {formatFileSize(photo.fileSize)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="time" size={16} color="#FFFFFF" />
                <Text style={styles.infoText}>
                  {formatTimestamp(photo.timestamp)}
                </Text>
              </View>
              {photo.compressed && (
                <View style={styles.compressedBadge}>
                  <Ionicons name="resize" size={14} color="#28A745" />
                  <Text style={styles.compressedText}>Compressed</Text>
                </View>
              )}
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.replaceButton]}
                onPress={handleReplace}
              >
                <Ionicons name="camera" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Replace</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={handleDelete}
              >
                <Ionicons name="trash" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    minWidth: 44,
    alignItems: 'center',
  },
  photoCounter: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  photoCounterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
  },
  image: {
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  navButtonLeft: {
    left: 16,
  },
  navButtonRight: {
    right: 16,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingTop: 16,
  },
  photoInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '400',
  },
  compressedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(40, 167, 69, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  compressedText: {
    color: '#28A745',
    fontSize: 11,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 32,
    paddingBottom: Platform.OS === 'ios' ? 0 : 16,
    gap: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  replaceButton: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#DC3545',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PhotoPreviewModal;