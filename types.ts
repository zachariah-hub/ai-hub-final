export enum View {
  DATA_MANAGEMENT = 'dataManagement',
  BOT_RUNNER = 'botRunner',
}

export enum Language {
  EN = 'en',
  ES = 'es',
}

export interface Supplier {
  SupplierID: string;
  SupplierName: string;
  PhoneNumber: string;
  Specialty: string;
  ContactPerson: string;
}

export interface Product {
  ProductID: string;
  ProductName: string;
  ProductDescription_for_AI: string;
  UnitOfMeasure: string;
}

export enum BotStatus {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  AGENT_SPEAKING = 'agentSpeaking',
  LISTENING_FOR_RESPONSE = 'listeningForResponse',
  PROCESSING_RESPONSE = 'processingResponse',
  // FIX: Added missing AWAITING_MANUAL_CALL status to resolve compilation error.
  AWAITING_MANUAL_CALL = 'awaitingManualCall',
  CALL_ENDED = 'callEnded',
  ERROR = 'error',
}

export interface OrderItem {
  product: Product;
  quantity: number | null;
  notes: string | null;
}

export interface Order {
  supplier: Supplier;
  items: OrderItem[];
}

export interface TranscriptEntry {
  speaker: 'agent' | 'supplier';
  text: string;
  timestamp: Date;
}

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export interface ExtractedData {
  confirmationId: string | null;
  deliveryEstimate: string | null;
}