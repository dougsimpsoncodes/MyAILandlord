import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import sgMail from '@sendgrid/mail';
import { config } from '../config';

const db = admin.firestore();

// Initialize SendGrid
if (config.sendgrid.apiKey) {
  sgMail.setApiKey(config.sendgrid.apiKey);
}

export const sendCaseNotification = async (caseId: string, type: 'created' | 'updated' | 'vendor_assigned') => {
  try {
    // Get case data
    const caseDoc = await db.collection('cases').doc(caseId).get();
    if (!caseDoc.exists) {
      throw new Error('Case not found');
    }
    
    const caseData = caseDoc.data();
    if (!caseData) {
      throw new Error('Case data not found');
    }
    
    // Get recipient based on notification type
    let recipientEmail: string;
    let subject: string;
    let text: string;
    
    switch (type) {
      case 'created':
        // Notify landlord
        const landlordDoc = await db.collection('users').doc(caseData.landlordId).get();
        recipientEmail = landlordDoc.data()?.email;
        subject = `New Maintenance Request: ${caseData.title}`;
        text = `A new maintenance request has been submitted.\n\nTitle: ${caseData.title}\nDescription: ${caseData.description}\nPriority: ${caseData.priority}\nCategory: ${caseData.category}`;
        break;
        
      case 'updated':
        // Notify tenant
        const tenantDoc = await db.collection('users').doc(caseData.tenantId).get();
        recipientEmail = tenantDoc.data()?.email;
        subject = `Update on your maintenance request: ${caseData.title}`;
        text = `Your maintenance request has been updated.\n\nStatus: ${caseData.status}`;
        break;
        
      case 'vendor_assigned':
        // Notify vendor
        recipientEmail = caseData.vendorEmail;
        subject = `New Work Order: ${caseData.title}`;
        text = `You have been assigned a new work order.\n\nTitle: ${caseData.title}\nDescription: ${caseData.description}\nLocation: ${caseData.propertyAddress} ${caseData.unitNumber || ''}\nNotes: ${caseData.vendorNotes || 'None'}`;
        break;
        
      default:
        throw new Error('Invalid notification type');
    }
    
    if (!recipientEmail) {
      console.error('No recipient email found');
      return;
    }
    
    const msg = {
      to: recipientEmail,
      from: config.sendgrid.fromEmail,
      subject,
      text,
      html: text.replace(/\n/g, '<br>')
    };
    
    if (config.sendgrid.apiKey) {
      await sgMail.send(msg);
      console.log(`Email sent to ${recipientEmail}`);
    } else {
      console.log('SendGrid not configured, skipping email');
    }
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Firestore trigger for sending emails to vendors
export const sendCaseToVendor = functions.firestore
  .document('cases/{caseId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const previousData = change.before.data();
    
    // Check if vendor was just assigned
    if (newData.vendorEmail && !previousData.vendorEmail) {
      await sendCaseNotification(context.params.caseId, 'vendor_assigned');
    }
  });