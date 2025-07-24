import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TenantStackParamList } from '../../navigation/MainStack';
import { Ionicons } from '@expo/vector-icons';

type FollowUpScreenRouteProp = RouteProp<TenantStackParamList, 'FollowUp'>;
type FollowUpScreenNavigationProp = NativeStackNavigationProp<TenantStackParamList, 'FollowUp'>;

interface Question {
  id: string;
  question: string;
  type: 'single' | 'multiple';
  options: string[];
  answer?: string | string[];
}

const FollowUpScreen = () => {
  const route = useRoute<FollowUpScreenRouteProp>();
  const navigation = useNavigation<FollowUpScreenNavigationProp>();
  const { issueId } = route.params;

  const [questions] = useState<Question[]>([
    {
      id: '1',
      question: 'Where exactly is this issue located?',
      type: 'single',
      options: ['Kitchen', 'Bathroom', 'Living Room', 'Bedroom', 'Other'],
    },
    {
      id: '2',
      question: 'How long has this problem been occurring?',
      type: 'single',
      options: ['Just noticed', 'A few days', 'A week', 'More than a week', 'Ongoing for months'],
    },
    {
      id: '3',
      question: 'Does this happen at specific times?',
      type: 'single',
      options: ['All the time', 'Only mornings', 'Only evenings', 'Randomly', 'When using specific items'],
    },
    {
      id: '4',
      question: 'How urgent is this repair?',
      type: 'single',
      options: ['Emergency', 'Very urgent', 'Moderate', 'Can wait', 'Low priority'],
    },
  ]);

  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const currentQuestion = questions[currentQuestionIndex];

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleNext = () => {
    if (!answers[currentQuestion.id]) {
      Alert.alert('Please Select', 'Please select an answer before continuing.');
      return;
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      navigation.navigate('ConfirmSubmission', { issueId });
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else {
      navigation.goBack();
    }
  };

  const getUrgencyColor = (option: string) => {
    switch (option) {
      case 'Emergency':
        return '#E74C3C';
      case 'Very urgent':
        return '#E67E22';
      case 'Moderate':
        return '#F39C12';
      case 'Can wait':
        return '#27AE60';
      case 'Low priority':
        return '#95A5A6';
      default:
        return '#3498DB';
    }
  };

  const getOptionStyle = (questionId: string, option: string) => {
    const isSelected = answers[questionId] === option;
    const baseStyle: any[] = [styles.optionButton];
    
    if (isSelected) {
      baseStyle.push(styles.optionButtonSelected);
      if (questionId === '4') {
        baseStyle.push({ borderColor: getUrgencyColor(option) });
      }
    }
    
    return baseStyle;
  };

  const getOptionTextStyle = (questionId: string, option: string) => {
    const isSelected = answers[questionId] === option;
    const baseStyle: any[] = [styles.optionText];
    
    if (isSelected) {
      baseStyle.push(styles.optionTextSelected);
      if (questionId === '4') {
        baseStyle.push({ color: getUrgencyColor(option) });
      }
    }
    
    return baseStyle;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {currentQuestionIndex + 1} of {questions.length}
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }
              ]} 
            />
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.questionContainer}>
          <View style={styles.questionHeader}>
            <Ionicons name="help-circle" size={32} color="#3498DB" />
            <Text style={styles.questionNumber}>Question {currentQuestionIndex + 1}</Text>
          </View>
          
          <Text style={styles.questionText}>{currentQuestion.question}</Text>
          
          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option) => (
              <TouchableOpacity
                key={option}
                style={getOptionStyle(currentQuestion.id, option)}
                onPress={() => handleAnswer(currentQuestion.id, option)}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <Text style={getOptionTextStyle(currentQuestion.id, option)}>
                    {option}
                  </Text>
                  {answers[currentQuestion.id] === option && (
                    <Ionicons 
                      name="checkmark-circle" 
                      size={24} 
                      color={currentQuestion.id === '4' ? getUrgencyColor(option) : '#3498DB'} 
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {currentQuestion.id === '4' && (
            <View style={styles.urgencyNote}>
              <Ionicons name="information-circle" size={16} color="#7F8C8D" />
              <Text style={styles.urgencyNoteText}>
                Emergency repairs will be prioritized for immediate response
              </Text>
            </View>
          )}
        </View>

        <View style={styles.aiInsight}>
          <View style={styles.aiHeader}>
            <Ionicons name="sparkles" size={20} color="#9B59B6" />
            <Text style={styles.aiTitle}>AI Insight</Text>
          </View>
          <Text style={styles.aiText}>
            {currentQuestion.id === '1' && "Knowing the exact location helps us send the right tools and expertise."}
            {currentQuestion.id === '2' && "Duration helps us understand if this is a new issue or ongoing problem."}
            {currentQuestion.id === '3' && "Timing patterns can help identify the root cause of the problem."}
            {currentQuestion.id === '4' && "Priority level helps us schedule repairs appropriately and manage expectations."}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            {currentQuestionIndex === questions.length - 1 ? 'Review & Submit' : 'Next Question'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  progressContainer: {
    flex: 1,
  },
  progressText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E1E8ED',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3498DB',
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  questionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  questionNumber: {
    fontSize: 16,
    color: '#3498DB',
    fontWeight: '600',
  },
  questionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 24,
    lineHeight: 28,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E1E8ED',
  },
  optionButtonSelected: {
    backgroundColor: '#EBF5FF',
    borderColor: '#3498DB',
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#3498DB',
    fontWeight: '600',
  },
  urgencyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  urgencyNoteText: {
    fontSize: 12,
    color: '#7F8C8D',
    flex: 1,
  },
  aiInsight: {
    backgroundColor: '#F8F5FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8D5FF',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  aiTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9B59B6',
  },
  aiText: {
    fontSize: 14,
    color: '#8E44AD',
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E1E8ED',
  },
  nextButton: {
    backgroundColor: '#3498DB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FollowUpScreen;