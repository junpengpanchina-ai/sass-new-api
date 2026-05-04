import { redirect } from "next/navigation";

export default function DashboardModelsRedirectPage() {
  redirect("/console/models");
}
