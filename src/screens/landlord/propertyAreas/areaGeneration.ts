import { AssetCondition, PropertyArea, PropertyData } from '../../../types/property';

const createArea = (
  id: string,
  name: string,
  type: PropertyArea['type'],
  icon: string,
  isDefault: boolean,
): PropertyArea => ({
  id,
  name,
  type,
  icon,
  isDefault,
  photos: [],
  inventoryComplete: false,
  condition: AssetCondition.GOOD,
  assets: [],
});

const generateRoomName = (type: string, count: number, index: number): string => {
  const typeNames: Record<string, string> = {
    kitchen: 'Kitchen',
    living_room: 'Living Room',
    garage: 'Garage',
    outdoor: 'Yard',
    laundry: 'Laundry Room',
  };

  const baseName = typeNames[type] || 'Room';

  if (count === 1) return baseName;
  if (index === 0) return `Main ${baseName}`;
  return `${baseName} ${index + 1}`;
};

export const getIconForRoomType = (type: PropertyArea['type']): string => {
  const iconMap: Record<PropertyArea['type'], string> = {
    kitchen: 'restaurant',
    living_room: 'tv',
    bedroom: 'bed',
    bathroom: 'water',
    garage: 'car',
    outdoor: 'leaf',
    laundry: 'shirt',
    other: 'home',
  };
  return iconMap[type] || 'home';
};

export const getRoomTypeLabel = (type: PropertyArea['type']): string => {
  const typeMap: Record<PropertyArea['type'], string> = {
    bedroom: 'Bedroom',
    bathroom: 'Bathroom',
    living_room: 'Living Room',
    kitchen: 'Kitchen',
    laundry: 'Laundry/Utility',
    garage: 'Garage/Storage',
    outdoor: 'Outdoor',
    other: 'Other',
  };
  return typeMap[type] || 'Other';
};

export const generateDynamicAreas = (propertyData: PropertyData): PropertyArea[] => {
  const bedrooms = propertyData.bedrooms || 0;
  const bathrooms = propertyData.bathrooms || 0;

  const essentialAreas: PropertyArea[] = [
    createArea('kitchen', 'Kitchen', 'kitchen', 'restaurant', true),
    createArea('living', 'Living Room', 'living_room', 'tv', true),
  ];

  const bedroomAreas: PropertyArea[] = [];
  for (let i = 1; i <= bedrooms; i++) {
    const bedroomName = bedrooms === 1 ? 'Bedroom' : i === 1 ? 'Master Bedroom' : `Bedroom ${i}`;
    bedroomAreas.push(createArea(`bedroom${i}`, bedroomName, 'bedroom', 'bed', true));
  }

  const bathroomAreas: PropertyArea[] = [];
  const fullBathrooms = Math.floor(bathrooms);
  const hasHalfBath = bathrooms % 1 !== 0;

  for (let i = 1; i <= fullBathrooms; i++) {
    const bathroomName = fullBathrooms === 1 ? 'Bathroom' : i === 1 ? 'Master Bathroom' : `Bathroom ${i}`;
    bathroomAreas.push(createArea(`bathroom${i}`, bathroomName, 'bathroom', 'water', true));
  }

  if (hasHalfBath) {
    bathroomAreas.push(createArea('half-bathroom', 'Half Bathroom', 'bathroom', 'water', true));
  }

  const optionalAreas: PropertyArea[] =
    propertyData.type === 'apartment' || propertyData.type === 'condo'
      ? [
          createArea('balcony', 'Balcony/Patio', 'outdoor', 'flower', false),
          createArea('laundry', 'Laundry Room', 'laundry', 'shirt', false),
          createArea('storage', 'Storage Closet', 'other', 'archive', false),
        ]
      : [
          createArea('garage', 'Garage', 'garage', 'car', false),
          createArea('yard', 'Yard', 'outdoor', 'leaf', false),
          createArea('basement', 'Basement', 'other', 'layers', false),
          createArea('laundry', 'Laundry Room', 'laundry', 'shirt', false),
        ];

  return [...essentialAreas, ...bedroomAreas, ...bathroomAreas, ...optionalAreas];
};

export const generateAreasFromCounts = (
  propertyData: PropertyData | undefined,
  counts: Record<string, number>,
): PropertyArea[] => {
  const generatedAreas: PropertyArea[] = [];

  const bedrooms = propertyData?.bedrooms || 0;
  const bathrooms = propertyData?.bathrooms || 0;

  for (let i = 1; i <= bedrooms; i++) {
    const bedroomName = bedrooms === 1 ? 'Bedroom' : i === 1 ? 'Master Bedroom' : `Bedroom ${i}`;
    generatedAreas.push(createArea(`bedroom${i}`, bedroomName, 'bedroom', 'bed', true));
  }

  const fullBathrooms = Math.floor(bathrooms);
  const hasHalfBath = bathrooms % 1 !== 0;

  for (let i = 1; i <= fullBathrooms; i++) {
    const bathroomName = fullBathrooms === 1 ? 'Bathroom' : i === 1 ? 'Master Bathroom' : `Bathroom ${i}`;
    generatedAreas.push(createArea(`bathroom${i}`, bathroomName, 'bathroom', 'water', true));
  }

  if (hasHalfBath) {
    generatedAreas.push(createArea('half-bathroom', 'Half Bathroom', 'bathroom', 'water', true));
  }

  Object.entries(counts).forEach(([type, count]) => {
    for (let i = 0; i < count; i++) {
      generatedAreas.push(
        createArea(
          `${type}${i + 1}`,
          generateRoomName(type, count, i),
          type as PropertyArea['type'],
          getIconForRoomType(type as PropertyArea['type']),
          false,
        ),
      );
    }
  });

  return generatedAreas;
};
