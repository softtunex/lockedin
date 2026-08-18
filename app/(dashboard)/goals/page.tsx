import { redirect } from "next/navigation";

// The goals list now lives on the dashboard's Projects section — redirect
// rather than 404 for anyone with an old link/bookmark. /goals/new and
// /goals/[id] are unaffected.
export default function GoalsPage() {
  redirect("/dashboard");
}
