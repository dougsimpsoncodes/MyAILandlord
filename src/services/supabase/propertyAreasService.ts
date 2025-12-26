/**
 * Property Areas & Assets Service
 * Handles database operations for property_areas and property_assets tables
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase } from './config';
import { PropertyArea, InventoryItem, AssetCondition } from '../../types/property';
import { storageService } from './storage';
import log from '../../lib/log';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

// Database row types (match Supabase schema)
interface DbPropertyArea {
  id: string;
  property_id: string;
  name: string;
  area_type: string;
  icon_name: string | null;
  is_default: boolean | null;
  photos: string[] | null;
  inventory_complete: boolean | null;
  condition: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface DbPropertyAsset {
  id: string;
  area_id: string;
  property_id: string;
  name: string;
  asset_type: string;
  category: string;
  subcategory: string | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  condition: string | null;
  installation_date: string | null;
  warranty_start_date: string | null;
  warranty_end_date: string | null;
  warranty_provider: string | null;
  photos: string[] | null;
  manual_url: string | null;
  notes: string | null;
  purchase_price: number | null;
  current_value: number | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

// Convert database row to app type (sync version - photos need async regeneration)
function dbAreaToAppArea(dbArea: DbPropertyArea, assets: InventoryItem[] = []): PropertyArea {
  // Database stores paths, not URLs - we'll regenerate URLs in getAreasWithAssets
  const photoPaths = dbArea.photos || [];
  return {
    id: dbArea.id,
    name: dbArea.name,
    type: dbArea.area_type as PropertyArea['type'],
    icon: dbArea.icon_name || 'grid-outline',
    isDefault: dbArea.is_default || false,
    photos: [], // Will be populated with signed URLs
    photoPaths: photoPaths, // Store the paths for URL regeneration
    inventoryComplete: dbArea.inventory_complete || false,
    condition: (dbArea.condition as AssetCondition) || AssetCondition.GOOD,
    assets: assets,
  };
}

// Generate signed URLs for photo paths
async function regeneratePhotoUrls(paths: string[]): Promise<string[]> {
  if (!paths || paths.length === 0) return [];

  const urls: string[] = [];
  for (const path of paths) {
    if (!path) continue;
    try {
      const url = await storageService.getDisplayUrl('property-images', path);
      if (url) {
        urls.push(url);
      }
    } catch (error) {
      log.warn('Failed to generate signed URL for path', { path, error: String(error) });
    }
  }
  return urls;
}

// Convert app type to database insert
function appAreaToDbArea(area: PropertyArea, propertyId: string): Omit<DbPropertyArea, 'created_at' | 'updated_at'> {
  // Save photoPaths to database (storage paths), not signed URLs
  // If photoPaths exists, use it; otherwise extract paths from photos if they look like paths
  let pathsToSave = area.photoPaths || [];

  // If no photoPaths but photos exist, check if photos are paths (not URLs)
  if (pathsToSave.length === 0 && area.photos && area.photos.length > 0) {
    // Photos that don't start with http are likely paths
    const possiblePaths = area.photos.filter(p => p && !p.startsWith('http'));
    if (possiblePaths.length > 0) {
      pathsToSave = possiblePaths;
    }
  }

  // Generate UUID if the area ID is not a valid UUID (e.g., "kitchen", "living", etc.)
  const areaId = uuidValidate(area.id) ? area.id : uuidv4();

  return {
    id: areaId,
    property_id: propertyId,
    name: area.name,
    area_type: area.type,
    icon_name: area.icon,
    is_default: area.isDefault,
    photos: pathsToSave, // Save paths, not URLs
    inventory_complete: area.inventoryComplete,
    condition: area.condition,
  };
}

// Convert database asset to app type
function dbAssetToAppAsset(dbAsset: DbPropertyAsset): InventoryItem {
  return {
    id: dbAsset.id,
    areaId: dbAsset.area_id,
    name: dbAsset.name,
    assetType: dbAsset.asset_type as InventoryItem['assetType'],
    category: dbAsset.category,
    subcategory: dbAsset.subcategory || undefined,
    brand: dbAsset.brand || undefined,
    model: dbAsset.model || undefined,
    serialNumber: dbAsset.serial_number || undefined,
    condition: (dbAsset.condition as AssetCondition) || AssetCondition.GOOD,
    installationDate: dbAsset.installation_date || undefined,
    warrantyStartDate: dbAsset.warranty_start_date || undefined,
    warrantyEndDate: dbAsset.warranty_end_date || undefined,
    warrantyProvider: dbAsset.warranty_provider || undefined,
    photos: dbAsset.photos || [],
    manualUrl: dbAsset.manual_url || undefined,
    notes: dbAsset.notes || undefined,
    purchasePrice: dbAsset.purchase_price || undefined,
    currentValue: dbAsset.current_value || undefined,
    isActive: dbAsset.is_active ?? true,
  };
}

// Convert app asset to database insert (omit id to let database generate UUID)
function appAssetToDbAsset(asset: InventoryItem, propertyId: string): Omit<DbPropertyAsset, 'id' | 'created_at' | 'updated_at'> {
  return {
    area_id: asset.areaId,
    property_id: propertyId,
    name: asset.name,
    asset_type: asset.assetType,
    category: asset.category,
    subcategory: asset.subcategory || null,
    brand: asset.brand || null,
    model: asset.model || null,
    serial_number: asset.serialNumber || null,
    condition: asset.condition,
    installation_date: asset.installationDate || null,
    warranty_start_date: asset.warrantyStartDate || null,
    warranty_end_date: asset.warrantyEndDate || null,
    warranty_provider: asset.warrantyProvider || null,
    photos: asset.photos,
    manual_url: asset.manualUrl || null,
    notes: asset.notes || null,
    purchase_price: asset.purchasePrice || null,
    current_value: asset.currentValue || null,
    is_active: asset.isActive,
  };
}

export const propertyAreasService = {
  /**
   * Get all areas for a property with their assets
   * @param propertyId - The property ID
   * @param client - Optional authenticated Supabase client (recommended for RLS)
   */
  async getAreasWithAssets(propertyId: string, client?: SupabaseClient): Promise<PropertyArea[]> {
    const supabase = client || defaultSupabase;
    try {
      // Fetch areas
      const { data: areasData, error: areasError } = await supabase
        .from('property_areas')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: true });

      if (areasError) {
        log.error('Failed to fetch property areas', { propertyId, error: areasError.message });
        throw areasError;
      }

      if (!areasData || areasData.length === 0) {
        return [];
      }

      // Fetch all assets for this property
      const { data: assetsData, error: assetsError } = await supabase
        .from('property_assets')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: true });

      if (assetsError) {
        log.error('Failed to fetch property assets', { propertyId, error: assetsError.message });
        throw assetsError;
      }

      // Group assets by area_id
      const assetsByArea = new Map<string, InventoryItem[]>();
      (assetsData || []).forEach((dbAsset: DbPropertyAsset) => {
        const asset = dbAssetToAppAsset(dbAsset);
        const existing = assetsByArea.get(dbAsset.area_id) || [];
        existing.push(asset);
        assetsByArea.set(dbAsset.area_id, existing);
      });

      // Convert areas with their assets
      const areas = areasData.map((dbArea: DbPropertyArea) =>
        dbAreaToAppArea(dbArea, assetsByArea.get(dbArea.id) || [])
      );

      // Regenerate signed URLs for all area photos
      for (const area of areas) {
        if (area.photoPaths && area.photoPaths.length > 0) {
          try {
            const urls = await regeneratePhotoUrls(area.photoPaths);
            area.photos = urls;
            log.info('Regenerated photo URLs for area', {
              areaId: area.id,
              areaName: area.name,
              pathCount: area.photoPaths.length,
              urlCount: urls.length
            });
          } catch (urlError) {
            log.warn('Failed to regenerate photo URLs for area', {
              areaId: area.id,
              error: String(urlError)
            });
          }
        }
      }

      log.info('Fetched property areas with assets', {
        propertyId,
        areaCount: areas.length,
        assetCount: assetsData?.length || 0
      });

      return areas;
    } catch (error) {
      log.error('Error in getAreasWithAssets', { error: String(error) });
      throw error;
    }
  },

  /**
   * Save areas and assets for a property (replaces all existing)
   */
  async saveAreasAndAssets(propertyId: string, areas: PropertyArea[], client?: SupabaseClient): Promise<void> {
    const supabase = client || defaultSupabase;

    try {
      // Delete existing areas (cascades to assets due to FK)
      const { error: deleteError } = await supabase
        .from('property_areas')
        .delete()
        .eq('property_id', propertyId);

      if (deleteError) {
        log.error('Failed to delete existing areas', { propertyId, error: deleteError.message });
        throw deleteError;
      }

      if (areas.length === 0) {
        log.info('No areas to save', { propertyId });
        return;
      }

      // Insert areas and create ID mapping (old string ID -> new UUID)
      const areaIdMap: Record<string, string> = {};
      const areasToInsert = areas.map(area => {
        const dbArea = appAreaToDbArea(area, propertyId);
        // Map old area.id to new UUID
        areaIdMap[area.id] = dbArea.id;
        return dbArea;
      });

      const { data: insertedAreas, error: areasInsertError } = await supabase
        .from('property_areas')
        .insert(areasToInsert)
        .select();

      if (areasInsertError) {
        log.error('Failed to insert areas', { propertyId, error: areasInsertError.message });
        throw areasInsertError;
      }

      // Collect all assets from all areas, using mapped area IDs
      const allAssets: ReturnType<typeof appAssetToDbAsset>[] = [];
      areas.forEach(area => {
        const newAreaId = areaIdMap[area.id] || area.id;
        (area.assets || []).forEach(asset => {
          // Create asset with correct area ID
          const dbAsset = appAssetToDbAsset(asset, propertyId);
          // Override area_id with the mapped UUID
          dbAsset.area_id = newAreaId;
          allAssets.push(dbAsset);
        });
      });

      // Insert assets if any
      if (allAssets.length > 0) {
        const { error: assetsInsertError } = await supabase
          .from('property_assets')
          .insert(allAssets);

        if (assetsInsertError) {
          log.error('Failed to insert assets', { propertyId, error: assetsInsertError.message });
          throw assetsInsertError;
        }
      }

      log.info('Saved property areas and assets', {
        propertyId,
        areaCount: areas.length,
        assetCount: allAssets.length
      });
    } catch (error) {
      log.error('Error in saveAreasAndAssets', { error: String(error) });
      throw error;
    }
  },

  /**
   * Add a single area to a property
   */
  async addArea(propertyId: string, area: PropertyArea): Promise<PropertyArea> {
    try {
      const dbArea = appAreaToDbArea(area, propertyId);
      const { data, error } = await supabase
        .from('property_areas')
        .insert(dbArea)
        .select()
        .single();

      if (error) {
        log.error('Failed to add area', { propertyId, error: error.message });
        throw error;
      }

      return dbAreaToAppArea(data as DbPropertyArea, []);
    } catch (error) {
      log.error('Error in addArea', { error: String(error) });
      throw error;
    }
  },

  /**
   * Update an area
   */
  async updateArea(areaId: string, updates: Partial<PropertyArea>): Promise<void> {
    try {
      const dbUpdates: Partial<DbPropertyArea> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.type !== undefined) dbUpdates.area_type = updates.type;
      if (updates.icon !== undefined) dbUpdates.icon_name = updates.icon;
      if (updates.photos !== undefined) dbUpdates.photos = updates.photos;
      if (updates.inventoryComplete !== undefined) dbUpdates.inventory_complete = updates.inventoryComplete;
      if (updates.condition !== undefined) dbUpdates.condition = updates.condition;

      const { error } = await defaultSupabase
        .from('property_areas')
        .update(dbUpdates)
        .eq('id', areaId);

      if (error) {
        log.error('Failed to update area', { areaId, error: error.message });
        throw error;
      }
    } catch (error) {
      log.error('Error in updateArea', { error: String(error) });
      throw error;
    }
  },

  /**
   * Delete an area (and its assets via cascade)
   */
  async deleteArea(areaId: string): Promise<void> {
    try {
      const { error } = await defaultSupabase
        .from('property_areas')
        .delete()
        .eq('id', areaId);

      if (error) {
        log.error('Failed to delete area', { areaId, error: error.message });
        throw error;
      }
    } catch (error) {
      log.error('Error in deleteArea', { error: String(error) });
      throw error;
    }
  },

  /**
   * Add an asset to an area
   * @param propertyId - The property ID
   * @param asset - The asset to add
   * @param client - Optional authenticated Supabase client (recommended for RLS)
   */
  async addAsset(propertyId: string, asset: InventoryItem, client?: SupabaseClient): Promise<InventoryItem> {
    const supabase = client || defaultSupabase;
    try {
      const dbAsset = appAssetToDbAsset(asset, propertyId);

      const { data, error } = await supabase
        .from('property_assets')
        .insert(dbAsset)
        .select()
        .single();

      if (error) {
        log.error('Failed to add asset', { propertyId, error: error.message });
        throw error;
      }

      return dbAssetToAppAsset(data as DbPropertyAsset);
    } catch (error) {
      log.error('Error in addAsset', { error: String(error) });
      throw error;
    }
  },

  /**
   * Update an asset
   */
  async updateAsset(assetId: string, updates: Partial<InventoryItem>): Promise<void> {
    try {
      const dbUpdates: Partial<DbPropertyAsset> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.assetType !== undefined) dbUpdates.asset_type = updates.assetType;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.subcategory !== undefined) dbUpdates.subcategory = updates.subcategory || null;
      if (updates.brand !== undefined) dbUpdates.brand = updates.brand || null;
      if (updates.model !== undefined) dbUpdates.model = updates.model || null;
      if (updates.serialNumber !== undefined) dbUpdates.serial_number = updates.serialNumber || null;
      if (updates.condition !== undefined) dbUpdates.condition = updates.condition;
      if (updates.photos !== undefined) dbUpdates.photos = updates.photos;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

      const { error } = await defaultSupabase
        .from('property_assets')
        .update(dbUpdates)
        .eq('id', assetId);

      if (error) {
        log.error('Failed to update asset', { assetId, error: error.message });
        throw error;
      }
    } catch (error) {
      log.error('Error in updateAsset', { error: String(error) });
      throw error;
    }
  },

  /**
   * Delete an asset
   */
  async deleteAsset(assetId: string): Promise<void> {
    try {
      const { error } = await defaultSupabase
        .from('property_assets')
        .delete()
        .eq('id', assetId);

      if (error) {
        log.error('Failed to delete asset', { assetId, error: error.message });
        throw error;
      }
    } catch (error) {
      log.error('Error in deleteAsset', { error: String(error) });
      throw error;
    }
  },

  /**
   * Get area and asset counts for a property
   */
  async getCounts(propertyId: string): Promise<{ areaCount: number; assetCount: number }> {
    try {
      const [areasResult, assetsResult] = await Promise.all([
        supabase
          .from('property_areas')
          .select('id', { count: 'exact', head: true })
          .eq('property_id', propertyId),
        supabase
          .from('property_assets')
          .select('id', { count: 'exact', head: true })
          .eq('property_id', propertyId),
      ]);

      return {
        areaCount: areasResult.count || 0,
        assetCount: assetsResult.count || 0,
      };
    } catch (error) {
      log.error('Error in getCounts', { error: String(error) });
      return { areaCount: 0, assetCount: 0 };
    }
  },
};
