"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import PostCard from "./PostCard";

export default function HomeFeed() {
  const { data: session } = useSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // חילוץ ה-ID של המשתמש הנוכחי מתוך הסשן
  const currentUserId = (session?.user as { id?: string })?.id;

  const fetchPosts = async () => {
    try {
      // מושכים את הפוסטים (כמו שעשינו באלבום)
      const res = await fetch("/api/album"); 
      const data = await res.json();
      
      // מסדרים מהחדש לישן
      const sortedData = Array.isArray(data) ? data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];
      setPosts(sortedData);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 mt-6 px-4 sm:px-0 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-full aspect-square bg-[var(--border-light)] rounded-2xl" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center mt-16 text-[var(--text-secondary)]">
        <p className="text-lg font-medium">no posts yet </p>
        <p className="text-sm mt-1">be the first to post something!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col mt-4 sm:gap-6 pb-20">
      {posts.map((item) => (
        <PostCard
          key={item.id}
          post={{
            id: item.id,
            user: { 
              name: item.user.name, 
              avatar: item.user.avatar || item.user.image || null 
            },
            url: item.url,
            caption: item.caption || "",
            likesCount: item._count?.likes || 0,
            commentsCount: item._count?.comments || 0,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            isLikedByMe: item.likes?.some((l: any) => l.userId === currentUserId) || false,
            createdAt: new Date(item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
          }}
          isMine={item.user.id === currentUserId}
          onDeleted={fetchPosts} // מרענן את הפיד אחרי מחיקה
        />
      ))}
    </div>
  );
}