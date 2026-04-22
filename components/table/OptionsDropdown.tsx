"use client";

import React, { useState, useRef, useEffect } from "react";
import { MoreVertical, Edit2, Trash2, Eye } from "lucide-react";
import Link from "next/link";

export function OptionsDropdown({
  onEdit,
  onDelete,
  viewHref,
  status,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  viewHref?: string;
  status?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const canEdit = status === "Yet to Start";
  const canDelete = status === "Yet to Start";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 rounded-full text-[#5C5C5C] hover:bg-gray-100 hover:text-[#171717] transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-36 bg-white border border-[#EBEBEB] rounded-[8px] shadow-lg z-50 overflow-hidden">
          <div className="py-1">
            {viewHref && (
              <Link
                href={viewHref}
                className="flex items-center gap-2 px-4 py-2 text-[13px] text-[#5C5C5C] hover:bg-gray-50 hover:text-[#171717] w-full text-left transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Eye className="w-3.5 h-3.5" />
                View
              </Link>
            )}
            {onEdit && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onEdit();
                }}
                disabled={!canEdit}
                className={`flex items-center gap-2 px-4 py-2 text-[13px] w-full text-left transition-colors ${
                  canEdit 
                    ? "text-[#5C5C5C] hover:bg-gray-50 hover:text-[#171717]" 
                    : "text-[#A1A1AA] cursor-not-allowed"
                }`}
              >
                <Edit2 className={`w-3.5 h-3.5 ${!canEdit ? "opacity-50" : ""}`} />
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onDelete();
                }}
                disabled={!canDelete}
                className={`flex items-center gap-2 px-4 py-2 text-[13px] w-full text-left transition-colors ${
                  canDelete 
                    ? "text-[#FB3748] hover:bg-[#FFF0F1]" 
                    : "text-[#A1A1AA] cursor-not-allowed"
                }`}
              >
                <Trash2 className={`w-3.5 h-3.5 ${!canDelete ? "opacity-50" : ""}`} />
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}