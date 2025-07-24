export interface Property {
  id: string;
  landlordId: string;
  address: string;
  units: Unit[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Unit {
  id: string;
  name: string; // "Apt 2B", "Main Floor", etc.
  propertyId: string;
  areas: Area[];
}

export interface Area {
  id: string;
  name: string; // "Kitchen", "Master Bathroom", etc.
  type: AreaType;
  unitId: string;
  assets: Asset[];
}

export interface Asset {
  id: string;
  name: string; // "Kitchen Sink", "Refrigerator", etc.
  category: AssetCategory;
  areaId: string;
  brand?: string;
  model?: string;
  installDate?: Date;
  warrantyExpiry?: Date;
  commonIssues: string[];
}

export enum AreaType {
  KITCHEN = 'kitchen',
  BATHROOM = 'bathroom',
  BEDROOM = 'bedroom',
  LIVING_ROOM = 'living_room',
  DINING_ROOM = 'dining_room',
  LAUNDRY_ROOM = 'laundry_room',
  BASEMENT = 'basement',
  ATTIC = 'attic',
  GARAGE = 'garage',
  OUTDOOR = 'outdoor',
  HALLWAY = 'hallway',
  OTHER = 'other'
}

export enum AssetCategory {
  PLUMBING = 'plumbing',
  ELECTRICAL = 'electrical',
  HVAC = 'hvac',
  APPLIANCE = 'appliance',
  FIXTURE = 'fixture',
  STRUCTURAL = 'structural',
  FLOORING = 'flooring',
  WINDOW = 'window',
  DOOR = 'door'
}

export interface AssetTemplate {
  name: string;
  category: AssetCategory;
  areaTypes: AreaType[];
  commonIssues: string[];
  estimatedCost: {
    min: number;
    max: number;
  };
  vendorType: string;
}