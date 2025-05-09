import { useAuthStore } from "../store/useAuthStore";
import { LogOut, MessageSquare, Settings, User, Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useChatStore } from "../store/useChatStore";
import { unReadNotifications } from "../lib/unReadNotifications.js";
import moment from "moment";

export const Navbar = () => {
  const { logout, authUser } = useAuthStore();
  const { notifications, users, getNotifications, markNotificationAsRead, setSelectedUser, markAllNotificationsAsRead } = useChatStore();
  const [isOpen,setIsOpen]=useState(false);
  // Use state for loading status
  const [loading, setLoading] = useState(true);

  // Get unread notifications from the store
  const unReadNotification = unReadNotifications(notifications);

  // Use effect to fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      await getNotifications(); // Ensure notifications are fetched before continuing
      setLoading(false); // Set loading state to false once data is fetched
    };
    fetchNotifications();
  }, [getNotifications]);

  const modifiedNotifications = notifications
    .filter((n) => !n.isRead) // Hide read notifications
    .map((n) => {
      const sender = users.find((user) => user._id === n.senderId);
      return { ...n, senderName: sender?.fullName };
    });

  // Function to handle notification click
  const handleNotificationClick = (n) => {
    const senderUser = users.find((user) => user._id === n.senderId);
    if (senderUser) {
      setSelectedUser(senderUser); // Open chat with sender
      markNotificationAsRead(n.senderId); // Mark this notification as read
    }
  };

  return (
    <header className="border-b border-base-300 fixed w-full top-0 z-40 backdrop-blur-lg bg-base-100/80">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo Section */}
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-all">
          <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-lg font-bold">BuddyTalk</h1>
        </Link>

        {/* Actions Section */}
        <div className="flex items-center gap-4 relative">
          {/* Notification Bell */}
          <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="relative">
              <Bell className="w-6 h-6 text-gray-500 hover:text-gray-700" />
              {unReadNotification.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full px-1.5">
                  {unReadNotification.length}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {isOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white border rounded-lg shadow-lg p-4 z-50">
                <div className="flex justify-between items-center border-b pb-2 mb-2">
                  <h3 className="text-lg text-gray-600 font-semibold">Notifications</h3>
                  <button className="text-sm text-blue-500 hover:underline" onClick={() => markAllNotificationsAsRead()}>
                    Mark all as read
                  </button>
                </div>

                {/* No Notifications */}
                {loading ? (
                  <div className="text-gray-400 text-sm text-center py-2">Loading...</div>
                ) : modifiedNotifications.length === 0 ? (
                  <div className="text-gray-400 text-sm text-center py-2">No notifications yet...</div>
                ) : (
                  // Notification List
                  modifiedNotifications.map((n, index) => (
                    <div
                      key={index}
                      className={`p-2 rounded-md flex flex-col gap-1 cursor-pointer ${n.isRead ? "bg-blue-500 text-white" : "bg-gray-300 text-gray-600"}`}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <span className="text-sm">{`${n.senderName} sent you a new message`}</span>
                      <span className="text-xs">{moment(n.date).calendar()}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Settings Button */}
          <Link to="/settings" className="btn btn-sm gap-2 transition-colors">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </Link>

          {/* Profile & Logout */}
          {authUser && (
            <>
              <Link to="/profile" className="btn btn-sm gap-2">
                <User className="size-5" />
                <span className="hidden sm:inline">Profile</span>
              </Link>

              <button className="flex gap-2 items-center text-red-500 hover:text-red-700" onClick={logout}>
                <LogOut className="size-5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
