import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";


export const getUserForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({
      _id: { $ne: loggedInUserId },
    }).select("-password");
    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUserForSidebar:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;

    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessages controller:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const senderId = req.user._id;

    const { id: receiverId } = req.params;

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }
    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });
    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverId) {
      console.log("sucessto send receiver");
      io.to(receiverSocketId).emit("newMessage", newMessage);
      io.to(receiverSocketId).emit("getNotification", {
        senderId: newMessage.senderId,
        isRead: false, // The notification is unread initially
        date: new Date(),
        messageId: newMessage._id,
      
      });
    }
    else {
      console.log("⚠️ Receiver is offline, notification not sent");
    }
    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessages controller:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
export const deleteMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;

    

    const message = await Message.findOne({
      _id: messageId,
      // $or: [{ senderId: myId }, { receiverId: myId }],
    });

    if (!message) {
      res
        .status(400)
        .json({ error: "Message not found or not authorized " });
    }
    const deleteMessageId = await Message.findOneAndDelete(message._id);
    console.log("delete message id", deleteMessageId);

    const receiverSocketId = getReceiverSocketId(message.receiverId);
    console.log("🚀 ~ deleteMessage ~ receiverSocketId:", receiverSocketId)

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageDeleted", messageId);  
    } else {
      console.log("not receive socket recive id");
    }

    res.status(200).json({ message: "Message deleted sucessfully", messageId });
  } catch (error) {
    console.error("Error in deleteMessage controller", error.message);
    res.status(500).json({ error: "INtrenal server error" });
  }
};

export const deleteAllMessages = async (req, res) => {
 
  try {
    const senderId = req.user._id;
    const { id: receiverId } = req.params;
    const filter = {
      $and: [{ senderId: senderId }, { receiverId: receiverId }]
    };
    const findMessageForDelete = await Message.find( filter);
    console.log("🚀 ~ deleteAllMessages ~ receiverId:", receiverId)

    console.log("🚀 ~ deleteAllMessages ~ receiverId:", findMessageForDelete.receiverId)
    console.log("🚀 ~ deleteAllMessages ~ senderId:", senderId)
    console.log("🚀 ~ deleteAllMessages ~ findMessageForDelete:", findMessageForDelete)
    const deleteResult = await Message.deleteMany(filter);
     
    console.log("🚀 ~ deleteAllMessages ~ deleteResult:", deleteResult)
    if (deleteResult.length===0) {
      console.log("no message to delete");
      res
        .status(400)
        .json({ message: "No message are found to delete" });
    }
    else{
      console.log("sucess delete all messages")
      res
      .status(200)
      .json({ message: "All messages deleted successfully" });
    }

    

   
   
  } catch (error) {
    console.error("Error while deleting messages:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
