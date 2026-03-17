"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function PresenterPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Presenter Mode</h1>
        <p className="text-slate-500 mt-2">Upload your deck and bring MeetO into the call to present and assist.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Presentation Setup</CardTitle>
          <CardDescription>Configure the meeting and the deck the bot will use.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="meeting-link">Meeting Link</Label>
            <Input id="meeting-link" placeholder="https://meet.google.com/..." />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bot-name">Bot Name</Label>
            <Input id="bot-name" defaultValue="MeetO Presenter" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deck">Deck Upload (PPT or PDF)</Label>
            <Input id="deck" type="file" accept=".pdf,.ppt,.pptx" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Presentation Instructions</Label>
            <Textarea 
              id="instructions" 
              placeholder="e.g. Pause for questions after the budget slide. Emphasize the timeline." 
              className="min-h-[100px]"
            />
          </div>

          <Button className="w-full bg-brand-indigo hover:bg-brand-indigo/90">Deploy Presenter Bot</Button>
        </CardContent>
      </Card>
    </div>
  )
}
