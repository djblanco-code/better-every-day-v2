import { redirect } from "next/navigation";

// Today and Home are one page now (task 6.5). Old links and the PWA start_url land here.
export default function Today() { redirect("/"); }
