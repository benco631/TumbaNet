"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send } from "lucide-react";
import UserAvatar from "./UserAvatar";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; avatar: string | null };
}

interface CommentsModalProps {
  mediaId: string;
  isOpen: boolean;
  onClose: () => void;
  onCommentAdded: () => void; // כדי לעדכן את מונה התגובות בכרטיס הראשי
}

export default function CommentsModal({ mediaId, isOpen, onClose, onCommentAdded }: CommentsModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // מביאים את התגובות רק כשהמודאל נפתח
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetch(`/api/album/comment?mediaId=${mediaId}`)
        .then((res) => res.json())
        .then((data) => {
          setComments(Array.isArray(data) ? data : []);
          setIsLoading(false);
        });
    }
  }, [isOpen, mediaId]);

  // גלילה אוטומטית לתגובה החדשה ביותר
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isPosting) return;

    setIsPosting(true);
    try {
      const res = await fetch("/api/album/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId, content: newComment }),
      });

      if (res.ok) {
        const postedComment = await res.json();
        setComments((prev) => [...prev, postedComment]); // מוסיפים מיד לרשימה
        setNewComment("");
        onCommentAdded(); // מעדכנים את הכרטיס הראשי
      }
    } catch {
      console.error("Failed to post comment");
    } finally {
      setIsPosting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-center items-end sm:items-center bg-black/60 p-0 sm:p-4">
        {/* אזור לחיצה סמוי לסגירה */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-[var(--bg-primary)] h-[75vh] sm:h-[600px] sm:rounded-3xl rounded-t-3xl flex flex-col shadow-2xl border border-[var(--border-light)] overflow-hidden"
          onClick={(e) => e.stopPropagation()} // מונע סגירה כשלוחצים בתוך החלון
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-light)] bg-[var(--bg-secondary)]">
            <h3 className="font-semibold text-lg text-[var(--text-primary)]">Comments</h3>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-[var(--bg-card-hover)] transition-colors text-[var(--text-secondary)]">
              <X size={20} />
            </button>
          </div>

          {/* רשימת התגובות */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoading ? (
              <div className="text-center text-[var(--text-secondary)] animate-pulse mt-4">Loading comments...</div>
            ) : comments.length === 0 ? (
              <div className="text-center text-[var(--text-secondary)] mt-10">No comments yet. Be the first!</div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <UserAvatar name={comment.user.name} avatarUrl={comment.user.avatar} className="w-8 h-8 text-xs" />
                  <div className="flex-1 bg-[var(--bg-secondary)] p-3 rounded-2xl rounded-tl-none">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{comment.user.name}</p>
                    <p className="text-sm text-[var(--text-secondary)] mt-0.5 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* אזור כתיבת תגובה */}
          <form onSubmit={handlePostComment} className="p-4 border-t border-[var(--border-light)] bg-[var(--bg-secondary)] flex items-center gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-tumba-400 text-[var(--text-primary)]"
            />
            <button
              type="submit"
              disabled={!newComment.trim() || isPosting}
              className="p-2.5 bg-tumba-500 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-tumba-400 transition-colors"
            >
              <Send size={18} className={newComment.trim() ? "translate-x-[-1px] translate-y-[1px]" : ""} />
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}