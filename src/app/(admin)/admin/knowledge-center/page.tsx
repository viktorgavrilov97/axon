import { AdminKnowledgeList } from "@/modules/knowledge-center/components/AdminKnowledgeList";
import { getKnowledgeItems } from "@/modules/knowledge-center/api/knowledge-actions";

export const dynamic = "force-dynamic";

export default async function AdminKnowledgeCenterPage() {
  const items = await getKnowledgeItems(true);
  const serializedItems = JSON.parse(JSON.stringify(items));

  return (
    <div className="p-8">
      <AdminKnowledgeList items={serializedItems} />
    </div>
  );
}

