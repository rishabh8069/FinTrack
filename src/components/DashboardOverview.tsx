import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  AlertCircle, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight, 
  MessageSquare, 
  ScanLine, 
  Send,
  ChevronRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell
} from 'recharts';
import { Transaction, Client, MonthlySummary } from '../types';

interface DashboardOverviewProps {
  summary: MonthlySummary;
  transactions: Transaction[];
  clients: Client[];
  onNavigateTab: (tab: string) => void;
  onSendReminder: (client: Client) => void;
  onOpenScanner: () => void;
}

const NATURAL_CATEGORY_COLORS = [
  '#5F6F52', // Olive Sage
  '#A67B5B', // Terracotta Clay
  '#A9B388', // Soft Sage
  '#C49A6C', // Warm Sand
  '#798E68', // Deep Moss
  '#8C867A', // Warm Slate
  '#3D3D3D', // Charcoal
  '#D4A373', // Light Amber
];

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  summary,
  transactions,
  clients,
  onNavigateTab,
  onSendReminder,
  onOpenScanner,
}) => {
  // Format currency
  const formatINR = (val: number) => '₹' + (val || 0).toLocaleString('en-IN');

  // Overdue and pending clients
  const overdueClients = clients.filter((c) => c.status === 'overdue' && c.outstanding > 0);
  const pendingClients = clients.filter((c) => c.outstanding > 0);

  // Prepare Expense Pie Chart Data
  const expensePieData = Object.entries(summary.expenseByCategory || {})
    .filter(([_, val]) => Number(val) > 0)
    .map(([name, value]) => ({ name, value: Number(value) }));

  // Cash flow trend data for recent days
  const chartData = [
    { day: '01 Aug', income: 0, expense: 1850 },
    { day: '04 Aug', income: 10000, expense: 1200 },
    { day: '07 Aug', income: 0, expense: 2199 },
    { day: '10 Aug', income: 15000, expense: 850 },
    { day: '12 Aug', income: 5000, expense: 3200 },
    { day: '14 Aug', income: 10000, expense: 1450 },
    { day: 'Today', income: 0, expense: 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / WhatsApp Bot Callout */}
      <div className="bg-[#F5F1E8] border border-[#E8E4D9] rounded-[28px] p-5 sm:p-7 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-white border border-[#E8E4D9] flex items-center justify-center shrink-0 shadow-xs">
            <MessageSquare className="w-6 h-6 text-[#5F6F52]" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-lg font-bold font-serif text-[#2C3327]">Natural WhatsApp Financial Assistant</h2>
              <span className="bg-[#F5F8F2] text-[#5F6F52] border border-[#E8EFDF] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Phase 1 & 2 Active
              </span>
            </div>
            <p className="text-sm text-[#6B655B] mt-1 max-w-2xl">
              Type or voice natural messages like <span className="text-[#2C3327] font-semibold">"Received ₹5,000 from Rahul for website development"</span> or snap any receipt/UPI screenshot. FinTrack organizes everything into ledgers.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <button
            id="btn-open-whatsapp-simulator"
            onClick={() => onNavigateTab('whatsapp')}
            className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-[#5F6F52] hover:bg-[#4A5D4E] text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-md shadow-[#5F6F52]/20 transition active:scale-95"
          >
            <MessageSquare className="w-4 h-4 fill-white stroke-[#5F6F52]" />
            <span>Open WhatsApp Bot</span>
          </button>
          <button
            id="btn-scan-receipt-hero"
            onClick={onOpenScanner}
            className="flex items-center justify-center space-x-2 bg-white hover:bg-[#FAF7F0] text-[#2C3327] border border-[#E8E4D9] px-4 py-2.5 rounded-xl font-medium text-sm transition shadow-xs"
          >
            <ScanLine className="w-4 h-4 text-[#5F6F52]" />
            <span>Scan Bill</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <div className="bg-white border border-[#E8E4D9] rounded-[24px] p-5 shadow-xs transition hover:border-[#D9D2C5]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8C867A]">Total Income (Aug)</span>
            <div className="w-9 h-9 rounded-xl bg-[#F5F8F2] border border-[#E8EFDF] text-[#5F6F52] flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-serif text-[#2C3327]">
              {formatINR(summary.totalIncome)}
            </div>
            <div className="flex items-center space-x-1.5 mt-1.5 text-xs text-[#5F6F52] font-semibold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>4 Client Payments Collected</span>
            </div>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white border border-[#E8E4D9] rounded-[24px] p-5 shadow-xs transition hover:border-[#D9D2C5]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8C867A]">Total Expenses</span>
            <div className="w-9 h-9 rounded-xl bg-[#FAF3EE] border border-[#F3E5DC] text-[#A67B5B] flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-serif text-[#2C3327]">
              {formatINR(summary.totalExpenses)}
            </div>
            <div className="flex items-center space-x-1.5 mt-1.5 text-xs text-[#8C867A] font-medium">
              <span>{Object.keys(summary.expenseByCategory || {}).length} expense categories tracked</span>
            </div>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-white border border-[#E8E4D9] rounded-[24px] p-5 shadow-xs transition hover:border-[#D9D2C5]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8C867A]">Net Profit</span>
            <div className="w-9 h-9 rounded-xl bg-[#F5F8F2] border border-[#E8EFDF] text-[#5F6F52] flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl sm:text-3xl font-extrabold font-serif ${summary.netProfit >= 0 ? 'text-[#5F6F52]' : 'text-[#A67B5B]'}`}>
              {formatINR(summary.netProfit)}
            </div>
            <div className="flex items-center space-x-1.5 mt-1.5 text-xs text-[#6B655B] font-medium">
              <span className="bg-[#F5F8F2] text-[#5F6F52] border border-[#E8EFDF] font-bold px-2 py-0.5 rounded-md">
                {summary.profitMargin.toFixed(1)}% margin
              </span>
              <span>healthy business health</span>
            </div>
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div className="bg-white border border-[#E8E4D9] rounded-[24px] p-5 shadow-xs transition hover:border-[#D9D2C5]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8C867A]">Pending Receivables</span>
            <div className="w-9 h-9 rounded-xl bg-[#FAF3EE] border border-[#F3E5DC] text-[#A67B5B] flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-serif text-[#A67B5B]">
              {formatINR(summary.totalOutstanding)}
            </div>
            <div className="flex items-center space-x-1.5 mt-1.5 text-xs text-[#8C867A] font-medium">
              <span>{pendingClients.length} clients with balance ({overdueClients.length} overdue)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Visuals & Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Timeline Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-[#E8E4D9] rounded-[28px] p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold font-serif text-[#2C3327] text-base">Monthly Cash Flow & Transactions</h3>
              <p className="text-xs text-[#8C867A]">Income received vs business expenses this month</p>
            </div>
            <div className="flex items-center space-x-3 text-xs font-medium">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#5F6F52] inline-block"></span>
                <span className="text-[#3D3D3D]">Income</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#A67B5B] inline-block"></span>
                <span className="text-[#3D3D3D]">Expenses</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeNaturalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5F6F52" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#5F6F52" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="expenseNaturalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A67B5B" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#A67B5B" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#8C867A" fontSize={11} tickLine={false} />
                <YAxis stroke="#8C867A" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip 
                  formatter={(val: number) => [`₹${val.toLocaleString('en-IN')}`, '']}
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E8E4D9', borderRadius: '12px', color: '#2C3327', fontSize: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
                />
                <Area type="monotone" dataKey="income" name="Income" stroke="#5F6F52" strokeWidth={2.5} fillOpacity={1} fill="url(#incomeNaturalGradient)" />
                <Area type="monotone" dataKey="expense" name="Expense" stroke="#A67B5B" strokeWidth={2} fillOpacity={1} fill="url(#expenseNaturalGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Donut Breakdown (1 col) */}
        <div className="bg-white border border-[#E8E4D9] rounded-[28px] p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-bold font-serif text-[#2C3327] text-base">Expense Breakdown</h3>
              <p className="text-xs text-[#8C867A]">By business cost category</p>
            </div>
            <button 
              onClick={() => onNavigateTab('expenses')}
              className="text-xs font-semibold text-[#5F6F52] hover:underline"
            >
              View All
            </button>
          </div>

          <div className="h-44 w-full flex items-center justify-center my-2">
            {expensePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {expensePieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={NATURAL_CATEGORY_COLORS[index % NATURAL_CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']}
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E8E4D9', borderRadius: '12px', color: '#2C3327', fontSize: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-[#8C867A]">No expenses recorded yet.</p>
            )}
          </div>

          <div className="space-y-2 max-h-36 overflow-y-auto no-scrollbar pt-3 border-t border-[#F2EEE3]">
            {expensePieData.slice(0, 4).map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: NATURAL_CATEGORY_COLORS[idx % NATURAL_CATEGORY_COLORS.length] }}></span>
                  <span className="text-[#3D3D3D] font-medium truncate">{item.name}</span>
                </div>
                <span className="font-semibold text-[#2C3327] shrink-0">
                  {formatINR(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two Columns: Overdue / Outstanding Client Action Center + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Outstanding Receivables Action Card */}
        <div className="bg-white border border-[#E8E4D9] rounded-[28px] p-6 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-[#5F6F52]" />
              <h3 className="font-bold font-serif text-[#2C3327] text-base">Client Receivables</h3>
            </div>
            <button
              onClick={() => onNavigateTab('clients')}
              className="text-xs font-semibold text-[#5F6F52] hover:underline"
            >
              All Ledgers
            </button>
          </div>

          <p className="text-xs text-[#8C867A] mb-4">
            Directly follow up with clients via WhatsApp with 1-click tailored reminder messages.
          </p>

          <div className="space-y-3">
            {pendingClients.slice(0, 3).map((client) => {
              const isOverdue = client.status === 'overdue';
              return (
                <div 
                  key={client.id}
                  className={`p-3.5 rounded-2xl border transition ${
                    isOverdue 
                      ? 'border-[#F3E5DC] bg-[#FAF3EE]' 
                      : 'border-[#E8E4D9] bg-[#FDFBF7]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-[#2C3327]">{client.name}</span>
                        {isOverdue && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF3EE] text-[#A67B5B] border border-[#F3E5DC]">
                            Overdue
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#8C867A] mt-0.5">{client.serviceCategory}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-[#A67B5B]">
                        {formatINR(client.outstanding)}
                      </div>
                      <span className="text-[10px] text-[#8C867A]">of {formatINR(client.totalBilled)}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-[#E8E4D9]/80">
                    <span className="text-[11px] text-[#8C867A]">
                      Due: <strong className="text-[#3D3D3D]">{client.dueDate || 'N/A'}</strong>
                    </span>
                    <button
                      onClick={() => onSendReminder(client)}
                      className="flex items-center space-x-1.5 text-xs font-semibold bg-[#5F6F52]/10 hover:bg-[#5F6F52]/20 text-[#5F6F52] border border-[#5F6F52]/25 px-3 py-1 rounded-xl transition"
                    >
                      <Send className="w-3 h-3" />
                      <span>WhatsApp Reminder</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Transactions Feed (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-[#E8E4D9] rounded-[28px] p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold font-serif text-[#2C3327] text-base">Recent Transactions</h3>
              <p className="text-xs text-[#8C867A]">Natural entries recorded via WhatsApp, OCR scans & web</p>
            </div>
            <button
              onClick={() => onNavigateTab('transactions')}
              className="text-xs font-semibold text-[#5F6F52] hover:underline flex items-center"
            >
              <span>View Full History</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          <div className="divide-y divide-[#F2EEE3]">
            {transactions.slice(0, 5).map((tx) => {
              const isIncome = tx.type === 'income' || tx.type === 'payment_received';
              return (
                <div key={tx.id} className="py-3.5 flex items-center justify-between hover:bg-[#FDFBF7] px-2 rounded-xl transition">
                  <div className="flex items-center space-x-3.5">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      isIncome 
                        ? 'bg-[#F5F8F2] border border-[#E8EFDF] text-[#5F6F52]' 
                        : 'bg-[#FAF3EE] border border-[#F3E5DC] text-[#A67B5B]'
                    }`}>
                      {isIncome ? <ArrowDownRight className="w-5 h-5 stroke-[2.2]" /> : <ArrowUpRight className="w-5 h-5 stroke-[2.2]" />}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-[#2C3327]">
                          {tx.clientName ? `${tx.clientName}` : tx.description}
                        </span>
                        {tx.source === 'whatsapp' && (
                          <span className="text-[10px] font-medium bg-[#F5F8F2] text-[#5F6F52] border border-[#E8EFDF] px-2 py-0.5 rounded-full flex items-center space-x-0.5">
                            <MessageSquare className="w-2.5 h-2.5 mr-0.5" />
                            <span>WhatsApp</span>
                          </span>
                        )}
                        {tx.source === 'receipt_scan' && (
                          <span className="text-[10px] font-medium bg-[#FAF7F0] text-[#8C867A] border border-[#E8E4D9] px-2 py-0.5 rounded-full flex items-center space-x-0.5">
                            <ScanLine className="w-2.5 h-2.5 mr-0.5" />
                            <span>OCR Scan</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#8C867A] mt-0.5">
                        {tx.category} • {tx.date} • {tx.paymentMethod || 'UPI'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-sm font-bold font-serif ${
                      isIncome ? 'text-[#5F6F52]' : 'text-[#2C3327]'
                    }`}>
                      {isIncome ? '+' : '-'}{formatINR(tx.amount)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
