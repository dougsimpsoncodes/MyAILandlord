import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { DesignSystem } from '../../theme/DesignSystem';
import ScreenContainer from '../../components/shared/ScreenContainer';
import ConfirmDialog from '../../components/shared/ConfirmDialog';

type IssueCategory = 'general' | 'bug' | 'billing' | 'feature' | 'account';

const ContactSupportScreen = () => {
  const navigation = useNavigation();
  const [selectedCategory, setSelectedCategory] = useState<IssueCategory | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Dialog state
  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmStyle?: 'default' | 'destructive' | 'info';
    onConfirm: () => void;
  }>({ visible: false, title: '', message: '', onConfirm: () => {} });

  const categories: { id: IssueCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'general', label: 'General', icon: 'help-circle-outline' },
    { id: 'bug', label: 'Bug Report', icon: 'bug-outline' },
    { id: 'billing', label: 'Billing', icon: 'card-outline' },
    { id: 'feature', label: 'Feature Request', icon: 'bulb-outline' },
    { id: 'account', label: 'Account', icon: 'person-outline' },
  ];

  const showNotification = (title: string, msg: string, style: 'default' | 'destructive' | 'info' = 'info', onConfirm?: () => void) => {
    setDialogConfig({
      visible: true,
      title,
      message: msg,
      confirmStyle: style,
      onConfirm: () => {
        setDialogConfig(prev => ({ ...prev, visible: false }));
        onConfirm?.();
      },
    });
  };

  const handleSubmit = async () => {
    if (!selectedCategory) {
      showNotification('Error', 'Please select a category', 'destructive');
      return;
    }
    if (!subject.trim()) {
      showNotification('Error', 'Please enter a subject', 'destructive');
      return;
    }
    if (!message.trim()) {
      showNotification('Error', 'Please enter your message', 'destructive');
      return;
    }

    setIsSending(true);
    try {
      // TODO: Implement support ticket API
      await new Promise(resolve => setTimeout(resolve, 1000));
      showNotification(
        'Message Sent',
        'Thank you for contacting us. We\'ll get back to you within 24-48 hours.',
        'default',
        () => navigation.goBack()
      );
    } catch {
      showNotification('Error', 'Failed to send message. Please try again.', 'destructive');
    } finally {
      setIsSending(false);
    }
  };

  const handleEmailPress = () => {
    Linking.openURL('mailto:support@myailandlord.com');
  };

  return (
    <ScreenContainer
      title="Contact Support"
      showBackButton
      onBackPress={() => navigation.goBack()}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Contact Options */}
        <View style={styles.contactOptions}>
          <TouchableOpacity style={styles.contactOption} onPress={handleEmailPress}>
            <View style={[styles.contactIcon, { backgroundColor: '#EBF5FB' }]}>
              <Ionicons name="mail-outline" size={22} color="#3498DB" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>support@myailandlord.com</Text>
            </View>
            <Ionicons name="open-outline" size={18} color="#BDC3C7" />
          </TouchableOpacity>
        </View>

        {/* Category Selection */}
        <Text style={styles.sectionTitle}>What can we help you with?</Text>
        <View style={styles.categoriesContainer}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                selectedCategory === cat.id && styles.categoryChipSelected,
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Ionicons
                name={cat.icon}
                size={16}
                color={selectedCategory === cat.id ? '#FFFFFF' : '#7F8C8D'}
              />
              <Text style={[
                styles.categoryLabel,
                selectedCategory === cat.id && styles.categoryLabelSelected,
              ]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Message Form */}
        <Text style={styles.sectionTitle}>Your Message</Text>
        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>Subject</Text>
          <TextInput
            style={styles.input}
            placeholder="Brief description of your issue"
            placeholderTextColor="#95A5A6"
            value={subject}
            onChangeText={setSubject}
          />

          <Text style={styles.inputLabel}>Message</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Please describe your issue in detail..."
            placeholderTextColor="#95A5A6"
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, isSending && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSending}
        >
          <Text style={styles.submitBtnText}>
            {isSending ? 'Sending...' : 'Send Message'}
          </Text>
        </TouchableOpacity>

        {/* Response Time Note */}
        <View style={styles.noteCard}>
          <Ionicons name="time-outline" size={18} color="#7F8C8D" />
          <Text style={styles.noteText}>
            Average response time: 24-48 hours
          </Text>
        </View>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        confirmStyle={dialogConfig.confirmStyle}
        onConfirm={dialogConfig.onConfirm}
        onCancel={() => setDialogConfig(prev => ({ ...prev, visible: false }))}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contactOptions: {
    backgroundColor: DesignSystem.colors.background,
    borderRadius: 12,
    marginBottom: 24,
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  contactValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#3498DB',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: DesignSystem.colors.text,
    marginBottom: 12,
    marginLeft: 4,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
  },
  categoryChipSelected: {
    backgroundColor: '#3498DB',
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#7F8C8D',
  },
  categoryLabelSelected: {
    color: '#FFFFFF',
  },
  formCard: {
    backgroundColor: DesignSystem.colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7F8C8D',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: DesignSystem.colors.text,
  },
  textArea: {
    minHeight: 120,
  },
  submitBtn: {
    backgroundColor: '#3498DB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  noteText: {
    fontSize: 13,
    color: '#7F8C8D',
  },
});

export default ContactSupportScreen;
