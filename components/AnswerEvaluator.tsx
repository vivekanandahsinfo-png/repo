'use client';

import React, { useState, useEffect } from 'react';
import { Upload, FileCheck, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { fileToBase64 } from '@/lib/fileUtils';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/lib/supabase';
import { uploadToAppFiles, getSignedFileUrl, deleteFileFromStorage } from '@/src/storageHelpers';

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

export default function AnswerEvaluator() {
  const [qpFile, setQpFile] = useState<File | null>(null);
  const [qpFilePath, setQpFilePath] = useState<string | null>(null);
  const [qpFileUrl, setQpFileUrl] = useState<string | null>(null);
  const [isUploadingQp, setIsUploadingQp] = useState(false);

  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [answerFilePath, setAnswerFilePath] = useState<string | null>(null);
  const [answerFileUrl, setAnswerFileUrl] = useState<string | null>(null);
  const [isUploadingAnswer, setIsUploadingAnswer] = useState(false);

  const [evalId, setEvalId] = useState<string | null>(null);

  const [evaluating, setEvaluating] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [previousEvaluations, setPreviousEvaluations] = useState<any[]>([]);
  const [isLoadingEvaluations, setIsLoadingEvaluations] = useState(false);

  useEffect(() => {
    const fetchEvaluations = async () => {
      if (!supabase) return;
      try {
        setIsLoadingEvaluations(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data, error } = await supabase
            .from('evaluations')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          if (data) setPreviousEvaluations(data);
        }
      } catch (err) {
        console.error('Error fetching evaluations:', err);
      } finally {
        setIsLoadingEvaluations(false);
      }
    };
    
    fetchEvaluations();
  }, []);

  const handleSelectPreviousEvaluation = (evaluation: any) => {
    setReport(evaluation.report);
    setEvalId(evaluation.id);
    // You could also populate qpFilePath and answerFilePath if those exist
  };

  const handleQpFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setQpFile(selected);
      setIsUploadingQp(true);
      const path = await uploadToAppFiles(selected, 'question_paper');
      if (path) {
        setQpFilePath(path);
        const url = await getSignedFileUrl(path);
        if (url) setQpFileUrl(url);
      }
      setIsUploadingQp(false);
    }
  };

  const handleDeleteQpFile = async () => {
    if (qpFilePath) {
      await deleteFileFromStorage(qpFilePath);
      if (evalId && supabase) {
        await supabase.from('evaluations').update({ question_paper_path: null }).eq('id', evalId);
      }
    }
    setQpFile(null); setQpFilePath(null); setQpFileUrl(null);
  };

  const handleAnswerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setAnswerFile(selected);
      setIsUploadingAnswer(true);
      const path = await uploadToAppFiles(selected, 'answer_script');
      if (path) {
        setAnswerFilePath(path);
        const url = await getSignedFileUrl(path);
        if (url) setAnswerFileUrl(url);
      }
      setIsUploadingAnswer(false);
    }
  };

  const handleDeleteAnswerFile = async () => {
    if (answerFilePath) {
      await deleteFileFromStorage(answerFilePath);
      if (evalId && supabase) {
        await supabase.from('evaluations').update({ answer_script_path: null }).eq('id', evalId);
      }
    }
    setAnswerFile(null); setAnswerFilePath(null); setAnswerFileUrl(null);
  };

  const handleEvaluate = async () => {
    if (!qpFile || !answerFile) {
      setError('Please upload both the Question Paper and the Answer Script.');
      return;
    }

    try {
      setEvaluating(true);
      setError(null);
      setReport(null);

      const qpBase64 = await fileToBase64(qpFile);
      const answerBase64 = await fileToBase64(answerFile);

      const prompt = `
You are an expert examiner. Your task is to accurately evaluate the student's answer script against the provided question paper.
I have attached two documents (they may be PDFs or Images):
1. The Question Paper (and optionally its key/syllabus if combined).
2. The Student's Answer Script.

Please analyze the Answer Script, grade the answers based on the questions, and generate a comprehensive evaluation report in Markdown format.

The report should clearly contain:
### 📊 Evaluation Summary
- **Total Marks Allotted:** (Calculate based on the paper limits vs achieved by student)
- **Percentage:** 
- **Grade/Remarks:**

### ✅ Strengths
- Explain where the student performed well, what concepts they clearly understood.

### 📈 Areas for Improvement
- Detail exactly which questions went wrong and why. Identify the conceptual gaps.

### 📝 Detailed Output
- Briefly list the questions and the given evaluation/marks per question.

Make sure the output is professional, constructive, and beautifully formatted in markdown.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: [
          prompt,
          {
            inlineData: {
              data: qpBase64,
              mimeType: qpFile.type,
            },
          },
          {
            inlineData: {
              data: answerBase64,
              mimeType: answerFile.type,
            },
          }
        ],
      });

      const generatedText = response.text || '';
      setReport(generatedText);

      if (supabase && generatedText) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: evalData, error: dbError } = await supabase.from('evaluations').insert({
            user_id: session.user.id,
            report: generatedText,
            question_paper_path: qpFilePath,
            answer_script_path: answerFilePath
          }).select().single();
          if (dbError) {
            console.error("Supabase Save Error:", dbError);
          } else if (evalData) {
            setEvalId(evalData.id);
            setPreviousEvaluations(prev => [evalData, ...prev]);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to evaluate answer script. Files might be too large or the network request failed.');
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Form Section */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-6">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">1. Evaluation Setup</h2>
          <p className="text-[11px] text-slate-500 font-medium">Upload the question paper and student answers to generate a detailed report.</p>
        </div>

        <div className="flex flex-col gap-5 mt-2">
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-semibold text-slate-500 uppercase">1. Upload Question Paper & Key (PDF or Image)</label>
            <div className="flex items-center justify-center w-full mt-1">
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-blue-200 rounded-xl cursor-pointer bg-blue-50/50 hover:bg-blue-50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-blue-600">
                  <Upload className="w-6 h-6 mb-2" />
                  <p className="mb-1 text-sm"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".pdf,image/*" 
                  onChange={handleQpFileChange}
                  disabled={isUploadingQp}
                />
              </label>
            </div>
            {qpFile && (
              <div className="flex items-center justify-between text-sm text-blue-700 bg-blue-50 p-3 rounded-xl border border-blue-200 mt-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  {isUploadingQp ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" /> : <FileCheck className="w-4 h-4 shrink-0" />}
                  {qpFileUrl ? (
                    <a href={qpFileUrl} target="_blank" rel="noreferrer" className="truncate hover:underline font-medium">
                      {qpFile.name}
                    </a>
                  ) : (
                    <span className="truncate">{qpFile.name}</span>
                  )}
                </div>
                <button type="button" onClick={handleDeleteQpFile} className="text-red-500 hover:text-red-700 shrink-0 ml-2" title="Remove File">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-semibold text-slate-500 uppercase">2. Upload Answer Script (PDF or Image)</label>
            <div className="flex items-center justify-center w-full mt-1">
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-blue-200 rounded-xl cursor-pointer bg-blue-50/50 hover:bg-blue-50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-blue-600">
                  <Upload className="w-6 h-6 mb-2" />
                  <p className="mb-1 text-sm"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".pdf,image/*" 
                  onChange={handleAnswerFileChange}
                  disabled={isUploadingAnswer}
                />
              </label>
            </div>
            {answerFile && (
              <div className="flex items-center justify-between text-sm text-green-700 bg-green-50 p-3 rounded-xl border border-green-200 mt-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  {isUploadingAnswer ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" /> : <FileCheck className="w-4 h-4 shrink-0" />}
                  {answerFileUrl ? (
                    <a href={answerFileUrl} target="_blank" rel="noreferrer" className="truncate hover:underline font-medium">
                      {answerFile.name}
                    </a>
                  ) : (
                    <span className="truncate">{answerFile.name}</span>
                  )}
                </div>
                <button type="button" onClick={handleDeleteAnswerFile} className="text-red-500 hover:text-red-700 shrink-0 ml-2" title="Remove File">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 p-3 rounded-lg border border-red-200 mb-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleEvaluate}
          disabled={evaluating}
          className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 mt-4 rounded-xl shadow-lg shadow-slate-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {evaluating ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileCheck className="w-5 h-5" />}
          {evaluating ? 'Evaluating Script...' : 'Evaluate & Generate Report'}
        </button>

        {/* Previous Evaluations List */}
        <div className="mt-8 border-t border-slate-100 pt-6">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Previous Evaluations</h3>
          {isLoadingEvaluations ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : previousEvaluations.length > 0 ? (
            <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-2">
              {previousEvaluations.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => handleSelectPreviousEvaluation(ev)}
                  className={`text-left p-4 rounded-xl border transition-colors ${
                    evalId === ev.id 
                    ? 'bg-blue-50 border-blue-200 shadow-sm' 
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                      {new Date(ev.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-700 line-clamp-2">
                    {ev.report ? ev.report.substring(0, 100).replace(/#/g, '') + '...' : 'No report content'}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
              No previous evaluations found.
            </p>
          )}
        </div>
      </div>

      {/* Output Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col min-h-[600px] relative">
        <div className="absolute top-4 right-6 px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full border border-blue-100">
          REPORT VIEW
        </div>
        <div className="flex items-center justify-between mb-6 shrink-0 mt-2">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Student Evaluation Report</h2>
            <p className="text-sm text-slate-500 mt-1">Review AI grading and feedback</p>
          </div>
        </div>
        
        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-6 overflow-y-auto max-h-[600px] shadow-inner">
          {evaluating ? (
            <div className="h-full flex items-center justify-center flex-col text-slate-400 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-slate-800" />
              <span className="text-sm font-bold text-slate-800 uppercase tracking-widest">Reviewing Answers...</span>
            </div>
          ) : report ? (
            <div className="max-w-2xl mx-auto prose prose-sm prose-slate prose-headings:font-bold prose-headings:text-slate-800 p-4 bg-white rounded shadow-sm border border-slate-200">
              <ReactMarkdown>{report}</ReactMarkdown>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">
              Evaluation report will appear here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
