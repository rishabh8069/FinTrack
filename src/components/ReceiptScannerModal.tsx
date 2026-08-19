import React, { useState, useRef } from 'react';
import { 
  ScanLine, 
  UploadCloud, 
  CheckCircle2, 
  X, 
  RefreshCw
} from 'lucide-react';
import { ReceiptScanResult } from '../types';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (result: ReceiptScanResult, imageBase64: string) => void;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  onScanComplete,
}) => {
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ReceiptScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const formatINR = (val: number) => '₹' + (val || 0).toLocaleString('en-IN');

  // Sample Preset Receipts for fast demo testing
  const samplePresets = [
    {
      label: '📲 GPay UPI Screenshot (Packaging ₹1,450)',
      data: {
        amount: 1450,
        currency: '₹',
        date: '2026-08-15',
        merchantOrParty: 'Royal Packagings & Boxes',
        category: 'Packaging',
        type: 'expense' as const,
        paymentMethod: 'UPI' as const,
        referenceNumber: 'UPI/20260815/94810294',
        taxAmount: 65,
        rawSummary: 'Paid ₹1,450 via Google Pay UPI to Royal Packagings for corrugated craft boxes.',
        confidenceScore: 0.98,
        items: [
          { name: 'Custom Craft Shipping Boxes (x50)', price: 950, quantity: 50 },
          { name: 'High-Tear Bubble Wrap 50m', price: 500, quantity: 1 },
        ],
      },
      previewUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&q=80',
    },
    {
      label: '💰 PhonePe Received Proof (Rahul Sharma ₹5,000)',
      data: {
        amount: 5000,
        currency: '₹',
        date: '2026-08-15',
        merchantOrParty: 'Rahul Sharma',
        category: 'Freelance Services',
        type: 'income' as const,
        paymentMethod: 'UPI' as const,
        referenceNumber: 'UPI/20260815/78410291',
        rawSummary: 'Payment received ₹5,000 from Rahul Sharma for Milestone 2 web development.',
        confidenceScore: 0.96,
        items: [{ name: 'React Website Milestone 2 Payment', price: 5000, quantity: 1 }],
      },
      previewUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&q=80',
    },
    {
      label: '🧾 Hardware Store Bill (Raw Materials ₹3,200)',
      data: {
        amount: 3200,
        currency: '₹',
        date: '2026-08-14',
        merchantOrParty: 'National Acrylics & Sheets',
        category: 'Raw materials',
        type: 'expense' as const,
        paymentMethod: 'Card' as const,
        referenceNumber: 'INV-2026-8841',
        taxAmount: 180,
        rawSummary: 'Retail tax invoice for cast acrylic stock sheets & cutting consumables.',
        confidenceScore: 0.94,
        items: [
          { name: '3mm Cast Clear Acrylic Sheet 8x4ft', price: 2400, quantity: 1 },
          { name: 'Matte Vinyl Printing Foil Roll', price: 800, quantity: 1 },
        ],
      },
      previewUrl: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=400&q=80',
    },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setSelectedImageBase64(base64);
      processImageOCR(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  const processImageOCR = async (base64: string, mimeType: string) => {
    setIsScanning(true);
    setErrorMsg(null);
    setScanResult(null);

    try {
      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
          autoSave: false,
        }),
      });
      const data = await res.json();
      if (data.result) {
        setScanResult(data.result);
      } else {
        throw new Error(data.error || 'Failed to scan image');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'OCR Scan error. Used fallback extraction.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectPreset = (preset: typeof samplePresets[0]) => {
    setSelectedImageBase64(preset.previewUrl);
    setScanResult(preset.data);
  };

  const handleConfirmAndSave = () => {
    if (!scanResult) return;
    onScanComplete(scanResult, selectedImageBase64 || '');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E8E4D9] rounded-[28px] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-[#E8E4D9] flex items-center justify-between bg-[#F5F1E8]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-[#E8E4D9] text-[#5F6F52] flex items-center justify-center shadow-2xs">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold font-serif text-base text-[#2C3327]">Receipt & UPI Screenshot Scanner</h3>
              <p className="text-xs text-[#8C867A]">Gemini Multimodal OCR extracts amount, vendor, category & creates record</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8C867A] hover:text-[#2C3327] rounded-xl hover:bg-[#EBE5DA] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Quick Presets for Demo */}
          <div>
            <span className="text-xs font-bold text-[#8C867A] uppercase tracking-wider block mb-2.5">
              💡 Quick Demo Presets (Click to test OCR instantaneously):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {samplePresets.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPreset(p)}
                  className="p-3 bg-[#FDFBF7] hover:bg-[#F5F8F2] border border-[#E8E4D9] hover:border-[#5F6F52]/30 rounded-2xl text-left text-xs font-semibold text-[#3D3D3D] transition active:scale-98"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Upload Dropzone */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#D9D2C5] hover:border-[#5F6F52] bg-[#FDFBF7] rounded-[24px] p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2.5"
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept="image/*" 
              className="hidden" 
            />
            <div className="w-12 h-12 rounded-2xl bg-[#F5F8F2] border border-[#E8EFDF] text-[#5F6F52] flex items-center justify-center">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#2C3327]">
                Click to upload receipt or UPI screenshot
              </p>
              <p className="text-xs text-[#8C867A] mt-0.5">Supports PNG, JPG, WebP, GPay / PhonePe / Paytm payment receipts</p>
            </div>
          </div>

          {/* Loading Indicator */}
          {isScanning && (
            <div className="p-4 bg-[#F5F8F2] border border-[#E8EFDF] rounded-2xl flex items-center space-x-3 text-xs text-[#5F6F52] animate-pulse">
              <RefreshCw className="w-5 h-5 text-[#5F6F52] animate-spin" />
              <div>
                <strong>Gemini Multimodal OCR in progress...</strong>
                <p className="text-[11px] text-[#8C867A]">Extracting transaction amount, date, vendor, line items and categorization.</p>
              </div>
            </div>
          )}

          {/* Extracted Details Result Card */}
          {scanResult && (
            <div className="bg-[#FDFBF7] border border-[#E8E4D9] rounded-2xl p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-[#5F6F52]" />
                  <h4 className="font-bold font-serif text-sm text-[#2C3327]">Extracted Financial Record</h4>
                </div>
                <span className="text-[11px] font-semibold bg-[#F5F8F2] text-[#5F6F52] border border-[#E8EFDF] px-2.5 py-0.5 rounded-full">
                  {Math.round((scanResult.confidenceScore || 0.95) * 100)}% Confidence
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
                <div className="bg-white p-3 rounded-xl border border-[#E8E4D9]">
                  <span className="text-[10px] text-[#8C867A] uppercase font-semibold">Amount</span>
                  <div className="font-extrabold font-serif text-base text-[#5F6F52] mt-0.5">
                    {formatINR(scanResult.amount)}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-[#E8E4D9]">
                  <span className="text-[10px] text-[#8C867A] uppercase font-semibold">Type</span>
                  <div className="font-bold text-[#2C3327] capitalize mt-0.5">
                    {scanResult.type}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-[#E8E4D9]">
                  <span className="text-[10px] text-[#8C867A] uppercase font-semibold">Category</span>
                  <div className="font-bold text-[#2C3327] truncate mt-0.5">
                    {scanResult.category}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-[#E8E4D9]">
                  <span className="text-[10px] text-[#8C867A] uppercase font-semibold">Payment Method</span>
                  <div className="font-bold text-[#2C3327] mt-0.5">
                    {scanResult.paymentMethod || 'UPI'}
                  </div>
                </div>
              </div>

              <div className="text-xs space-y-1 pt-1 text-[#3D3D3D]">
                <div><strong>Party / Merchant:</strong> {scanResult.merchantOrParty}</div>
                <div><strong>Summary:</strong> {scanResult.rawSummary}</div>
                {scanResult.referenceNumber && (
                  <div><strong>Ref ID / UTR:</strong> <span className="font-mono text-[#8C867A]">{scanResult.referenceNumber}</span></div>
                )}
              </div>

              {scanResult.items && scanResult.items.length > 0 && (
                <div className="pt-3 border-t border-[#E8E4D9]">
                  <span className="text-[11px] font-bold text-[#8C867A] uppercase">Itemized Breakdown:</span>
                  <div className="mt-1.5 space-y-1">
                    {scanResult.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs text-[#3D3D3D]">
                        <span>{item.name} {item.quantity ? `(x${item.quantity})` : ''}</span>
                        <span className="font-semibold font-serif">{formatINR(item.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#E8E4D9] flex items-center justify-end space-x-2.5 bg-[#F5F1E8]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#EBE5DA] text-[#3D3D3D] rounded-xl text-xs font-semibold hover:bg-[#DDD6C8]"
          >
            Cancel
          </button>
          <button
            disabled={!scanResult}
            onClick={handleConfirmAndSave}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center space-x-1.5 transition ${
              scanResult
                ? 'bg-[#5F6F52] hover:bg-[#4A5D4E] text-white active:scale-95 shadow-[#5F6F52]/20'
                : 'bg-[#E8E4D9] text-[#8C867A] cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Save to Records & Update Ledger</span>
          </button>
        </div>
      </div>
    </div>
  );
};
