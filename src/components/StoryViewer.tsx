"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Camera } from "lucide-react";
import UserAvatar from "./UserAvatar";

interface StoryItem { id: string; url: string; type: string; createdAt: string; caption?: string | null; }
interface UserStories { id: string; user: { id: string; name: string; avatar: string | null }; isMe: boolean; items: StoryItem[]; }

interface StoryViewerProps {
  storyGroups: UserStories[];
  initialGroupIndex: number;
  onClose: () => void;
  onDelete?: (storyId: string) => void;
  onAddMore?: () => void;
}

const STORY_DURATION = 5000;

export default function StoryViewer({ storyGroups, initialGroupIndex, onClose, onDelete, onAddMore }: StoryViewerProps) {
  const [currentGroupIndex, setCurrentGroupIndex] = useState(initialGroupIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const currentGroup = storyGroups[currentGroupIndex];
  const stories = useMemo<StoryItem[]>(() => currentGroup?.items ?? [], [currentGroup]);
  const isMe = currentGroup?.isMe;

  // Fully parses 2D text coordinates (X & Y) with translate safety overrides
  const parsedCaption = useMemo(() => {
    const rawCaption = stories[currentStoryIndex]?.caption;
    if (!rawCaption) return null;

    try {
      if (rawCaption.startsWith("{")) {
        return JSON.parse(rawCaption) as { text: string; x: number; y: number };
      }
    } catch (e) {
      console.error("Failed to parse 2D story layout positioning", e);
    }

    // Default legacy text placement
    return { text: rawCaption, x: 50, y: 50 };
  }, [stories, currentStoryIndex]);

  useEffect(() => {
    if (!isMe && stories[currentStoryIndex]) {
      fetch("/api/stories/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: stories[currentStoryIndex].id })
      }).catch(console.error);
    }
  }, [currentStoryIndex, isMe, stories]);

  const handleNext = useCallback(() => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex((prev) => prev + 1);
    } else if (currentGroupIndex < storyGroups.length - 1) {
      setCurrentGroupIndex((prev) => prev + 1);
      setCurrentStoryIndex(0); 
    } else {
      onClose();
    }
  }, [currentStoryIndex, stories.length, currentGroupIndex, storyGroups.length, onClose]);

  const handlePrev = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex((prev) => prev - 1);
    } else if (currentGroupIndex > 0) {
      setCurrentGroupIndex((prev) => prev - 1);
      setCurrentStoryIndex(storyGroups[currentGroupIndex - 1].items.length - 1);
    }
  }, [currentStoryIndex, currentGroupIndex, storyGroups]);

  useEffect(() => {
    const timer = setTimeout(() => handleNext(), STORY_DURATION);
    return () => clearTimeout(timer);
  }, [currentGroupIndex, currentStoryIndex, handleNext]);

  if (!currentGroup || stories.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 bg-black flex flex-col sm:p-4"
    >
      <div className="relative flex-1 w-full max-w-md mx-auto sm:rounded-3xl overflow-hidden shadow-2xl bg-black" style={{ perspective: "1200px" }}>
        
        <AnimatePresence>
          <motion.div
            key={currentGroup.id}
            initial={{ rotateY: 90, opacity: 0.5, zIndex: 10 }}
            animate={{ rotateY: 0, opacity: 1, zIndex: 20 }}
            exit={{ rotateY: -90, opacity: 0.5, zIndex: 10 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="absolute inset-0 origin-center"
          >
            {/* Progress Bars */}
            <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 p-3 pt-4 sm:pt-4 pb-0 bg-gradient-to-b from-black/70 to-transparent">
              {stories.map((story, idx) => (
                <div key={story.id} className="h-0.5 flex-1 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm">
                  <motion.div
                    key={`${story.id}-${currentStoryIndex}`}
                    className="h-full bg-white"
                    initial={{ width: idx < currentStoryIndex ? "100%" : "0%" }}
                    animate={{ width: idx === currentStoryIndex ? "100%" : idx < currentStoryIndex ? "100%" : "0%" }}
                    transition={idx === currentStoryIndex ? { duration: STORY_DURATION / 1000, ease: "linear" } : { duration: 0 }}
                  />
                </div>
              ))}
            </div>

            {/* Header User Details */}
            <div className="absolute top-6 left-0 right-0 z-30 flex items-center justify-between px-3">
              <div className="flex items-center gap-2">
                <UserAvatar name={currentGroup.user.name} avatarUrl={currentGroup.user.avatar} className="w-8 h-8 text-xs ring-1 ring-white/20" />
                <span className="text-white text-sm font-semibold drop-shadow-md">{currentGroup.user.name}</span>
              </div>
              <button onClick={onClose} className="p-2 text-white drop-shadow-md hover:bg-white/10 rounded-full transition-colors z-40">
                <X size={24} />
              </button>
            </div>

            {/* Image Containment View */}
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={stories[currentStoryIndex].url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 blur-2xl scale-110" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={stories[currentStoryIndex].url} alt="Story" className="relative z-10 w-full h-full object-contain" />
            </div>

            {/* 2D Placed Responsive Overlay Text */}
            {parsedCaption && (
              <div 
                className="absolute z-20 pointer-events-none"
                style={{ 
                  top: `${parsedCaption.y}%`, 
                  left: `${parsedCaption.x ?? 50}%`,
                  transform: "translate(-50%, -50%)", // Perfectly aligns center origin to coordinates
                  width: "max-content",
                  maxWidth: "85%"
                }}
              >
                <span className="bg-black/50 text-white text-xl md:text-2xl px-5 py-2.5 rounded-2xl backdrop-blur-md text-center font-bold drop-shadow-2xl block break-words leading-snug">
                  {parsedCaption.text}
                </span>
              </div>
            )}

            {/* Tap Triggers */}
            <div className="absolute inset-0 z-20 flex">
              <div className="w-1/3 h-full" onClick={handlePrev} />
              <div className="w-2/3 h-full" onClick={handleNext} />
            </div>

            {/* Footer Admin Actions */}
            {isMe && (
              <div className="absolute bottom-6 left-0 right-0 z-40 flex justify-between px-6 pointer-events-none">
                <button onClick={(e) => { e.stopPropagation(); onAddMore?.(); }} className="pointer-events-auto bg-black/40 hover:bg-black/60 transition-colors p-3.5 rounded-full text-white backdrop-blur-md shadow-lg">
                  <Camera size={24} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }} className="pointer-events-auto bg-black/40 hover:bg-black/60 transition-colors p-3.5 rounded-full text-red-500 backdrop-blur-md shadow-lg">
                  <Trash2 size={24} />
                </button>
              </div>
            )}

            {/* Action Dialog */}
            <AnimatePresence>
              {showDeleteConfirm && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 pointer-events-auto"
                  onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
                >
                  <div className="bg-[var(--bg-primary)] p-6 rounded-3xl w-full max-w-xs text-center border border-[var(--border-light)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Delete the Story?</h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-6">This action cannot be undone.</p>
                    <div className="flex gap-3">
                      <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium hover:bg-[var(--bg-card-hover)] transition-colors">
                        Cancel
                      </button>
                      <button onClick={() => { onDelete?.(stories[currentStoryIndex].id); setShowDeleteConfirm(false); }} className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-500 font-medium hover:bg-red-500/30 transition-colors">
                        Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}