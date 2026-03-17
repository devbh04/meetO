import { notFound } from "next/navigation";
import MeetingDashboardView from "@/components/dashboard/meeting-dashboard-view";

// Optional: you can extract this to a separate lib/api file.
async function getMeetingData(id: string) {
  try {
    const res = await fetch(`http://127.0.0.1:8000/api/meetings/${id}`, {
      cache: "no-store", // Prevent caching since data might update
    });
    if (!res.ok) {
      return null;
    }
    return await res.json();
  } catch (error) {
    console.error("Failed to fetch meeting data:", error);
    return null;
  }
}

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meeting = await getMeetingData(id);

  if (!meeting) {
    // For development fallback if the bot server isn't running yet.
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
        <h2 className="text-2xl font-bold mb-2">Meeting Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The meeting data could not be retrieved from the backend. 
          Are you sure the FastAPI bot server is running on port 8000?
        </p>
      </div>
    );
  }

  return <MeetingDashboardView meeting={meeting} />;
}
