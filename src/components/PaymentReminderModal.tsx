import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  ExternalLink, 
  X, 
  MessageSquare, 
  RefreshCw
} from 'lucide-react';
import { Client } from '../types';

interface PaymentReminderModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  businessName: string;
  ownerName: string;
  upiId: string;
  onSendSimulatedReminder: (text: string) => void;
}

export const PaymentReminderModal: React.FC<PaymentReminderModalProps> = ({
  client,
  isOpen,
  onClose,
  businessName,
  ownerName,
  upiId,
  onSendSimulatedReminder,
}) => {
  const [tone, setTone] = useState<'polite' | 'friendly' | 'firm' | 'urgent'>('polite');
  const [reminderText, setReminderText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const formatINR = (val: number) => '₹' + (val || 0).toLocaleString('en-IN');

  const generateReminderMessage = async (chosenTone: typeof tone) => {
    if (!client) return;
    setIsLoading(true);

    try {
      const res = await fetch('/api/generate-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          tone: chosenTone,
        }),
      });
      const data = await res.json();
      if (data.reminderText) {
        setReminderText(data.reminderText);
      }
    } catch (e) {
      console.error(e);
      // Fallback
      if (chosenTone === 'urgent' || chosenTone === 'firm') {
        setReminderText(
          `Hello *${client.name}*,\n\nThis is an urgent follow-up regarding the outstanding balance of *₹${client.outstanding.toLocaleString('en-IN')}* for *${client.serviceCategory}* which was due on *${client.dueDate || 'recently'}*.\n\nKindly clear the pending dues today via UPI to *${upiId}*.\n\nPlease share the transaction screenshot once completed. Thank you!\n\n— *${ownerName}* (${businessName})`
        );
      } else {
        setReminderText(
          `Hi *${client.name}*! Hope you are having a great week 😊\n\nJust a gentle reminder regarding the milestone invoice for *${client.serviceCategory}*.\n\n• *Pending Amount:* *₹${client.outstanding.toLocaleString('en-IN')}*\n• *Due Date:* ${client.dueDate || 'This week'}\n• *UPI ID:* \`${upiId}\`\n\nPlease let me know once transferred or if you need an updated invoice copy. Thank you!\n\nBest,\n*${ownerName}* | ${businessName}`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (client && isOpen) {
      generateReminderMessage(tone);
    }
  }, [client, isOpen, tone]);

  if (!isOpen || !client) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(reminderText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const whatsappPhone = client.phone ? client.phone.replace(/[^0-9]/g, '') : '';
  const waLink = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(reminderText)}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E8E4D9] rounded-[28px] w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-[#E8E4D9] flex items-center justify-between bg-[#F5F1E8]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-[#E8E4D9] text-[#5F6F52] flex items-center justify-center shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold font-serif text-base text-[#2C3327]">
                WhatsApp Payment Reminder
              </h3>
              <p className="text-xs text-[#8C867A]">
                Personalized AI reminder for {client.name} ({formatINR(client.outstanding)} pending)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8C867A] hover:text-[#2C3327] rounded-xl hover:bg-[#EBE5DA] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4 text-xs">
          {/* Tone Selector */}
          <div>
            <label className="font-bold text-[#2C3327] block mb-2">
              Select Tone / Urgency Level:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['polite', 'friendly', 'firm', 'urgent'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={`py-2 px-2.5 rounded-xl font-semibold capitalize text-center transition ${
                    tone === t
                      ? 'bg-[#5F6F52] text-white shadow-xs'
                      : 'bg-[#F5F1E8] text-[#6B655B] hover:bg-[#EBE5DA]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Message Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#2C3327] flex items-center">
                <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-[#5F6F52]" />
                WhatsApp Message Draft:
              </span>
              <button
                onClick={() => generateReminderMessage(tone)}
                className="text-[#8C867A] hover:text-[#5F6F52] text-[11px] font-medium flex items-center space-x-1"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Regenerate</span>
              </button>
            </div>

            <div className="relative">
              <textarea
                rows={7}
                value={reminderText}
                onChange={(e) => setReminderText(e.target.value)}
                className="w-full p-4 bg-[#FDFBF7] border border-[#E8E4D9] rounded-2xl text-[#2C3327] font-sans leading-relaxed text-xs outline-none focus:border-[#5F6F52] resize-none"
              />
            </div>
          </div>

          {/* Client Details Strip */}
          <div className="p-3.5 bg-[#FDFBF7] rounded-2xl border border-[#E8E4D9] flex items-center justify-between text-[#3D3D3D]">
            <div>
              <strong>Phone:</strong> {client.phone || 'N/A'} • <strong>Due:</strong> {client.dueDate || 'Immediate'}
            </div>
            <div>
              <strong>UPI ID:</strong> <span className="font-mono text-[#5F6F52] font-bold">{upiId}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#E8E4D9] flex flex-wrap items-center justify-between gap-2.5 bg-[#F5F1E8]">
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-[#EBE5DA] hover:bg-[#DDD6C8] text-[#2C3327] font-semibold text-xs transition"
          >
            {isCopied ? <Check className="w-4 h-4 text-[#5F6F52]" /> : <Copy className="w-4 h-4" />}
            <span>{isCopied ? 'Copied!' : 'Copy Text'}</span>
          </button>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => {
                onSendSimulatedReminder(reminderText);
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#FAF7F0] text-[#2C3327] font-medium text-xs border border-[#E8E4D9] shadow-2xs"
            >
              Test in WhatsApp Bot
            </button>

            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-[#5F6F52] hover:bg-[#4A5D4E] text-white font-bold text-xs shadow-md shadow-[#5F6F52]/20 transition active:scale-95"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open in WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
