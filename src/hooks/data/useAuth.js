import { useState, useEffect } from "react";
import supabase from "../../lib/supabase";

export const useAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [isMe, setIsMe] = useState(false);
  const [user, setUser] = useState(null);

  // Check if user is logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
      setUser(session?.user || null);
      setIsGuest(session?.user?.user_metadata?.is_guest === true);
      setIsMe(session?.user?.user_metadata?.is_me === true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
      setUser(session?.user || null);
      setIsGuest(session?.user?.user_metadata?.is_guest === true);
      setIsMe(session?.user?.user_metadata?.is_me === true);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { isGuest, isLoggedIn, isMe, user };
};