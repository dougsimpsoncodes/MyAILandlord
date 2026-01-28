// Type declaration for expo-barcode-scanner
// This module may not be available in Expo Go, hence conditional import in AssetScanningScreen

declare module 'expo-barcode-scanner' {
  import { ComponentType } from 'react';
  import { ViewStyle } from 'react-native';

  export interface BarCodeScannerProps {
    onBarCodeScanned?: (result: { type: string; data: string }) => void;
    barCodeTypes?: string[];
    type?: 'front' | 'back';
    style?: ViewStyle;
  }

  export interface PermissionResponse {
    status: 'granted' | 'denied' | 'undetermined';
    expires: 'never' | number;
    granted: boolean;
    canAskAgain: boolean;
  }

  export const BarCodeScanner: ComponentType<BarCodeScannerProps> & {
    requestPermissionsAsync: () => Promise<PermissionResponse>;
    getPermissionsAsync: () => Promise<PermissionResponse>;
    Constants: {
      BarCodeType: {
        qr: string;
        aztec: string;
        datamatrix: string;
        pdf417: string;
        ean13: string;
        ean8: string;
        upc_e: string;
        code39: string;
        code93: string;
        code128: string;
        codabar: string;
        interleaved2of5: string;
        itf14: string;
        maxicode: string;
        rss14: string;
        rss_expanded: string;
        upc_a: string;
      };
      Type: {
        front: 'front';
        back: 'back';
      };
    };
  };
}
