"use client";

import { FileText, Download } from "@phosphor-icons/react";
import { Button } from "@/shared/ui/button";

interface Report {
  id: string;
  title: string;
  date: string;
  month: string;
  year: string;
}

const mockReports: Report[] = [
  {
    id: "1",
    title: "Financial Report",
    date: "September 2024",
    month: "September",
    year: "2024",
  },
  {
    id: "2",
    title: "Financial Report",
    date: "August 2024",
    month: "August",
    year: "2024",
  },
  {
    id: "3",
    title: "Financial Report",
    date: "July 2024",
    month: "July",
    year: "2024",
  },
  {
    id: "4",
    title: "Financial Report",
    date: "June 2024",
    month: "June",
    year: "2024",
  },
];

export function ReportsPage() {
  const handleOpenPDF = (reportId: string) => {
    // Mock action - in real implementation, this would open/download the PDF
    console.log(`Opening PDF for report ${reportId}`);
    // window.open(`/api/reports/${reportId}/pdf`, '_blank');
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-3">
          <h1 className="text-2xl text-white-900">Reports</h1>
          <p className="text-body text-white-700 mt-1">
            Financial reports by period
          </p>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockReports.map((report) => (
          <div
            key={report.id}
            className="p-6 bg-onsurface-900 rounded-xl border border-onsurface-950 hover:border-onsurface-800 transition-colors flex flex-col"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-onsurface-950 flex items-center justify-center flex-shrink-0">
                <FileText size={24} weight="regular" className="text-white-700" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-heading text-white-900 mb-1">
                  {report.title}
                </h3>
                <p className="text-body text-white-700">{report.date}</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleOpenPDF(report.id)}
              className="w-full group mt-auto"
            >
              <Download size={16} weight="regular" className="mr-2 group-hover:translate-y-0.5 transition-transform" />
              Download PDF
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
