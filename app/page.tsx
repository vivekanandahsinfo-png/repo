'use client';

import React, { useState, useEffect } from 'react';
import QuestionPaperBuilder from '@/components/QuestionPaperBuilder';
import AnswerEvaluator from '@/components/AnswerEvaluator';
import { BookOpen, PenTool, LogOut, Loader2 } from 'lucide-react';
import { supabase } from '@/src/supabaseClient';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'build' | 'evaluate'>('build');
  const [session, setSession] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(!!supabase);
  const router = useRouter();

  useEffect(() => {
    if (!supabase) {
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthChecking(false);
      if (!session) {
        router.push('/login');
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        router.push('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  if (isAuthChecking || !session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <header className="py-8 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-200 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight font-display text-slate-900">
            <span className="text-blue-600">Edu</span>
            <span className="text-red-500">Set</span> AI
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Intelligent Document Generation & Evaluation
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm font-semibold text-slate-600">
          <span>{session.user?.email}</span>
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </header>

      <div className="flex justify-center mb-8">
        <div className="inline-flex bg-slate-100 rounded-full p-1">
          <button
            onClick={() => setActiveTab('build')}
            className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm transition-all ${
              activeTab === 'build'
                ? 'bg-white text-blue-700 shadow-sm font-semibold'
                : 'text-slate-500 hover:text-slate-700 font-medium'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Paper Builder
          </button>
          <button
            onClick={() => setActiveTab('evaluate')}
            className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm transition-all ${
              activeTab === 'evaluate'
                ? 'bg-white text-blue-700 shadow-sm font-semibold'
                : 'text-slate-500 hover:text-slate-700 font-medium'
            }`}
          >
            <PenTool className="w-4 h-4" />
            Script Evaluator
          </button>
        </div>
      </div>

      <main className="flex-1 pb-16">
        {activeTab === 'build' ? <QuestionPaperBuilder /> : <AnswerEvaluator />}
      </main>
    </div>
  );
}
