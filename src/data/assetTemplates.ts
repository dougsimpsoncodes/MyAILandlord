import { AssetTemplate, InventoryItem, AssetCondition } from '../types/property';

// Asset templates organized by room type for smart suggestions
export const ASSET_TEMPLATES_BY_ROOM: Record<string, AssetTemplate[]> = {
  kitchen: [
    {
      name: 'Refrigerator',
      category: 'Major Appliances',
      subcategory: 'Refrigeration',
      assetType: 'appliance',
      commonBrands: ['Whirlpool', 'GE', 'Samsung', 'LG', 'KitchenAid'],
      estimatedLifespan: 12,
      maintenanceFrequency: 'annually'
    },
    {
      name: 'Dishwasher',
      category: 'Major Appliances',
      subcategory: 'Cleaning',
      assetType: 'appliance',
      commonBrands: ['Bosch', 'Whirlpool', 'GE', 'KitchenAid'],
      estimatedLifespan: 10,
      maintenanceFrequency: 'annually'
    },
    {
      name: 'Range/Stove',
      category: 'Major Appliances',
      subcategory: 'Cooking',
      assetType: 'appliance',
      commonBrands: ['GE', 'Whirlpool', 'Samsung', 'Frigidaire'],
      estimatedLifespan: 15,
      maintenanceFrequency: 'annually'
    },
    {
      name: 'Microwave',
      category: 'Small Appliances',
      subcategory: 'Cooking',
      assetType: 'appliance',
      commonBrands: ['Panasonic', 'GE', 'Samsung', 'LG'],
      estimatedLifespan: 8,
      maintenanceFrequency: 'as-needed'
    },
    {
      name: 'Garbage Disposal',
      category: 'Plumbing',
      subcategory: 'Waste Management',
      assetType: 'fixture',
      commonBrands: ['InSinkErator', 'Waste King', 'KitchenAid'],
      estimatedLifespan: 12,
      maintenanceFrequency: 'annually'
    },
    {
      name: 'Kitchen Sink',
      category: 'Plumbing',
      subcategory: 'Fixtures',
      assetType: 'fixture',
      commonBrands: ['Kohler', 'Moen', 'American Standard'],
      estimatedLifespan: 20,
      maintenanceFrequency: 'as-needed'
    },
    {
      name: 'Kitchen Faucet',
      category: 'Plumbing',
      subcategory: 'Fixtures',
      assetType: 'fixture',
      commonBrands: ['Moen', 'Delta', 'Kohler', 'Pfister'],
      estimatedLifespan: 15,
      maintenanceFrequency: 'as-needed'
    }
  ],

  bathroom: [
    {
      name: 'Toilet',
      category: 'Plumbing',
      subcategory: 'Fixtures',
      assetType: 'fixture',
      commonBrands: ['Kohler', 'American Standard', 'Toto'],
      estimatedLifespan: 25,
      maintenanceFrequency: 'annually'
    },
    {
      name: 'Bathroom Sink',
      category: 'Plumbing',
      subcategory: 'Fixtures',
      assetType: 'fixture',
      commonBrands: ['Kohler', 'Moen', 'American Standard'],
      estimatedLifespan: 20,
      maintenanceFrequency: 'as-needed'
    },
    {
      name: 'Bathroom Faucet',
      category: 'Plumbing',
      subcategory: 'Fixtures',
      assetType: 'fixture',
      commonBrands: ['Moen', 'Delta', 'Kohler'],
      estimatedLifespan: 15,
      maintenanceFrequency: 'as-needed'
    },
    {
      name: 'Shower/Tub',
      category: 'Plumbing',
      subcategory: 'Fixtures',
      assetType: 'fixture',
      commonBrands: ['Kohler', 'American Standard', 'Delta'],
      estimatedLifespan: 30,
      maintenanceFrequency: 'annually'
    },
    {
      name: 'Exhaust Fan',
      category: 'Ventilation',
      subcategory: 'HVAC',
      assetType: 'system',
      commonBrands: ['Broan', 'Delta', 'Air King'],
      estimatedLifespan: 10,
      maintenanceFrequency: 'annually'
    },
    {
      name: 'Vanity',
      category: 'Storage',
      subcategory: 'Furniture',
      assetType: 'furniture',
      estimatedLifespan: 20,
      maintenanceFrequency: 'as-needed'
    }
  ],

  bedroom: [
    {
      name: 'Ceiling Fan',
      category: 'Electrical',
      subcategory: 'Lighting',
      assetType: 'fixture',
      commonBrands: ['Hunter', 'Harbor Breeze', 'Westinghouse'],
      estimatedLifespan: 15,
      maintenanceFrequency: 'annually'
    },
    {
      name: 'Closet Organizer',
      category: 'Storage',
      subcategory: 'Organization',
      assetType: 'structure',
      commonBrands: ['ClosetMaid', 'Rubbermaid', 'IKEA'],
      estimatedLifespan: 15,
      maintenanceFrequency: 'as-needed'
    },
    {
      name: 'Window Blinds',
      category: 'Window Treatments',
      subcategory: 'Coverings',
      assetType: 'fixture',
      commonBrands: ['Hunter Douglas', 'Levolor', 'Bali'],
      estimatedLifespan: 10,
      maintenanceFrequency: 'annually'
    }
  ],

  living_room: [
    {
      name: 'Ceiling Fan',
      category: 'Electrical',
      subcategory: 'Lighting',
      assetType: 'fixture',
      commonBrands: ['Hunter', 'Harbor Breeze', 'Westinghouse'],
      estimatedLifespan: 15,
      maintenanceFrequency: 'annually'
    },
    {
      name: 'Fireplace',
      category: 'Heating',
      subcategory: 'HVAC',
      assetType: 'structure',
      estimatedLifespan: 50,
      maintenanceFrequency: 'annually'
    },
    {
      name: 'Built-in Shelving',
      category: 'Storage',
      subcategory: 'Furniture',
      assetType: 'structure',
      estimatedLifespan: 30,
      maintenanceFrequency: 'as-needed'
    }
  ],

  laundry: [
    {
      name: 'Washer',
      category: 'Major Appliances',
      subcategory: 'Laundry',
      assetType: 'appliance',
      commonBrands: ['Whirlpool', 'GE', 'Samsung', 'LG', 'Maytag'],
      estimatedLifespan: 12,
      maintenanceFrequency: 'annually'
    },
    {
      name: 'Dryer',
      category: 'Major Appliances',
      subcategory: 'Laundry',
      assetType: 'appliance',
      commonBrands: ['Whirlpool', 'GE', 'Samsung', 'LG', 'Maytag'],
      estimatedLifespan: 12,
      maintenanceFrequency: 'annually'
    },
    {
      name: 'Utility Sink',
      category: 'Plumbing',
      subcategory: 'Fixtures',
      assetType: 'fixture',
      commonBrands: ['Kohler', 'American Standard'],
      estimatedLifespan: 20,
      maintenanceFrequency: 'as-needed'
    },
    {
      name: 'Water Heater',
      category: 'Plumbing',
      subcategory: 'Water Systems',
      assetType: 'system',
      commonBrands: ['Rheem', 'Bradford White', 'AO Smith'],
      estimatedLifespan: 10,
      maintenanceFrequency: 'annually'
    }
  ],

  garage: [
    {
      name: 'Garage Door',
      category: 'Structure',
      subcategory: 'Doors',
      assetType: 'structure',
      commonBrands: ['Chamberlain', 'Craftsman', 'Genie'],
      estimatedLifespan: 20,
      maintenanceFrequency: 'annually'
    },
    {
      name: 'Garage Door Opener',
      category: 'Electrical',
      subcategory: 'Motors',
      assetType: 'system',
      commonBrands: ['Chamberlain', 'Craftsman', 'Genie'],
      estimatedLifespan: 15,
      maintenanceFrequency: 'annually'
    },
    {
      name: 'Storage Shelving',
      category: 'Storage',
      subcategory: 'Organization',
      assetType: 'structure',
      estimatedLifespan: 20,
      maintenanceFrequency: 'as-needed'
    }
  ],

  outdoor: [
    {
      name: 'HVAC Unit',
      category: 'HVAC',
      subcategory: 'Climate Control',
      assetType: 'system',
      commonBrands: ['Carrier', 'Trane', 'Lennox', 'Goodman'],
      estimatedLifespan: 15,
      maintenanceFrequency: 'quarterly'
    },
    {
      name: 'Deck/Patio',
      category: 'Structure',
      subcategory: 'Outdoor Living',
      assetType: 'structure',
      estimatedLifespan: 25,
      maintenanceFrequency: 'annually'
    },
    {
      name: 'Outdoor Lighting',
      category: 'Electrical',
      subcategory: 'Lighting',
      assetType: 'fixture',
      estimatedLifespan: 10,
      maintenanceFrequency: 'annually'
    },
    {
      name: 'Sprinkler System',
      category: 'Plumbing',
      subcategory: 'Irrigation',
      assetType: 'system',
      commonBrands: ['Rain Bird', 'Hunter', 'Toro'],
      estimatedLifespan: 20,
      maintenanceFrequency: 'quarterly'
    }
  ]
};

// Get suggested assets for a specific room type
export const getAssetsByRoom = (roomType: string): AssetTemplate[] => {
  return ASSET_TEMPLATES_BY_ROOM[roomType] || ASSET_TEMPLATES_BY_ROOM.other || [];
};

// Get all unique asset categories
export const getAllAssetCategories = (): string[] => {
  const categories = new Set<string>();
  Object.values(ASSET_TEMPLATES_BY_ROOM).forEach(templates => {
    templates.forEach(template => categories.add(template.category));
  });
  return Array.from(categories).sort();
};

// Convert template to inventory item
export const templateToInventoryItem = (template: AssetTemplate, areaId: string): Partial<InventoryItem> => {
  return {
    areaId,
    name: template.name,
    assetType: template.assetType,
    category: template.category,
    subcategory: template.subcategory,
    condition: AssetCondition.GOOD,
    photos: [],
    isActive: true
  };
};