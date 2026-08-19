"use client";

import { Play, Download, FileText, VideoCamera, Presentation, BookOpen } from "@phosphor-icons/react";
import { Button } from "@/shared/ui/button";

interface Material {
  id: string;
  title: string;
  type: "video" | "presentation" | "document";
  description: string;
  actionLabel: string;
}

const mockVideos: Material[] = [
  {
    id: "v1",
    title: "Introduction to Cryptocurrencies",
    type: "video",
    description: "Basic principles of cryptocurrencies and blockchain",
    actionLabel: "Watch",
  },
  {
    id: "v2",
    title: "How to Start Investing in Crypto",
    type: "video",
    description: "Step-by-step guide for beginner investors",
    actionLabel: "Watch",
  },
  {
    id: "v3",
    title: "Cryptocurrency Trading Strategies",
    type: "video",
    description: "Main trading strategies in the crypto market",
    actionLabel: "Watch",
  },
];

const mockPresentations: Material[] = [
  {
    id: "p1",
    title: "Introduction to Axon",
    type: "presentation",
    description: "Basic principles of Axon strategies",
    actionLabel: "Download",
  },
  {
    id: "p2",
    title: "Investment Strategies 2024",
    type: "presentation",
    description: "Current strategies for investing in the current year",
    actionLabel: "Download",
  },
  {
    id: "p3",
    title: "Technical Analysis of Markets",
    type: "presentation",
    description: "Methods of technical analysis for decision making",
    actionLabel: "Download",
  },
];

const mockDocuments: Material[] = [
  {
    id: "d1",
    title: "Investor's Guide",
    type: "document",
    description: "Complete guide to starting investing",
    actionLabel: "View",
  },
  {
    id: "d2",
    title: "Fundamentals of Cryptocurrencies",
    type: "document",
    description: "Introduction to the world of cryptocurrencies and blockchain",
    actionLabel: "View",
  },
  {
    id: "d3",
    title: "Risk Management",
    type: "document",
    description: "Strategies for managing investment risks",
    actionLabel: "View",
  },
];

const getTypeIcon = (type: Material["type"]) => {
  switch (type) {
    case "video":
      return VideoCamera;
    case "presentation":
      return Presentation;
    case "document":
      return BookOpen;
  }
};

const getTypeLabel = (type: Material["type"]) => {
  switch (type) {
    case "video":
      return "VIDEO";
    case "presentation":
      return "PRESENTATION";
    case "document":
      return "DOCUMENT";
  }
};

const getActionIcon = (type: Material["type"]) => {
  switch (type) {
    case "video":
      return Play;
    case "presentation":
    case "document":
      return Download;
  }
};

export function MaterialsPage() {
  const handleAction = (material: Material) => {
    // Mock action - in real implementation, this would open/download the material
    console.log(`${material.actionLabel} ${material.type}: ${material.id}`);
    // if (material.type === 'video') {
    //   window.open(`/materials/videos/${material.id}`, '_blank');
    // } else {
    //   window.open(`/api/materials/${material.id}/download`, '_blank');
    // }
  };

  const renderMaterialCard = (material: Material) => {
    const Icon = getTypeIcon(material.type);
    const ActionIcon = getActionIcon(material.type);

    return (
      <div
        key={material.id}
        className="p-6 bg-onsurface-900 rounded-xl border border-onsurface-950 hover:border-onsurface-800 transition-colors flex flex-col"
      >
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-onsurface-950 flex items-center justify-center flex-shrink-0">
            <Icon size={24} weight="regular" className="text-white-700" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center px-2 py-1 rounded-md bg-onsurface-950 mb-2">
              <span className="text-xs text-white-700 font-medium">
                {getTypeLabel(material.type)}
              </span>
            </div>
            <h3 className="text-heading text-white-900 mb-2">
              {material.title}
            </h3>
            <p className="text-body text-white-700">
              {material.description}
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleAction(material)}
          className="w-full group mt-auto"
        >
          <ActionIcon
            size={16}
            weight="regular"
            className="mr-2 group-hover:translate-y-0.5 transition-transform"
          />
          {material.actionLabel}
        </Button>
      </div>
    );
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-3">
          <h1 className="text-2xl text-white-900">Knowledge Center</h1>
          <p className="text-body text-white-700 mt-1">
            Educational resources and learning materials
          </p>
        </div>
      </div>

      {/* Educational Videos Section */}
      <div className="mb-12">
        <h2 className="text-heading text-white-900 mb-6">Educational Videos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockVideos.map(renderMaterialCard)}
        </div>
      </div>

      {/* Presentations Section */}
      <div className="mb-12">
        <h2 className="text-heading text-white-900 mb-6">Presentations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockPresentations.map(renderMaterialCard)}
        </div>
      </div>

      {/* Educational Materials Section */}
      <div>
        <h2 className="text-heading text-white-900 mb-6">Educational Materials</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockDocuments.map(renderMaterialCard)}
        </div>
      </div>
    </div>
  );
}
