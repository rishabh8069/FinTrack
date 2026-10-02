
import React, { useState } from 'react';

interface AuthScreenProps {
    onAuthenticated: (token: string, user: any) => void;
}

type AuthStep = 'phone' | 'otp' | 'onboarding';

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
    const [step, setStep] = useState<AuthStep>('phone');

    const [whatsappNumber, setWhatsappNumber] = useState('+91');
    const [otp, setOtp] = useState('');

    const [token, setToken] = useState('');
    const [user, setUser] = useState<any>(null);

    const [name, setName] = useState('');
    const [usageType, setUsageType] = useState<'personal' | 'business'>('personal');
    const [businessName, setBusinessName] = useState('');
    const [upiId, setUpiId] = useState('');
    const [currency, setCurrency] = useState('INR');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const sendOTP = async () => {
        setError('');
        setMessage('');

        if (!/^\+\d{8,15}$/.test(whatsappNumber.trim())) {
            setError('Enter a valid WhatsApp number with country code.');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/send-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    whatsappNumber: whatsappNumber.trim(),
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to generate OTP.');
            }

            setStep('otp');
            setMessage(data.message);

        } catch (err: any) {
            setError(err.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    const verifyOTP = async () => {
        setError('');
        setMessage('');

        if (!/^\d{6}$/.test(otp)) {
            setError('Enter the six-digit OTP.');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    whatsappNumber: whatsappNumber.trim(),
                    otp,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'OTP verification failed.');
            }

            setToken(data.token);
            setUser(data.user);

            if (data.user?.onboardingCompleted) {
                onAuthenticated(data.token, data.user);
            } else {
                setStep('onboarding');
            }

        } catch (err: any) {
            setError(err.message || 'Unable to verify OTP.');
        } finally {
            setLoading(false);
        }
    };

    const completeOnboarding = async () => {
        setError('');
        setMessage('');

        if (!name.trim()) {
            setError('Please enter your name.');
            return;
        }

        if (usageType === 'business' && !businessName.trim()) {
            setError('Please enter your business name.');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/onboarding', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: name.trim(),
                    usageType,
                    businessName: usageType === 'business' ? businessName.trim() : undefined,
                    upiId: upiId.trim(),
                    currency,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Onboarding failed.');
            }

            onAuthenticated(token, data.user);

        } catch (err: any) {
            setError(err.message || 'Unable to complete onboarding.');
        } finally {
            setLoading(false);
        }
    };

    const inputClass =
        'w-full px-4 py-3 rounded-xl border border-[#E8E4D9] bg-white text-[#3D3D3D] outline-none focus:border-[#5F6F52]';

    return (
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-md bg-white border border-[#E8E4D9] rounded-3xl p-7 sm:p-9 shadow-sm">

                <div className="text-center mb-8">
                    <div className="text-3xl font-serif font-bold text-[#2C3327]">
                        FinTrack
                    </div>
                    <p className="text-sm text-[#8C867A] mt-2">
                        Your finances, connected.
                    </p>
                </div>

                {step === 'phone' && (
                    <div className="space-y-5">
                        <div>
                            <h1 className="text-2xl font-serif font-bold text-[#2C3327]">
                                Welcome to FinTrack
                            </h1>
                            <p className="text-sm text-[#8C867A] mt-2">
                                Continue with your WhatsApp number to register or log in.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                WhatsApp Number
                            </label>
                            <input
                                type="tel"
                                value={whatsappNumber}
                                onChange={(e) => setWhatsappNumber(e.target.value)}
                                placeholder="+919876543210"
                                className={inputClass}
                            />
                        </div>

                        <button
                            onClick={sendOTP}
                            disabled={loading}
                            className="w-full py-3 rounded-xl bg-[#5F6F52] hover:bg-[#4A5D4E] text-white font-semibold disabled:opacity-50"
                        >
                            {loading ? 'Please wait...' : 'Continue with WhatsApp'}
                        </button>
                    </div>
                )}

                {step === 'otp' && (
                    <div className="space-y-5">
                        <div>
                            <h1 className="text-2xl font-serif font-bold text-[#2C3327]">
                                Verify your number
                            </h1>
                            <p className="text-sm text-[#8C867A] mt-2">
                                Enter the six-digit development OTP shown in your backend terminal.
                            </p>
                        </div>

                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                            placeholder="000000"
                            className={`${inputClass} text-center text-2xl tracking-[0.5em]`}
                        />

                        <button
                            onClick={verifyOTP}
                            disabled={loading}
                            className="w-full py-3 rounded-xl bg-[#5F6F52] text-white font-semibold disabled:opacity-50"
                        >
                            {loading ? 'Verifying...' : 'Verify OTP'}
                        </button>

                        <button
                            onClick={() => {
                                setOtp('');
                                setError('');
                                setStep('phone');
                            }}
                            className="w-full text-sm text-[#5F6F52] font-medium"
                        >
                            Change WhatsApp number
                        </button>
                    </div>
                )}

                {step === 'onboarding' && (
                    <div className="space-y-5">
                        <div>
                            <h1 className="text-2xl font-serif font-bold text-[#2C3327]">
                                Set up your profile
                            </h1>
                            <p className="text-sm text-[#8C867A] mt-2">
                                Tell us a little about how you'll use FinTrack.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Your Name
                            </label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter your name"
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Account Type
                            </label>
                            <select
                                value={usageType}
                                onChange={(e) => setUsageType(e.target.value as 'personal' | 'business')}
                                className={inputClass}
                            >
                                <option value="personal">Personal</option>
                                <option value="business">Business</option>
                            </select>
                        </div>

                        {usageType === 'business' && (
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Business Name
                                </label>
                                <input
                                    value={businessName}
                                    onChange={(e) => setBusinessName(e.target.value)}
                                    placeholder="Enter business name"
                                    className={inputClass}
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                UPI ID (Optional)
                            </label>
                            <input
                                value={upiId}
                                onChange={(e) => setUpiId(e.target.value)}
                                placeholder="yourname@upi"
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Currency
                            </label>
                            <select
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className={inputClass}
                            >
                                <option value="INR">INR (₹)</option>
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                            </select>
                        </div>

                        <button
                            onClick={completeOnboarding}
                            disabled={loading}
                            className="w-full py-3 rounded-xl bg-[#5F6F52] text-white font-semibold disabled:opacity-50"
                        >
                            {loading ? 'Setting up...' : 'Complete Setup'}
                        </button>
                    </div>
                )}

                {error && (
                    <div className="mt-5 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {message && !error && (
                    <div className="mt-5 p-3 rounded-xl bg-green-50 text-green-700 text-sm">
                        {message}
                    </div>
                )}

                <p className="text-xs text-center text-[#A09A8F] mt-8">
                    Secure access to your personal FinTrack workspace.
                </p>
            </div>
        </div>
    );
}
