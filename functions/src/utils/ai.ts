import OpenAI from 'openai';
import { config } from '../config';

const openai = config.openai.apiKey ? new OpenAI({
  apiKey: config.openai.apiKey
}) : null;

export const analyzeCase = async (description: string, images?: string[]): Promise<any> => {
  if (!openai) {
    console.log('OpenAI not configured, skipping analysis');
    return null;
  }
  
  try {
    const prompt = `
    Analyze this maintenance request and provide:
    1. Suggested category (plumbing, electrical, hvac, appliance, structural, other)
    2. Priority assessment (low, medium, high, emergency)
    3. Estimated cost range
    4. Suggested actions for resolution
    
    Description: ${description}
    `;
    
    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert property maintenance advisor. Provide concise, actionable advice.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    });
    
    const content = response.choices[0].message.content || '';
    
    // Parse AI response (you might want more sophisticated parsing)
    const lines = content.split('\n');
    const analysis = {
      suggestedCategory: extractValue(lines, 'category') || 'other',
      priorityAssessment: extractValue(lines, 'priority') || 'medium',
      estimatedCost: extractValue(lines, 'cost') || 'Unknown',
      suggestedActions: extractActions(lines),
      analyzedAt: new Date()
    };
    
    return analysis;
  } catch (error) {
    console.error('Error analyzing case with AI:', error);
    return null;
  }
};

const extractValue = (lines: string[], keyword: string): string => {
  const line = lines.find(l => l.toLowerCase().includes(keyword));
  if (!line) return '';
  
  const parts = line.split(':');
  return parts[1]?.trim() || '';
};

const extractActions = (lines: string[]): string[] => {
  const actionIndex = lines.findIndex(l => l.toLowerCase().includes('action'));
  if (actionIndex === -1) return [];
  
  const actions: string[] = [];
  for (let i = actionIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line && (line.startsWith('-') || line.match(/^\d+\./))) {
      actions.push(line.replace(/^[-\d.]\s*/, ''));
    }
  }
  
  return actions;
};