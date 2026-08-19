export type TransactionType = 'income' | 'expense' | 'bill_raised' | 'payment_received';

export type ExpenseCategory = 
  | 'Raw materials'
  | 'Marketing'
  | 'Transportation'
  | 'Utilities'
  | 'Packaging'
  | 'Equipment'
  | 'Software & Tools'
  | 'Rent & Workspace'
  | 'Other business expenses';

export type IncomeCategory = 
  | 'Web Development'
  | 'Design & Branding'
  | 'Consulting'
  | 'Product Sales'
  | 'Freelance Services'
  | 'Retainer'
  | 'Other Income';

export interface BusinessInfo {
  name: string;
  ownerName: string;
  currency: string;
  phone: string;
  upiId: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string; // default '₹'
  clientId?: string;
  clientName?: string;
  category: ExpenseCategory | IncomeCategory | string;
  description: string;
  date: string; // ISO string or YYYY-MM-DD
  paymentMethod?: 'UPI' | 'Bank Transfer' | 'Cash' | 'Card' | 'Cheque';
  receiptUrl?: string;
  receiptImageBase64?: string;
  notes?: string;
  whatsappMessageId?: string;
  source: 'whatsapp' | 'web' | 'receipt_scan';
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  serviceCategory?: string;
  totalBilled: number;
  totalReceived: number;
  outstanding: number;
  lastTransactionDate?: string;
  status: 'active' | 'cleared' | 'overdue';
  dueDate?: string;
  notes?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'system';
  text: string;
  timestamp: string;
  type?: 'text' | 'image' | 'transaction_confirmation' | 'query_answer' | 'reminder_draft';
  imageUrl?: string;
  transactionData?: Partial<Transaction>;
  extractedDetails?: {
    action: 'add_transaction' | 'query_answer' | 'reminder' | 'unknown';
    amount?: number;
    clientName?: string;
    category?: string;
    type?: TransactionType;
    summary?: string;
  };
  status?: 'sent' | 'delivered' | 'read';
}

export interface MonthlySummary {
  month: string; // e.g. "2026-08"
  monthName: string; // e.g. "August 2026"
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  totalOutstanding: number;
  expenseByCategory: Record<string, number>;
  incomeByCategory: Record<string, number>;
  transactionCount: number;
}

export interface ReceiptScanResult {
  amount: number;
  currency: string;
  date: string;
  merchantOrParty: string;
  category: string;
  type: 'expense' | 'income';
  paymentMethod: 'UPI' | 'Bank Transfer' | 'Cash' | 'Card';
  referenceNumber?: string;
  taxAmount?: number;
  rawSummary: string;
  confidenceScore: number;
  items?: Array<{ name: string; price: number; quantity?: number }>;
}

export interface AppState {
  transactions: Transaction[];
  clients: Client[];
  chatMessages: ChatMessage[];
  businessInfo: BusinessInfo;
}
