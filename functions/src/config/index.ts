import * as functions from 'firebase-functions';

export const config = {
  sendgrid: {
    apiKey: functions.config().sendgrid?.key || '',
    fromEmail: 'noreply@myailandlord.com',
    templates: {
      caseCreated: 'd-template-id-1',
      caseUpdated: 'd-template-id-2',
      vendorAssigned: 'd-template-id-3'
    }
  },
  openai: {
    apiKey: functions.config().openai?.key || '',
    model: 'gpt-4-turbo-preview'
  },
  storage: {
    maxImageSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    bucketName: 'my-ai-landlord.appspot.com'
  },
  cors: {
    allowedOrigins: [
      'http://localhost:8081',
      'http://localhost:19006',
      'https://my-ai-landlord.firebaseapp.com',
      'https://my-ai-landlord.web.app'
    ]
  }
};