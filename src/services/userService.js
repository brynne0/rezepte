import supabase from "../lib/supabase";

// Get user's preferred language from database
export const getUserPreferredLanguage = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'en';
    
    const { data: userData } = await supabase
      .from('users')
      .select('preferred_language')
      .eq('id', user.id)
      .single();
      
    return userData?.preferred_language || 'en';
  } catch (error) {
    console.error('Error fetching user preferred language:', error);
    return 'en'; // Default fallback
  }
};

// Update user's preferred language
export const updateUserPreferredLanguage = async (language) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { error } = await supabase
      .from('users')
      .update({ preferred_language: language })
      .eq('id', user.id);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating user preferred language:', error);
    throw error;
  }
};

// Get user profile data
export const getUserProfile = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
      
    if (error) throw error;
    return profile;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};