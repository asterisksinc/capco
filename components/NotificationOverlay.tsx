"use client";

import { useNotification } from "@/contexts/NotificationContext";
import { Bell, X } from "lucide-react";
import { useState } from "react";
import { NotificationModal } from "./NotificationModal";

export function NotificationOverlay() {
  const { overlayNotification, dismissOverlay, refreshUnreadCount } = useNotification();
  const [modalOpen, setModalOpen] = useState(false);

  if (!overlayNotification && !modalOpen) return null;

  return (
    <>
      {overlayNotification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm bg-white border border-[#EBEBEB] rounded-[12px] shadow-lg p-4 flex items-start gap-3 animate-in slide-in-from-top-5 fade-in duration-300">
          <div className="w-10 h-10 rounded-full bg-[#E6F8FD] flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-[#00B6E2]" />
          </div>
          <div 
            className="flex-1 cursor-pointer" 
            onClick={() => {
              setModalOpen(true);
            }}
          >
            <p className="text-[14px] font-semibold text-[#171717]">{overlayNotification.title}</p>
            <p className="text-[13px] text-[#5C5C5C] mt-1">{overlayNotification.body}</p>
            <p className="text-[12px] text-[#00B6E2] mt-2 font-medium">Click to view details</p>
          </div>
          <button 
            onClick={dismissOverlay}
            className="p-1 hover:bg-gray-100 rounded-md text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {modalOpen && overlayNotification && (
        <NotificationModal 
          notification={overlayNotification.payload?.data || { 
            id: overlayNotification.id, 
            title: overlayNotification.title, 
            message: overlayNotification.body 
          }}
          onClose={() => {
            setModalOpen(false);
            dismissOverlay();
            refreshUnreadCount();
          }}
        />
      )}
    </>
  );
}
