"use client";

import { X, FileText } from "lucide-react";
import { useEffect, useCallback } from "react";

export type DocsUploadedModalProps = {
  isOpen: boolean;
  onClose: () => void;
  activeTab: "Raw Material" | "Metallisation" | "Slitting" | string;
  woData?: any;
};

export function DocsUploadedModal({ isOpen, onClose, activeTab, woData }: DocsUploadedModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !woData) return null;

  const renderContent = () => {
    if (activeTab === "Raw Material") {
      const rawMaterials = woData.work_order_materials || [];
      const images: string[] = [];
      rawMaterials.forEach((wom: any) => {
        const inv = wom.inventory;
        if (inv?.raw_material_image_url) {
           images.push(inv.raw_material_image_url);
        }
      });
      const uniqueImages = Array.from(new Set(images));

      if (uniqueImages.length === 0) {
         return <EmptyState stage="Raw Material" />;
      }

      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {uniqueImages.map((img, idx) => (
             <ImageCard key={idx} url={img} title="Raw Material Image" subtitle={`Image ${idx + 1}`} />
          ))}
        </div>
      );
    }

    if (activeTab === "Metallisation") {
      const metallisationRows = woData.metallisation || [];
      if (metallisationRows.length === 0) {
         return <EmptyState stage="Metallisation" />;
      }

      const hasImages = metallisationRows.some((row: any) => 
        row.qc_details?.images?.qc
      );

      if (!hasImages) return <EmptyState stage="Metallisation" />;

      return (
        <div className="flex flex-col gap-6">
          {metallisationRows.map((row: any, idx: number) => {
             const qc = row.qc_details?.images?.qc;
             if (!qc) return null;

             return (
               <div key={idx} className="flex flex-col gap-4 border border-[#EBEBEB] rounded-[8px] p-5 bg-white">
                 <p className="font-semibold text-[15px] text-[#171717] border-b border-[#EBEBEB] pb-3">Coil No: {row.metallisation_no || row.coil_no || `Item ${idx+1}`}</p>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                   {qc && <ImageCard url={qc} title="QC Image" />}
                 </div>
               </div>
             )
          })}
        </div>
      );
    }

    if (activeTab === "Slitting") {
      const slittingRows = woData.slitting || [];
      const bagsWithImages = slittingRows.filter((row: any) => row.slitting_review_image_url);
      
      if (bagsWithImages.length === 0) {
         return <EmptyState stage="Slitting" />;
      }

      const qcImage = bagsWithImages[0].slitting_review_image_url;

      return (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 border border-[#EBEBEB] rounded-[8px] p-5 bg-white">
            <p className="font-semibold text-[15px] text-[#171717] border-b border-[#EBEBEB] pb-3">Slitting Stage QC</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
               <ImageCard url={qcImage} title="QC Image" />
            </div>
          </div>
        </div>
      );
    }
    
    return <EmptyState stage={activeTab} />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171717]/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-[16px] w-full max-w-[900px] max-h-[85vh] shadow-lg flex flex-col overflow-hidden">
        <div className="flex items-start justify-between px-6 py-5 border-b border-[#EBEBEB]">
          <div className="flex flex-col gap-1">
            <h2 className="text-[18px] md:text-[22px] leading-tight font-semibold text-[#171717]">Uploaded Documents</h2>
            <p className="text-[11px] md:text-[14px] text-[#5C5C5C]">View the documents uploaded for the {activeTab} stage.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto bg-[#FAFCFF] flex-1 min-h-[300px]">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ stage }: { stage: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 h-full">
      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-[#EBEBEB]">
        <FileText className="w-6 h-6 text-[#A1A1AA]" />
      </div>
      <p className="text-[14px] font-medium text-[#5C5C5C]">No documents uploaded yet for {stage}.</p>
    </div>
  );
}

import { Download } from "lucide-react";

export function ImageCard({ url, title, subtitle }: { url: string; title: string; subtitle?: string }) {
  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${title.replace(/\s+/g, "_").toLowerCase()}_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Failed to download image:", err);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative group overflow-hidden rounded-[8px] border border-[#EBEBEB] shadow-sm bg-white aspect-video flex items-center justify-center">
        <a href={url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-0">
          <img src={url} alt={title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
        </a>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 pointer-events-none z-10" />
        <button 
          onClick={handleDownload}
          className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-white/90 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white text-[#171717] hover:text-[#00B6E2]"
          title="Download Image"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
      <div className="flex flex-col px-1">
        <span className="text-[13px] font-medium text-[#171717]">{title}</span>
        {subtitle && <span className="text-[11px] text-[#8B8BA2]">{subtitle}</span>}
      </div>
    </div>
  );
}
