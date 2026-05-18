"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { Plus, X } from "lucide-react"; // הוספנו פה את ה-X
import { uploadFileToFirebase } from "@/lib/firebaseUpload";
import UserAvatar from "./UserAvatar";
import StoryViewer from "./StoryViewer";

// הוספנו את ה-caption לאינטרפייס
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

export default function StoryTray() {
  const { data: session } = useSession();
  const [groupedStories, setGroupedStories] = useState<UserStories[]>([]);
  const [selectedStoryGroup, setSelectedStoryGroup] = useState<UserStories | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // States חדשים לתצוגה המקדימה של העלאת הסטורי
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // רפרנס לאינפוט הנסתר שיפתח את הגלריה בטלפון כנלחץ על הפלוס
  const fileInputRef = useRef<HTMLInputElement>(null);

  // יצרנו פונקציה חיצונית כדי שנוכל לקרוא לה גם אחרי מחיקה או סגירת סטורי
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

  // מפעילים את הפונקציה פעם אחת כשהעמוד נטען
  useEffect(() => {
    loadStories();
  }, []);

  const handleStoryClick = (storyGroup: UserStories) => {
    if (storyGroup.items.length > 0) {
      setSelectedStoryGroup(storyGroup);
    }
  };

  const handleAddStoryClick = () => {
    // פותח את חלון בחירת הקבצים של המכשיר
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // יוצרים URL זמני לתצוגה המקדימה
    const localUrl = URL.createObjectURL(file);
    setPreviewFile(file);
    setPreviewUrl(localUrl);
    setCaptionText(""); // מאפסים טקסט קודם
    
    // מנקים את האינפוט כדי שאפשר יהיה לבחור שוב את אותו קובץ
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // פונקציית ההעלאה הסופית - רצה רק אחרי לחיצה על "שתף"
  const handleUploadStory = async () => {
    if (!previewFile) return;
    setIsUploading(true);

    try {
      // 1. Upload file directly to Firebase Storage
      const imageUrl = await uploadFileToFirebase(previewFile, "stories");
      if (!imageUrl) throw new Error("No URL returned from Firebase upload");

      // 2. Save story metadata to the database
      const storyRes = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: imageUrl,
          type: previewFile.type.startsWith("video/") ? "video" : "image",
          caption: captionText.trim() || null, // מוסיפים את הטקסט!
        }),
      });

      if (!storyRes.ok) throw new Error("Failed to save story to database");

      // 3. מנקים את חלון התצוגה המקדימה ומרעננים סטוריז
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
        setSelectedStoryGroup(null); // סוגר את חלון הצפייה
        loadStories(); // מרענן את השורות והעיגולים
      } else {
        alert("שגיאה במחיקת הסטורי");
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

  // מחלקים את הנתונים: הסטורי שלי מול הסטוריז של החברים
  const myStoryGroup = groupedStories.find((s) => s.isMe);
  const othersStories = groupedStories.filter((s) => !s.isMe);
  const currentUser = session?.user as { name?: string; image?: string } | undefined;

  return (
    <>
      <div className="w-full overflow-x-auto pb-4 pt-1 hide-scrollbar">
        <div className="flex gap-4 px-1 w-max">
          
          {/* ── 1. הסטורי שלי (או כפתור הוספה אם אין לי) ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition-transform relative"
            onClick={myStoryGroup ? () => handleStoryClick(myStoryGroup) : handleAddStoryClick}
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
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  avatarUrl={myStoryGroup?.user?.avatar || (currentUser as any)?.avatar || currentUser?.image || null}
                  className="w-16 h-16 text-xl"
                />
                {/* פלוס קטן רק אם אין לי סטורי בכלל */}
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

          {/* ── 2. הסטוריז של שאר החברים ── */}
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
        
        {/* אינפוט נסתר לבחירת קובץ */}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileSelected}
        />
        <style dangerouslySetInnerHTML={{__html: `
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}} />
      </div>

      {/* ── מסך התצוגה המקדימה להוספת סטורי (חדש) ── */}
      <AnimatePresence>
        {previewUrl && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: "100%" }}
            className="fixed inset-0 z-[60] bg-black flex flex-col sm:p-4"
          >
            <div className="relative flex-1 w-full max-w-md mx-auto sm:rounded-3xl overflow-hidden bg-black flex flex-col">
              {/* כפתור ביטול */}
              <button 
                onClick={() => { setPreviewUrl(null); setPreviewFile(null); }} 
                className="absolute top-4 left-4 z-50 p-2 bg-black/50 text-white rounded-full backdrop-blur-md"
              >
                <X size={24} />
              </button>

              {/* תצוגת התמונה */}
              <div className="relative flex-1 flex items-center justify-center overflow-hidden">
                {/* רקע מטושטש */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-30 blur-2xl scale-110" />
                {/* התמונה המקורית ב-contain */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Preview" className="relative z-10 w-full h-full object-contain" />
                
                {/* אזור כתיבת הטקסט במרכז התמונה */}
                <div className="absolute top-1/2 left-0 right-0 z-20 flex justify-center px-4 -translate-y-1/2">
                  <textarea
                    autoFocus
                    value={captionText}
                    onChange={(e) => setCaptionText(e.target.value)}
                    placeholder="הוסף טקסט..."
                    className="bg-black/40 text-white text-2xl md:text-3xl px-4 py-3 rounded-2xl backdrop-blur-md text-center font-bold drop-shadow-2xl placeholder:text-white/60 resize-none outline-none w-10/12 overflow-hidden"
                    rows={2}
                    maxLength={60}
                  />
                </div>
              </div>

              {/* כפתור העלאה */}
              <div className="p-4 bg-black/80 backdrop-blur-md absolute bottom-0 left-0 right-0 z-50">
                <button
                  onClick={handleUploadStory}
                  disabled={isUploading}
                  className="w-full py-3.5 bg-gradient-to-r from-tumba-500 to-neon-pink text-white rounded-2xl font-bold text-lg shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                  {isUploading ? "מעלה סטורי..." : "שתף לסטורי"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* רינדור הפופ-אפ של הסטוריז הקיימים */}
      <AnimatePresence>
        {selectedStoryGroup && (
          <StoryViewer 
            key="story-viewer"
            storyGroups={groupedStories.filter(g => g.items.length > 0)}
            initialGroupIndex={groupedStories.filter(g => g.items.length > 0).findIndex(g => g.id === selectedStoryGroup.id)}
            onClose={() => {
              setSelectedStoryGroup(null); // סוגר את החלון
              loadStories(); // מרענן מיד כדי שהעיגול יהפוך לכהה אם ראינו הכל
            }}
            onAddMore={handleAddStoryClick}
            onDelete={handleDeleteStory}
          />
        )}
      </AnimatePresence>
    </>
  );
}