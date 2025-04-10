"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from '@/utils/supabase/Client';

export default function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>, action: 'login' | 'signup') => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    
    const supabase = createClient();
    
    try {
      let result;
      
      if (action === 'login') {
        result = await supabase.auth.signInWithPassword({
          email,
          password,
        });
      } else {
        result = await supabase.auth.signUp({
          email,
          password,
        });
      }
      
      if (result.error) {
        setError(result.error.message);
      } else {
        router.push('/chat');
        router.refresh();
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-1 flex-col justify-center px-4 py-10 lg:px-6">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h3 className="text-center text-lg font-semibold text-foreground dark:text-foreground">
            Welcome Back
          </h3>
          <p className="text-center text-sm text-muted-foreground dark:text-muted-foreground">
            Enter your credentials to access your account.
          </p>
          {error && (
            <div className="mt-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          <form className="mt-6 space-y-4" onSubmit={(e) => handleSubmit(e, 'login')}>
            <div>
              <Label
                htmlFor="email"
                className="text-sm font-medium text-foreground dark:text-foreground"
              >
                Email
              </Label>
              <Input
                type="email"
                id="email"
                name="email"
                autoComplete="email"
                placeholder="Enter your email"
                className="mt-2"
                required
              />
            </div>
            <div>
              <Label
                htmlFor="password"
                className="text-sm font-medium text-foreground dark:text-foreground"
              >
                Password
              </Label>
              <Input
                type="password"
                id="password"
                name="password"
                autoComplete="current-password"
                placeholder="**************"
                className="mt-2"
                required
              />
            </div>
            <div className="flex gap-2">
              <Button 
                type="submit"
                className="mt-4 flex-1 py-2 font-medium"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
              <Button 
                type="button"
                onClick={(e) => handleSubmit(e as any, 'signup')}
                className="mt-4 flex-1 py-2 font-medium"
                variant="outline"
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Sign up'}
              </Button>
            </div>
          </form>
          <p className="mt-6 text-sm text-muted-foreground dark:text-muted-foreground">
            Forgot your password?{" "}
            <a
              href="#"
              className="font-medium text-primary hover:text-primary/90 dark:text-primary dark:hover:text-primary/90"
            >
              Reset password
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}