"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendCaseToVendor = exports.sendCaseNotification = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const mail_1 = __importDefault(require("@sendgrid/mail"));
const config_1 = require("../config");
const db = admin.firestore();
// Initialize SendGrid
if (config_1.config.sendgrid.apiKey) {
    mail_1.default.setApiKey(config_1.config.sendgrid.apiKey);
}
const sendCaseNotification = async (caseId, type) => {
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
        let recipientEmail;
        let subject;
        let text;
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
            from: config_1.config.sendgrid.fromEmail,
            subject,
            text,
            html: text.replace(/\n/g, '<br>')
        };
        if (config_1.config.sendgrid.apiKey) {
            await mail_1.default.send(msg);
            console.log(`Email sent to ${recipientEmail}`);
        }
        else {
            console.log('SendGrid not configured, skipping email');
        }
    }
    catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};
exports.sendCaseNotification = sendCaseNotification;
// Firestore trigger for sending emails to vendors
exports.sendCaseToVendor = functions.firestore
    .document('cases/{caseId}')
    .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const previousData = change.before.data();
    // Check if vendor was just assigned
    if (newData.vendorEmail && !previousData.vendorEmail) {
        await (0, exports.sendCaseNotification)(context.params.caseId, 'vendor_assigned');
    }
});
//# sourceMappingURL=email.js.map