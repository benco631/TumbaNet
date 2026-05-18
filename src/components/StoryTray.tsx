"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { Plus, X, RotateCcw, Zap } from "lucide-react";
import { uploadFileToFirebase } from "@/lib/firebaseUpload";
import UserAvatar from "./UserAvatar";
import StoryViewer from "./StoryViewer";

interface StoryItem {
  id: string;
  url: string;
  type: string;
  createdAt: string;
  caption?: string | null;
}

interface UserStories {
  id: string;
  user: { id: string; name: string; avatar: string | null };
  hasUnseen: boolean;
  isMe: boolean;
  items: StoryItem[];
}

// Helper function to convert Data URL to File synchronously to prevent race conditions
const dataURLtoFile = (dataurl: string, filename: string) => {
  const arr = dataurl.split(",");
  
  // הגנה: אם אין מאצ' של סוג קובץ, נברירת המחדל תהיה jpeg
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  
  // הגנה: אם אין מידע להמיר, נמיר מחרוזת ריקה כדי לא לקרוס
  const bstr = atob(arr[1] || "");
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

export default function StoryTray() {
  const { data: session } = useSession();
  const [groupedStories, setGroupedStories] = useState<UserStories[]>([]);
  const [selectedStoryGroup, setSelectedStoryGroup] = useState<UserStories | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // In-App Camera States
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Story Preview & Text States
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);

  // Bounding container refs for 2D dragging coordinates calculation
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const draggableTextRef = useRef<HTMLDivElement>(null);

  // מאזין: ברגע שהמצלמה נפתחת ויש לנו זרם - נחבר אותו לווידאו שעל המסך
  useEffect(() => {
    if (isCameraOpen && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      // פקודת חובה למובייל כדי שהווידאו באמת יתחיל לרוץ ולא יקפא
      videoRef.current.play().catch(console.error);
    }
  }, [isCameraOpen, cameraStream]);

  const loadStories = async () => {
    try {
      const res = await fetch("/api/stories");
      const data = await res.json();
      setGroupedStories(Array.isArray(data) ? data : []);
      setIsLoading(false);
    } catch (err) {
      console.error("Failed to load stories:", err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStories();
  }, []);

  const handleStoryClick = (storyGroup: UserStories) => {
    if (storyGroup.items.length > 0) {
      setSelectedStoryGroup(storyGroup);
    }
  };

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }
    setCameraStream(null);
    setIsCameraOpen(false);
  }, [cameraStream]);

 
const startCamera = async (mode: "user" | "environment") => {
    // במקום לקרוא ל-stopCamera() שסוגר את כל המסך, אנחנו מכבים רק את הזרם הישן
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }
    
    setIsCameraLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: mode,
          width: { ideal: 4096 }, 
          height: { ideal: 2160 }
        },
        audio: false,
      });

      setCameraStream(stream);
      setFacingMode(mode);
      setIsCameraOpen(true); // שומרים על המסך פתוח
    } catch (err) {
      console.error("Camera access error:", err);
      alert("Could not access camera. Please check your permissions.");
      stopCamera(); // פה כן נסגור הכל כי קרתה שגיאה
    } finally {
      setIsCameraLoading(false);
    }
  };

  const toggleCameraMode = () => {
    startCamera(facingMode === "user" ? "environment" : "user");
  };

 const capturePhoto = () => {
    if (!videoRef.current || !cameraStream) return;

    const video = videoRef.current;
    
    // 🚨 הגנה קריטית: מוודאים שהווידאו באמת התחיל לרוץ ויש לו גודל
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.warn("Camera is still initializing dimensions...");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setPreviewUrl(dataUrl);
    setCaptionText("");
    setIsEditingText(false);

    // Create file instantly and synchronously
    const file = dataURLtoFile(dataUrl, `story-${Date.now()}.jpg`);
    setPreviewFile(file);

    stopCamera();
  };

  const handleUploadStory = async () => {
    if (!previewFile) return;
    setIsUploading(true);

    // Calculate 2D percentage positions (X and Y) relative to viewport container bounds
    let xPercent = 50;
    let yPercent = 50;
    
    if (captionText && draggableTextRef.current && previewContainerRef.current) {
      const textRect = draggableTextRef.current.getBoundingClientRect();
      const containerRect = previewContainerRef.current.getBoundingClientRect();
      
      const textCenterX = textRect.left + textRect.width / 2;
      const textCenterY = textRect.top + textRect.height / 2;
      
      xPercent = ((textCenterX - containerRect.left) / containerRect.width) * 100;
      yPercent = ((textCenterY - containerRect.top) / containerRect.height) * 100;
    }

    try {
      const imageUrl = await uploadFileToFirebase(previewFile, "stories");
      if (!imageUrl) throw new Error("No URL returned from Firebase upload");

      // Save structured JSON with both coordinates
      const finalCaption = captionText.trim() 
        ? JSON.stringify({ text: captionText.trim(), x: xPercent, y: yPercent }) 
        : null;

      const storyRes = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: imageUrl,
          type: "image",
          caption: finalCaption,
        }),
      });

      if (!storyRes.ok) throw new Error("Failed to save story to database");

      setPreviewFile(null);
      setPreviewUrl(null);
      setCaptionText("");
      loadStories();
    } catch (error) {
      console.error("Story upload error:", error);
      alert("Failed to upload story. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    try {
      const res = await fetch(`/api/stories?storyId=${storyId}`, { method: "DELETE" });
      if (res.ok) {
        setSelectedStoryGroup(null);
        loadStories();
      } else {
        alert("Error deleting story");
      }
    } catch (error) {
      console.error("Failed to delete story:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full flex gap-4 px-4 py-3 overflow-x-auto hide-scrollbar opacity-50">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 animate-pulse">
            <div className="w-16 h-16 rounded-full bg-[var(--border-light)]" />
            <div className="w-12 h-3 rounded bg-[var(--border-light)]" />
          </div>
        ))}
      </div>
    );
  }

  const myStoryGroup = groupedStories.find((s) => s.isMe);
  const othersStories = groupedStories.filter((s) => !s.isMe);
  const currentUser = session?.user as { name?: string; image?: string } | undefined;

  return (
    <>
      <div className="w-full overflow-x-auto pb-4 pt-1 hide-scrollbar">
        <div className="flex gap-4 px-1 w-max">
          
          {/* Your Story */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition-transform relative"
            onClick={myStoryGroup ? () => handleStoryClick(myStoryGroup) : () => startCamera("environment")}
          >
            <div 
              className={`p-[2.5px] rounded-full ${
                myStoryGroup 
                  ? (myStoryGroup.hasUnseen ? "bg-gradient-to-tr from-tumba-400 via-neon-pink to-tumba-600 animate-neon-pulse" : "bg-[var(--border-light)]") 
                  : ""
              }`}
            >
              <div className="p-[3px] bg-[var(--bg-primary)] rounded-full relative">
                <UserAvatar
                  name={myStoryGroup?.user?.name || currentUser?.name || "You"}
                  avatarUrl={myStoryGroup?.user?.avatar || (currentUser as { avatar?: string })?.avatar || currentUser?.image || null}
                  className="w-16 h-16 text-xl"
                />
                {!myStoryGroup && (
                  <div className="absolute bottom-0 right-0 bg-tumba-500 rounded-full p-1 border-2 border-[var(--bg-primary)] text-white shadow-sm">
                    <Plus size={12} strokeWidth={3} />
                  </div>
                )}
              </div>
            </div>
            <span className="text-[11px] font-medium tracking-wide text-[var(--text-secondary)]">
              Your Story
            </span>
          </motion.div>

          {/* Others' Stories */}
          {othersStories.map((story, i) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              onClick={() => handleStoryClick(story)}
              className="flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
            >
              <div
                className={`p-[2.5px] rounded-full ${
                  story.hasUnseen
                    ? "bg-gradient-to-tr from-tumba-400 via-neon-pink to-tumba-600 animate-neon-pulse"
                    : "bg-[var(--border-light)]"
                }`}
              >
                <div className="p-[3px] bg-[var(--bg-primary)] rounded-full">
                  <UserAvatar
                    name={story.user.name}
                    avatarUrl={story.user.avatar}
                    className="w-16 h-16 text-xl"
                  />
                </div>
              </div>
              <span
                className={`text-[11px] font-medium tracking-wide ${
                  story.hasUnseen ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                }`}
              >
                {story.user.name}
              </span>
            </motion.div>
          ))}
        </div>
        
        <style dangerouslySetInnerHTML={{__html: `
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}} />
      </div>

      {/* In-App Camera Modal */}
      <AnimatePresence>
        {isCameraOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col"
          >
            {isCameraLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black">
                <Zap size={40} className="text-neon-pink animate-pulse" />
                <span className="text-white/70 font-medium">Opening camera...</span>
              </div>
            )}

            <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black">
              <video
  ref={videoRef}
  autoPlay
  playsInline
  muted
  // שינינו מ object-cover ל object-contain
  className={`absolute inset-0 w-full h-full object-contain ${facingMode === "user" ? "-scale-x-100" : ""}`}
/>

              <div className="absolute top-4 left-0 right-0 z-30 flex justify-between px-4 pointer-events-none">
                <button onClick={stopCamera} className="pointer-events-auto p-3.5 bg-black/40 text-white rounded-full backdrop-blur-md">
                  <X size={24} />
                </button>
                <button onClick={toggleCameraMode} className="pointer-events-auto p-3.5 bg-black/40 text-white rounded-full backdrop-blur-md">
                  <RotateCcw size={24} />
                </button>
              </div>

              <div className="absolute bottom-10 left-0 right-0 z-30 flex justify-center pointer-events-none">
                <button
                  onClick={capturePhoto}
                  className="pointer-events-auto w-20 h-20 bg-white rounded-full p-1.5 shadow-2xl transition-all active:scale-90"
                >
                  <div className="w-full h-full rounded-full border-4 border-black" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Optional & 2D Draggable Preview Modal */}
      <AnimatePresence>
        {previewUrl && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }}
            className="fixed inset-0 z-[60] bg-black flex flex-col sm:p-4"
          >
            <div className="relative flex-1 w-full max-w-md mx-auto sm:rounded-3xl overflow-hidden bg-black flex flex-col">
              
              {/* Cancel Button */}
              <button 
                onClick={() => { setPreviewUrl(null); setPreviewFile(null); setCaptionText(""); setIsEditingText(false); }} 
                className="absolute top-4 left-4 z-50 p-2 bg-black/50 text-white rounded-full backdrop-blur-md"
              >
                <X size={24} />
              </button>

              {/* Interactive Screen Area */}
              <div 
                ref={previewContainerRef}
                className="relative flex-1 flex items-center justify-center overflow-hidden cursor-text"
                onClick={() => { if (!isEditingText && !captionText) setIsEditingText(true); }}
              >
                <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-30 blur-2xl scale-110 pointer-events-none" />
                <img src={previewUrl} alt="Preview" className="relative z-10 w-full h-full object-contain pointer-events-none" />
                
                {/* Guide hint when empty */}
                {!captionText && !isEditingText && (
                  <div className="absolute z-20 text-white/60 text-sm font-medium pointer-events-none bg-black/20 px-4 py-2 rounded-full backdrop-blur-sm">
                    Tap anywhere to type
                  </div>
                )}

                {/* 2D DRAGGABLE TEXT (Both X and Y) */}
                {captionText && !isEditingText && (
                  <motion.div
                    ref={draggableTextRef}
                    drag={true} // Enabled full 2D dragging instead of restricting to "y"
                    dragConstraints={previewContainerRef}
                    dragElastic={0.05}
                    dragMomentum={false}
                    whileDrag={{ scale: 1.05 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingText(true);
                    }}
                    className="absolute z-30 bg-black/50 text-white text-xl md:text-2xl px-5 py-2.5 rounded-2xl backdrop-blur-md text-center font-bold shadow-2xl max-w-[85%] break-words cursor-grab active:cursor-grabbing select-none"
                    style={{ top: "45%" }}
                  >
                    {captionText}
                  </motion.div>
                )}

                {/* Input text overlay box */}
                <AnimatePresence>
                  {isEditingText && (
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4"
                      onClick={(e) => { e.stopPropagation(); setIsEditingText(false); }}
                    >
                      <textarea
                        autoFocus
                        value={captionText}
                        onChange={(e) => setCaptionText(e.target.value)}
                        placeholder="Type something..."
                        className="bg-transparent text-white text-2xl md:text-3xl px-4 py-3 text-center font-bold placeholder:text-white/30 resize-none outline-none w-full max-w-xs overflow-hidden"
                        rows={3}
                        maxLength={80}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); setIsEditingText(false); }}
                        className="mt-6 px-6 py-2.5 bg-white text-black font-bold rounded-full text-sm shadow-md transition-transform active:scale-95"
                      >
                        Done
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom Action Bar */}
              <div className="p-4 bg-black/80 backdrop-blur-md absolute bottom-0 left-0 right-0 z-50">
                <button
                  onClick={handleUploadStory}
                  disabled={isUploading || isEditingText}
                  className="w-full py-3.5 bg-gradient-to-r from-tumba-500 to-neon-pink text-white rounded-2xl font-bold text-lg shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                  {isUploading ? "Sharing story..." : "Share to Story"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedStoryGroup && (
          <StoryViewer 
            key="story-viewer"
            storyGroups={groupedStories.filter(g => g.items.length > 0)}
            initialGroupIndex={groupedStories.filter(g => g.items.length > 0).findIndex(g => g.id === selectedStoryGroup.id)}
            onClose={() => {
              setSelectedStoryGroup(null);
              loadStories();
            }}
            onAddMore={() => startCamera("environment")}
            onDelete={handleDeleteStory}
          />
        )}
      </AnimatePresence>
    </>
  );
}