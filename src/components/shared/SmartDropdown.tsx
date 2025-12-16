import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DropdownOption {
  value: string;
  label: string;
  icon?: string;
  description?: string;
}

interface SmartDropdownProps {
  label: string;
  placeholder: string;
  options: DropdownOption[];
  value?: string;
  onSelect: (value: string) => void;
  disabled?: boolean;
}

export const SmartDropdown: React.FC<SmartDropdownProps> = ({
  label,
  placeholder,
  options,
  value,
  onSelect,
  disabled = false
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const selectedOption = options.find(option => option.value === value);

  const handleSelect = (optionValue: string) => {
    onSelect(optionValue);
    setIsVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      <TouchableOpacity
        style={[
          styles.dropdown,
          disabled && styles.dropdownDisabled,
          isVisible && styles.dropdownActive
        ]}
        onPress={() => !disabled && setIsVisible(true)}
        disabled={disabled}
      >
        <View style={styles.dropdownContent}>
          {selectedOption ? (
            <View style={styles.selectedOption}>
              {selectedOption.icon && (
                <Ionicons 
                  name={selectedOption.icon as any} 
                  size={20} 
                  color="#2C3E50" 
                  style={styles.optionIcon}
                />
              )}
              <Text style={styles.selectedText}>{selectedOption.label}</Text>
            </View>
          ) : (
            <Text style={styles.placeholder}>{placeholder}</Text>
          )}
        </View>
        
        <Ionicons 
          name={isVisible ? "chevron-up" : "chevron-down"} 
          size={20} 
          color={disabled ? "#95A5A6" : "#7F8C8D"} 
        />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <TouchableOpacity 
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setIsVisible(false)}
        >
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity 
                onPress={() => setIsVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#7F8C8D" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.optionsList}>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.option,
                    value === option.value && styles.selectedOptionItem
                  ]}
                  onPress={() => handleSelect(option.value)}
                >
                  <View style={styles.optionContent}>
                    {option.icon && (
                      <Ionicons 
                        name={option.icon as any} 
                        size={24} 
                        color={value === option.value ? "#3498DB" : "#7F8C8D"} 
                        style={styles.optionIcon}
                      />
                    )}
                    <View style={styles.optionText}>
                      <Text style={[
                        styles.optionLabel,
                        value === option.value && styles.selectedOptionLabel
                      ]}>
                        {option.label}
                      </Text>
                      {option.description && (
                        <Text style={styles.optionDescription}>
                          {option.description}
                        </Text>
                      )}
                    </View>
                  </View>
                  
                  {value === option.value && (
                    <Ionicons name="checkmark" size={20} color="#3498DB" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E1E8ED',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    
    
    
    
    elevation: 2,
  },
  dropdownDisabled: {
    backgroundColor: '#FFFFFF',
    opacity: 0.5,
  },
  dropdownActive: {
    borderColor: '#3498DB',
  },
  dropdownContent: {
    flex: 1,
  },
  selectedOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedText: {
    fontSize: 16,
    color: '#2C3E50',
  },
  placeholder: {
    fontSize: 16,
    color: '#95A5A6',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    maxHeight: '80%',
    boxShadow: '0px 10px 10px rgba(0, 0, 0, 0.25)',
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F2F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  closeButton: {
    padding: 4,
  },
  optionsList: {
    maxHeight: 400,
  },
  option: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedOptionItem: {
    backgroundColor: '#F8FBFF',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    marginRight: 12,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '500',
  },
  selectedOptionLabel: {
    color: '#3498DB',
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 2,
  },
});