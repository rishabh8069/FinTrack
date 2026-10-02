import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Navbar } from './components/Navbar';
import { DashboardOverview } from './components/DashboardOverview';
import { WhatsAppSimulator } from './components/WhatsAppSimulator';
import { ClientLedgerView } from './components/ClientLedgerView';
import { ExpenseTrackerView } from './components/ExpenseTrackerView';
import { TransactionHistoryView } from './components/TransactionHistoryView';
import { ReceiptScannerModal } from './components/ReceiptScannerModal';
import { PaymentReminderModal } from './components/PaymentReminderModal';
import { NewTransactionModal } from './components/NewTransactionModal';
import { SettingsModal } from './components/SettingsModal';
import { Transaction, Client, ChatMessage, MonthlySummary, ReceiptScanResult } from './types';
import { INITIAL_BUSINESS_INFO } from './data/initialData';
import { AuthScreen } from './components/AuthScreen';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const [authStatus, setAuthStatus] = useState<
    'checking' | 'authenticated' | 'unauthenticated'
  >('checking');

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [clients, setClients] = useState<Client[]>([]);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const [businessInfo, setBusinessInfo] = useState({
    ...INITIAL_BUSINESS_INFO,
    name: '',
    ownerName: '',
    phone: '',
    upiId: '',
  });

  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [isNewTxOpen, setIsNewTxOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [reminderClient, setReminderClient] = useState<Client | null>(null);
  const [paymentClientForTx, setPaymentClientForTx] = useState<Client | null>(null);

  // Authenticated API helper
  const apiFetch = async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const token = localStorage.getItem('fintrack_token');

    const headers = new Headers(options.headers);

    headers.set('Content-Type', 'application/json');

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return fetch(url, {
      ...options,
      headers,
    });
  };

  // Fetch all authenticated, business-scoped application data
  const fetchAppData = async () => {
    console.log('[FRONTEND] fetchAppData() called');

    try {
      const res = await apiFetch('/api/data');

      console.log('[FRONTEND] /api/data status:', res.status);

      if (!res.ok) {

        const errorText = await res.text();

        console.error('[FRONTEND] /api/data failed:', errorText);

        if (res.status === 401) {
          localStorage.removeItem('fintrack_token');
          setAuthStatus('unauthenticated');
        }

        return;

      }

      const data = await res.json();

      console.log('[FRONTEND] Application data received:', {
        businessId: data.businessId,
        transactions: data.transactions?.length,
        clients: data.clients?.length,
        chatMessages: data.chatMessages?.length,
        businessName: data.businessInfo?.name,
      });

      console.log(
        '[FRONTEND] Transaction types:',
        data.transactions?.map((tx: any) => ({
          id: tx.id,
          amount: tx.amount,
          type: tx.type,
          category: tx.category,
          source: tx.source,
        }))
      );

      // Restore transactions
      if (data.transactions) {
        setTransactions(data.transactions);
      }

      // Restore clients
      if (data.clients) {
        setClients(data.clients);
      }

      // Restore WhatsApp chat history
      if (data.chatMessages) {
        setChatMessages(data.chatMessages);
      }

      // Restore business/profile information
      if (data.businessInfo) {
        setBusinessInfo(data.businessInfo);
      }

    } catch (error) {
      console.error('[FRONTEND] Failed to fetch application data:', error);
    }
  };

  useEffect(() => {

    const validateSession = async () => {

      const token = localStorage.getItem('fintrack_token');

      if (!token) {
        setAuthStatus('unauthenticated');
        return;
      }

      try {

        console.log('[AUTH] Validating existing session...');

        const response = await fetch('/api/auth/auth-test', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401 || response.status === 403) {

          localStorage.removeItem('fintrack_token');

          setAuthStatus('unauthenticated');

          return;
        }

        if (!response.ok) {
          throw new Error('Unable to validate authentication session.');
        }

        console.log('[AUTH] Session validated successfully.');

        setAuthStatus('authenticated');

        await fetchAppData();

      } catch (error) {

        console.error('[AUTH] Session validation failed:', error);

        // Keep the stored token if this was a network/server error.
        // The user can retry authentication after the server is available.
        setAuthStatus('unauthenticated');

      }

    };

    validateSession();

  }, []);

  const handleAuthenticated = (token: string, user: any) => {

    console.log('[AUTH] User authenticated:', user._id);

    localStorage.setItem('fintrack_token', token);

    setAuthStatus('authenticated');

    fetchAppData();

  };


  const handleLogout = () => {
    console.log('[AUTH] Logging out user...');

    // Remove the stored authentication token
    localStorage.removeItem('fintrack_token');

    // Clear user-specific application data
    setTransactions([]);
    setClients([]);
    setChatMessages([]);

    setBusinessInfo({
      ...INITIAL_BUSINESS_INFO,
      name: '',
      ownerName: '',
      phone: '',
      upiId: '',
    });

    // Reset dashboard navigation and modal states
    setActiveTab('dashboard');
    setIsNewTxOpen(false);
    setIsScannerOpen(false);
    setIsSettingsOpen(false);
    setReminderClient(null);
    setPaymentClientForTx(null);

    // Return to authentication screen
    setAuthStatus('unauthenticated');

    console.log('[AUTH] User logged out successfully.');
  };


  // Compute live summary from state
  const calculateMonthlySummary = (): MonthlySummary => {
    let totalIncome = 0;
    let totalExpenses = 0;
    const expenseByCategory: Record<string, number> = {};
    const incomeByCategory: Record<string, number> = {};

    transactions.forEach((tx) => {
      if (tx.type === 'income' || tx.type === 'payment_received') {
        totalIncome += tx.amount;
        incomeByCategory[tx.category] = (incomeByCategory[tx.category] || 0) + tx.amount;
      } else if (tx.type === 'expense') {
        totalExpenses += tx.amount;
        expenseByCategory[tx.category] = (expenseByCategory[tx.category] || 0) + tx.amount;
      }
    });

    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
    const totalOutstanding = clients.reduce((sum, c) => sum + c.outstanding, 0);

    return {
      month: '2026-08',
      monthName: 'August 2026',
      totalIncome,
      totalExpenses,
      netProfit,
      profitMargin,
      totalOutstanding,
      expenseByCategory,
      incomeByCategory,
      transactionCount: transactions.length,
    };
  };

  const summary = calculateMonthlySummary();

  // Send message to WhatsApp Bot (Natural Language parsing & Q&A)
  const handleSendMessage = async (text: string) => {
    try {
      const res = await apiFetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.userMessage && data.botMessage) {
          setChatMessages((prev) => [...prev, data.userMessage, data.botMessage]);
        }
        if (data.transaction) {
          setTransactions((prev) => [data.transaction, ...prev]);
          // Confetti celebratory trigger if income recorded!
          if (data.transaction.type === 'income' || data.transaction.type === 'payment_received') {
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.8 },
              colors: ['#5F6F52', '#A9B388', '#A67B5B'],
            });
          }
        }
        if (data.clients) {
          setClients(data.clients);
        }
      }
    } catch (e) {
      console.error('Error sending message:', e);
    }
  };

  // Save manual transaction from modal
  const handleSaveTransaction = async (txData: any) => {
    try {
      const res = await apiFetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txData),
      });

      const data = await res.json();
      if (data.success && data.transaction) {
        setTransactions((prev) => [data.transaction, ...prev]);
        fetchAppData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete transaction
  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm('Delete this transaction record?')) return;
    try {
      const res = await apiFetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTransactions((prev) => prev.filter((t) => t.id !== id));
        fetchAppData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Add / update client
  const handleAddOrUpdateClient = async (clientData: Partial<Client>) => {
    try {
      const res = await apiFetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData),
      });
      const data = await res.json();
      if (data.success && data.client) {
        fetchAppData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle OCR scan completion
  const handleScanComplete = async (scanResult: ReceiptScanResult, imageBase64: string) => {
    const isIncome = scanResult.type === 'income';
    const txPayload = {
      type: scanResult.type || 'expense',
      amount: scanResult.amount,
      currency: '₹',
      clientName: isIncome ? scanResult.merchantOrParty : undefined,
      category: scanResult.category || (isIncome ? 'Freelance Services' : 'Other business expenses'),
      description: scanResult.rawSummary || `${scanResult.merchantOrParty} (${scanResult.paymentMethod})`,
      date: scanResult.date || new Date().toISOString().split('T')[0],
      paymentMethod: scanResult.paymentMethod || 'UPI',
      source: 'receipt_scan',
      receiptImageBase64: imageBase64 ? imageBase64.substring(0, 80) : undefined,
      notes: `Ref: ${scanResult.referenceNumber || 'N/A'}. Extracted with Gemini Multimodal OCR.`,
    };

    await handleSaveTransaction(txPayload);

    // Add confirmation message to WhatsApp chat
    setChatMessages((prev) => [
      ...prev,
      {
        id: 'msg_scan_' + Date.now(),
        sender: 'bot',
        text: `📸 *Receipt / Screenshot Processed!*\n\n• *Amount:* ₹${scanResult.amount.toLocaleString('en-IN')}\n• *Party:* ${scanResult.merchantOrParty}\n• *Category:* ${scanResult.category}\n• *Method:* ${scanResult.paymentMethod} (Ref: ${scanResult.referenceNumber || 'Verified'})\n• *Date:* ${scanResult.date}\n\n✅ *Record logged into FinTrack.*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'read',
        type: 'transaction_confirmation',
      },
    ]);
  };

  // Reset demo data
  const handleResetData = async () => {
    try {
      const res = await apiFetch('/api/reset', { method: 'POST' });
      if (res.ok) {
        await fetchAppData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (authStatus === 'checking') {

    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">

        <div className="text-center">

          <h1 className="text-3xl font-serif font-bold text-[#2C3327]">
            FinTrack
          </h1>

          <p className="text-sm text-[#8C867A] mt-3">
            Checking your account...
          </p>

        </div>

      </div>
    );

  }

  if (authStatus === 'unauthenticated') {

    return (
      <AuthScreen onAuthenticated={handleAuthenticated} />
    );

  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#3D3D3D] flex flex-col font-sans selection:bg-[#5F6F52] selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewTx={() => {
          setPaymentClientForTx(null);
          setIsNewTxOpen(true);
        }}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
        businessName={businessInfo.name}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardOverview
            summary={summary}
            transactions={transactions}
            clients={clients}
            onNavigateTab={setActiveTab}
            onSendReminder={(client) => setReminderClient(client)}
            onOpenScanner={() => setIsScannerOpen(true)}
          />
        )}

        {activeTab === 'whatsapp' && (
          <WhatsAppSimulator
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            onOpenScanner={() => setIsScannerOpen(true)}
            clients={clients}
            businessPhone={businessInfo.phone}
            businessName={businessInfo.name}
          />
        )}

        {activeTab === 'clients' && (
          <ClientLedgerView
            clients={clients}
            transactions={transactions}
            onAddOrUpdateClient={handleAddOrUpdateClient}
            onSendReminderModal={(client) => setReminderClient(client)}
            onRecordClientPayment={(client) => {
              setPaymentClientForTx(client);
              setIsNewTxOpen(true);
            }}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpenseTrackerView
            transactions={transactions}
            onOpenNewExpense={() => {
              setPaymentClientForTx(null);
              setIsNewTxOpen(true);
            }}
            onOpenScanner={() => setIsScannerOpen(true)}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionHistoryView
            transactions={transactions}
            onDeleteTransaction={handleDeleteTransaction}
            onOpenNewTx={() => {
              setPaymentClientForTx(null);
              setIsNewTxOpen(true);
            }}
          />
        )}

        {activeTab === 'scanner' && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="bg-white border border-[#E8E4D9] rounded-[28px] p-7 shadow-xs">
              <h2 className="text-xl font-bold font-serif text-[#2C3327]">Receipt & Screenshot OCR Engine</h2>
              <p className="text-sm text-[#8C867A] mt-1 mb-5">
                Powered by Gemini 3.7 Flash multimodal vision. Extract amounts, dates, vendors & auto-update your ledger.
              </p>
              <button
                onClick={() => setIsScannerOpen(true)}
                className="px-6 py-3 bg-[#5F6F52] hover:bg-[#4A5D4E] text-white font-semibold rounded-2xl text-sm shadow-md shadow-[#5F6F52]/20 active:scale-95 transition"
              >
                Open OCR Scanner Modal
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <ReceiptScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanComplete={handleScanComplete}
      />

      <PaymentReminderModal
        client={reminderClient}
        isOpen={!!reminderClient}
        onClose={() => setReminderClient(null)}
        businessName={businessInfo.name}
        ownerName={businessInfo.ownerName}
        upiId={businessInfo.upiId}
        onSendSimulatedReminder={(reminderText) => {
          handleSendMessage(`Draft reminder sent to ${reminderClient?.name}: "${reminderText.substring(0, 60)}..."`);
        }}
      />

      <NewTransactionModal
        isOpen={isNewTxOpen}
        onClose={() => {
          setIsNewTxOpen(false);
          setPaymentClientForTx(null);
        }}
        clients={clients}
        initialClient={paymentClientForTx}
        initialType={paymentClientForTx ? 'income' : 'expense'}
        onSaveTransaction={handleSaveTransaction}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        businessInfo={businessInfo}
        onSaveBusinessInfo={async (info) => {
          try {
            const response = await apiFetch('/api/business', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(info),
            });

            if (!response.ok) {
              throw new Error('Failed to save business profile');
            }

            const data = await response.json();

            setBusinessInfo(data.businessInfo);

            console.log('[Business] Profile saved successfully');
          } catch (error) {
            console.error('[Business] Save failed:', error);
          }
        }}
        onResetData={handleResetData}
      />
    </div>
  );
}
