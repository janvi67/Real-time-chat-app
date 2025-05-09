import { useRef, useEffect, useState } from "react";
import { FiMic, FiMicOff } from "react-icons/fi";
import { FaVideo, FaVideoSlash, FaTimes } from "react-icons/fa";
import { FaCameraRotate } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { io } from "socket.io-client";
import { useAuthStore } from "../../store/useAuthStore"; // ✅ Adjust path as needed

const configuration = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

export const Lobby = () => {
  const baseUrl = useAuthStore((state) => state.baseUrl); // ✅ Get base URL from Zustand
  const userInfo = 123456; // Replace with actual user ID logic

  const socket = useRef(null);
  const pc = useRef(null);
  const localStream = useRef(null);
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);

  const hangupButton = useRef(null);
  const muteAudButton = useRef(null);
  const muteVideoButton = useRef(null);

  const [audioState, setAudioState] = useState(true);
  const [videoState, setVideoState] = useState(true);
  const [setIsFrontCamera] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    socket.current = io(baseUrl, { transports: ["websocket"] }); // ✅ Use dynamic URL
    startCall();

    socket.current.on("calling", async (e) => {
      if (!localStream.current) return;

      switch (e.type) {
        case "offer":
          await handleOffer(e);
          break;
        case "answer":
          await handleAnswer(e);
          break;
        case "candidate":
          await handleCandidate(e);
          break;
        case "ready":
          if (pc.current) {
            console.log("Already in call, ignoring");
            return;
          }
          makeCall();
          break;
        case "bye":
          if (pc.current) hangup();
          break;
        default:
          console.log("Unhandled event", e);
      }
    });

    return () => {
      socket.current.disconnect(); // ✅ Cleanup
    };
  }, [baseUrl]);

  async function startCall() {
    try {
      localStream.current = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: { echoCancellation: true },
      });
      localVideo.current.srcObject = localStream.current;

      hangupButton.current.disabled = false;
      muteAudButton.current.disabled = false;
      muteVideoButton.current.disabled = false;

      socket.current.emit("calling", { id: userInfo, type: "ready" });
    } catch (error) {
      console.error("Error starting call:", error);
    }
  }

  async function makeCall() {
    try {
      pc.current = new RTCPeerConnection(configuration);

      pc.current.onicecandidate = (e) => {
        if (e.candidate) {
          socket.current.emit("calling", {
            type: "candidate",
            id: userInfo,
            candidate: e.candidate.candidate,
            sdpMid: e.candidate.sdpMid,
            sdpMLineIndex: e.candidate.sdpMLineIndex,
          });
        }
      };

      pc.current.ontrack = (e) => {
        if (e.streams && e.streams[0]) {
          remoteVideo.current.srcObject = e.streams[0];
        }
      };

      localStream.current.getTracks().forEach((track) =>
        pc.current.addTrack(track, localStream.current)
      );

      const offer = await pc.current.createOffer();
      await pc.current.setLocalDescription(offer);

      socket.current.emit("calling", {
        id: userInfo,
        type: "offer",
        sdp: offer.sdp,
      });
    } catch (error) {
      console.error("Error making call:", error);
    }
  }

  async function handleOffer(offer) {
    if (pc.current) {
      console.error("Already in call");
      return;
    }

    try {
      pc.current = new RTCPeerConnection(configuration);

      pc.current.onicecandidate = (e) => {
        if (e.candidate) {
          socket.current.emit("calling", {
            type: "candidate",
            id: userInfo,
            candidate: e.candidate.candidate,
            sdpMid: e.candidate.sdpMid,
            sdpMLineIndex: e.candidate.sdpMLineIndex,
          });
        }
      };

      pc.current.ontrack = (e) => {
        if (e.streams && e.streams[0]) {
          remoteVideo.current.srcObject = e.streams[0];
        }
      };

      localStream.current.getTracks().forEach((track) =>
        pc.current.addTrack(track, localStream.current)
      );

      await pc.current.setRemoteDescription({ type: "offer", sdp: offer.sdp });

      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);

      socket.current.emit("calling", {
        id: userInfo,
        type: "answer",
        sdp: answer.sdp,
      });
    } catch (error) {
      console.error("Error handling offer:", error);
    }
  }

  async function handleAnswer(answer) {
    if (!pc.current) return;
    try {
      await pc.current.setRemoteDescription({ type: "answer", sdp: answer.sdp });
    } catch (error) {
      console.error("Error setting remote description:", error);
    }
  }

  async function handleCandidate(candidate) {
    if (!pc.current) return;
    try {
      await pc.current.addIceCandidate({
        candidate: candidate.candidate,
        sdpMid: candidate.sdpMid,
        sdpMLineIndex: candidate.sdpMLineIndex,
      });
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
    }
  }

  function hangup() {
    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }

    setAudioState(false);
    setVideoState(false);
    hangupButton.current.disabled = true;
    muteAudButton.current.disabled = true;
    muteVideoButton.current.disabled = true;
  }

  function endCall() {
    Swal.fire({
      title: "End call?",
      showCancelButton: true,
      confirmButtonText: "Yes",
      cancelButtonText: "No",
    }).then((res) => {
      if (res.isConfirmed) {
        hangup();
        socket.current.emit("calling", { id: userInfo, type: "bye" });
        navigate("/");
      }
    });
  }

  function toggleAudio() {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setAudioState((prev) => !prev);
    }
  }

  function toggleVideo() {
    if (localStream.current) {
      localStream.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setVideoState((prev) => !prev);
    }
  }

  function toggleVideoFrontRear() {
    setIsFrontCamera((prev) => !prev);
    startCall(); // Would ideally switch camera facing, which needs constraints setup
  }

  return (
    <div className="w-screen h-screen flex flex-col justify-center items-center">
      <div className="flex space-x-4 mb-4">
        <video
          ref={localVideo}
          autoPlay
          playsInline
          muted
          className="w-84 h-63 bg-gray-200 rounded-lg shadow-md"
        ></video>
        <video
          ref={remoteVideo}
          autoPlay
          playsInline
          className="w-84 h-63 bg-gray-200 rounded-lg shadow-md"
        ></video>
      </div>
      <div className="flex space-x-4">
        <button ref={muteAudButton} onClick={toggleAudio}>
          {audioState ? <FiMic /> : <FiMicOff />}
        </button>
        <button ref={muteVideoButton} onClick={toggleVideo}>
          {videoState ? <FaVideo /> : <FaVideoSlash />}
        </button>
        <button ref={hangupButton} onClick={endCall}>
          <FaTimes />
        </button>
        <button onClick={toggleVideoFrontRear}>
          <FaCameraRotate />
        </button>
      </div>
    </div>
  );
};
