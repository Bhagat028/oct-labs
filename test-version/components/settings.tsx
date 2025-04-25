"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Cable, Loader2 } from "lucide-react"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

function useDatabaseUrl() {
  const [savedUrl, setSavedUrl] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const supabase = createClientComponentClient<Database>()
  
  // Monitor authentication state
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user)
    })
    
    // Initial authentication check
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setIsAuthenticated(!!session?.user)
      } catch (error) {
        console.error("Auth check error:", error)
        setIsAuthenticated(false)
        
        // Try to recover from cookie parsing errors
        if (error instanceof Error && error.message.includes('cookie')) {
          try {
            await supabase.auth.signOut()
            console.log("Signed out to reset auth state due to cookie error")
          } catch (e) {
            console.error("Failed to sign out:", e)
          }
        }
      }
    }
    
    checkAuth()
    
    return () => {
      data.subscription.unsubscribe()
    }
  }, [supabase])
  
  // Fetch the database URL when auth state changes
  useEffect(() => {
    const fetchUrl = async () => {
      if (!isAuthenticated) {
        setSavedUrl("")
        setIsLoading(false)
        return
      }
      
      try {
        setIsLoading(true)
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setSavedUrl("")
          setIsLoading(false)
          return
        }
        
        const response = await fetch('/api/get-db-url', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setSavedUrl(data.url || "")
        } else {
          // Handle specific error responses
          if (response.status === 401) {
            console.error("Authentication error fetching URL")
            setIsAuthenticated(false)
          } else {
            console.error(`Error fetching URL: ${response.status}`)
          }
        }
      } catch (error) {
        console.error("Error loading database URL:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchUrl()
  }, [isAuthenticated, supabase])
  
  const saveUrl = useCallback(async (url: string): Promise<boolean> => {
    if (!isAuthenticated) return false
    setIsSaving(true)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return false
      
      const response = await fetch('/api/save-db-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ url: url.trim() })
      })
      
      if (response.ok) {
        setSavedUrl(url.trim())
        return true
      }
      
      if (response.status === 401) {
        setIsAuthenticated(false)
      }
      
      return false
    } catch (error) {
      console.error("Error saving URL:", error)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [isAuthenticated, supabase])
  
  const deleteUrl = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated) return false
    setIsSaving(true)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return false
      
      const response = await fetch('/api/save-db-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ url: '' }) // Empty URL to delete
      })
      
      if (response.ok) {
        setSavedUrl("")
        return true
      }
      
      if (response.status === 401) {
        setIsAuthenticated(false)
      }
      
      return false
    } catch (error) {
      console.error("Error deleting URL:", error)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [isAuthenticated, supabase])
  
  return { savedUrl, saveUrl, deleteUrl, isLoading, isAuthenticated, isSaving }
}

interface AlertState {
  show: boolean;
  message: string;
  type: "success" | "error";
}

function useAlert() {
  const [alert, setAlert] = useState<AlertState>({ 
    show: false, 
    message: "", 
    type: "success" 
  })

  const showAlert = useCallback((message: string, type: "success" | "error" = "success") => {
    setAlert({ show: true, message, type })
    const timer = setTimeout(() => {
      setAlert(prev => ({ ...prev, show: false }))
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  return { alert, showAlert }
}

const maskUrl = (url: string): string => {
  if (!url) return ""
  try {
    const urlObj = new URL(url)
    if (urlObj.password) {
      return url.replace(/:([^:@]+)@/, ":****@")
    }
    return url
  } catch {
    return url
  }
}

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export default function DatabaseUrlStorage() {
  const { savedUrl, saveUrl, deleteUrl, isLoading, isAuthenticated, isSaving } = useDatabaseUrl()
  const { alert, showAlert } = useAlert()
  const [databaseUrl, setDatabaseUrl] = useState<string>("")
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false)
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false)

  const handleSave = async () => {
    if (!isAuthenticated) {
      showAlert("You must be logged in to save a database URL", "error")
      return
    }
    
    if (!databaseUrl.trim()) {
      showAlert("Database URL is required", "error")
      return
    }

    if (!isValidUrl(databaseUrl)) {
      showAlert("Invalid URL format", "error")
      return
    }

    if (await saveUrl(databaseUrl)) {
      setDatabaseUrl("")
      setIsDialogOpen(false)
      showAlert("Database URL saved successfully!", "success")
    } else {
      showAlert("Failed to save URL", "error")
    }
  }

  const handleDelete = async () => {
    if (await deleteUrl()) {
      showAlert("Database URL deleted", "success")
      setConfirmDelete(false)
    } else {
      showAlert("Failed to delete URL", "error")
    }
  }

  return (
    <div>
      {alert.show && (
        <Alert
          variant={alert.type === "success" ? "default" : "destructive"}
          className="mb-4 fixed top-4 right-4 z-50 max-w-sm shadow-lg"
        >
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full">
            <Cable className="h-5 w-5" />
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-md max-w-[95vw] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Database URL</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Save your database connection string (securely stored in an encrypted session).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {isLoading ? (
              <div className="py-4 text-center text-sm text-muted-foreground flex items-center justify-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </div>
            ) : !isAuthenticated ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                Please log in to manage your database URL
              </div>
            ) : !savedUrl ? (
              <div className="space-y-2">
                <Label htmlFor="database-url" className="text-sm">
                  Connection URL
                </Label>
                <Input
                  id="database-url"
                  placeholder="postgres://username:password@host:port/db"
                  value={databaseUrl}
                  onChange={(e) => setDatabaseUrl(e.target.value)}
                  className="break-all text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  This is stored securely in an encrypted session.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Saved URL</Label>
                <div className="p-3 border rounded-md bg-muted/50 overflow-x-auto text-sm font-mono break-all">
                  {maskUrl(savedUrl)}
                </div>

                <div className="flex justify-end gap-2 mt-2">
                  {confirmDelete ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmDelete(false)}
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          "Confirm Delete"
                        )}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setConfirmDelete(true)}
                      disabled={isSaving}
                    >
                      Delete URL
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Close
            </Button>
            {isAuthenticated && !savedUrl && !isLoading && (
              <Button 
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save URL"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Add this type for TypeScript - replace with your actual Supabase database types
type Database = any;
