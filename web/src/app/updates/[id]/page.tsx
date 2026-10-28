import type { Metadata } from "next";
import UpdateClient from "./UpdateClient";
import { getPublicPulse } from "@/lib/serverApi";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await getPublicPulse(params.id);
  const title = item?.headline || item?.title || "Technology update";
  const description = item?.summary || item?.contentSummary || "Technology intelligence from TechPulse AI.";
  return { title, description, openGraph: { title, description, type: "article" } };
}

export default async function UpdatePage({ params }: Props) {
  return <UpdateClient id={params.id} initialItem={await getPublicPulse(params.id)} />;
}
