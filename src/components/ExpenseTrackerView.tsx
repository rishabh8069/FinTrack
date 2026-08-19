import React, { useState } from 'react';
import { 
  Receipt, 
  Package, 
  Layers, 
  Megaphone, 
  Car, 
  Zap, 
  Wrench, 
  Laptop, 
  Plus, 
  Search, 
  ScanLine
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Transaction } from '../types';

interface ExpenseTrackerViewProps {
  transactions: Transaction[];
  onOpenNewExpense: () => void;
  onOpenScanner: () => void;
}

const CATEGORY_ICONS: Record<string, any> = {
  'Raw materials': Layers,
  'Marketing': Megaphone,
  'Transportation': Car,
  'Utilities': Zap,
  'Packaging': Package,
  'Equipment': Wrench,
  'Software & Tools': Laptop,
  'Rent & Workspace': Package,
  'Other business expenses': Receipt,
};

const NATURAL_CATEGORY_COLORS: Record<string, string> = {
  'Raw materials': '#5F6F52',
  'Marketing': '#A67B5B',
  'Transportation': '#C49A6C',
  'Utilities': '#798E68',
  'Packaging': '#A9B388',
  'Equipment': '#8C867A',
  'Software & Tools': '#5F6F52',
  'Rent & Workspace': '#D4A373',
  'Other business expenses': '#3D3D3D',
};

export const ExpenseTrackerView: React.FC<ExpenseTrackerViewProps> = ({
  transactions,
  onOpenNewExpense,
  onOpenScanner,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const formatINR = (val: number) => '₹' + (val || 0).toLocaleString('en-IN');

  const expenseTransactions = transactions.filter((t) => t.type === 'expense');
  const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Group by category
  const categoryTotals: Record<string, { total: number; count: number }> = {};
  expenseTransactions.forEach((t) => {
    if (!categoryTotals[t.category]) {
      categoryTotals[t.category] = { total: 0, count: 0 };
    }
    categoryTotals[t.category].total += t.amount;
    categoryTotals[t.category].count += 1;
  });

  const chartData = Object.entries(categoryTotals).map(([name, data]) => ({
    category: name,
    amount: data.total,
    count: data.count,
  })).sort((a, b) => b.amount - a.amount);

  const filteredExpenses = expenseTransactions.filter((t) => {
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch = 
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif text-[#2C3327]">Business Expense Tracker</h2>
          <p className="text-xs text-[#8C867A] mt-0.5">
            Categorized tracking for raw materials, packaging, marketing, tools & transportation.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={onOpenScanner}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-white hover:bg-[#FAF7F0] text-[#2C3327] border border-[#E8E4D9] rounded-xl text-xs font-semibold transition shadow-xs"
          >
            <ScanLine className="w-4 h-4 text-[#5F6F52]" />
            <span>Scan Receipt</span>
          </button>
          <button
            onClick={onOpenNewExpense}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-[#5F6F52] hover:bg-[#4A5D4E] text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-[#5F6F52]/20 transition active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Log Expense</span>
          </button>
        </div>
      </div>

      {/* Expense Summary & Bar Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Total Expense KPI Card */}
        <div className="bg-white border border-[#E8E4D9] rounded-[28px] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-[#8C867A] uppercase tracking-wider">August Total Outflow</span>
            <div className="text-3xl font-extrabold font-serif text-[#A67B5B] mt-2">
              {formatINR(totalExpenses)}
            </div>
            <p className="text-xs text-[#8C867A] mt-1">
              Across {expenseTransactions.length} recorded business purchases
            </p>
          </div>

          <div className="mt-4 pt-3.5 border-t border-[#F2EEE3] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8C867A]">Largest Category</span>
              <strong className="text-[#2C3327]">
                {chartData[0]?.category || 'N/A'} ({formatINR(chartData[0]?.amount || 0)})
              </strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8C867A]">Average Expense</span>
              <strong className="text-[#2C3327]">
                {formatINR(expenseTransactions.length > 0 ? totalExpenses / expenseTransactions.length : 0)}
              </strong>
            </div>
          </div>
        </div>

        {/* Expense Category Bar Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-[#E8E4D9] rounded-[28px] p-6 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold font-serif text-[#2C3327]">Expenses by Category</h3>
            <span className="text-xs text-[#8C867A]">August 2026</span>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis 
                  dataKey="category" 
                  stroke="#8C867A" 
                  fontSize={10} 
                  tickLine={false} 
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis stroke="#8C867A" fontSize={10} tickLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip 
                  formatter={(val: number) => [`₹${val.toLocaleString('en-IN')}`, 'Spent']}
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E8E4D9', borderRadius: '12px', color: '#2C3327', fontSize: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={NATURAL_CATEGORY_COLORS[entry.category] || '#5F6F52'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
            selectedCategory === 'all'
              ? 'bg-[#5F6F52] text-white shadow-xs'
              : 'bg-white border border-[#E8E4D9] text-[#6B655B] hover:text-[#2C3327] hover:bg-[#F5F1E8]'
          }`}
        >
          All Categories ({expenseTransactions.length})
        </button>
        {Object.entries(categoryTotals).map(([cat, data]) => {
          const Icon = CATEGORY_ICONS[cat] || Receipt;
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                isSelected
                  ? 'bg-[#5F6F52] text-white shadow-xs'
                  : 'bg-white border border-[#E8E4D9] text-[#6B655B] hover:text-[#2C3327] hover:bg-[#F5F1E8]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat}</span>
              <span className="text-[10px] opacity-80 font-bold font-serif">({formatINR(data.total)})</span>
            </button>
          );
        })}
      </div>

      {/* Expense Item List */}
      <div className="bg-white border border-[#E8E4D9] rounded-[28px] overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-[#E8E4D9] flex items-center justify-between bg-[#FDFBF7]">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#8C867A] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search expenses..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#E8E4D9] rounded-xl text-xs text-[#2C3327] outline-none focus:border-[#5F6F52] placeholder:text-[#8C867A]"
            />
          </div>
          <span className="text-xs text-[#8C867A] font-medium">{filteredExpenses.length} entries shown</span>
        </div>

        <div className="divide-y divide-[#F2EEE3]">
          {filteredExpenses.map((expense) => {
            const Icon = CATEGORY_ICONS[expense.category] || Receipt;
            const categoryColor = NATURAL_CATEGORY_COLORS[expense.category] || '#5F6F52';
            return (
              <div key={expense.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-[#FDFBF7] transition">
                <div className="flex items-center space-x-3.5">
                  <div 
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border border-[#E8E4D9]"
                    style={{ backgroundColor: `${categoryColor}15`, color: categoryColor }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-sm text-[#2C3327]">{expense.description}</span>
                      <span 
                        className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border"
                        style={{ backgroundColor: `${categoryColor}10`, borderColor: `${categoryColor}30`, color: categoryColor }}
                      >
                        {expense.category}
                      </span>
                    </div>
                    <div className="text-xs text-[#8C867A] mt-0.5 flex items-center space-x-2">
                      <span>{expense.date}</span>
                      <span>•</span>
                      <span>{expense.paymentMethod || 'UPI'}</span>
                      <span>•</span>
                      <span className="capitalize">{expense.source === 'whatsapp' ? '💬 WhatsApp' : expense.source === 'receipt_scan' ? '📸 OCR Scan' : '🌐 Web'}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-bold font-serif text-[#2C3327]">
                    -{formatINR(expense.amount)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
