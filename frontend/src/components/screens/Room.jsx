import { useEffect, useRef } from "react";
import { useAuthStore } from "../../store/useAuthStore";

export const Room = () => {
  const { myStream, remoteStream, acceptCall } = useAuthStore();
  const myVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (myStream) myVideoRef.current.srcObject = myStream;
  }, [myStream]);

  useEffect(() => {
    if (remoteStream) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  return (
    <div className="h-screen pt-20">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="bg-base-300 rounded-xl p-6 space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold mb-4">Room</h1>
            <button className="btn btn-primary" onClick={acceptCall}>
              Accept Call
            </button>
            <h1 className="text-2xl mt-2.5">My Stream</h1>
            <video ref={myVideoRef} autoPlay playsInline />
            <h1 className="text-2xl mt-2.5">Remote Stream</h1>
            <video ref={remoteVideoRef} autoPlay playsInline />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Room;
