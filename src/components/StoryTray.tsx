"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { Plus } from "lucide-react";
import UserAvatar from "./UserAvatar";
import StoryViewer from "./StoryViewer";


interface StoryItem {
  id: string;
  url: string;
  type: string;
  createdAt: string;
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

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. משנים סטייט כדי להראות חיווי טעינה על העיגול שלך (אופציונלי אבל מומלץ)
    // setIsUploadingStory(true); 

    try {
      // 2. מעלים את הקובץ לשרת (משתמשים בנתיב ההעלאה הקיים שלכם שמחובר ל-Firebase)
      const formData = new FormData();
      formData.append("file", file);
      
      
      const uploadRes = await fetch("/api/stories/upload", { 
        method: "POST", 
        body: formData
      });
      
      if (!uploadRes.ok) throw new Error("Failed to upload file to Firebase");
      
      // כאן אנחנו צריכים לקבל את ה-URL של התמונה שחזרה מ-Firebase
      // נניח שזה חוזר ב- uploadData.url 
      const uploadData = await uploadRes.json(); 
      const imageUrl = uploadData.url; 

      if (!imageUrl) throw new Error("No URL returned from upload");

      // 3. שומרים את הסטורי החדש במסד הנתונים שלנו
      const storyRes = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          url: imageUrl, 
          type: file.type.startsWith("video/") ? "video" : "image" 
        }),
      });

      if (!storyRes.ok) throw new Error("Failed to save story to DB");

      // 4. מרעננים את הסטוריז כדי שהסטורי החדש יופיע מיד
      const newStoriesRes = await fetch("/api/stories");
      setGroupedStories(await newStoriesRes.json());

    } catch (error) {
      console.error("Story upload error:", error);
      alert("תקלה בהעלאת הסטורי, נסה שוב!");
    } finally {
      // מאפסים את ה-input כדי שאפשר יהיה להעלות שוב את אותה תמונה אם רוצים
      if (fileInputRef.current) fileInputRef.current.value = "";
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
                  // אנחנו מנסים קודם לקחת את השם והתמונה מהמסד נתונים, ואם אין - מהסשן
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
                    avatarUrl={story.user.avatar} // <--- פה המפתח! המידע המדויק מהשרת
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
        
        {/* אינפוט נסתר לבחירת קובץ - עם פתיחת מצלמה אוטומטית במובייל! */}
        <input
          type="file"
          accept="image/*" // הורדנו את הווידאו כדי להכריח מצלמה
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

    {/* רינדור הפופ-אפ של הסטוריז */}
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