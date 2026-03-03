import { useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    GoogleAuthProvider,
    signInWithPopup,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    type ConfirmationResult,
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Loader2, ArrowLeft } from 'lucide-react';

declare global {
    interface Window {
        recaptchaVerifier?: RecaptchaVerifier;
    }
}

type AuthStep = 'initial' | 'phone-input' | 'otp-input';

export const LoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const from = (location.state as any)?.from?.pathname || '/hub';

    const [step, setStep] = useState<AuthStep>('initial');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [isPhoneLoading, setIsPhoneLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const recaptchaContainerRef = useRef<HTMLDivElement>(null);

    // ─── Google Sign-In ───
    const handleGoogleSignIn = useCallback(async () => {
        setError(null);
        setIsGoogleLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            // onAuthStateChanged in authStore handles the rest
            navigate(from, { replace: true });
        } catch (err: any) {
            if (err.code === 'auth/popup-closed-by-user') {
                // User closed popup — not an error
            } else {
                setError(err.message || 'Google sign-in failed');
            }
        } finally {
            setIsGoogleLoading(false);
        }
    }, [navigate, from]);

    // ─── Phone: Send OTP ───
    const handleSendOtp = useCallback(async () => {
        const cleaned = phone.trim();
        if (cleaned.length < 10) {
            setError('Please enter a valid phone number with country code (e.g. +91XXXXXXXXXX)');
            return;
        }
        setError(null);
        setIsPhoneLoading(true);

        try {
            // Set up invisible reCAPTCHA
            if (!window.recaptchaVerifier) {
                window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current!, {
                    size: 'invisible',
                });
            }

            const result = await signInWithPhoneNumber(auth, cleaned, window.recaptchaVerifier);
            setConfirmationResult(result);
            setStep('otp-input');
        } catch (err: any) {
            console.error('[Auth] Phone OTP error:', err);
            setError(err.message || 'Failed to send OTP');
            // Reset reCAPTCHA on error
            window.recaptchaVerifier = undefined;
        } finally {
            setIsPhoneLoading(false);
        }
    }, [phone]);

    // ─── Phone: Verify OTP ───
    const handleVerifyOtp = useCallback(async () => {
        if (!confirmationResult || otp.length < 6) {
            setError('Please enter the 6-digit OTP');
            return;
        }
        setError(null);
        setIsPhoneLoading(true);

        try {
            await confirmationResult.confirm(otp);
            // onAuthStateChanged in authStore handles the rest
            navigate(from, { replace: true });
        } catch (err: any) {
            setError(err.message || 'Invalid OTP. Please try again.');
        } finally {
            setIsPhoneLoading(false);
        }
    }, [confirmationResult, otp, navigate, from]);

    return (
        <div className="text-center space-y-8 animate-fade-in">
            {/* Logo */}
            <div className="space-y-3">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/15 flex items-center justify-center">
                    <span className="text-primary text-2xl font-bold">C</span>
                </div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                    Welcome to CricScore
                </h1>
                <p className="text-muted-foreground text-sm">
                    Score matches, track stats, compete with friends
                </p>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive font-medium">
                    {error}
                </div>
            )}

            {/* Sign in card */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">

                {step === 'initial' && (
                    <>
                        <h2 className="text-sm font-semibold text-foreground">Sign in to continue</h2>

                        {/* Google */}
                        <button
                            onClick={handleGoogleSignIn}
                            disabled={isGoogleLoading}
                            className="w-full flex items-center justify-center gap-3 bg-foreground text-background font-medium px-4 py-3 rounded-xl hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-60"
                        >
                            {isGoogleLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                            )}
                            {isGoogleLoading ? 'Signing in...' : 'Sign in with Google'}
                        </button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="bg-card px-3 text-muted-foreground">or</span>
                            </div>
                        </div>

                        {/* Phone → go to phone step */}
                        <button
                            onClick={() => { setStep('phone-input'); setError(null); }}
                            className="w-full bg-primary text-primary-foreground font-medium px-4 py-3 rounded-xl hover:bg-primary/90 transition-colors active:scale-[0.98]"
                        >
                            Continue with Phone
                        </button>
                    </>
                )}

                {step === 'phone-input' && (
                    <>
                        <div className="flex items-center gap-2 mb-2">
                            <button onClick={() => { setStep('initial'); setError(null); }} className="p-1.5 rounded-lg hover:bg-secondary">
                                <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                            </button>
                            <h2 className="text-sm font-semibold text-foreground">Enter Phone Number</h2>
                        </div>

                        <input
                            type="tel"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            placeholder="+91 XXXXX XXXXX"
                            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        />
                        <p className="text-[11px] text-muted-foreground text-left">
                            Include country code (e.g. +91 for India)
                        </p>

                        <button
                            onClick={handleSendOtp}
                            disabled={isPhoneLoading || phone.trim().length < 10}
                            className="w-full bg-primary text-primary-foreground font-medium px-4 py-3 rounded-xl hover:bg-primary/90 transition-colors active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {isPhoneLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isPhoneLoading ? 'Sending OTP...' : 'Send OTP'}
                        </button>
                    </>
                )}

                {step === 'otp-input' && (
                    <>
                        <div className="flex items-center gap-2 mb-2">
                            <button onClick={() => { setStep('phone-input'); setError(null); }} className="p-1.5 rounded-lg hover:bg-secondary">
                                <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                            </button>
                            <h2 className="text-sm font-semibold text-foreground">Enter OTP</h2>
                        </div>

                        <p className="text-xs text-muted-foreground text-left">
                            We sent a 6-digit code to <strong className="text-foreground">{phone}</strong>
                        </p>

                        <input
                            type="text"
                            value={otp}
                            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="Enter 6-digit OTP"
                            maxLength={6}
                            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground text-center tracking-[0.5em] font-mono font-semibold placeholder:tracking-normal placeholder:font-normal placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        />

                        <button
                            onClick={handleVerifyOtp}
                            disabled={isPhoneLoading || otp.length < 6}
                            className="w-full bg-primary text-primary-foreground font-medium px-4 py-3 rounded-xl hover:bg-primary/90 transition-colors active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {isPhoneLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isPhoneLoading ? 'Verifying...' : 'Verify & Sign In'}
                        </button>

                        <button
                            onClick={handleSendOtp}
                            disabled={isPhoneLoading}
                            className="text-xs text-primary font-medium hover:underline"
                        >
                            Resend OTP
                        </button>
                    </>
                )}
            </div>

            {/* reCAPTCHA container (invisible) */}
            <div ref={recaptchaContainerRef} id="recaptcha-container" />

            <p className="text-xs text-muted-foreground">
                By continuing, you agree to CricScore's Terms of Service
            </p>
        </div>
    );
};
