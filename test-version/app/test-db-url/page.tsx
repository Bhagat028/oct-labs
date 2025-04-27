"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchDatabaseUrl } from '@/lib/db-utils'

export default function TestDbUrlPage() {
  const [dbUrl, setDbUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const getDbUrl = async () => {
      try {
        const url = await fetchDatabaseUrl()
        setDbUrl(url)
      } catch (error) {
        setError("Error retrieving database URL")
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    
    getDbUrl()
  }, [])

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Database URL</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center p-4">Loading database URL...</div>
          ) : error ? (
            <div className="p-3 border rounded-md bg-destructive/10 mb-4 text-destructive">
              {error}
            </div>
          ) : dbUrl ? (
            <div className="p-3 border rounded-md bg-muted mb-4 break-all">
              <p className="font-mono text-sm">{dbUrl}</p>
            </div>
          ) : (
            <div className="p-3 border rounded-md bg-muted mb-4">
              No database URL found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
