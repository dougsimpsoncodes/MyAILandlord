export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'tenant' | 'landlord';
  createdAt: Date;
  updatedAt: Date;
  
  // Tenant specific fields
  landlordId?: string;
  propertyAddress?: string;
  unitNumber?: string;
  
  // Landlord specific fields
  properties?: Property[];
  tenantIds?: string[];
  vendorContacts?: VendorContact[];
}

export interface Property {
  id: string;
  address: string;
  units: string[];
  createdAt: Date;
}

export interface VendorContact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  specialty: string;
  notes?: string;
}