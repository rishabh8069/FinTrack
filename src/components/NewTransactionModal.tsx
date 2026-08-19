import React, { useState } from 'react';
import { X, ArrowDownRight, ArrowUpRight, Receipt } from 'lucide-react';
import { Client, TransactionType, ExpenseCategory, IncomeCategory } from '../types';

interface NewTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  initialClient?: Client | null;
  initialType?: TransactionType;
  onSaveTransaction: (txData: any) => Promise<void>;
}

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Raw materials',
  'Packaging',
  'Marketing',
  'Transportation',
  'Utilities',
  'Equipment',
  'Software & Tools',
  'Rent & Workspace',
  'Other business expenses',
];

const INCOME_CATEGORIES: IncomeCategory[] = [
  'Web Development',
  'Design & Branding',
  'Consulting',
  'Product Sales',
  'Freelance Services',
  'Retainer',
  'Other Income',
];

export const NewTransactionModal: React.FC<NewTransactionModalProps> = ({
  isOpen,
  onClose,
  clients,
  initialClient = null,
  initialType = 'income',
  onSaveTransaction,
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState('');
  const [clientName, setClientName] = useState(initialClient?.name || '');
  const [category, setCategory] = useState<string>(initialType === 'income' ? 'Web Development' : 'Packaging');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Bank Transfer' | 'Cash' | 'Card'>('UPI');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;

    setIsSubmitting(true);
    try {
      const selectedClientObj = clients.find((c) => c.name.toLowerCase() === clientName.toLowerCase());

      await onSaveTransaction({
        type,
        amount: Number(amount),
        currency: '₹',
        clientName: clientName.trim() || undefined,
        clientId: selectedClientObj?.id,
        category,
        description: description.trim() || (type === 'income' ? `Payment from ${clientName || 'Client'}` : `${category} expense`),
        date,
        paymentMethod,
        notes: notes.trim() || undefined,
      });

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E8E4D9] rounded-[28px] w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-[#E8E4D9] flex items-center justify-between bg-[#F5F1E8]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-[#E8E4D9] text-[#5F6F52] flex items-center justify-center shadow-2xs">
              <Receipt className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold font-serif text-[#2C3327]">Record Financial Entry</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8C867A] hover:text-[#2C3327] rounded-xl hover:bg-[#EBE5DA] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
          {/* Type Toggle Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#F5F1E8] rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setType('income');
                setCategory('Web Development');
              }}
              className={`py-2.5 rounded-xl font-bold flex items-center justify-center space-x-1.5 transition ${
                type === 'income'
                  ? 'bg-[#5F6F52] text-white shadow-xs'
                  : 'text-[#6B655B] hover:text-[#2C3327]'
              }`}
            >
              <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
              <span>Income Received (+)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setType('expense');
                setCategory('Packaging');
              }}
              className={`py-2.5 rounded-xl font-bold flex items-center justify-center space-x-1.5 transition ${
                type === 'expense'
                  ? 'bg-[#A67B5B] text-white shadow-xs'
                  : 'text-[#6B655B] hover:text-[#2C3327]'
              }`}
            >
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
              <span>Business Expense (-)</span>
            </button>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#2C3327] mb-1">Amount (₹) *</label>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full p-2.5 bg-[#FDFBF7] border border-[#E8E4D9] rounded-xl text-[#2C3327] font-bold font-serif text-sm outline-none focus:border-[#5F6F52]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#2C3327] mb-1">Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 bg-[#FDFBF7] border border-[#E8E4D9] rounded-xl text-[#2C3327] outline-none focus:border-[#5F6F52] font-medium"
              />
            </div>
          </div>

          {/* Client or Vendor Name */}
          <div>
            <label className="block font-bold text-[#2C3327] mb-1">
              {type === 'income' ? 'Client / Payer Name' : 'Merchant / Supplier (Optional)'}
            </label>
            <input
              type="text"
              list="client-suggestions"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder={type === 'income' ? 'e.g. Rahul Sharma' : 'e.g. Royal Packagings'}
              className="w-full p-2.5 bg-[#FDFBF7] border border-[#E8E4D9] rounded-xl text-[#2C3327] outline-none focus:border-[#5F6F52]"
            />
            <datalist id="client-suggestions">
              {clients.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </div>

          {/* Category & Payment Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#2C3327] mb-1">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 bg-[#FDFBF7] border border-[#E8E4D9] rounded-xl text-[#2C3327] outline-none focus:border-[#5F6F52] font-medium"
              >
                {(type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#2C3327] mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full p-2.5 bg-[#FDFBF7] border border-[#E8E4D9] rounded-xl text-[#2C3327] outline-none focus:border-[#5F6F52] font-medium"
              >
                <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-[#2C3327] mb-1">Description / Item Details</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Website development milestone 2 / 50 packaging boxes"
              className="w-full p-2.5 bg-[#FDFBF7] border border-[#E8E4D9] rounded-xl text-[#2C3327] outline-none focus:border-[#5F6F52]"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[#E8E4D9] flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#F5F1E8] hover:bg-[#EBE5DA] text-[#3D3D3D] font-semibold rounded-xl text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#5F6F52] hover:bg-[#4A5D4E] text-white font-bold rounded-xl text-xs shadow-md shadow-[#5F6F52]/20 active:scale-95 transition"
            >
              {isSubmitting ? 'Saving...' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
