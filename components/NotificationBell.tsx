"use client";

import { useNotification } from "@/contexts/NotificationContext";
import { notificationService } from "@/src/services/notificationService";
import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NotificationModal } from "./NotificationModal";

export function NotificationBell({ className }: { className?: string }) {
  const { unreadCount, refreshUnreadCount } = useNotification();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationService.list({ limit: 20 });
      setNotifications(data || []);
      // Also refresh unread count just in case
      refreshUnreadCount();
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!dropdownOpen) {
      loadNotifications();
    }
    setDropdownOpen(!dropdownOpen);
  };

  const handleNotificationClick = (notification: any) => {
    setSelectedNotification(notification);
    setDropdownOpen(false);
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button 
          onClick={handleToggle}
          className="w-[40px] h-[40px] flex items-center justify-center border border-[#EBEBEB] rounded-[6px] bg-white transition-colors hover:bg-gray-50"
        >
          <Bell className={className || "w-5 h-5 text-[#171717]"} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white" />
          )}
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-80 max-h-[400px] bg-white border border-[#EBEBEB] rounded-[12px] shadow-xl overflow-hidden z-[110] flex flex-col animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="px-4 py-3 border-b border-[#EBEBEB] flex items-center justify-between bg-gray-50">
              <h3 className="font-semibold text-[14px] text-[#171717]">Notifications</h3>
              <span className="text-[12px] text-[#5C5C5C]">{unreadCount} unread</span>
            </div>
            
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-8 text-center text-[13px] text-gray-500">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-[13px] text-gray-500">No notifications yet.</div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`text-left p-4 border-b border-[#EBEBEB] last:border-b-0 hover:bg-gray-50 transition-colors flex flex-col gap-1 ${!notif.read_at ? "bg-[#F0FDFF]" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-[13px] text-[#171717] line-clamp-1">{notif.title}</span>
                        {!notif.read_at && <span className="w-2 h-2 bg-[#00B6E2] rounded-full shrink-0 mt-1.5" />}
                      </div>
                      <span className="text-[12px] text-[#5C5C5C] line-clamp-2">{notif.message}</span>
                      <span className="text-[11px] text-[#8B8BA2] mt-1">
                        {new Date(notif.created_at).toLocaleString()}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedNotification && (
        <NotificationModal 
          notification={selectedNotification}
          onClose={() => {
            setSelectedNotification(null);
            loadNotifications();
          }}
        />
      )}
    </>
  );
}
