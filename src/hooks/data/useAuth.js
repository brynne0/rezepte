import { useState, useEffect } from "react";
import supabase from "../../lib/supabase";

export const useAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [isMe, setIsMe] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
      setUser(session?.user || null);
      setIsGuest(session?.user?.user_metadata?.is_guest === true);
      setIsMe(session?.user?.user_metadata?.is_me === true);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      setUser(session?.user || null);
      setIsGuest(session?.user?.user_metadata?.is_guest === true);
      setIsMe(session?.user?.user_metadata?.is_me === true);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { isGuest, isLoggedIn, isMe, user, loading };
};
