-- Supabase Schema for EduSet AI

-- 1. Create table for Question Papers
CREATE TABLE IF NOT EXISTS question_papers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    class_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    easy_percent INTEGER,
    medium_percent INTEGER,
    hard_percent INTEGER,
    content TEXT NOT NULL,
    syllabus_file_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE question_papers ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for question_papers
CREATE POLICY "Users can insert their own question papers" ON question_papers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own question papers" ON question_papers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own question papers" ON question_papers
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own question papers" ON question_papers
    FOR DELETE USING (auth.uid() = user_id);


-- 2. Create table for Evaluations
CREATE TABLE IF NOT EXISTS evaluations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    report TEXT NOT NULL,
    question_paper_path TEXT,
    answer_script_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for evaluations
CREATE POLICY "Users can insert their own evaluations" ON evaluations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own evaluations" ON evaluations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own evaluations" ON evaluations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own evaluations" ON evaluations
    FOR DELETE USING (auth.uid() = user_id);
