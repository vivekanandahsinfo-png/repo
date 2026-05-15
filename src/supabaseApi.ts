import { supabase } from './supabaseClient';

/**
 * ==========================================
 * QUESTION PAPERS API
 * ==========================================
 */

export const getQuestionPapers = async () => {
  if (!supabase) throw new Error("Supabase client not initialized");
  const { data, error } = await supabase
    .from('question_papers')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data;
};

export const createQuestionPaper = async (paperData: {
  user_id: string;
  class_name: string;
  subject: string;
  easy_percent: number;
  medium_percent: number;
  hard_percent: number;
  content: string;
  syllabus_file_path?: string | null;
}) => {
  if (!supabase) throw new Error("Supabase client not initialized");
  const { data, error } = await supabase
    .from('question_papers')
    .insert([paperData])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateQuestionPaper = async (id: string, updates: Partial<{ content: string }>) => {
  if (!supabase) throw new Error("Supabase client not initialized");
  const { data, error } = await supabase
    .from('question_papers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteQuestionPaper = async (id: string) => {
  if (!supabase) throw new Error("Supabase client not initialized");
  const { error } = await supabase
    .from('question_papers')
    .delete()
    .eq('id', id);

  if (error) throw error;
};


/**
 * ==========================================
 * EVALUATIONS API
 * ==========================================
 */

export const getEvaluations = async () => {
  if (!supabase) throw new Error("Supabase client not initialized");
  const { data, error } = await supabase
    .from('evaluations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const createEvaluation = async (evaluationData: {
  user_id: string;
  report: string;
  question_paper_path?: string | null;
  answer_script_path?: string | null;
}) => {
  if (!supabase) throw new Error("Supabase client not initialized");
  const { data, error } = await supabase
    .from('evaluations')
    .insert([evaluationData])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteEvaluation = async (id: string) => {
  if (!supabase) throw new Error("Supabase client not initialized");
  const { error } = await supabase
    .from('evaluations')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
