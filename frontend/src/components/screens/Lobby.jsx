import { useRef, useEffect, useState } from "react";
import { FiMic, FiMicOff } from "react-icons/fi";
import { FaVideo, FaVideoSlash, FaTimes } from "react-icons/fa";
import { FaCameraRotate } from "react-icons/fa6";
import { io } from "socket.io-client";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

const socket = io("https://real-time-chat-app-backend-9p1k.onrender.com", { transports: ["websocket"] });

const configuration = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

export const Lobby = () => {
  const userInfo = 123456; // Assume userId is defined elsewhere

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
  useEffect(() => {
    startCall();
  }, []);

  useEffect(() => {
    hangupButton.current.disabled = true;
    muteAudButton.current.disabled = true;
    muteVideoButton.current.disabled = true;

    socket.on("calling", async (e) => {
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
          if (pc.current) {
            hangup();
          }
          break;
        default:
          console.log("Unhandled event", e);
          break;
      }
    });

    return () => {
      socket.off("calling");
    };
  }, []);

  async function makeCall() {
    console.log("Making a call...");
    try {
      pc.current = new RTCPeerConnection(configuration);

      pc.current.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("calling", {
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
        } else {
          console.error("No streams available in ontrack event.");
        }
      };

      localStream.current
        .getTracks()
        .forEach((track) => pc.current.addTrack(track, localStream.current));

      const offer = await pc.current.createOffer();
      await pc.current.setLocalDescription(offer);
      socket.emit("calling", { id: userInfo, type: "offer", sdp: offer.sdp });
    } catch (error) {
      console.error("Error making call:", error);
    }
  }

  async function handleOffer(offer) {
    if (pc.current) {
      console.error("Existing peer connection detected.");
      return;
    }

    try {
      pc.current = new RTCPeerConnection(configuration);

      pc.current.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("calling", {
            type: "candidate",
            id: userInfo,
            candidate: e.candidate.candidate,
            sdpMid: e.candidate.sdpMid,
            sdpMLineIndex: e.candidate.sdpMLineIndex,
          });
        }
      };

      pc.current.ontrack = (event) => {
        if (remoteVideo.current) {
          remoteVideo.current.srcObject = event.streams[0];
        }
      };

      localStream.current
        .getTracks()
        .forEach((track) => pc.current.addTrack(track, localStream.current));

      await pc.current.setRemoteDescription(offer);
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);

      socket.emit("calling", { id: userInfo, type: "answer", sdp: answer.sdp });
    } catch (error) {
      console.error("Error handling offer:", error);
    }
  }

  async function handleAnswer(answer) {
    if (!pc.current) {
      console.error("No peer connection");
      return;
    }

    try {
      await pc.current.setRemoteDescription(answer);
    } catch (error) {
      console.error("Error setting remote description:", error);
    }
  }

  async function handleCandidate(candidate) {
    if (!pc.current) {
      console.error("No peer connection to add candidate");
      return;
    }

    try {
      await pc.current.addIceCandidate(candidate);
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
      setAudioState(false);
      setVideoState(false);
    }

    hangupButton.current.disabled = false;
    muteAudButton.current.disabled = false;
    muteVideoButton.current.disabled = false;
  }

  const startCall = async () => {
    try {
      localStream.current = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: { echoCancellation: true },
      });
      localVideo.current.srcObject = localStream.current;

      hangupButton.current.disabled = false;
      muteAudButton.current.disabled = false;
      muteVideoButton.current.disabled = false;

      socket.emit("calling", { id: userInfo, type: "ready" });
    } catch (error) {
      console.error("Error starting call:", error);
    }
  };

  const navigate = useNavigate();

  const endCall = () => {
    Swal.fire({
      title: "End call?",
      showCancelButton: true,
      confirmButtonText: "Yes",
      cancelButtonText: "No",
    }).then((res) => {
      if (res.isConfirmed) {
        hangup();
        socket.emit("calling", { id: userInfo, type: "bye" });

        navigate("/"); // Navigate to the home page after ending the call
      }
    });
  };

  function toggleAudio() {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setAudioState(!audioState);
    }
  }

  function toggleVideo() {
    if (localStream.current) {
      localStream.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setVideoState(!videoState);
    }
  }
  function toggleVideoFrontRear() {
    setIsFrontCamera((prev) => !prev); // Toggle Camera
    startCall(); // Restart with new camera mode
  }

  return (
    <div className=" w-screen h-screen flex justify-center items-center">
      <div className="flex space-x-4">
        <video
          ref={localVideo}
          autoPlay
          playsInline
          className="w-84 h-63 bg-gray-200 rounded-lg shadow-md"
        ></video>
        <video
          ref={remoteVideo}
          autoPlay
          playsInline
          className="w-84 h-63 bg-gray-200 rounded-lg shadow-md"
        ></video>
      </div>
      <div className="absolute bottom-50 flex space-x-4">
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
