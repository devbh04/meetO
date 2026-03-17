"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function NotetakerPage() {
  const [meetingLink, setMeetingLink] = useState("")
  const [botName, setBotName] = useState("MeetO Notetaker")
  const [instructions, setInstructions] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState<{ type: "success" | "error" | null, message: string }>({ type: null, message: "" })

  const handleDeploy = async () => {
    if (!meetingLink) {
      setStatus({ type: "error", message: "Meeting link is required." })
      return
    }

    setIsSubmitting(true)
    setStatus({ type: null, message: "" })

    try {
      const res = await fetch("http://127.0.0.1:8000/api/meetings/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meeting_link: meetingLink,
          bot_name: botName,
          instructions: instructions || null,
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to deploy bot. Ensure the backend is running.")
      }

      const data = await res.json()
      setStatus({ type: "success", message: data.message || "Bot successfully deployed!" })
    } catch (error: any) {
      setStatus({ type: "error", message: error.message || "An error occurred." })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Notetaker Mode</h1>
        <p className="text-slate-500 mt-2">Configure MeetO to join your meeting and take automated, structured notes.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Meeting Details</CardTitle>
          <CardDescription>Enter the meeting information for the bot to join.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {status.type === "error" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{status.message}</AlertDescription>
            </Alert>
          )}
          {status.type === "success" && (
             <Alert className="bg-green-50 text-green-800 border-green-200">
             <CheckCircle2 className="h-4 w-4 text-green-600" />
             <AlertTitle className="text-green-800">Success</AlertTitle>
             <AlertDescription>{status.message}</AlertDescription>
           </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="meeting-link">Meeting Link</Label>
            <Input 
              id="meeting-link" 
              placeholder="https://meet.google.com/..." 
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bot-name">Bot Name</Label>
            <Input 
              id="bot-name" 
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="extraction">Extraction Instructions (Optional)</Label>
            <Textarea 
              id="extraction" 
              placeholder="e.g. Extract any mentions of budget, timeline, or risk." 
              className="min-h-[100px]"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-sm text-slate-500">Specify what specific data you want the AI to look for.</p>
          </div>

          <Button 
            className="w-full bg-brand-indigo hover:bg-brand-indigo/90"
            onClick={handleDeploy}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Deploying Bot..." : "Deploy Notetaker Bot"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
