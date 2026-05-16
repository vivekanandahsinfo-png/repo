'use client';

import React, { useEffect } from 'react';
import Auth from '@/components/Auth';
import { supabase } from '@/src/supabaseClient';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [checking, setChecking] = React.useState(!!supabase);

  useEffect(() => {
    if (!supabase) {
      return;
    }
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/');
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-display text-slate-900 mb-2">
          <span className="text-blue-600">VIV</span>
          <span className="text-red-500">Set</span> AI
        </h1>
        <p className="text-slate-500 text-sm">
          Intelligent Document Generation & Evaluation
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Auth />
      </div>
    </div>
  );
}
