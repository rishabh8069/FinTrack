import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Paperclip, 
  Mic, 
  Image as ImageIcon, 
  CheckCheck, 
  Bot, 
  Sparkles, 
  Info,
  ArrowDownRight,
  ArrowUpRight,
  Receipt,
  PlusCircle,
  MinusCircle
} from 'lucide-react';
import { ChatMessage, Client } from '../types';

interface WhatsAppSimulatorProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  onOpenScanner: () => void;
  clients: Client[];
  businessPhone?: string;
  businessName?: string;
}

export const WhatsAppSimulator: React.FC<WhatsAppSimulatorProps> = ({
  messages,
  onSendMessage,
  onOpenScanner,
  clients,
  businessPhone = '+91 98765 43210',
  businessName = 'FinTrack Assistant',
}) => {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const samplePrompts = [
    { label: '💰 Received ₹5,000', text: 'Received ₹5,000 from Rahul for website development.' },
    { label: '💵 Income ₹8,000', text: 'Income ₹8,000 from Ananya for design branding' },
    { label: '📦 Spent ₹1,450', text: 'Spent ₹1,450 on packaging boxes and bubble wrap' },
    { label: '🚕 Paid ₹450 Uber', text: 'Paid ₹450 for Uber cab to client meeting' },
    { label: '📈 Month Earnings', text: 'How much did I earn this month?' },
    { label: '👥 Who owes me?', text: 'Who owes me money?' },
    { label: '📉 Top Expenses', text: 'What were my biggest expenses?' },
    { label: '💳 Got ₹10,000 Advance', text: 'Received ₹10,000 from Vikram advance for app' },
  ];

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Handle voice note simulation
  useEffect(() => {
    let interval: any;
    if (isRecordingVoice) {
      interval = setInterval(() => {
        setVoiceSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setVoiceSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecordingVoice]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    setInputText('');
    setIsTyping(true);

    try {
      await onSendMessage(text);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSimulateVoice = () => {
    if (!isRecordingVoice) {
      setIsRecordingVoice(true);
    } else {
      setIsRecordingVoice(false);
      // Simulate recognized speech
      handleSend('Received ₹5,000 from Rahul for website development.');
    }
  };

  // Helper to format WhatsApp markdown (*bold*, _italic_, bullet points)
  const renderFormattedText = (raw: string) => {
    if (!raw) return null;

    const lines = raw.split('\n');
    return (
      <div className="space-y-1 text-[13.5px] leading-relaxed">
        {lines.map((line, idx) => {
          const parts = [];
          const regex = /(\*[^*]+\*|_[^_]+_)/g;
          let match;
          let lastIndex = 0;
          let keyCounter = 0;

          while ((match = regex.exec(line)) !== null) {
            if (match.index > lastIndex) {
              parts.push(line.substring(lastIndex, match.index));
            }
            const token = match[0];
            if (token.startsWith('*') && token.endsWith('*')) {
              parts.push(<strong key={keyCounter++} className="font-bold text-[#2C3327]">{token.slice(1, -1)}</strong>);
            } else if (token.startsWith('_') && token.endsWith('_')) {
              parts.push(<em key={keyCounter++} className="italic text-[#5F6F52]">{token.slice(1, -1)}</em>);
            }
            lastIndex = regex.lastIndex;
          }
          if (lastIndex < line.length) {
            parts.push(line.substring(lastIndex));
          }

          return (
            <div key={idx} className={line.startsWith('•') ? 'pl-2 text-[#3D3D3D]' : 'text-[#3D3D3D]'}>
              {parts.length > 0 ? parts : line}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Top Helper Cards */}
      <div className="mb-4 bg-[#F5F8F2] border border-[#E8EFDF] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2.5 text-[#5F6F52] font-medium">
          <Sparkles className="w-4 h-4 text-[#5F6F52] shrink-0" />
          <span>
            <strong className="font-serif text-[#2C3327]">Natural Language Transaction Processing:</strong> Send messages exactly as you would on WhatsApp. FinTrack automatically extracts client names, categories, amounts, and logs them into ledgers!
          </span>
        </div>
        <button
          onClick={onOpenScanner}
          className="flex items-center space-x-1 font-semibold text-[#5F6F52] hover:underline shrink-0"
        >
          <Paperclip className="w-3.5 h-3.5" />
          <span>Upload Receipt / UPI</span>
        </button>
      </div>

      {/* Main WhatsApp Window Frame */}
      <div className="bg-white border border-[#E8E4D9] rounded-[28px] overflow-hidden shadow-xs flex flex-col h-[650px]">
        {/* WhatsApp Mobile/Web Header */}
        <div className="bg-[#5F6F52] text-white px-5 py-3.5 flex items-center justify-between shadow-xs select-none shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-[#4A5D4E] flex items-center justify-center border border-white/30">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="w-3 h-3 rounded-full bg-[#A9B388] border-2 border-[#5F6F52] absolute bottom-0 right-0"></span>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="font-bold font-serif text-sm tracking-wide text-white">FinTrack Bot</h3>
                <span className="w-3.5 h-3.5 rounded-full bg-white/20 flex items-center justify-center text-[9px] font-bold text-white">✓</span>
              </div>
              <p className="text-[11px] text-[#E8EFDF] flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A9B388] inline-block animate-pulse"></span>
                <span>Online • WhatsApp Business Assistant</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-[#F5F8F2]">
            <button 
              onClick={onOpenScanner}
              title="Scan Receipt Screenshot"
              className="p-1.5 hover:bg-white/10 rounded-xl transition flex items-center space-x-1.5 text-xs"
            >
              <ImageIcon className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px] font-medium">Scan Image</span>
            </button>
            <div className="w-px h-4 bg-white/20"></div>
            <span className="text-xs text-[#E8EFDF] font-mono hidden sm:inline">{businessPhone}</span>
          </div>
        </div>

        {/* Chat Message Scrollable Canvas */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F5F1E8]"
          style={{
            backgroundImage: `radial-gradient(#8C867A 0.6px, transparent 0.6px)`,
            backgroundSize: '24px 24px',
          }}
        >
          {/* WhatsApp Encryption Security Notice */}
          <div className="flex justify-center my-2">
            <div className="bg-white/90 border border-[#E8E4D9] text-[#6B655B] text-[11px] px-3.5 py-1.5 rounded-xl max-w-sm text-center shadow-2xs flex items-center space-x-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 text-[#8C867A]" />
              <span>Messages and transactions are securely processed by FinTrack AI.</span>
            </div>
          </div>

          {/* Messages Feed */}
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-md rounded-2xl px-4 py-3 shadow-xs relative text-sm ${
                    isUser
                      ? 'bg-[#E8EFDF] text-[#2C3327] border border-[#D9E5CF] rounded-tr-xs'
                      : 'bg-white text-[#2C3327] rounded-tl-xs border border-[#E8E4D9]'
                  }`}
                >
                  {/* Formatted Content */}
                  <div>{renderFormattedText(msg.text)}</div>

                  {/* Transaction Card Badge if confirmed */}
                  {msg.transactionData && (
                    <div className={`mt-3 p-3 rounded-2xl border text-xs flex items-center justify-between shadow-2xs ${
                      msg.transactionData.type === 'income' || msg.transactionData.type === 'payment_received'
                        ? 'bg-[#F5F8F2] border-[#E8EFDF]'
                        : 'bg-[#FAF3EE] border-[#F3E5DC]'
                    }`}>
                      <div className="flex items-center space-x-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          msg.transactionData.type === 'income' || msg.transactionData.type === 'payment_received'
                            ? 'bg-[#5F6F52] text-white'
                            : 'bg-[#A67B5B] text-white'
                        }`}>
                          {msg.transactionData.type === 'income' || msg.transactionData.type === 'payment_received' ? (
                            <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-[#2C3327] flex items-center space-x-1">
                            <span>{msg.transactionData.type === 'income' || msg.transactionData.type === 'payment_received' ? 'Income Logged' : 'Expense Logged'}</span>
                            {msg.transactionData.clientName && (
                              <span className="text-[10px] text-[#6B655B] font-normal">• {msg.transactionData.clientName}</span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#8C867A]">
                            {msg.transactionData.category} • {msg.transactionData.paymentMethod || 'UPI'}
                          </div>
                        </div>
                      </div>
                      <div className={`font-bold font-serif text-base ${
                        msg.transactionData.type === 'income' || msg.transactionData.type === 'payment_received'
                          ? 'text-[#5F6F52]'
                          : 'text-[#A67B5B]'
                      }`}>
                        {msg.transactionData.type === 'income' || msg.transactionData.type === 'payment_received' ? '+' : '-'}₹{(msg.transactionData.amount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  )}

                  {/* Timestamp and Double Check mark */}
                  <div className="flex items-center justify-end space-x-1 mt-1.5 text-[10px] text-[#8C867A]">
                    <span>{msg.timestamp}</span>
                    {isUser && (
                      <CheckCheck className="w-3.5 h-3.5 text-[#5F6F52] inline stroke-[2.2]" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl rounded-tl-xs px-4 py-2.5 shadow-xs border border-[#E8E4D9] flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-[#5F6F52] animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-[#5F6F52] animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 rounded-full bg-[#5F6F52] animate-bounce [animation-delay:0.4s]"></span>
                <span className="text-xs text-[#8C867A] font-medium ml-1">FinTrack is processing...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Sample Prompts Tray */}
        <div className="bg-[#FDFBF7] px-4 py-2.5 border-t border-[#E8E4D9] overflow-x-auto no-scrollbar flex items-center space-x-2 shrink-0">
          <div className="flex items-center space-x-1.5 shrink-0 pr-2 border-r border-[#E8E4D9]">
            <button
              onClick={() => setInputText('Received ₹5,000 from ')}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#F5F8F2] hover:bg-[#E8EFDF] text-[#5F6F52] border border-[#E8EFDF] flex items-center space-x-1 transition active:scale-95 shadow-2xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Income</span>
            </button>
            <button
              onClick={() => setInputText('Spent ₹ on ')}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#FAF3EE] hover:bg-[#F3E5DC] text-[#A67B5B] border border-[#F3E5DC] flex items-center space-x-1 transition active:scale-95 shadow-2xs"
            >
              <MinusCircle className="w-3.5 h-3.5" />
              <span>- Expense</span>
            </button>
          </div>

          <span className="text-[11px] font-semibold text-[#8C867A] shrink-0 flex items-center">
            <Sparkles className="w-3 h-3 text-[#5F6F52] mr-1" /> Quick test:
          </span>
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p.text)}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-white hover:bg-[#F5F8F2] text-[#3D3D3D] hover:text-[#5F6F52] border border-[#E8E4D9] hover:border-[#5F6F52]/30 transition whitespace-nowrap shadow-2xs shrink-0 active:scale-95"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Message Input Bar */}
        <div className="bg-white px-4 py-3 border-t border-[#E8E4D9] flex items-center space-x-2.5 shrink-0">
          <button
            id="btn-chat-attach"
            onClick={onOpenScanner}
            title="Attach Receipt / Screenshot"
            className="p-2 text-[#8C867A] hover:text-[#2C3327] rounded-xl hover:bg-[#F5F1E8] transition"
          >
            <Paperclip className="w-5 h-5 rotate-45" />
          </button>

          {isRecordingVoice ? (
            <div className="flex-1 flex items-center justify-between bg-[#FAF3EE] border border-[#F3E5DC] rounded-full px-4 py-2 text-[#A67B5B] text-xs animate-pulse">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#A67B5B] inline-block"></span>
                <span>Listening to voice note... ({voiceSeconds}s)</span>
              </div>
              <button 
                onClick={handleSimulateVoice}
                className="font-bold text-[#A67B5B] underline"
              >
                Done (Process)
              </button>
            </div>
          ) : (
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex-1 flex items-center"
            >
              <input
                id="input-whatsapp-message"
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type natural message, e.g. 'Received ₹5,000 from Rahul for website development'..."
                className="w-full bg-[#FDFBF7] text-[#2C3327] px-4 py-2.5 rounded-full text-sm outline-none border border-[#E8E4D9] focus:border-[#5F6F52] transition placeholder:text-[#8C867A]"
              />
            </form>
          )}

          {inputText.trim() ? (
            <button
              id="btn-send-whatsapp-message"
              onClick={() => handleSend()}
              disabled={isTyping}
              className="w-10 h-10 rounded-full bg-[#5F6F52] hover:bg-[#4A5D4E] text-white flex items-center justify-center shadow-md shadow-[#5F6F52]/20 transition active:scale-95 shrink-0"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          ) : (
            <button
              id="btn-voice-whatsapp-message"
              onClick={handleSimulateVoice}
              title="Simulate Voice Note"
              className={`w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95 shrink-0 ${
                isRecordingVoice 
                  ? 'bg-[#A67B5B] text-white' 
                  : 'bg-[#5F6F52] hover:bg-[#4A5D4E] text-white shadow-md shadow-[#5F6F52]/20'
              }`}
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
