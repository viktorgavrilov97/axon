import { notFound } from "next/navigation";
import { db } from "@/shared/lib/db";
import { KnowledgeItemForm } from "@/modules/knowledge-center/components/KnowledgeItemForm";

interface EditKnowledgeItemPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditKnowledgeItemPage({ params }: EditKnowledgeItemPageProps) {
  const { id } = await params;
  
  const item = await db.knowledgeItem.findUnique({
    where: { id },
  });

  if (!item) {
    notFound();
  }

  const serializedItem = JSON.parse(JSON.stringify(item));

  return (
    <div className="p-8">
      <KnowledgeItemForm initialData={serializedItem} />
    </div>
  );
}

