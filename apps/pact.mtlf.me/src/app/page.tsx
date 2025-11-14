"use client";

import { PRESET_ACCOUNTS } from "@/types";
import { redirect } from "next/navigation";

export default function HomePage() {
  // Redirect to the first preset account
  redirect(`/${PRESET_ACCOUNTS[0].id}`);
}
