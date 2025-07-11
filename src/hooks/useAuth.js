import { useState, useEffect } from "react";
import supabase from "../utils/supabaseClient";

export const useAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMe, setIsMe] = useState(false);
  const [user, setUser] = useState(null);

  // Check if user is logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
      setUser(session?.user || null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check if I am logged in
  useEffect(() => {
    const checkMe = async () => {
      if (isLoggedIn) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setIsMe(user?.user_metadata?.is_me || false);
      } else {
        setIsMe(false);
      }
    };

    checkMe();
  }, [isLoggedIn]);

  return { isLoggedIn, isMe, user };
};
