import { useState, useRef, useEffect } from "react";
import { X, EllipsisVertical, Video } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const ChatHeader = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const { selectedUser, setSelectedUser } = useChatStore();
  const { deleteAllMessages, messages } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const navigate = useNavigate();

  const handleDeleteAllMessages = async () => {
    if (window.confirm("Are you sure you want to delete all messages?")) {
      try {
        if (!messages || messages.length === 0) {
          toast.error("No messages to delete.");
        } else {
          await deleteAllMessages(selectedUser._id);
          toast.success("All messages deleted successfully.");
        }
      } catch (error) {
        console.error("Failed to delete messages:", error);
      }
    }
    setShowDropdown(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="p-2.5 border-b border-base-300 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img
                src={selectedUser.profilePic || "/avatar.png"}
                alt={selectedUser.fullName}
              />
            </div>
          </div>

          {/* User Info */}
          <div>
            <h3 className="font-medium">{selectedUser.fullName}</h3>
            <p className="text-sm text-base-content/70">
              {onlineUsers.includes(selectedUser._id) ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        {/* Icons */}
        <div className="flex gap-5 items-center">
          {/* Dropdown Toggle */}
          <div className="relative" ref={dropdownRef}>
            <button onClick={() => setShowDropdown((prev) => !prev)}>
              <EllipsisVertical />
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <ul className="absolute right-0 mt-2 w-48 bg-base-100 border border-base-300 rounded-md shadow-lg z-50">
                <li>
                  <button
                    className="block w-full px-4 py-2 text-left hover:bg-base-200"
                    onClick={handleDeleteAllMessages}
                  >
                    Delete All Messages
                  </button>
                </li>
                <li>
                  <button
                    className="block w-full px-4 py-2 text-left hover:bg-base-200"
                    onClick={() => {
                      console.log("Other Action");
                      setShowDropdown(false);
                    }}
                  >
                    Other Action
                  </button>
                </li>
              </ul>
            )}
          </div>

          {/* Video Button */}
          <button onClick={() => navigate(`/lobby/${selectedUser._id}`)}>
            <Video />
          </button>

          {/* Close Chat Button */}
          <button
            onClick={() => {
              navigate("/");
              setSelectedUser(null);
            }}
          >
            <X />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
