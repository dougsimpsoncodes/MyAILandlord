// AI-powered asset label extraction service
// Uses Supabase Edge Function to securely call Gemini Vision API

import * as FileSystem from 'expo-file-system';
import { supabase } from '../supabase/config';

export interface ExtractedAssetData {
  brand?: string;
  model?: string;
  serialNumber?: string;
  year?: string;
  energyRating?: string;
  capacity?: string;
  voltage?: string;
  wattage?: string;
  dimensions?: string;
  weight?: string;
  color?: string;
  confidence?: number; // 0-1 confidence score
}

export interface LabelExtractionResult {
  success: boolean;
  data?: ExtractedAssetData;
  error?: string;
}

/**
 * Extract asset information from a photo of a label, nameplate, or energy guide
 * Uses Supabase Edge Function to securely call Gemini Vision API
 * @param imageUri - Local URI of the image to process
 * @returns Promise containing extracted data or error
 */
export async function extractAssetDataFromImage(imageUri: string): Promise<LabelExtractionResult> {
  try {
    // Read image and convert to base64
    let base64Image: string;
    try {
      base64Image = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch {
      return {
        success: false,
        error: 'Failed to read image file. Please try again.'
      };
    }

    // Determine MIME type from URI
    const mimeType = imageUri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

    // Call Edge Function (API key is securely stored server-side)
    const { data, error } = await supabase.functions.invoke('extract-asset-label', {
      body: {
        imageBase64: base64Image,
        mimeType: mimeType
      }
    });

    if (error) {
      return {
        success: false,
        error: `Label extraction service unavailable: ${error.message}`
      };
    }

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Failed to extract label data.'
      };
    }

    // Validate and enhance with brand patterns
    const enhancedData = validateAndEnhanceData(data.data);

    return {
      success: true,
      data: enhancedData
    };

  } catch (error) {
    return {
      success: false,
      error: 'Failed to process image. Please try again.'
    };
  }
}

/**
 * Enhanced brand database with common model patterns and identifiers
 * Helps improve extraction accuracy by recognizing brand-specific patterns
 */
export const BRAND_PATTERNS = {
  whirlpool: {
    modelPatterns: [/^W[A-Z]{2}\d{6}[A-Z]*$/, /^WR[A-Z]\d{6}[A-Z]*$/],
    serialPatterns: [/^WH\d{10}$/, /^W\d{9}[A-Z]$/],
    commonPrefixes: ['WRF', 'WRS', 'WRT', 'WDF', 'WDT']
  },
  ge: {
    modelPatterns: [/^G[A-Z]{2}\d{6}[A-Z]*$/, /^PF[A-Z]\d{6}[A-Z]*$/],
    serialPatterns: [/^GE\d{10}$/, /^[A-Z]{2}\d{8}$/],
    commonPrefixes: ['GSS', 'GTS', 'GBS', 'GDF', 'GDT']
  },
  samsung: {
    modelPatterns: [/^RF\d{2}[A-Z]\d{4}[A-Z]{2}$/, /^DW\d{2}[A-Z]\d{4}[A-Z]{2}$/],
    serialPatterns: [/^SM\d{10}$/, /^[A-Z]{4}\d{8}$/],
    commonPrefixes: ['RF', 'RT', 'RS', 'DW', 'NX']
  },
  lg: {
    modelPatterns: [/^LF[A-Z]\d{4}[A-Z]{2}$/, /^LG\d{4}[A-Z]{3}$/],
    serialPatterns: [/^LG\d{10}$/, /^\d{3}[A-Z]{2}\d{5}$/],
    commonPrefixes: ['LF', 'LG', 'LM', 'LD', 'LT']
  },
  bosch: {
    modelPatterns: [/^SH[A-Z]{2}\d{2}[A-Z]\d{2}[A-Z]$/, /^B\d{2}[A-Z]{3}\d{2}[A-Z]$/],
    serialPatterns: [/^BSH\d{10}$/, /^[A-Z]{3}\d{7}$/],
    commonPrefixes: ['SH', 'B', 'WTA', 'WAT', 'SMV']
  }
};

/**
 * Validate and enhance extracted data using brand patterns
 */
export function validateAndEnhanceData(data: ExtractedAssetData): ExtractedAssetData {
  if (!data.brand) return data;
  
  const brandKey = data.brand.toLowerCase().replace(/\s+/g, '');
  const patterns = BRAND_PATTERNS[brandKey as keyof typeof BRAND_PATTERNS];
  
  if (!patterns) return data;
  
  // Validate model number format
  if (data.model && patterns.modelPatterns) {
    const isValidModel = patterns.modelPatterns.some(pattern => pattern.test(data.model!));
    if (!isValidModel) {
      console.warn(`Model validation failed for brand pattern`);
    }
  }
  
  // Validate serial number format
  if (data.serialNumber && patterns.serialPatterns) {
    const isValidSerial = patterns.serialPatterns.some(pattern => pattern.test(data.serialNumber!));
    if (!isValidSerial) {
      console.warn(`Serial number validation failed for brand pattern`);
    }
  }
  
  return data;
}

/**
 * Get common asset templates for a specific brand to help with suggestions
 */
export function getCommonModelsForBrand(brand: string, assetType: string): string[] {
  const brandLower = brand.toLowerCase();
  
  // Common model series by brand and asset type
  const commonModels: Record<string, Record<string, string[]>> = {
    whirlpool: {
      refrigerator: ['WRF555SDFZ', 'WRS325SDHZ', 'WRT518SZFM', 'WRF767SDHZ'],
      dishwasher: ['WDT750SAKZ', 'WDF520PADM', 'WDT730PAHZ', 'WDF540PADM'],
      washer: ['WTW5000DW', 'WTW4816FW', 'WTW7120HW', 'WTW8127LC']
    },
    ge: {
      refrigerator: ['GSS25GSHSS', 'GTS18GTHWW', 'PFE28KSKSS', 'GNE27JSMSS'],
      dishwasher: ['GDT695SSJSS', 'GDF630PMMES', 'GDT665SSNSS', 'GDF510PSMSS'],
      range: ['JGS760SELSS', 'JGB735SPSS', 'PGS930SELSS', 'JGS750SPSS']
    },
    samsung: {
      refrigerator: ['RF23J9011SR', 'RT18M6215SG', 'RF28R7551SR', 'RF23M8070SR'],
      dishwasher: ['DW80R9950UG', 'DW80R5060US', 'DW80M9550UG', 'DW80R7060UG'],
      washer: ['WF45R6100AC', 'WF42H5000AW', 'WF50R8500AV', 'WF45T7000AW']
    }
  };
  
  return commonModels[brandLower]?.[assetType] || [];
}

