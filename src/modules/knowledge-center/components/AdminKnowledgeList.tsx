"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KnowledgeItem } from "@prisma/client";
import { 
  Plus, 
  PencilSimple, 
  Trash, 
  ArrowUp, 
  ArrowDown, 
  VideoCamera, 
  FilePdf, 
  Question 
} from "@phosphor-icons/react";
import { Button } from "@/shared/ui/button";
import { deleteKnowledgeItem, reorderKnowledgeItem } from "../api/knowledge-actions";
import toast from "react-hot-toast";

interface AdminKnowledgeListProps {
  items: KnowledgeItem[];
}

export function AdminKnowledgeList({ items }: AdminKnowledgeListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    
    setLoading(id);
    const res = await deleteKnowledgeItem(id);
    setLoading(null);
    
    if (res.ok) {
      toast.success("Item deleted");
      router.refresh();
    } else {
      toast.error(res.error || "Failed to delete");
    }
  };

  const handleReorder = async (id: string, direction: "up" | "down") => {
    setLoading(id);
    const res = await reorderKnowledgeItem(id, direction);
    setLoading(null);
    
    if (res.ok) {
      router.refresh();
    } else {
      toast.error(res.error || "Failed to reorder");
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "VIDEO": return <VideoCamera size={20} />;
      case "PDF": return <FilePdf size={20} />;
      case "REPORT": return <FilePdf size={20} />;
      case "FAQ": return <Question size={20} />;
      default: return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "VIDEO": return "Video";
      case "PDF": return "Materials";
      case "REPORT": return "Reports";
      case "FAQ": return "FAQ";
      default: return type;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "VIDEO": return { bg: "bg-[#A8CFFF]/10", text: "text-[#A8CFFF]" };
      case "PDF": return { bg: "bg-[#F4D48C]/10", text: "text-[#F4D48C]" };
      case "REPORT": return { bg: "bg-[#4ADE80]/10", text: "text-[#4ADE80]" };
      case "FAQ": return { bg: "bg-[#DCC6FF]/10", text: "text-[#DCC6FF]" };
      default: return { bg: "bg-onsurface-800", text: "text-white-600" };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white-900">Knowledge Center</h1>
        <Button onClick={() => router.push("/admin/knowledge-center/create")}>
          <Plus size={20} className="mr-2" />
          Add Item
        </Button>
      </div>

      <div className="rounded-xl overflow-hidden">
        {items.length === 0 ? (
          <div className="p-8">
            <p className="text-body text-white-600 text-center">
              No items found. Create one to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-separate" style={{ borderSpacing: '0 12px' }}>
              <colgroup>
                <col className="w-[20%]" />
                <col className="w-[40%]" />
                <col className="w-[15%]" />
                <col className="w-[25%]" />
              </colgroup>
              <thead>
                <tr>
                  <th className="text-left text-small text-white-700 pb-4 pl-0">Type</th>
                  <th className="text-left text-small text-white-700 pb-4 pl-0">Title</th>
                  <th className="text-left text-small text-white-700 pb-4 pl-0">Order</th>
                  <th className="text-right text-small text-white-700 pb-4 pr-0">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const badgeColor = getTypeBadgeColor(item.type);
                  return (
                    <tr 
                      key={item.id} 
                      className="bg-onsurface-900 hover:bg-onsurface-800 transition-all duration-200 group rounded-xl"
                    >
                      <td className="py-5 px-5 rounded-l-xl group-hover:px-6 transition-all duration-200 overflow-hidden">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(item.type)}
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-small ${badgeColor.bg} ${badgeColor.text}`}>
                            {getTypeLabel(item.type)}
                          </span>
                        </div>
                      </td>
                      <td className="py-5 px-5 group-hover:px-6 transition-all duration-200 overflow-hidden">
                        <div className="text-body text-white-900 font-medium">{item.title}</div>
                        {(item.description || item.faqAnswer) && (
                          <div className="text-body text-white-500 truncate max-w-xs mt-1">
                            {item.description || item.faqAnswer}
                          </div>
                        )}
                      </td>
                      <td className="py-5 px-5 group-hover:px-6 transition-all duration-200 overflow-hidden">
                        <div className="flex items-center gap-1">
                          <button
                            disabled={index === 0 || loading === item.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReorder(item.id, "up");
                            }}
                            className="p-1 hover:text-white-900 text-white-500 disabled:opacity-30 transition-colors"
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button
                            disabled={index === items.length - 1 || loading === item.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReorder(item.id, "down");
                            }}
                            className="p-1 hover:text-white-900 text-white-500 disabled:opacity-30 transition-colors"
                          >
                            <ArrowDown size={16} />
                          </button>
                        </div>
                      </td>
                      <td className="py-5 px-5 rounded-r-xl group-hover:px-6 text-right transition-all duration-200 overflow-hidden">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/admin/knowledge-center/edit/${item.id}`);
                            }}
                          >
                            <PencilSimple size={16} />
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id);
                            }}
                            disabled={loading === item.id}
                            className="!bg-redhaze/10 !text-redhaze hover:!bg-redhaze/20"
                          >
                            <Trash size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

