'use client';

import React, { useState } from 'react';
import { supabase } from '@/src/supabaseClient';
import { Loader2, MailCheck, LogIn, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Auth() {
  const [isSignIn, setIsSignIn] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    if (!supabase) {
      setError("Supabase client is not configured correctly. Please check your connection URL and API key.");
      setLoading(false);
      return;
    }

    try {
      if (isSignIn) {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        
        if (data.session) {
          router.push('/');
        }
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        
        if (!data.session) {
          setIsSignIn(true);
          setPassword('');
          setMessage("Check your email and confirm your account before logging in.");
        } else {
          router.push('/');
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto mt-16 mt-8">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 mb-2">
            {isSignIn ? 'Welcome back' : 'Create an account'}
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            {isSignIn 
              ? 'Enter your details to access your dashboard' 
              : 'Sign up to start building your assessments'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg py-2 px-3 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg py-2 px-3 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-start gap-2">
              <span className="font-semibold block">{error}</span>
            </div>
          )}

          {message && (
            <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg border border-green-100 flex items-start gap-2">
              <MailCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-semibold block">{message}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 mt-2 rounded-xl shadow-lg shadow-blue-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isSignIn ? (
              <LogIn className="w-4 h-4" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            {loading 
              ? (isSignIn ? 'Signing In...' : 'Signing Up...') 
              : (isSignIn ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignIn(!isSignIn);
              setError(null);
              setMessage(null);
            }}
            className="text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors"
          >
            {isSignIn 
              ? "Don't have an account? Sign up" 
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
