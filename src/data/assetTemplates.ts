import { AssetTemplate, AssetCategory, AreaType } from '../models/Property';

export const ASSET_TEMPLATES: AssetTemplate[] = [
  // Kitchen Assets
  {
    name: 'Kitchen Sink',
    category: AssetCategory.PLUMBING,
    areaTypes: [AreaType.KITCHEN],
    commonIssues: [
      'Faucet leak',
      'Drain clog',
      'Garbage disposal not working',
      'Low water pressure',
      'No hot water'
    ],
    estimatedCost: { min: 100, max: 300 },
    vendorType: 'Plumber'
  },
  {
    name: 'Refrigerator',
    category: AssetCategory.APPLIANCE,
    areaTypes: [AreaType.KITCHEN],
    commonIssues: [
      'Not cooling',
      'Making loud noise',
      'Ice maker broken',
      'Door seal damaged',
      'Water dispenser not working'
    ],
    estimatedCost: { min: 150, max: 400 },
    vendorType: 'Appliance Repair'
  },
  {
    name: 'Stove/Oven',
    category: AssetCategory.APPLIANCE,
    areaTypes: [AreaType.KITCHEN],
    commonIssues: [
      'Burner not heating',
      'Oven not heating',
      'Gas smell',
      'Temperature not accurate',
      'Door not closing properly'
    ],
    estimatedCost: { min: 100, max: 350 },
    vendorType: 'Appliance Repair'
  },
  {
    name: 'Dishwasher',
    category: AssetCategory.APPLIANCE,
    areaTypes: [AreaType.KITCHEN],
    commonIssues: [
      'Not draining',
      'Not cleaning dishes',
      'Leaking water',
      'Strange noises',
      'Door not latching'
    ],
    estimatedCost: { min: 120, max: 300 },
    vendorType: 'Appliance Repair'
  },
  {
    name: 'Kitchen Lighting',
    category: AssetCategory.ELECTRICAL,
    areaTypes: [AreaType.KITCHEN],
    commonIssues: [
      'Light not turning on',
      'Flickering lights',
      'Switch not working',
      'Bulb keeps burning out',
      'Dim lighting'
    ],
    estimatedCost: { min: 50, max: 200 },
    vendorType: 'Electrician'
  },

  // Bathroom Assets
  {
    name: 'Toilet',
    category: AssetCategory.PLUMBING,
    areaTypes: [AreaType.BATHROOM],
    commonIssues: [
      'Won\'t flush',
      'Constantly running',
      'Clogged',
      'Leaking at base',
      'Loose toilet seat'
    ],
    estimatedCost: { min: 80, max: 250 },
    vendorType: 'Plumber'
  },
  {
    name: 'Shower/Bathtub',
    category: AssetCategory.PLUMBING,
    areaTypes: [AreaType.BATHROOM],
    commonIssues: [
      'Low water pressure',
      'No hot water',
      'Drain clog',
      'Leaky faucet',
      'Cracked tiles'
    ],
    estimatedCost: { min: 100, max: 400 },
    vendorType: 'Plumber'
  },
  {
    name: 'Bathroom Sink',
    category: AssetCategory.PLUMBING,
    areaTypes: [AreaType.BATHROOM],
    commonIssues: [
      'Faucet leak',
      'Drain clog',
      'Low water pressure',
      'Cabinet door broken',
      'Mirror loose'
    ],
    estimatedCost: { min: 75, max: 200 },
    vendorType: 'Plumber'
  },
  {
    name: 'Exhaust Fan',
    category: AssetCategory.HVAC,
    areaTypes: [AreaType.BATHROOM, AreaType.KITCHEN],
    commonIssues: [
      'Not turning on',
      'Very loud noise',
      'Not removing moisture',
      'Switch broken',
      'Poor ventilation'
    ],
    estimatedCost: { min: 60, max: 180 },
    vendorType: 'HVAC Technician'
  },

  // Living Room Assets
  {
    name: 'Electrical Outlets',
    category: AssetCategory.ELECTRICAL,
    areaTypes: [AreaType.LIVING_ROOM, AreaType.BEDROOM, AreaType.KITCHEN, AreaType.BATHROOM],
    commonIssues: [
      'Outlet not working',
      'GFCI tripping',
      'Sparking outlet',
      'Loose outlet',
      'USB ports not working'
    ],
    estimatedCost: { min: 50, max: 150 },
    vendorType: 'Electrician'
  },
  {
    name: 'Ceiling Fan',
    category: AssetCategory.ELECTRICAL,
    areaTypes: [AreaType.LIVING_ROOM, AreaType.BEDROOM],
    commonIssues: [
      'Not turning on',
      'Wobbling',
      'Making noise',
      'Remote not working',
      'Light not working'
    ],
    estimatedCost: { min: 80, max: 200 },
    vendorType: 'Electrician'
  },
  {
    name: 'Windows',
    category: AssetCategory.WINDOW,
    areaTypes: [AreaType.LIVING_ROOM, AreaType.BEDROOM, AreaType.KITCHEN, AreaType.BATHROOM],
    commonIssues: [
      'Won\'t open/close',
      'Broken glass',
      'Drafty',
      'Lock broken',
      'Screen damaged'
    ],
    estimatedCost: { min: 100, max: 300 },
    vendorType: 'Handyman'
  },

  // HVAC Assets
  {
    name: 'Air Conditioning Unit',
    category: AssetCategory.HVAC,
    areaTypes: [AreaType.LIVING_ROOM, AreaType.BEDROOM, AreaType.OTHER],
    commonIssues: [
      'Not cooling',
      'Not turning on',
      'Strange noises',
      'Leaking water',
      'Poor airflow'
    ],
    estimatedCost: { min: 150, max: 500 },
    vendorType: 'HVAC Technician'
  },
  {
    name: 'Heating System',
    category: AssetCategory.HVAC,
    areaTypes: [AreaType.BASEMENT, AreaType.UTILITY, AreaType.OTHER],
    commonIssues: [
      'No heat',
      'Uneven heating',
      'Strange smells',
      'Thermostat not working',
      'High energy bills'
    ],
    estimatedCost: { min: 200, max: 600 },
    vendorType: 'HVAC Technician'
  },

  // Laundry Assets
  {
    name: 'Washing Machine',
    category: AssetCategory.APPLIANCE,
    areaTypes: [AreaType.LAUNDRY_ROOM, AreaType.KITCHEN, AreaType.BASEMENT],
    commonIssues: [
      'Not spinning',
      'Not draining',
      'Leaking water',
      'Not filling with water',
      'Making loud noise'
    ],
    estimatedCost: { min: 100, max: 350 },
    vendorType: 'Appliance Repair'
  },
  {
    name: 'Dryer',
    category: AssetCategory.APPLIANCE,
    areaTypes: [AreaType.LAUNDRY_ROOM, AreaType.KITCHEN, AreaType.BASEMENT],
    commonIssues: [
      'Not heating',
      'Not turning on',
      'Takes too long to dry',
      'Making noise',
      'Lint buildup'
    ],
    estimatedCost: { min: 80, max: 250 },
    vendorType: 'Appliance Repair'
  }
];

export const getAssetsByArea = (areaType: AreaType): AssetTemplate[] => {
  return ASSET_TEMPLATES.filter(asset => 
    asset.areaTypes.includes(areaType)
  );
};

export const getCommonIssues = (assetName: string): string[] => {
  const asset = ASSET_TEMPLATES.find(a => a.name === assetName);
  return asset?.commonIssues || [];
};

export const getEstimatedCost = (assetName: string): { min: number; max: number } => {
  const asset = ASSET_TEMPLATES.find(a => a.name === assetName);
  return asset?.estimatedCost || { min: 0, max: 0 };
};