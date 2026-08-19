import React, { useEffect, useState } from 'react';;
import {
  Settings,
  X,
  Copy,
  Check,
  MessageSquare,
  Building,
  RotateCcw
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessInfo: {
    name: string;
    ownerName: string;
    currency: string;
    phone: string;
    upiId: string;
  };
  onSaveBusinessInfo: (info: any) => Promise<void> | void;
  onResetData: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  businessInfo,
  onSaveBusinessInfo,
  onResetData,
}) => {
  const [formData, setFormData] = useState({ ...businessInfo });
  useEffect(() => {
    if (isOpen) {
      setFormData({ ...businessInfo });
    }
  }, [businessInfo, isOpen]);
  const [isCopiedWebhook, setIsCopiedWebhook] = useState(false);
  const [isCopiedToken, setIsCopiedToken] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  if (!isOpen) return null;

  const webhookUrl = `${window.location.origin}/api/whatsapp/webhook`;
  const verifyToken = 'fintrack_verify_token';

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setIsCopiedWebhook(true);
    setTimeout(() => setIsCopiedWebhook(false), 2000);
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(verifyToken);
    setIsCopiedToken(true);
    setTimeout(() => setIsCopiedToken(false), 2000);
  };

  const handleReset = async () => {
    if (window.confirm('Reset all transactions, client ledgers, and WhatsApp messages back to initial demo defaults?')) {
      setIsResetting(true);
      try {
        await onResetData();
        onClose();
      } finally {
        setIsResetting(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await onSaveBusinessInfo(formData);

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E8E4D9] rounded-[28px] w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-[#E8E4D9] flex items-center justify-between bg-[#F5F1E8]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-[#E8E4D9] text-[#5F6F52] flex items-center justify-center shadow-2xs">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold font-serif text-base text-[#2C3327]">FinTrack Settings & Integration</h3>
              <p className="text-xs text-[#8C867A]">Business identity, payment identifiers, and WhatsApp Webhook</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8C867A] hover:text-[#2C3327] rounded-xl hover:bg-[#EBE5DA] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Business Profile Settings */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <h4 className="font-bold font-serif text-[#2C3327] text-sm flex items-center">
              <Building className="w-4 h-4 mr-1.5 text-[#5F6F52]" />
              Business Identity
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#2C3327] mb-1">Business Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 bg-[#FDFBF7] border border-[#E8E4D9] rounded-xl text-[#2C3327] outline-none focus:border-[#5F6F52]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#2C3327] mb-1">Owner / Freelancer Name</label>
                <input
                  type="text"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  className="w-full p-2.5 bg-[#FDFBF7] border border-[#E8E4D9] rounded-xl text-[#2C3327] outline-none focus:border-[#5F6F52]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#2C3327] mb-1">WhatsApp Phone #</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-2.5 bg-[#FDFBF7] border border-[#E8E4D9] rounded-xl text-[#2C3327] outline-none focus:border-[#5F6F52] font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#2C3327] mb-1">Business UPI ID (for Reminders)</label>
                <input
                  type="text"
                  value={formData.upiId}
                  onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                  className="w-full p-2.5 bg-[#FDFBF7] border border-[#E8E4D9] rounded-xl text-[#2C3327] outline-none focus:border-[#5F6F52] font-mono"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-[#5F6F52] hover:bg-[#4A5D4E] text-white font-bold rounded-xl text-xs shadow-md shadow-[#5F6F52]/20 transition"
              >
                Save Business Profile
              </button>
            </div>
          </form>

          {/* WhatsApp Webhook Details */}
          <div className="pt-4 border-t border-[#E8E4D9] space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold font-serif text-[#2C3327] text-sm flex items-center">
                <MessageSquare className="w-4 h-4 mr-1.5 text-[#5F6F52]" />
                Live WhatsApp Cloud API Webhook
              </h4>
              <span className="bg-[#F5F8F2] text-[#5F6F52] border border-[#E8EFDF] text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                Webhook Ready
              </span>
            </div>

            <p className="text-[#6B655B] text-[11px] leading-relaxed">
              Connect your Meta WhatsApp Business Cloud API or Twilio account to automatically record incoming payments and expenses sent from your real WhatsApp!
            </p>

            <div className="space-y-2.5">
              <div>
                <label className="text-[10px] font-bold text-[#8C867A] uppercase tracking-wider">Webhook Callback URL</label>
                <div className="flex items-center space-x-2 mt-1">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="flex-1 p-2.5 bg-[#FDFBF7] border border-[#E8E4D9] rounded-xl font-mono text-[11px] text-[#2C3327] outline-none select-all"
                  />
                  <button
                    onClick={handleCopyWebhook}
                    className="p-2.5 bg-[#EBE5DA] hover:bg-[#DDD6C8] text-[#2C3327] rounded-xl transition"
                    title="Copy URL"
                  >
                    {isCopiedWebhook ? <Check className="w-4 h-4 text-[#5F6F52]" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#8C867A] uppercase tracking-wider">Verification Token</label>
                <div className="flex items-center space-x-2 mt-1">
                  <input
                    type="text"
                    readOnly
                    value={verifyToken}
                    className="flex-1 p-2.5 bg-[#FDFBF7] border border-[#E8E4D9] rounded-xl font-mono text-[11px] text-[#2C3327] outline-none select-all"
                  />
                  <button
                    onClick={handleCopyToken}
                    className="p-2.5 bg-[#EBE5DA] hover:bg-[#DDD6C8] text-[#2C3327] rounded-xl transition"
                    title="Copy Token"
                  >
                    {isCopiedToken ? <Check className="w-4 h-4 text-[#5F6F52]" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 3-Step Setup Guide */}
              <div className="bg-[#F5F8F2] border border-[#E8EFDF] rounded-xl p-3 text-[11px] text-[#3D3D3D] space-y-1.5">
                <div className="font-bold text-[#5F6F52]">Quick Meta Cloud API Setup:</div>
                <ol className="list-decimal list-inside space-y-1 text-[#6B655B]">
                  <li>Go to <strong>developers.facebook.com</strong> &gt; Your WhatsApp App &gt; <strong>Configuration</strong>.</li>
                  <li>Paste the <strong>Callback URL</strong> and <strong>Verify Token</strong> from above &gt; Click <em>Verify & Save</em>.</li>
                  <li>Under Webhook fields, subscribe to <strong>messages</strong>.</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Reset Demo Data */}
          <div className="pt-4 border-t border-[#E8E4D9] flex items-center justify-between">
            <div>
              <h5 className="font-bold text-[#2C3327]">Reset Demo Data</h5>
              <p className="text-[11px] text-[#8C867A]">Restore initial transactions, clients & chat logs</p>
            </div>
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#FAF3EE] hover:bg-[#F3E5DC] text-[#A67B5B] border border-[#F3E5DC] rounded-xl font-bold transition text-xs"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span>Reset to Defaults</span>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5 border-t border-[#E8E4D9] bg-[#F5F1E8] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#5F6F52] hover:bg-[#4A5D4E] text-white font-semibold rounded-xl text-xs shadow-xs"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
};
