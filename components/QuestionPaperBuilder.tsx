'use client';

import React, { useState } from 'react';
import { Upload, FileText, Loader2, Download, AlertCircle, Trash2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { fileToBase64 } from '@/lib/fileUtils';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '@/lib/supabase';
import { uploadToAppFiles, getSignedFileUrl, deleteFileFromStorage } from '@/src/storageHelpers';

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

export default function QuestionPaperBuilder() {
  const [targetClass, setTargetClass] = useState('10th');
  const [subject, setSubject] = useState('Science');
  const [easyPercent, setEasyPercent] = useState(30);
  const [mediumPercent, setMediumPercent] = useState(50);
  const [hardPercent, setHardPercent] = useState(20);
  
  const [file, setFile] = useState<File | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [paperId, setPaperId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [generatedPaper, setGeneratedPaper] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setIsUploading(true);
      const path = await uploadToAppFiles(selected, 'syllabus');
      if (path) {
        setFilePath(path);
        const url = await getSignedFileUrl(path);
        if (url) setFileUrl(url);
      }
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async () => {
    if (filePath) {
      await deleteFileFromStorage(filePath);
      if (paperId && supabase) {
        await supabase.from('question_papers').update({ syllabus_file_path: null }).eq('id', paperId);
      }
    }
    setFile(null);
    setFilePath(null);
    setFileUrl(null);
  };

  const handleGenerate = async () => {
    if (!file) {
      setError('Please upload a syllabus PDF or Image.');
      return;
    }
    
    if (easyPercent + mediumPercent + hardPercent !== 100) {
      setError('Difficulty percentages must sum to 100%.');
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      setGeneratedPaper(null);

      const base64Data = await fileToBase64(file);
      const mimeType = file.type;

      const prompt = `
You are an expert educator and examination paper setter.
Create a detailed question paper for class: ${targetClass}, subject: ${subject}.
I have attached the syllabus document. Only include topics present in the syllabus.

Difficulty distribution required:
- Easy: ${easyPercent}%
- Medium: ${mediumPercent}%
- Hard: ${hardPercent}%

Generate a structured question paper consisting of:
1. Multiple Choice Questions (MCQs)
2. Fill in the Blanks
3. Short Answer Questions
4. Long Answer Questions

Questions should test:
- Knowledge Check (recall facts)
- Understanding (comprehension)
- Application (problem-solving)

Please provide the output in clean, structured Markdown format so it can be easily read and rendered. Do not include answers, only the question paper.
Provide sensible marks allocation for each question and section. At the top of the paper, show the Class, Subject, Total Marks, and Time Allowed.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: [
          prompt,
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
        ],
      });

      const generatedText = response.text || '';
      setGeneratedPaper(generatedText);
      
      // Save to Supabase (if configured)
      if (supabase && generatedText) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: paperData, error: dbError } = await supabase.from('question_papers').insert({
            user_id: session.user.id,
            class_name: targetClass,
            subject: subject,
            easy_percent: easyPercent,
            medium_percent: mediumPercent,
            hard_percent: hardPercent,
            content: generatedText,
            syllabus_file_path: filePath
          }).select().single();
          if (dbError) {
            console.error("Supabase Save Error:", dbError);
          } else if (paperData) {
            setPaperId(paperData.id);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate question paper. Make sure your Syllabus file is not too large and is a valid PDF or Image.');
    } finally {
      setGenerating(false);
    }
  };

  const downloadPDF = () => {
    const paperElement = document.getElementById('generated-paper-content');
    if (!paperElement) return;

    html2canvas(paperElement, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${subject}_Class${targetClass}_QuestionPaper.pdf`);
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Form Section */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-6">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">1. Configuration</h2>
          <p className="text-[11px] text-slate-500 font-medium">Set up the parameters for your question paper.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-500 uppercase">Class</label>
            <select 
              value={targetClass} 
              onChange={e => setTargetClass(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full py-2 px-3"
            >
              {Array.from({length: 10}, (_, i) => `${i + 1}${i===0?'st':i===1?'nd':i===2?'rd':'th'}`).map(c => (
                <option key={c} value={c}>{c} Class</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-500 uppercase">Subject</label>
            <select 
              value={subject} 
              onChange={e => setSubject(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full py-2 px-3"
            >
              {['English', 'Maths', 'Science', 'Social', 'Physics', 'Biology', 'Chemistry', 'Computer Science'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-xs font-bold uppercase tracking-widest text-slate-400">2. Cognitive Difficulty</label>
          <div className="grid grid-cols-3 gap-4 mt-2">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Easy</span>
              <input type="number" value={easyPercent} onChange={e => setEasyPercent(Number(e.target.value))} className="bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold text-blue-600 rounded-lg py-2 px-3 text-center focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Medium</span>
              <input type="number" value={mediumPercent} onChange={e => setMediumPercent(Number(e.target.value))} className="bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold text-blue-600 rounded-lg py-2 px-3 text-center focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Hard</span>
              <input type="number" value={hardPercent} onChange={e => setHardPercent(Number(e.target.value))} className="bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold text-red-500 rounded-lg py-2 px-3 text-center focus:ring-red-500 focus:border-red-500" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase tracking-widest text-slate-400">3. Upload Syllabus (PDF or Image)</label>
          <div className="flex items-center justify-center w-full mt-2">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-blue-200 rounded-xl cursor-pointer bg-blue-50/50 hover:bg-blue-50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-blue-600">
                <Upload className="w-8 h-8 mb-3" />
                <p className="mb-2 text-sm"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                <p className="text-xs">PDF, PNG, JPG</p>
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept=".pdf,image/*" 
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </label>
          </div>
          {file && (
            <div className="flex items-center justify-between text-sm text-green-700 bg-green-50 p-3 rounded-xl border border-green-200 mt-2">
              <div className="flex items-center gap-2 overflow-hidden">
                {isUploading ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" /> : <FileText className="w-4 h-4 shrink-0" />}
                {fileUrl ? (
                  <a href={fileUrl} target="_blank" rel="noreferrer" className="truncate hover:underline font-medium">
                    {file.name}
                  </a>
                ) : (
                  <span className="truncate">{file.name}</span>
                )}
              </div>
              <button type="button" onClick={handleDeleteFile} className="text-red-500 hover:text-red-700 shrink-0 ml-2" title="Remove File">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 p-3 rounded-lg border border-red-200 mb-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 mt-4 rounded-xl shadow-lg shadow-blue-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
          {generating ? 'Generating Paper...' : 'Generate Paper'}
        </button>
      </div>

      {/* Output Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col min-h-[600px] relative">
        <div className="absolute top-4 right-6 px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full border border-blue-100">
          PREVIEW MODE
        </div>
        <div className="flex items-center justify-between mb-6 shrink-0 mt-2">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Draft - Summative Assessment</h2>
            <p className="text-sm text-slate-500 mt-1">Class: {targetClass} | Subject: {subject}</p>
          </div>
          {generatedPaper && (
            <button
              onClick={downloadPDF}
              className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg bg-white hover:bg-slate-50 shadow-sm flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          )}
        </div>
        
        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-6 overflow-y-auto max-h-[600px] shadow-inner">
          {generating ? (
            <div className="h-full flex items-center justify-center flex-col text-slate-400 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="text-sm font-bold text-blue-600 uppercase tracking-widest">Generating Assessment...</span>
            </div>
          ) : generatedPaper ? (
            <div id="generated-paper-content" className="max-w-2xl mx-auto prose prose-sm prose-slate prose-headings:font-bold prose-headings:text-slate-800 p-4 bg-white rounded shadow-sm border border-slate-200">
              <ReactMarkdown>{generatedPaper}</ReactMarkdown>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">
              Generated question paper will appear here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
