declare module 'react-native-html-to-pdf' {
  interface PDFOptions {
    html: string;
    fileName?: string;
    directory?: string;
    base64?: boolean;
    height?: number;
    width?: number;
    padding?: number;
  }

  interface PDFResult {
    filePath: string;
    uri: string;
    base64?: string;
  }

  export default {
    convert(options: PDFOptions): Promise<PDFResult>;
  };
} 