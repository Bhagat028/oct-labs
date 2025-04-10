"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/Client'

function generateAvatar(name: string | null, email: string | null): string {
  const input = email?.trim() || name?.trim() || "";
  return input.length >= 2 ? input.substring(0, 2).toUpperCase() : "NA";
}

const mythologicalNames = [
  "Zeus", "Hera", "Poseidon", "Athena", "Apollo", "Artemis", "Ares", "Aphrodite", "Hermes", "Dionysus"
];

function getRandomMythologicalName(): string {
  return mythologicalNames[Math.floor(Math.random() * mythologicalNames.length)];
}

// Client-side version of getUserDetails
export function useUserDetails() {
  const [userDetails, setUserDetails] = useState<{
    name: string | null;
    email: string;
    avatar: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchUserDetails() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getUser();
        
        if (error || !data?.user) {
          setUserDetails(null);
          setLoading(false);
          return;
        }
        
        // Check localStorage for an existing name
        let name = localStorage.getItem('userName');
        if (!name) {
          name = data.user.user_metadata?.name || getRandomMythologicalName();
          // Store the name in localStorage if it's not already there
          localStorage.setItem('userName', name || getRandomMythologicalName());
        }
        
        const email = data.user.email || "";
        const avatar = generateAvatar(name, email);
        
        setUserDetails({
          name,
          email,
          avatar
        });
      } catch (error) {
        console.error("Error fetching user details:", error);
        setUserDetails(null);
      } finally {
        setLoading(false);
      }
    }

    fetchUserDetails();
  }, [router]);

  return { userDetails, loading };
}

export default function Avatar() {
  const { userDetails, loading } = useUserDetails();
  const router = useRouter();
  
  useEffect(() => {
    if (!loading && !userDetails) {
      router.push('/login');
    }
  }, [loading, userDetails, router]);
  
  if (loading || !userDetails) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted animate-pulse"></div>
        <div className="space-y-2">
          <div className="h-4 w-20 bg-muted animate-pulse rounded"></div>
          <div className="h-3 w-24 bg-muted animate-pulse rounded"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
        {userDetails.avatar}
      </div>
      <div>
        {userDetails.name && <p className="text-sm font-medium">{userDetails.name}</p>}
        <p className="text-xs text-muted-foreground">{userDetails.email}</p>
      </div>
    </div>
  );
}
