'use client'

import { login, signup } from './actions'
import LoginForm from '@/components/login-form'

export default function LoginPage() {
  return (
    <LoginForm action={login} />
  )
}