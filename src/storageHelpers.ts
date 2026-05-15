import { supabase } from './supabaseClient';

export const uploadToAppFiles = async (file: File, featureName: string) => {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const ext = file.name.split('.').pop();
  const uuid = crypto.randomUUID();
  const filePath = `${session.user.id}/${featureName}/${uuid}.${ext}`;

  const { data, error } = await supabase.storage.from('app-files').upload(filePath, file);
  if (error) {
    console.error('Upload Error:', error);
    return null;
  }
  return data.path;
};

export const getSignedFileUrl = async (path: string) => {
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from('app-files').createSignedUrl(path, 3600);
  if (error) {
    console.error('Signed URL Error:', error);
    return null;
  }
  return data.signedUrl;
};

export const deleteFileFromStorage = async (path: string) => {
  if (!supabase) return false;
  const { error } = await supabase.storage.from('app-files').remove([path]);
  if (error) {
    console.error('Delete Storage Error:', error);
    return false;
  }
  return true;
};
