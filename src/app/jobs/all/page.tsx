import { redirect } from "next/navigation";

// The applications table lives on the Pipeline page now.
export default function All() { redirect("/jobs"); }
