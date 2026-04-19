"use client";

import React, { useState } from "react";
import { Heart, MessageCircle, Send, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import UserAvatar from "./UserAvatar";
import CommentsModal from "./CommentsModal";

// המבנה של פוסט
interface PostProps {
  post: {
    id: string;
    user: { name: string; avatar: string | null };
    url: string;
    caption: string;
    likesCount: number;
    commentsCount: number;
    isLikedByMe: boolean;
    createdAt: string;
  };
  isMine?: boolean;       // האם הפוסט שלי?
  onDeleted?: () => void; // פונקציה שתרוץ אחרי המחיקה
}

export default function PostCard({ post, isMine, onDeleted }: PostProps) {
  // סטייטים של לייקים
  const [liked, setLiked] = useState(post.isLikedByMe);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [isLiking, setIsLiking] = useState(false);
  
  // ── NEW: סטייט לאנימציית הלב הגדול מעל התמונה ──
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  
  // סטייטים של תגובות ומחיקה
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // פונקציית לייק (עם הגנה נגד לחיצות כפולות על הכפתור)
  const toggleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);

    const newLikedState = !liked;
    setLiked(newLikedState);
    setLikesCount((prev) => (newLikedState ? prev + 1 : prev - 1));

    try {
      const res = await fetch("/api/album/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: post.id }),
      });
      
      if (!res.ok) throw new Error("Failed to update like in DB");
    } catch (error) {
      console.error(error);
      setLiked(!newLikedState);
      setLikesCount((prev) => (!newLikedState ? prev + 1 : prev - 1));
    } finally {
      setIsLiking(false);
    }
  };

  // ── NEW: פונקציית טיפול בלחיצה כפולה על התמונה ──
  const handleImageDoubleClick = () => {
    // 1. מפעילים את האנימציה הויזואלית
    setShowHeartAnimation(true);
    
    // 2. מעלימים את הלב אחרי שנייה
    setTimeout(() => setShowHeartAnimation(false), 1000);

    // 3. אם עדיין לא עשינו לייק - מסמנים לייק בשרת
    if (!liked) {
      toggleLike();
    }
  };

  // פונקציית מחיקת פוסט
  const handleDeletePost = async () => {
    setShowDeleteConfirm(false);
    try {
      const res = await fetch(`/api/album?id=${post.id}`, { method: "DELETE" });
      if (res.ok) {
        onDeleted?.(); // מודיע לעמוד הראשי לרענן את הפיד
      } else {
        alert("שגיאה במחיקת הפוסט");
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-light)] sm:rounded-2xl overflow-hidden mb-6 shadow-sm relative">
      
      {/* ── Header: פרטי המשתמש שעשה את הפוסט ── */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <UserAvatar name={post.user.name} avatarUrl={post.user.avatar} className="w-10 h-10 text-sm" />
          <div>
            <p className="font-semibold text-[var(--text-primary)] text-sm">{post.user.name}</p>
            <p className="text-[var(--text-secondary)] text-xs">{post.createdAt}</p>
          </div>
        </div>
        
        {/* כפתור מחיקה מופיע רק אם הפוסט שייך למשתמש */}
        {isMine && (
          <button 
            onClick={() => setShowDeleteConfirm(true)} 
            className="text-[var(--text-secondary)] hover:text-red-500 transition-colors p-2 rounded-full hover:bg-[var(--bg-card-hover)]"
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>

      {/* ── Media: התמונה עצמה - שינינו פה כדי לתמוך בלחיצה כפולה ── */}
      <div 
        className="relative w-full aspect-square bg-black/50 flex items-center justify-center cursor-pointer overflow-hidden"
        onDoubleClick={handleImageDoubleClick} // <--- אירוע לחיצה כפולה!
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={post.url} 
          alt={post.caption} 
          className="w-full h-full object-cover select-none" // select-none מונע סימון תמונה כחול במובייל
        />

        {/* אנימציית הלב הגדול שקופץ */}
        <AnimatePresence>
          {showHeartAnimation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              transition={{ duration: 0.3, type: "spring", damping: 10 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
            >
              <Heart size={100} className="text-white fill-white drop-shadow-lg" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Actions: כפתורי לייק ותגובה ── */}
      <div className="p-3">
        <div className="flex items-center gap-4 mb-2">
          <button 
            onClick={toggleLike}
            className={`transition-transform active:scale-90 ${liked ? 'text-red-500' : 'text-[var(--text-primary)]'}`}
          >
            <Heart size={26} className={liked ? "fill-current" : ""} />
          </button>
          <button 
            onClick={() => setIsCommentsOpen(true)}
            className="text-[var(--text-primary)] transition-transform active:scale-90"
          >
            <MessageCircle size={26} />
          </button>
          <button className="text-[var(--text-primary)] transition-transform active:scale-90">
            <Send size={24} />
          </button>
        </div>

        {/* ── Footer: כיתוב ולייקים ── */}
        <div className="text-sm">
          <p className="font-semibold text-[var(--text-primary)] mb-1">
            {likesCount} likes
          </p>
          <p className="text-[var(--text-primary)]">
            <span className="font-semibold mr-2">{post.user.name}</span>
            {post.caption}
          </p>
          
          {commentsCount > 0 && (
            <button 
              onClick={() => setIsCommentsOpen(true)}
              className="text-[var(--text-secondary)] text-sm mt-2 font-medium"
            >
              View all {commentsCount} comments
            </button>
          )}
        </div>
      </div>

      {/* מודאל תגובות */}
      <CommentsModal 
        mediaId={post.id} 
        isOpen={isCommentsOpen} 
        onClose={() => setIsCommentsOpen(false)} 
        onCommentAdded={() => setCommentsCount(prev => prev + 1)}
      />

      {/* מודאל מחיקת פוסט אלגנטי */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setShowDeleteConfirm(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--bg-primary)] p-6 rounded-3xl w-full max-w-xs text-center border border-[var(--border-light)] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">למחוק את הפוסט?</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-6">כל הלייקים והתגובות יימחקו יחד איתו.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium hover:bg-[var(--bg-card-hover)] transition-colors">
                  ביטול
                </button>
                <button onClick={handleDeletePost} className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-500 font-medium hover:bg-red-500/30 transition-colors">
                  מחק פוסט
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}