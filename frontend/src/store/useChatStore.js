import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import CryptoJS from "crypto-js";

// Encryption/Decryption Helpers
const SECRET_KEY = "secretkeyforencdec";

const encryptMessage = (message) => {
  return CryptoJS.AES.encrypt(message, SECRET_KEY).toString();
};

const decryptMessage = (encryptedMessage) => {
  if (!encryptedMessage) return ""; // Prevents decryption errors
  const bytes = CryptoJS.AES.decrypt(encryptedMessage, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  notifications: [],

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load users.");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    if (!userId) return;
    set({ isMessagesLoading: true });

    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      const decryptedMessages = res.data.map((msg) => ({
        ...msg,
        text: decryptMessage(msg.text),
      }));

      set((state) => {
        // Avoid duplicate messages
        const existingMessageIds = new Set(state.messages.map((m) => m._id));
        const newMessages = decryptedMessages.filter(
          (msg) => !existingMessageIds.has(msg._id)
        );

        return {
          messages: [...state.messages, ...newMessages],
        };
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages.");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  getNotifications: async () => {
    const socket = useAuthStore.getState().socket;
    socket.off("getNotification");
    socket.on("getNotification", (notification) => {
      set((state) => ({
        notifications: [
          { ...notification, isRead: false },
          ...state.notifications,
        ],
      }));
    });
  },
  sendMessage: async (messageData) => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    try {
      const encryptedText = encryptMessage(messageData.text);
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        { text: encryptedText }
      );

      set((state) => ({
        messages: [...state.messages, { ...res.data, text: messageData.text }],
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message.");
    }
  },

  deleteMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/messages/delete/${messageId}`);
      set((state) => ({
        messages: state.messages.filter((msg) => msg._id !== messageId),
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete message.");
    }
  },

  deleteAllMessages: async (selectedUserId) => {
    try {
      await axiosInstance.delete(`/messages/deleteAll/${selectedUserId}`);
      set((state) => ({
        messages: state.messages.filter(
          (msg) =>
            msg.senderId !== selectedUserId && msg.receiverId !== selectedUserId
        ),
      }));
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to delete all messages."
      );
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    socket.on("newMessage", (newMessage) => {
      if (newMessage.senderId !== selectedUser._id) return;
      set((state) => ({
        messages: [
          ...state.messages,
          { ...newMessage, text: decryptMessage(newMessage.text) },
        ],
      }));
    });

    socket.on("messageDeleted", (deletedMessageId) => {
      set((state) => ({
        messages: state.messages.filter((msg) => msg._id !== deletedMessageId),
      }));
    });
  },

  markNotificationAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((notif) => ({
        ...notif,
        isRead: true,
      })),
    }));
  },
  markAllNotificationsAsRead: () => {},
  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("getNotification");
    socket.off("messageDeleted");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
