import { getKnowledgeItems } from "@/modules/knowledge-center/api/knowledge-actions";
import { KnowledgePage } from "@/modules/knowledge-center/components/KnowledgePage";

export const dynamic = "force-dynamic";

export default async function KnowledgeCenterRoute() {
  const items = await getKnowledgeItems(false); // fetch only published
  const serializedItems = JSON.parse(JSON.stringify(items));
  return <KnowledgePage items={serializedItems} />;
}

