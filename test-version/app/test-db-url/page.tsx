"use client"

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestDbUrlPage() {
  const [dbUrl, setDbUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
    }
    
    checkAuth()
  }, [supabase])

  const fetchDatabaseUrl = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError("You must be logged in to access the database URL")
        return
      }
      
      const response = await fetch('/api/test-db-url', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        setDbUrl(data.url || "No database URL found in session")
      } else {
        setError(data.error || "Failed to retrieve database URL")
      }
    } catch (error) {
      setError("An error occurred while fetching the database URL")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Database URL Test</CardTitle>
          <CardDescription>
            Test retrieval of your stored database URL from the server session
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isAuthenticated ? (
            <>
              {dbUrl && (
                <div className="p-3 border rounded-md bg-muted mb-4 break-all">
                  <p className="font-mono text-sm">{dbUrl}</p>
                </div>
              )}
              
              {error && (
                <div className="p-3 border rounded-md bg-destructive/10 mb-4 text-destructive">
                  {error}
                </div>
              )}
            </>
          ) : (
            <div className="text-center p-4">
              Please log in to test database URL retrieval
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
          {isAuthenticated && (
            <Button 
              onClick={fetchDatabaseUrl} 
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Test Database URL Retrieval"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
