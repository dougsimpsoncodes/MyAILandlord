import { AreaType } from '../models/Property';

export interface AreaTemplate {
  type: AreaType;
  displayName: string;
  icon: string;
  description: string;
}

export const AREA_TEMPLATES: AreaTemplate[] = [
  {
    type: AreaType.KITCHEN,
    displayName: 'Kitchen',
    icon: 'restaurant',
    description: 'Cooking and food preparation area'
  },
  {
    type: AreaType.BATHROOM,
    displayName: 'Bathroom',
    icon: 'water',
    description: 'Full bathroom with toilet, sink, and shower/tub'
  },
  {
    type: AreaType.BEDROOM,
    displayName: 'Bedroom',
    icon: 'bed',
    description: 'Sleeping area or guest room'
  },
  {
    type: AreaType.LIVING_ROOM,
    displayName: 'Living Room',
    icon: 'tv',
    description: 'Main living and entertainment space'
  },
  {
    type: AreaType.DINING_ROOM,
    displayName: 'Dining Room',
    icon: 'wine',
    description: 'Formal or informal dining area'
  },
  {
    type: AreaType.LAUNDRY_ROOM,
    displayName: 'Laundry Room',
    icon: 'shirt',
    description: 'Washer, dryer, and utility area'
  },
  {
    type: AreaType.BASEMENT,
    displayName: 'Basement',
    icon: 'home',
    description: 'Below-ground level storage or living space'
  },
  {
    type: AreaType.ATTIC,
    displayName: 'Attic',
    icon: 'triangle',
    description: 'Upper level storage or living space'
  },
  {
    type: AreaType.GARAGE,
    displayName: 'Garage',
    icon: 'car',
    description: 'Vehicle storage and utility space'
  },
  {
    type: AreaType.OUTDOOR,
    displayName: 'Outdoor/Patio',
    icon: 'sunny',
    description: 'Outdoor areas, patios, balconies'
  },
  {
    type: AreaType.HALLWAY,
    displayName: 'Hallway',
    icon: 'arrow-forward',
    description: 'Corridors and connecting spaces'
  },
  {
    type: AreaType.OTHER,
    displayName: 'Other',
    icon: 'ellipsis-horizontal',
    description: 'Other areas not listed above'
  }
];

export const getAreaTemplate = (type: AreaType): AreaTemplate | undefined => {
  return AREA_TEMPLATES.find(area => area.type === type);
};