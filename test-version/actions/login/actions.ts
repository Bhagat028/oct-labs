'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supabase/Client'

export async function login(formData: FormData) {
  // We need to use a client-side version since the server-side version uses next/headers
  const supabase = createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect('/error')
  }

  revalidatePath('/chat', 'layout')
  redirect('/chat')
}

export async function signup(formData: FormData) {
  // We need to use a client-side version since the server-side version uses next/headers
  const supabase = createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    redirect('/error')
  }

  revalidatePath('/chat', 'layout')
  redirect('/chat')
}