import React from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  Receipt, 
  ArrowLeftRight, 
  ScanLine, 
  Plus, 
  Settings
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenNewTx: () => void;
  onOpenScanner: () => void;
  onOpenSettings: () => void;
  businessName: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewTx,
  onOpenScanner,
  onOpenSettings,
  businessName,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'whatsapp', label: 'WhatsApp Assistant', icon: MessageSquare, badge: 'Live AI' },
    { id: 'clients', label: 'Client Ledgers', icon: Users },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
    { id: 'scanner', label: 'Receipt Scanner', icon: ScanLine, badge: 'OCR' },
  ];

  return (
    <header className="bg-white text-[#3D3D3D] border-b border-[#E8E4D9] sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Business Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5F6F52] flex items-center justify-center shadow-md shadow-[#5F6F52]/20 text-white font-bold text-xl">
              <span className="flex items-center">
                <MessageSquare className="w-5 h-5 fill-white stroke-[#5F6F52] mr-0.5" />
              </span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold font-serif tracking-tight text-[#2C3327]">FinTrack</span>
                <span className="text-[11px] font-semibold bg-[#F5F8F2] text-[#5F6F52] border border-[#E8EFDF] px-2.5 py-0.5 rounded-full">
                  WhatsApp Powered
                </span>
              </div>
              <p className="text-xs text-[#8C867A] font-medium truncate max-w-[200px] sm:max-w-xs">
                {businessName}
              </p>
            </div>
          </div>

          {/* Nav Links (Desktop) */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#5F6F52]/10 text-[#5F6F52] font-semibold border border-[#5F6F52]/20 shadow-xs'
                      : 'text-[#6B655B] hover:text-[#2C3327] hover:bg-[#F5F1E8]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#5F6F52]' : 'text-[#8C867A]'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-[#5F6F52] text-white rounded-md">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              id="btn-quick-scan"
              onClick={onOpenScanner}
              title="Scan Receipt or UPI screenshot"
              className="hidden sm:flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#F5F1E8] hover:bg-[#EBE5DA] text-[#2C3327] border border-[#E8E4D9] transition"
            >
              <ScanLine className="w-3.5 h-3.5 text-[#5F6F52]" />
              <span>Scan UPI/Bill</span>
            </button>

            <button
              id="btn-quick-add-tx"
              onClick={onOpenNewTx}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[#5F6F52] hover:bg-[#4A5D4E] text-white shadow-md shadow-[#5F6F52]/20 transition active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Add Entry</span>
              <span className="sm:hidden">New</span>
            </button>

            <button
              id="btn-open-settings"
              onClick={onOpenSettings}
              className="p-2 rounded-xl text-[#8C867A] hover:text-[#2C3327] hover:bg-[#F5F1E8] transition"
              title="Webhook & Business Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="md:hidden flex items-center space-x-1 py-2 overflow-x-auto border-t border-[#E8E4D9] no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition ${
                  isActive
                    ? 'bg-[#5F6F52]/15 text-[#5F6F52] font-semibold border border-[#5F6F52]/30'
                    : 'text-[#6B655B] hover:text-[#2C3327] bg-[#F5F1E8]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
