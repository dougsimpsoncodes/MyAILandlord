// AI-powered asset label extraction service
// This service integrates with OCR/Computer Vision APIs to extract asset information from photos

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
 * @param imageUri - Local URI of the image to process
 * @returns Promise containing extracted data or error
 */
export async function extractAssetDataFromImage(imageUri: string): Promise<LabelExtractionResult> {
  try {
    // TODO: Replace with actual OCR/AI service integration
    // Options include:
    // - Google Cloud Vision API
    // - AWS Textract
    // - Azure Computer Vision
    // - OpenAI Vision API
    // - On-device ML Kit (for offline processing)
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    
    // Mock extraction results for demonstration
    const mockResults: ExtractedAssetData[] = [
      {
        brand: 'Whirlpool',
        model: 'WRF555SDFZ',
        serialNumber: 'WH1234567890',
        year: '2021',
        energyRating: 'Energy Star',
        capacity: '25.2 cu ft',
        voltage: '115V',
        confidence: 0.92
      },
      {
        brand: 'GE',
        model: 'GSS25GSHSS',
        serialNumber: 'GE9876543210',
        year: '2020',
        energyRating: 'Energy Star Certified',
        capacity: '25.4 cu ft',
        confidence: 0.88
      },
      {
        brand: 'Samsung',
        model: 'RF23J9011SR',
        serialNumber: 'SM5555666677',
        year: '2022',
        energyRating: 'Energy Star Most Efficient',
        capacity: '22.5 cu ft',
        color: 'Stainless Steel',
        confidence: 0.95
      },
      {
        brand: 'Bosch',
        model: 'SHPM65Z55N',
        serialNumber: 'BSH2023001122',
        year: '2023',
        voltage: '120V',
        wattage: '1800W',
        confidence: 0.89
      },
      {
        brand: 'KitchenAid',
        model: 'KRMF706ESS',
        serialNumber: 'KA7890123456',
        year: '2021',
        capacity: '25.8 cu ft',
        energyRating: 'Energy Star',
        confidence: 0.91
      }
    ];
    
    // Randomly select one of the mock results
    const selectedResult = mockResults[Math.floor(Math.random() * mockResults.length)];
    
    // Occasionally simulate extraction failure
    if (Math.random() < 0.15) { // 15% failure rate for realism
      return {
        success: false,
        error: 'Could not extract clear text from the image. Please ensure the label is well-lit and in focus.'
      };
    }
    
    return {
      success: true,
      data: selectedResult
    };
    
  } catch (error) {
    console.log('Label extraction error:', error);
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
      console.log(`Model validation failed for brand pattern`);
    }
  }
  
  // Validate serial number format
  if (data.serialNumber && patterns.serialPatterns) {
    const isValidSerial = patterns.serialPatterns.some(pattern => pattern.test(data.serialNumber!));
    if (!isValidSerial) {
      console.log(`Serial number validation failed for brand pattern`);
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

/**
 * Production implementation would integrate with services like:
 * 
 * 1. Google Cloud Vision API:
 *    - Text detection and OCR
 *    - High accuracy for printed text
 *    - Good for nameplates and labels
 * 
 * 2. AWS Textract:
 *    - Form and table extraction
 *    - Excellent for energy guides
 *    - Structured data extraction
 * 
 * 3. Azure Computer Vision:
 *    - Read API for text extraction
 *    - Good integration with Azure ecosystem
 * 
 * 4. OpenAI Vision API:
 *    - Advanced understanding of context
 *    - Can interpret complex labels
 *    - Natural language processing
 * 
 * 5. On-device ML Kit (React Native):
 *    - Offline processing
 *    - Privacy-focused
 *    - Lower accuracy but instant results
 * 
 * Implementation example for Google Vision:
 * 
 * ```typescript
 * import vision from '@google-cloud/vision';
 * 
 * async function extractWithGoogleVision(imageUri: string) {
 *   const client = new vision.ImageAnnotatorClient();
 *   const [result] = await client.textDetection({
 *     image: { content: fs.readFileSync(imageUri) }
 *   });
 *   
 *   const detections = result.textAnnotations;
 *   // Parse and structure the detected text
 *   return parseDetectedText(detections);
 * }
 * ```
 */
