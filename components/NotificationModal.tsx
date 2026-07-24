"use client";

import { X, Check } from "lucide-react";
import { notificationService } from "@/src/services/notificationService";
import { useState } from "react";
import { useNotification } from "@/contexts/NotificationContext";

interface NotificationModalProps {
  notification: any;
  onClose: () => void;
}

export function NotificationModal({ notification, onClose }: NotificationModalProps) {
  const { onNotificationRead } = useNotification();
  const [isMarking, setIsMarking] = useState(false);

  const handleMarkAsRead = async () => {
    if (notification.read_at) {
      onClose();
      return;
    }
    
    setIsMarking(true);
    try {
      await notificationService.markRead([notification.id]);
      onNotificationRead();
    } catch (err) {
      console.error("Failed to mark as read", err);
    } finally {
      setIsMarking(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#171717]/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[16px] w-full max-w-md shadow-lg flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-[#EBEBEB] flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-[#171717]">Notification Details</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-md text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 flex flex-col gap-4">
          <div>
            <p className="text-[12px] font-medium text-[#8B8BA2] mb-1">
              {notification.created_at ? new Date(notification.created_at).toLocaleString() : "Just now"}
            </p>
            <h3 className="text-[18px] font-semibold text-[#171717]">{notification.title || "Notification"}</h3>
          </div>
          
          <div className="bg-[#F9FAFB] border border-[#EBEBEB] rounded-[8px] p-4 text-[14px] text-[#4B5563]">
            {notification.message || notification.body || "No details provided."}
          </div>
          
          {notification.type && (
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium px-2 py-1 bg-gray-100 text-gray-700 rounded-md">
                Type: {notification.type}
              </span>
            </div>
          )}
        </div>
        
        <div className="px-6 py-4 border-t border-[#EBEBEB] flex justify-end gap-3 bg-[#FAFAFA]">
          <button 
            onClick={onClose}
            className="px-4 py-2 border border-[#EBEBEB] bg-white text-[#171717] text-[14px] font-medium rounded-[6px] hover:bg-gray-50"
          >
            Close
          </button>
          {!notification.read_at && (
            <button 
              onClick={handleMarkAsRead}
              disabled={isMarking}
              className="px-4 py-2 bg-[#00B6E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#0092b5] flex items-center gap-2 disabled:opacity-70"
            >
              {isMarking ? "Marking..." : (
                <>
                  <Check className="w-4 h-4" />
                  Mark as Read
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
