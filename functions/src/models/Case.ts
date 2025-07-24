export interface Case {
  id: string;
  tenantId: string;
  landlordId: string;
  
  // Basic info
  title: string;
  description: string;
  category: 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'structural' | 'other';
  priority: 'low' | 'medium' | 'high' | 'emergency';
  status: 'new' | 'in_progress' | 'pending_vendor' | 'resolved' | 'closed';
  
  // Location
  propertyAddress: string;
  unitNumber?: string;
  location?: string; // e.g., "Kitchen", "Bathroom"
  
  // Structured data for smart insights
  structuredData?: {
    area: string; // AreaType
    asset: string; // Asset name
    issueType?: string; // Specific issue type
    assetCategory: string; // AssetCategory
    estimatedCost: {
      min: number;
      max: number;
    };
    vendorType?: string; // Type of vendor needed
  };
  
  // Media
  images?: string[]; // Storage URLs
  voiceNote?: string; // Storage URL
  
  // AI Analysis
  aiAnalysis?: {
    suggestedCategory: string;
    priorityAssessment: string;
    estimatedCost?: string;
    suggestedActions: string[];
    analyzedAt: Date;
  };
  
  // Vendor assignment
  vendorId?: string;
  vendorEmail?: string;
  vendorAssignedAt?: Date;
  vendorNotes?: string;
  
  // Timeline
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  
  // Communication
  updates?: CaseUpdate[];
}

export interface CaseUpdate {
  id: string;
  authorId: string;
  authorRole: 'tenant' | 'landlord' | 'vendor';
  message: string;
  images?: string[];
  createdAt: Date;
}