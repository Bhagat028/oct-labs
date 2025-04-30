"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchDatabaseUrl } from '@/lib/db-utils'

export default function TestDbUrlPage() {
  const [dbUrl, setDbUrl] = useState<string | null>(null)
  const [schema, setSchema] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const getData = async () => {
      try {
        const url = await fetchDatabaseUrl()
        setDbUrl(url)

        const schemaRes = await fetch('/api/get-context')
        const schemaJson = await schemaRes.json()

        if (schemaRes.ok) {
          setSchema(schemaJson.schema)
        } else {
          throw new Error(schemaJson.error || "Failed to load schema")
        }
      } catch (err) {
        console.error(err)
        setError("Error retrieving database URL or schema")
      } finally {
        setIsLoading(false)
      }
    }

    getData()
  }, [])

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-md mx-auto mb-6">
        <CardHeader>
          <CardTitle>Database URL</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center p-4">Loading...</div>
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

      {schema && (
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>Database Schema</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-[400px]">
              {JSON.stringify(schema, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
