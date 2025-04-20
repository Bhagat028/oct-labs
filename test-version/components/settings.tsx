"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// Custom hook for database URL storage
function useDatabaseUrl() {
  const [savedUrl, setSavedUrl] = useState("")
  
  // Load saved URL on component mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("databaseUrl")
      if (saved) setSavedUrl(saved)
    } catch (error: any) {
      console.error("Failed to load from localStorage:", error)
    }
  }, [])
  
  // Save URL handler
  const saveUrl = useCallback((url: string) => {
    try {
      localStorage.setItem("databaseUrl", url.trim())
      setSavedUrl(url.trim())
      return true
    } catch (error: any) {
      console.error("Failed to save to localStorage:", error)
      return false
    }
  }, [])
  
  // Delete URL handler
  const deleteUrl = useCallback(() => {
    try {
      localStorage.removeItem("databaseUrl")
      setSavedUrl("")
      return true
    } catch (error: any) {
      console.error("Failed to delete from localStorage:", error)
      return false
    }
  }, [])
  
  return { savedUrl, saveUrl, deleteUrl }
}

// Alert management hook
function useAlert() {
  const [alert, setAlert] = useState({ show: false, message: "", type: "success" })
  
  const showAlert = useCallback((message: string, type = "success") => {
    setAlert({ show: true, message, type })
    
    // Clear alert after delay
    const timer = setTimeout(() => {
      setAlert(prev => ({ ...prev, show: false }))
    }, 3000)
    
    // Cleanup on unmount
    return () => clearTimeout(timer)
  }, [])
  
  return { alert, showAlert }
}

// Utility to mask sensitive URL parts
const maskUrl = (url: string) => {
  if (!url) return ""
  try {
    const urlObj = new URL(url)
    if (urlObj.password) {
      return url.replace(/:([^:@]+)@/, ':****@')
    }
    return url
  } catch {
    return url
  }
}

// Validate URL format
const isValidUrl = (string: string) => {
  try {
    new URL(string)
    return true
  } catch {
    return false
  }
}

export default function DatabaseUrlStorage() {
  const { savedUrl, saveUrl, deleteUrl } = useDatabaseUrl()
  const { alert, showAlert } = useAlert()
  const [databaseUrl, setDatabaseUrl] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleSave = () => {
    if (!databaseUrl.trim()) {
      showAlert("Database URL is required", "error")
      return
    }

    if (!isValidUrl(databaseUrl.trim())) {
      showAlert("Invalid URL format", "error")
      return
    }

    if (saveUrl(databaseUrl.trim())) {
      setDatabaseUrl("")
      setIsDialogOpen(false)
      showAlert("Database URL saved successfully!", "success")
    } else {
      showAlert("Failed to save URL", "error")
    }
  }

  const handleDelete = () => {
    if (deleteUrl()) {
      setConfirmDelete(false)
      showAlert("URL deleted", "success")
    } else {
      showAlert("Failed to delete URL", "error")
    }
  }

  // Reset state when dialog closes
  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setConfirmDelete(false)
    }
  }

  return (
    <div>
      {alert.show && (
        <Alert 
          variant={alert.type === "success" ? "default" : "destructive"} 
          className="mb-4 animate-in fade-in duration-300"
        >
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end mb-4">
        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full px-4">
              Add Database URL
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Database URL</DialogTitle>
              <DialogDescription>
                Enter your database connection URL. This will be saved in localStorage.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="database-url">Database URL</Label>
                <Input
                  id="database-url"
                  placeholder="postgres://username:password@host:port/database"
                  value={databaseUrl}
                  onChange={(e) => setDatabaseUrl(e.target.value)}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Note: URL is stored in localStorage and not encrypted.
                </p>
              </div>

              {savedUrl && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Saved Database URL</h3>
                  <div className="w-full p-3 border rounded-md bg-muted/50">
                    <div className="flex justify-between items-center gap-4">
                      <div className="font-mono text-sm truncate">
                        {maskUrl(savedUrl)}
                      </div>

                      {!confirmDelete ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setConfirmDelete(true)}
                        >
                          Delete
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmDelete(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDelete}
                          >
                            Confirm
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="mt-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save URL</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
