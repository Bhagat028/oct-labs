"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Cable } from "lucide-react"
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
  const [savedUrl, setSavedUrl] = useState("")

  useEffect(() => {
    try {
      const stored = localStorage.getItem("databaseUrl")
      if (stored) setSavedUrl(stored)
    } catch (error) {
      console.error("Error loading from localStorage:", error)
    }
  }, [])

  const saveUrl = useCallback((url: string) => {
    try {
      const trimmed = url.trim()
      localStorage.setItem("databaseUrl", trimmed)
      setSavedUrl(trimmed)
      return true
    } catch (error) {
      console.error("Error saving URL:", error)
      return false
    }
  }, [])

  const deleteUrl = useCallback(() => {
    try {
      localStorage.removeItem("databaseUrl")
      setSavedUrl("")
      return true
    } catch (error) {
      console.error("Error deleting URL:", error)
      return false
    }
  }, [])

  return { savedUrl, saveUrl, deleteUrl }
}

function useAlert() {
  const [alert, setAlert] = useState({ show: false, message: "", type: "success" })

  const showAlert = useCallback((message: string, type = "success") => {
    setAlert({ show: true, message, type })
    const timer = setTimeout(() => {
      setAlert(prev => ({ ...prev, show: false }))
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  return { alert, showAlert }
}

const maskUrl = (url: string) => {
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

const isValidUrl = (url: string) => {
  try {
    new URL(url)
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

    if (!isValidUrl(databaseUrl)) {
      showAlert("Invalid URL format", "error")
      return
    }

    if (saveUrl(databaseUrl)) {
      setDatabaseUrl("")
      setIsDialogOpen(false)
      showAlert("Database URL saved successfully!", "success")
    } else {
      showAlert("Failed to save URL", "error")
    }
  }

  const handleDelete = () => {
    if (deleteUrl()) {
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
              Save your database connection string (stored in localStorage).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {!savedUrl && (
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
                  This is stored locally and is not encrypted.
                </p>
              </div>
            )}

            {savedUrl && (
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
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                      >
                        Confirm Delete
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setConfirmDelete(true)}
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
            {!savedUrl && (
              <Button onClick={handleSave}>Save URL</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
