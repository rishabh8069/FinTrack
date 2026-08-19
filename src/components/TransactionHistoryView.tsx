import React, { useState } from 'react';
import { 
  Search, 
  Download, 
  Trash2, 
  MessageSquare, 
  ScanLine, 
  Globe
} from 'lucide-react';
import { Transaction } from '../types';

interface TransactionHistoryViewProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => Promise<void>;
  onOpenNewTx: () => void;
}

export const TransactionHistoryView: React.FC<TransactionHistoryViewProps> = ({
  transactions,
  onDeleteTransaction,
  onOpenNewTx,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');

  const formatINR = (val: number) => '₹' + (val || 0).toLocaleString('en-IN');

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.clientName && t.clientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      selectedType === 'all' ||
      (selectedType === 'income' && (t.type === 'income' || t.type === 'payment_received')) ||
      (selectedType === 'expense' && t.type === 'expense');

    const matchesSource =
      selectedSource === 'all' || t.source === selectedSource;

    return matchesSearch && matchesType && matchesSource;
  });

  const totalFilteredIncome = filteredTransactions
    .filter((t) => t.type === 'income' || t.type === 'payment_received')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalFilteredExpense = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // CSV Export
  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Client/Party', 'Category', 'Description', 'Amount', 'Payment Method', 'Source'];
    const rows = filteredTransactions.map((t) => [
      t.date,
      t.type,
      t.clientName || 'N/A',
      t.category,
      `"${t.description.replace(/"/g, '""')}"`,
      t.amount,
      t.paymentMethod || 'UPI',
      t.source,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FinTrack_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif text-[#2C3327]">Transaction History</h2>
          <p className="text-xs text-[#8C867A] mt-0.5">
            Comprehensive audit log of all income, client billings, expenses, and receipt scans.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={exportToCSV}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-white hover:bg-[#FAF7F0] text-[#2C3327] border border-[#E8E4D9] rounded-xl text-xs font-semibold transition shadow-xs"
          >
            <Download className="w-4 h-4 text-[#8C867A]" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={onOpenNewTx}
            className="px-4 py-2.5 bg-[#5F6F52] hover:bg-[#4A5D4E] text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-[#5F6F52]/20 transition active:scale-95"
          >
            + Add Transaction
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E8E4D9] p-4 sm:p-5 rounded-[24px] shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#8C867A] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by description, client, category..."
              className="w-full pl-9 pr-4 py-2 bg-[#FDFBF7] border border-[#E8E4D9] rounded-xl text-xs text-[#2C3327] outline-none focus:border-[#5F6F52] placeholder:text-[#8C867A]"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto no-scrollbar">
            {/* Type selector */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3.5 py-2 bg-[#FDFBF7] border border-[#E8E4D9] rounded-xl text-xs text-[#3D3D3D] outline-none font-medium"
            >
              <option value="all">All Types</option>
              <option value="income">Income Only</option>
              <option value="expense">Expenses Only</option>
            </select>

            {/* Source selector */}
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="px-3.5 py-2 bg-[#FDFBF7] border border-[#E8E4D9] rounded-xl text-xs text-[#3D3D3D] outline-none font-medium"
            >
              <option value="all">All Sources</option>
              <option value="whatsapp">💬 WhatsApp</option>
              <option value="receipt_scan">📸 OCR Scan</option>
              <option value="web">🌐 Web Dashboard</option>
            </select>
          </div>
        </div>

        {/* Filter summary strip */}
        <div className="pt-3 border-t border-[#F2EEE3] flex items-center justify-between text-xs text-[#8C867A]">
          <span>Showing {filteredTransactions.length} of {transactions.length} records</span>
          <div className="flex items-center space-x-4 font-semibold">
            <span className="text-[#5F6F52]">Income: +{formatINR(totalFilteredIncome)}</span>
            <span className="text-[#A67B5B]">Expense: -{formatINR(totalFilteredExpense)}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E8E4D9] rounded-[28px] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F1E8] border-b border-[#E8E4D9] text-[#8C867A] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-5">Date</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Description / Party</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2EEE3]">
              {filteredTransactions.map((tx) => {
                const isIncome = tx.type === 'income' || tx.type === 'payment_received';
                return (
                  <tr key={tx.id} className="hover:bg-[#FDFBF7] transition">
                    <td className="py-3.5 px-5 font-medium text-[#3D3D3D] whitespace-nowrap">
                      {tx.date}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider border ${
                        isIncome 
                          ? 'bg-[#F5F8F2] border-[#E8EFDF] text-[#5F6F52]' 
                          : 'bg-[#FAF3EE] border-[#F3E5DC] text-[#A67B5B]'
                      }`}>
                        {isIncome ? 'Income' : 'Expense'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#2C3327]">
                        {tx.clientName ? `${tx.clientName}` : tx.description}
                      </div>
                      {tx.clientName && tx.description && (
                        <div className="text-[11px] text-[#8C867A] truncate max-w-xs">
                          {tx.description}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-[#3D3D3D] font-medium">
                      {tx.category}
                    </td>

                    <td className="py-3.5 px-4">
                      {tx.source === 'whatsapp' && (
                        <span className="inline-flex items-center space-x-1 text-[11px] text-[#5F6F52] font-medium">
                          <MessageSquare className="w-3 h-3 mr-0.5" />
                          <span>WhatsApp</span>
                        </span>
                      )}
                      {tx.source === 'receipt_scan' && (
                        <span className="inline-flex items-center space-x-1 text-[11px] text-[#8C867A] font-medium">
                          <ScanLine className="w-3 h-3 mr-0.5" />
                          <span>OCR Scan</span>
                        </span>
                      )}
                      {tx.source === 'web' && (
                        <span className="inline-flex items-center space-x-1 text-[11px] text-[#8C867A] font-medium">
                          <Globe className="w-3 h-3 mr-0.5" />
                          <span>Web</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold font-serif text-sm whitespace-nowrap">
                      <span className={isIncome ? 'text-[#5F6F52]' : 'text-[#2C3327]'}>
                        {isIncome ? '+' : '-'}{formatINR(tx.amount)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => onDeleteTransaction(tx.id)}
                        className="p-1.5 text-[#8C867A] hover:text-[#A67B5B] rounded-lg hover:bg-[#FAF3EE] transition"
                        title="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
