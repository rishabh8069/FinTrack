import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Send, 
  FileText, 
  Briefcase, 
  X,
} from 'lucide-react';
import { Client, Transaction } from '../types';

interface ClientLedgerViewProps {
  clients: Client[];
  transactions: Transaction[];
  onAddOrUpdateClient: (clientData: Partial<Client>) => Promise<void>;
  onSendReminderModal: (client: Client) => void;
  onRecordClientPayment: (client: Client) => void;
}

export const ClientLedgerView: React.FC<ClientLedgerViewProps> = ({
  clients,
  transactions,
  onAddOrUpdateClient,
  onSendReminderModal,
  onRecordClientPayment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'overdue' | 'cleared'>('all');
  const [selectedClientForStatement, setSelectedClientForStatement] = useState<Client | null>(null);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  
  // New Client Form State
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientCompany, setNewClientCompany] = useState('');
  const [newClientService, setNewClientService] = useState('');
  const [newClientBilled, setNewClientBilled] = useState('');
  const [newClientReceived, setNewClientReceived] = useState('');
  const [newClientDueDate, setNewClientDueDate] = useState('');
  const [newClientNotes, setNewClientNotes] = useState('');

  const formatINR = (val: number) => '₹' + (val || 0).toLocaleString('en-IN');

  // Filter clients
  const filteredClients = clients.filter((c) => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.company && c.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.serviceCategory && c.serviceCategory.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;
    if (filterStatus === 'all') return true;
    return c.status === filterStatus;
  });

  const totalOutstanding = clients.reduce((sum, c) => sum + c.outstanding, 0);
  const totalBilled = clients.reduce((sum, c) => sum + c.totalBilled, 0);
  const totalReceived = clients.reduce((sum, c) => sum + c.totalReceived, 0);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    await onAddOrUpdateClient({
      name: newClientName.trim(),
      phone: newClientPhone.trim() || undefined,
      email: newClientEmail.trim() || undefined,
      company: newClientCompany.trim() || undefined,
      serviceCategory: newClientService.trim() || 'Freelance Services',
      totalBilled: Number(newClientBilled) || 0,
      totalReceived: Number(newClientReceived) || 0,
      dueDate: newClientDueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      notes: newClientNotes.trim() || undefined,
    });

    setIsAddClientModalOpen(false);
    // Reset form
    setNewClientName('');
    setNewClientPhone('');
    setNewClientEmail('');
    setNewClientCompany('');
    setNewClientService('');
    setNewClientBilled('');
    setNewClientReceived('');
    setNewClientDueDate('');
    setNewClientNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif text-[#2C3327]">Client Ledgers & Accounts</h2>
          <p className="text-xs text-[#8C867A] mt-0.5">
            Track individual billing, payments received, pending balances, and send WhatsApp reminders.
          </p>
        </div>

        <button
          id="btn-add-new-client"
          onClick={() => setIsAddClientModalOpen(true)}
          className="flex items-center space-x-2 bg-[#5F6F52] hover:bg-[#4A5D4E] text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow-md shadow-[#5F6F52]/20 transition active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Client</span>
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E8E4D9] rounded-[24px] p-5 shadow-xs">
          <span className="text-xs font-semibold text-[#8C867A] uppercase tracking-wider">Total Billed</span>
          <div className="text-2xl font-bold font-serif text-[#2C3327] mt-1">{formatINR(totalBilled)}</div>
          <span className="text-xs text-[#8C867A] mt-1 block">{clients.length} active client accounts</span>
        </div>

        <div className="bg-white border border-[#E8E4D9] rounded-[24px] p-5 shadow-xs">
          <span className="text-xs font-semibold text-[#8C867A] uppercase tracking-wider">Total Collected</span>
          <div className="text-2xl font-bold font-serif text-[#5F6F52] mt-1">{formatINR(totalReceived)}</div>
          <span className="text-xs text-[#8C867A] mt-1 block">
            {totalBilled > 0 ? ((totalReceived / totalBilled) * 100).toFixed(1) : 0}% collection rate
          </span>
        </div>

        <div className="bg-white border border-[#E8E4D9] rounded-[24px] p-5 shadow-xs">
          <span className="text-xs font-semibold text-[#8C867A] uppercase tracking-wider">Total Outstanding</span>
          <div className="text-2xl font-bold font-serif text-[#A67B5B] mt-1">{formatINR(totalOutstanding)}</div>
          <span className="text-xs text-[#8C867A] mt-1 block">
            {clients.filter(c => c.outstanding > 0).length} clients with pending dues
          </span>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-[#E8E4D9] p-3.5 rounded-[22px] shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#8C867A] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by client, company, service..."
            className="w-full pl-9 pr-4 py-2 bg-[#FDFBF7] border border-[#E8E4D9] rounded-xl text-xs text-[#2C3327] outline-none focus:border-[#5F6F52] transition placeholder:text-[#8C867A]"
          />
        </div>

        <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
          {(['all', 'overdue', 'active', 'cleared'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition whitespace-nowrap ${
                filterStatus === status
                  ? 'bg-[#5F6F52] text-white shadow-xs'
                  : 'text-[#6B655B] hover:text-[#2C3327] bg-[#F5F1E8] hover:bg-[#EBE5DA]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Client Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredClients.map((client) => {
          const progressPercent = client.totalBilled > 0 
            ? Math.min(100, Math.round((client.totalReceived / client.totalBilled) * 100))
            : 100;
          const isOverdue = client.status === 'overdue';
          const isCleared = client.outstanding === 0;

          return (
            <div
              key={client.id}
              className={`bg-white border rounded-[28px] p-6 shadow-xs transition hover:border-[#D9D2C5] flex flex-col justify-between ${
                isOverdue 
                  ? 'border-[#F3E5DC]' 
                  : isCleared 
                  ? 'border-[#E8EFDF]' 
                  : 'border-[#E8E4D9]'
              }`}
            >
              <div>
                {/* Top Client Title & Status */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <h3 className="font-bold font-serif text-base text-[#2C3327]">{client.name}</h3>
                      {isOverdue && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF3EE] text-[#A67B5B] border border-[#F3E5DC]">
                          Overdue
                        </span>
                      )}
                      {isCleared && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F5F8F2] text-[#5F6F52] border border-[#E8EFDF]">
                          Cleared
                        </span>
                      )}
                      {!isOverdue && !isCleared && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF7F0] text-[#6B655B] border border-[#E8E4D9]">
                          Active
                        </span>
                      )}
                    </div>
                    {client.company && (
                      <p className="text-xs font-medium text-[#6B655B] mt-0.5">
                        {client.company}
                      </p>
                    )}
                  </div>

                  <span className="text-xs text-[#8C867A] font-mono">
                    {client.phone || client.email || 'Client'}
                  </span>
                </div>

                <div className="mt-2 text-xs text-[#8C867A] flex items-center space-x-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-[#5F6F52]" />
                  <span>{client.serviceCategory}</span>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8C867A]">Payment Progress</span>
                    <span className="font-bold text-[#3D3D3D]">{progressPercent}% Paid</span>
                  </div>
                  <div className="w-full h-2 bg-[#F5F1E8] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCleared ? 'bg-[#5F6F52]' : isOverdue ? 'bg-[#A67B5B]' : 'bg-[#798E68]'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Financial Figures */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#F2EEE3] text-center">
                  <div className="bg-[#FDFBF7] border border-[#E8E4D9] p-2.5 rounded-2xl">
                    <span className="text-[10px] font-semibold text-[#8C867A] uppercase">Billed</span>
                    <div className="text-xs sm:text-sm font-bold font-serif text-[#2C3327] mt-0.5">
                      {formatINR(client.totalBilled)}
                    </div>
                  </div>
                  <div className="bg-[#FDFBF7] border border-[#E8E4D9] p-2.5 rounded-2xl">
                    <span className="text-[10px] font-semibold text-[#8C867A] uppercase">Received</span>
                    <div className="text-xs sm:text-sm font-bold font-serif text-[#5F6F52] mt-0.5">
                      {formatINR(client.totalReceived)}
                    </div>
                  </div>
                  <div className="bg-[#FDFBF7] border border-[#E8E4D9] p-2.5 rounded-2xl">
                    <span className="text-[10px] font-semibold text-[#8C867A] uppercase">Outstanding</span>
                    <div className={`text-xs sm:text-sm font-bold font-serif mt-0.5 ${client.outstanding > 0 ? 'text-[#A67B5B]' : 'text-[#8C867A]'}`}>
                      {formatINR(client.outstanding)}
                    </div>
                  </div>
                </div>

                {client.dueDate && (
                  <div className="mt-3 text-[11px] text-[#8C867A] flex items-center justify-between">
                    <span>Due Date: <strong className="text-[#3D3D3D]">{client.dueDate}</strong></span>
                    {client.lastTransactionDate && <span>Last Tx: {client.lastTransactionDate}</span>}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3.5 border-t border-[#F2EEE3] flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedClientForStatement(client)}
                  className="flex items-center space-x-1 text-xs font-semibold text-[#3D3D3D] hover:text-[#2C3327] bg-[#F5F1E8] hover:bg-[#EBE5DA] px-3 py-1.5 rounded-xl transition"
                >
                  <FileText className="w-3.5 h-3.5 text-[#5F6F52]" />
                  <span>Statement</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onRecordClientPayment(client)}
                    className="text-xs font-semibold text-[#5F6F52] bg-[#F5F8F2] hover:bg-[#EBF1E3] border border-[#E8EFDF] px-3 py-1.5 rounded-xl transition"
                  >
                    + Payment
                  </button>

                  {client.outstanding > 0 && (
                    <button
                      onClick={() => onSendReminderModal(client)}
                      className="flex items-center space-x-1.5 text-xs font-semibold bg-[#5F6F52] hover:bg-[#4A5D4E] text-white px-3 py-1.5 rounded-xl shadow-xs transition active:scale-95"
                    >
                      <Send className="w-3 h-3" />
                      <span>Reminder</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Client Statement Modal Drawer */}
      {selectedClientForStatement && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8E4D9] rounded-[28px] w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 border-b border-[#E8E4D9] flex items-center justify-between bg-[#F5F1E8]">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-bold font-serif text-[#2C3327]">
                    {selectedClientForStatement.name} Ledger Statement
                  </h3>
                </div>
                <p className="text-xs text-[#8C867A]">
                  {selectedClientForStatement.company || selectedClientForStatement.serviceCategory}
                </p>
              </div>
              <button
                onClick={() => setSelectedClientForStatement(null)}
                className="p-2 text-[#8C867A] hover:text-[#2C3327] rounded-xl hover:bg-[#EBE5DA] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Financial Snapshot */}
              <div className="grid grid-cols-3 gap-3 p-3.5 bg-[#FDFBF7] rounded-2xl border border-[#E8E4D9] text-center">
                <div>
                  <span className="text-[10px] text-[#8C867A] uppercase font-semibold">Total Invoiced</span>
                  <div className="font-bold font-serif text-sm text-[#2C3327]">{formatINR(selectedClientForStatement.totalBilled)}</div>
                </div>
                <div>
                  <span className="text-[10px] text-[#8C867A] uppercase font-semibold">Total Received</span>
                  <div className="font-bold font-serif text-sm text-[#5F6F52]">{formatINR(selectedClientForStatement.totalReceived)}</div>
                </div>
                <div>
                  <span className="text-[10px] text-[#8C867A] uppercase font-semibold">Outstanding</span>
                  <div className="font-bold font-serif text-sm text-[#A67B5B]">{formatINR(selectedClientForStatement.outstanding)}</div>
                </div>
              </div>

              {/* Transaction History for this client */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C867A] mb-2.5">Ledger Transactions</h4>
                <div className="divide-y divide-[#F2EEE3] border border-[#E8E4D9] rounded-2xl overflow-hidden bg-white">
                  {transactions
                    .filter((t) => t.clientName?.toLowerCase() === selectedClientForStatement.name.toLowerCase() || t.clientId === selectedClientForStatement.id)
                    .map((tx) => (
                      <div key={tx.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-[#FDFBF7]">
                        <div>
                          <div className="font-semibold text-[#2C3327]">{tx.description}</div>
                          <div className="text-[#8C867A] text-[11px] mt-0.5">
                            {tx.date} • {tx.paymentMethod || 'UPI'} • via {tx.source}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`font-bold font-serif text-sm ${tx.type === 'income' || tx.type === 'payment_received' ? 'text-[#5F6F52]' : 'text-[#2C3327]'}`}>
                            {formatINR(tx.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#E8E4D9] flex justify-end bg-[#FDFBF7]">
              <button
                onClick={() => setSelectedClientForStatement(null)}
                className="px-5 py-2.5 bg-[#5F6F52] hover:bg-[#4A5D4E] text-white font-semibold rounded-xl text-xs shadow-xs"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Client Modal */}
      {isAddClientModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8E4D9] rounded-[28px] w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[#E8E4D9] flex items-center justify-between bg-[#F5F1E8]">
              <h3 className="text-base font-bold font-serif text-[#2C3327]">Add New Client Account</h3>
              <button
                onClick={() => setIsAddClientModalOpen(false)}
                className="p-1.5 text-[#8C867A] hover:text-[#2C3327] rounded-xl hover:bg-[#EBE5DA]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#2C3327] mb-1">Client Full Name *</label>
                <input
                  type="text"
                  required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full p-2.5 bg-[#FDFBF7] border border-[#E8E4D9] rounded-xl text-[#2C3327] outline-none focus:border-[#5F6F52]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#2C3327] mb-1">Company / Brand</label>
                  <input
                    type="text"
                    value={newClientCompany}
                    onChange={(e) => setNewClientCompany(e.target.value)}
                    placeholder="e.g. TechGrowth Labs"
                    className="w-full p-2.5 bg-[#FDFBF7] border border-[#E8E4D9] rounded-xl text-[#2C3327] outline-none focus:border-[#5F6F52]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#2C3327] mb-1">WhatsApp Phone #</label>
                  <input
                    type="text"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="e.g. +91 98201 12345"
                    className="w-full p-2.5 bg-[#FDFBF7] border border-[#E8E4D9] rounded-xl text-[#2C3327] outline-none focus:border-[#5F6F52]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#2C3327] mb-1">Service / Project Category</label>
                <input
                  type="text"
                  value={newClientService}
                  onChange={(e) => setNewClientService(e.target.value)}
                  placeholder="e.g. Website Development, Brand Identity"
                  className="w-full p-2.5 bg-[#FDFBF7] border border-[#E8E4D9] rounded-xl text-[#2C3327] outline-none focus:border-[#5F6F52]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#2C3327] mb-1">Initial Total Billed (₹)</label>
                  <input
                    type="number"
                    value={newClientBilled}
                    onChange={(e) => setNewClientBilled(e.target.value)}
                    placeholder="e.g. 25000"
                    className="w-full p-2.5 bg-[#FDFBF7] border border-[#E8E4D9] rounded-xl text-[#2C3327] outline-none focus:border-[#5F6F52]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#2C3327] mb-1">Initial Received (₹)</label>
                  <input
                    type="number"
                    value={newClientReceived}
                    onChange={(e) => setNewClientReceived(e.target.value)}
                    placeholder="e.g. 10000"
                    className="w-full p-2.5 bg-[#FDFBF7] border border-[#E8E4D9] rounded-xl text-[#2C3327] outline-none focus:border-[#5F6F52]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#2C3327] mb-1">Payment Due Date</label>
                <input
                  type="date"
                  value={newClientDueDate}
                  onChange={(e) => setNewClientDueDate(e.target.value)}
                  className="w-full p-2.5 bg-[#FDFBF7] border border-[#E8E4D9] rounded-xl text-[#2C3327] outline-none focus:border-[#5F6F52]"
                />
              </div>

              <div className="pt-4 border-t border-[#E8E4D9] flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddClientModalOpen(false)}
                  className="px-4 py-2 bg-[#F5F1E8] text-[#3D3D3D] font-semibold rounded-xl text-xs hover:bg-[#EBE5DA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#5F6F52] hover:bg-[#4A5D4E] text-white font-bold rounded-xl text-xs shadow-md shadow-[#5F6F52]/20"
                >
                  Create Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
