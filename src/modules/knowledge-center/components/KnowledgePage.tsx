"use client";

import { KnowledgeItem } from "@prisma/client";
import { Play, Download, FilePdf, VideoCamera, Question, CaretDown } from "@phosphor-icons/react";
import { Button } from "@/shared/ui/button";
import { useState } from "react";
import Image from "next/image";

interface KnowledgePageProps {
  items: KnowledgeItem[];
}

export function KnowledgePage({ items }: KnowledgePageProps) {
  const videos = items.filter((i) => i.type === "VIDEO");
  const materials = items.filter((i) => i.type === "PDF");
  const reports = items.filter((i) => i.type === "REPORT");
  const faqs = items.filter((i) => i.type === "FAQ");

  return (
    <div className="p-4 pb-20 sidebar:pb-4">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl text-white-900">Knowledge Center</h1>
      </div>

      {/* Videos Section */}
      {videos.length > 0 && (
        <div className="mb-8 sm:mb-12">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-heading text-white-900">Videos</h2>
          </div>
          <div className="space-y-3">
            {videos.map((video) => (
              <KnowledgeCard key={video.id} item={video} />
            ))}
          </div>
        </div>
      )}

      {/* Materials Section */}
      {materials.length > 0 && (
        <div className="mb-8 sm:mb-12">
           <div className="mb-4 sm:mb-6">
            <h2 className="text-heading text-white-900">Materials</h2>
          </div>
          <div className="space-y-3">
            {materials.map((material) => (
              <KnowledgeCard key={material.id} item={material} />
            ))}
          </div>
        </div>
      )}

      {/* Reports Section */}
      {reports.length > 0 && (
        <div className="mb-8 sm:mb-12">
           <div className="mb-4 sm:mb-6">
            <h2 className="text-heading text-white-900">Reports</h2>
          </div>
          <div className="space-y-3">
            {reports.map((report) => (
              <KnowledgeCard key={report.id} item={report} />
            ))}
          </div>
        </div>
      )}

      {/* FAQ Section */}
      {faqs.length > 0 && (
        <div>
           <div className="mb-4 sm:mb-6">
            <h2 className="text-heading text-white-900">FAQ</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <KnowledgeCard key={faq.id} item={faq} />
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center py-20 bg-onsurface-900/50 rounded-xl border border-onsurface-800 border-dashed">
            <p className="text-white-500">No knowledge items available at the moment.</p>
        </div>
      )}
    </div>
  );
}

function KnowledgeCard({ item }: { item: KnowledgeItem }) {
  const [isFaqOpen, setIsFaqOpen] = useState(false);

  const getIconBackgroundColor = () => {
    if (item.type === "VIDEO") {
      return "bg-[#A8CFFF]/10";
    }
    if (item.type === "PDF") {
      return "bg-[#F4D48C]/10";
    }
    if (item.type === "REPORT") {
      return "bg-[#4ADE80]/10";
    }
    if (item.type === "FAQ") {
      return "bg-[#DCC6FF]/10";
    }
    return "bg-[#A8CFFF]/10";
  };

  const getIconColor = () => {
    if (item.type === "VIDEO") {
      return "text-[#A8CFFF]";
    }
    if (item.type === "PDF") {
      return "text-[#F4D48C]";
    }
    if (item.type === "REPORT") {
      return "text-[#4ADE80]";
    }
    if (item.type === "FAQ") {
      return "text-[#DCC6FF]";
    }
    return "text-[#A8CFFF]";
  };

  const handleAction = () => {
    if (item.type === "VIDEO" && item.youtubeUrl) {
      window.open(item.youtubeUrl, "_blank");
    } else if ((item.type === "PDF" || item.type === "REPORT") && item.pdfUrl) {
      window.open(item.pdfUrl, "_blank");
    } else if (item.type === "FAQ") {
      setIsFaqOpen(!isFaqOpen);
    }
  };

  return (
    <div 
      className={`bg-onsurface-900 hover:bg-onsurface-800 transition-all duration-200 rounded-xl group ${
        item.type === "FAQ" || item.type === "VIDEO" ? "cursor-pointer" : ""
      }`}
      onClick={item.type === "FAQ" || item.type === "VIDEO" ? handleAction : undefined}
    >
      <div className={`transition-all duration-200 ${
        item.type === "FAQ" ? "py-5 flex items-center" : "py-5"
      } px-4 sm:px-5 group-hover:px-5 sm:group-hover:px-6`}>
        <div className="flex items-center gap-3 sm:gap-4 w-full">
          {/* Icon/Image Container - responsive size */}
          {item.type !== "FAQ" && (
            <div className={`flex-shrink-0 h-[40px] sm:h-[52px] flex items-center justify-center overflow-hidden ${getIconBackgroundColor()} w-[40px] sm:w-[52px] rounded-full`}>
              {item.type === "VIDEO" ? (
                item.youtubeCoverUrl ? (
                  <div className="relative w-full h-full">
                    <Image 
                      src={item.youtubeCoverUrl} 
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <VideoCamera size={18} weight="regular" className={getIconColor()} />
                )
              ) : (
                <FilePdf size={18} weight="regular" className={getIconColor()} />
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-body text-white-900 truncate font-medium">
                {item.faqQuestion || item.title}
              </h3>
            </div>
            {item.description && item.type !== "FAQ" && (
              <p className={`text-body line-clamp-2 text-white-700 ${
                item.type === "VIDEO" ? "sm:max-w-[50%]" : ""
              }`}>
                {item.description}
              </p>
            )}
            {item.type === "FAQ" && isFaqOpen && (
              <div className="mt-3">
                <p className="text-body text-white-700 leading-relaxed break-words">
                  {item.faqAnswer}
                </p>
              </div>
            )}
          </div>

          {/* Action Button/Icon */}
          <div className="flex-shrink-0">
            {item.type === "FAQ" ? (
              <div className={`transition-transform duration-300 ${isFaqOpen ? "rotate-180" : ""}`}>
                <CaretDown size={20} className="text-white-500" />
              </div>
            ) : (
              <Button 
                variant="secondary" 
                size="sm"
                onClick={handleAction}
                className="whitespace-nowrap hidden sm:flex"
              >
                {item.type === "VIDEO" ? (
                  <>
                    <Play size={16} weight="fill" className="mr-2" />
                    Watch
                  </>
                ) : (
                  <>
                    <Download size={16} className="mr-2" />
                    Download
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
