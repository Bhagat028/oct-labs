"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Cable, Loader2 } from "lucide-react"
import { createBrowserClient } from '@supabase/ssr'
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
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
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
    if (!isAuthenticated) return false;
    setIsSaving(true);
  
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;
  
      // 1. Save DB URL to iron-session
      const response = await fetch('/api/save-db-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ url: url.trim() })
      });
  
      if (!response.ok) {
        if (response.status === 401) setIsAuthenticated(false);
        return false;
      }
  
      setSavedUrl(url.trim());
  
      // 2. Fetch schema from external API
      const schemaResponse = await fetch("https://dashchat-datamanger-q5up.vercel.app/api/database", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url.trim(),
          id: session.user.id,  // use actual Supabase user ID
        }),
      });
  
      if (!schemaResponse.ok) {
        console.error("Failed to fetch schema from dashchat-datamanger");
        return true; // still consider URL saved even if schema fetch failed
      }
  
      const schema = await schemaResponse.json();
  
      // 3. Cache schema in Edge Config
      await fetch("/api/cache-schema", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          
        },
        body: JSON.stringify({
          userId: session.user.id,
          schema,
        }),
      });
  
      return true;
    } catch (error) {
      console.error("Error saving URL and schema:", error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [isAuthenticated, supabase]);
  


  const deleteUrl = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated) return false;
    setIsSaving(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;
      
      // Schema cache clearing code has been removed
      
      // Now delete the URL
      const response = await fetch('/api/get-db-url', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      // Handle response
      if (!response.ok) {
        console.warn(`Standard deletion failed (${response.status}): ${await response.text()}`);
        
        // Try clearing the entire session as a fallback
        const clearResponse = await fetch('/api/clear-session', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        
        if (clearResponse.ok) {
          console.log("Successfully cleared session as fallback");
          setSavedUrl("");
          return true;
        }
        
        if (response.status === 401 || clearResponse.status === 401) {
          setIsAuthenticated(false);
          console.error("Authentication failed during URL deletion");
        }
        
        return false;
      }
      
      console.log("Database URL deleted successfully");
      setSavedUrl("");
      return true;
    } catch (error) {
      console.error("Error deleting URL:", error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [isAuthenticated, supabase]);
  
  
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
