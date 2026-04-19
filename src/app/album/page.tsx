"use client";

import { useSession } from "next-auth/react";
import { AlbumIcon, UploadIcon, VideoIcon, PhotoIcon, LibraryIcon, CloseIcon } from "@/lib/icons";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { MotionPage } from "@/components/motion";
import { staggerContainer, fadeInUp } from "@/lib/animations";
import PostCard from "@/components/PostCard";

interface MediaItem {
  id: string;
  url: string;
  caption: string | null;
  type: string;
  createdAt: string;
  user: { id: string; name: string; avatar?: string | null };
  album: { id: string; name: string } | null;
  // שדות חברתיים שנוסיף ל-API בהמשך
  _count?: { likes: number; comments: number };
  likes?: { userId: string }[];
}

interface Album {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  user: { id: string; name: string };
  _count: { media: number };
  media: { url: string; type: string }[];
}

export default function AlbumPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"feed" | "gallery" | "albums">("feed");
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<MediaItem | null>(null);

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadCaption, setUploadCaption] = useState("");
  const [uploadAlbumId, setUploadAlbumId] = useState("");
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Album creation
  const [showAlbumForm, setShowAlbumForm] = useState(false);
  const [albumName, setAlbumName] = useState("");
  const [albumDesc, setAlbumDesc] = useState("");

  // Drag and drop
  const [dragOver, setDragOver] = useState(false);

  const userId = (session?.user as { id?: string })?.id;
  const isAdmin = (session?.user as { isAdmin?: boolean })?.isAdmin;

  const fetchMedia = useCallback(async (albumId?: string) => {
    const params = albumId ? `?albumId=${albumId}` : "";
    const res = await fetch(`/api/album${params}`);
    if (res.ok) setMedia(await res.json());
    setLoading(false);
  }, []);

  const fetchAlbums = useCallback(async () => {
    const res = await fetch("/api/album/albums");
    if (res.ok) setAlbums(await res.json());
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      fetchMedia();
      fetchAlbums();
    }
  }, [status, router, fetchMedia, fetchAlbums]);

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      if (uploadCaption) formData.append("caption", uploadCaption);
      if (uploadAlbumId) formData.append("albumId", uploadAlbumId);

      await fetch("/api/album/upload", { method: "POST", body: formData });
    }

    setUploadCaption("");
    setShowUpload(false);
    setUploading(false);
    fetchMedia(selectedAlbum || undefined);
  }

  async function handleUrlUpload() {
    if (!uploadUrl.trim()) return;
    setUploading(true);

    const isVideo = /\.(mp4|webm|mov)$/i.test(uploadUrl) || uploadUrl.includes("video");

    await fetch("/api/album", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: uploadUrl,
        caption: uploadCaption || null,
        type: isVideo ? "video" : "image",
        albumId: uploadAlbumId || null,
      }),
    });

    setUploadUrl("");
    setUploadCaption("");
    setShowUpload(false);
    setUploading(false);
    fetchMedia(selectedAlbum || undefined);
  }

  async function deleteMedia(id: string) {
    if (!confirm("Delete this media?")) return;
    await fetch(`/api/album?id=${id}`, { method: "DELETE" });
    fetchMedia(selectedAlbum || undefined);
    if (lightbox?.id === id) setLightbox(null);
  }

  async function createAlbum(e: React.FormEvent) {
    e.preventDefault();
    if (!albumName.trim()) return;

    const res = await fetch("/api/album/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: albumName, description: albumDesc }),
    });

    if (res.ok) {
      setAlbumName("");
      setAlbumDesc("");
      setShowAlbumForm(false);
      fetchAlbums();
    }
  }

  async function deleteAlbum(id: string) {
    if (!confirm("Delete this album? Media will be kept but unlinked.")) return;
    await fetch(`/api/album/albums?id=${id}`, { method: "DELETE" });
    fetchAlbums();
    if (selectedAlbum === id) {
      setSelectedAlbum(null);
      fetchMedia();
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-tumba-400 animate-pulse text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <MotionPage className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <AlbumIcon size={32} strokeWidth={1.75} className="text-tumba-400 shrink-0" />
            <span className="bg-gradient-to-r from-tumba-300 to-tumba-500 bg-clip-text text-transparent">
              Tumba Feed
            </span>
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Shared memories vault &mdash; {media.length} photos & videos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="px-5 py-2.5 rounded-xl bg-tumba-500 text-white font-semibold hover:bg-tumba-400 transition-all shadow-lg shadow-tumba-500/20"
          >
            {showUpload ? "Cancel" : "+ New Post"}
          </button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => { setViewMode("feed"); setSelectedAlbum(null); fetchMedia(); }}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            viewMode === "feed" && !selectedAlbum
              ? "bg-tumba-500 text-white shadow-lg shadow-tumba-500/25"
              : "bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]"
          }`}
        >
          Feed
        </button>
        <button
          onClick={() => { setViewMode("gallery"); setSelectedAlbum(null); fetchMedia(); }}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            viewMode === "gallery" && !selectedAlbum
              ? "bg-tumba-500 text-white shadow-lg shadow-tumba-500/25"
              : "bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]"
          }`}
        >
          Gallery
        </button>
        <button
          onClick={() => setViewMode("albums")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            viewMode === "albums"
              ? "bg-tumba-500 text-white shadow-lg shadow-tumba-500/25"
              : "bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]"
          }`}
        >
          Albums ({albums.length})
        </button>
        {selectedAlbum && (
          <span className="px-4 py-2 rounded-xl text-sm font-medium bg-tumba-500/10 text-tumba-400 border border-tumba-500/20 flex items-center">
            {albums.find((a) => a.id === selectedAlbum)?.name}
            <button onClick={() => { setSelectedAlbum(null); fetchMedia(); }} className="ml-2 text-tumba-400 hover:text-tumba-300">
              <CloseIcon size={14} />
            </button>
          </span>
        )}
      </div>

      {/* Upload Form (Remains exactly the same) */}
      {showUpload && (
        <div
          className={`mb-8 p-5 rounded-2xl border transition-all ${
            dragOver ? "border-tumba-500 bg-tumba-500/10" : "border-tumba-500/20 bg-tumba-500/5"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <h2 className="text-lg font-semibold mb-4">Upload Media</h2>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setUploadMode("file")}
              className={`px-3 py-1.5 rounded-lg text-sm ${uploadMode === "file" ? "bg-tumba-500/20 text-tumba-400" : "text-[var(--text-secondary)]"}`}
            >
              File Upload
            </button>
            <button
              onClick={() => setUploadMode("url")}
              className={`px-3 py-1.5 rounded-lg text-sm ${uploadMode === "url" ? "bg-tumba-500/20 text-tumba-400" : "text-[var(--text-secondary)]"}`}
            >
              URL
            </button>
          </div>

          {uploadMode === "file" ? (
            <div className="space-y-3">
              <div
                className="border-2 border-dashed border-[var(--border)] rounded-xl p-8 text-center cursor-pointer hover:border-tumba-500/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadIcon size={36} strokeWidth={1.5} className="mb-2 text-[var(--text-secondary)] mx-auto" />
                <p className="text-sm text-[var(--text-secondary)]">
                  {dragOver ? "Drop files here!" : "Click or drag & drop files here"}
                </p>
                <p className="text-xs text-[var(--text-secondary)]/50 mt-1">
                  Images & videos up to 50MB
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="url"
                value={uploadUrl}
                onChange={(e) => setUploadUrl(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-tumba-500"
                placeholder="https://example.com/photo.jpg"
              />
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <input
              type="text"
              value={uploadCaption}
              onChange={(e) => setUploadCaption(e.target.value)}
              className="flex-1 px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-tumba-500"
              placeholder="Caption (optional)"
            />
            <select
              value={uploadAlbumId}
              onChange={(e) => setUploadAlbumId(e.target.value)}
              className="px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-tumba-500"
            >
              <option value="">No album</option>
              {albums.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            {uploadMode === "url" && (
              <button
                onClick={handleUrlUpload}
                disabled={uploading || !uploadUrl.trim()}
                className="px-6 py-2 rounded-xl bg-tumba-500 text-white font-semibold hover:bg-tumba-400 transition-all disabled:opacity-50 whitespace-nowrap"
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            )}
          </div>
          {uploading && uploadMode === "file" && (
            <div className="mt-3 text-sm text-tumba-400 animate-pulse">Uploading...</div>
          )}
        </div>
      )}

      {/* ── NEW: Feed View ── */}
      {viewMode === "feed" && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="max-w-xl mx-auto flex flex-col pt-2"
        >
          {media.length === 0 ? (
            <div className="text-center py-16 text-[var(--text-secondary)]">
              <AlbumIcon size={48} strokeWidth={1.25} className="mb-4 text-[var(--text-secondary)] mx-auto" />
              <p className="text-lg">No posts yet</p>
            </div>
          ) : (
            media.map((item) => (
              <PostCard 
                key={item.id} 
                post={{
                  id: item.id,
                  user: { 
                    name: item.user.name, 
                    avatar: item.user.avatar || null 
                  },
                  url: item.url,
                  caption: item.caption || "",
                  likesCount: item._count?.likes || 0,
                  commentsCount: item._count?.comments || 0,
                  isLikedByMe: item.likes?.some(l => l.userId === userId) || false,
                  createdAt: new Date(item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                }}
                // שני הפרופס החדשים שלנו:
                isMine={item.user.id === userId || isAdmin} 
                onDeleted={() => fetchMedia()} 
              />
            ))
          )}
        </motion.div>
      )}

      {/* Albums View (Remains exactly the same) */}
      {viewMode === "albums" && !selectedAlbum && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Albums</h2>
            <button
              onClick={() => setShowAlbumForm(!showAlbumForm)}
              className="text-sm text-tumba-400 hover:text-tumba-300"
            >
              {showAlbumForm ? "Cancel" : "+ New Album"}
            </button>
          </div>

          {showAlbumForm && (
            <form onSubmit={createAlbum} className="mb-6 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] space-y-3">
              <input
                type="text"
                value={albumName}
                onChange={(e) => setAlbumName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-tumba-500"
                placeholder="Album name"
                required
              />
              <input
                type="text"
                value={albumDesc}
                onChange={(e) => setAlbumDesc(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-tumba-500"
                placeholder="Description (optional)"
              />
              <button type="submit" className="px-4 py-2 rounded-lg bg-tumba-500 text-white text-sm font-medium hover:bg-tumba-400 transition-colors">
                Create Album
              </button>
            </form>
          )}

          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {albums.map((album) => (
              <motion.div
                variants={fadeInUp}
                key={album.id}
                className="group p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] transition-all cursor-pointer"
                onClick={() => { setSelectedAlbum(album.id); setViewMode("gallery"); fetchMedia(album.id); }}
              >
                {/* Cover */}
                <div className="aspect-video rounded-xl bg-[var(--bg-secondary)] mb-3 overflow-hidden flex items-center justify-center">
                  {album.media[0] ? (
                    album.media[0].type === "video" ? (
                      <VideoIcon size={36} strokeWidth={1.5} className="text-[var(--text-secondary)]" />
                    ) : (
                      <img src={album.media[0].url} alt="" className="w-full h-full object-cover" />
                    )
                  ) : (
                    <PhotoIcon size={28} strokeWidth={1.5} className="text-[var(--text-secondary)]/30" />
                  )}
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{album.name}</h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {album._count.media} items &middot; by {album.user.name}
                    </p>
                  </div>
                  {(album.user.id === userId || isAdmin) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteAlbum(album.id); }}
                      className="opacity-0 group-hover:opacity-100 text-xs text-red-400/60 hover:text-red-400 px-1"
                    >
                      <CloseIcon size={14} />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
            {albums.length === 0 && (
              <div className="col-span-full text-center py-12 text-[var(--text-secondary)]">
                <LibraryIcon size={36} strokeWidth={1.5} className="mb-2 text-[var(--text-secondary)] mx-auto" />
                <p>No albums yet. Create one to organize your media!</p>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Gallery Grid (Remains exactly the same) */}
      {(viewMode === "gallery" || selectedAlbum) && (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {media.length === 0 ? (
            <div className="col-span-full text-center py-16 text-[var(--text-secondary)]">
              <AlbumIcon size={48} strokeWidth={1.25} className="mb-4 text-[var(--text-secondary)] mx-auto" />
              <p className="text-lg">No media yet</p>
              <p className="text-sm mt-1">Upload photos and videos to start building the memories vault!</p>
            </div>
          ) : (
            media.map((item) => (
              <motion.div
                variants={fadeInUp}
                key={item.id}
                className="group relative aspect-square rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg-card)] cursor-pointer hover:border-tumba-500/30 transition-all"
                onClick={() => setLightbox(item)}
              >
                {item.type === "video" ? (
                  <div className="w-full h-full flex items-center justify-center bg-[var(--bg-secondary)]">
                    <VideoIcon size={36} strokeWidth={1.5} className="text-[var(--text-secondary)]" />
                  </div>
                ) : (
                  <img src={item.url} alt={item.caption || ""} className="w-full h-full object-cover" />
                )}
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                  <div className="text-xs text-white/80">
                    <p className="font-medium">{item.user.name}</p>
                    {item.caption && <p className="truncate">{item.caption}</p>}
                  </div>
                </div>
                {/* Delete button */}
                {(item.user.id === userId || isAdmin) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteMedia(item.id); }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-xs bg-red-500/80 text-white px-1.5 py-0.5 rounded-lg transition-all hover:bg-red-500"
                  >
                    <CloseIcon size={14} />
                  </button>
                )}
              </motion.div>
            ))
          )}
        </motion.div>
      )}

      {/* Lightbox (Remains exactly the same) */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="max-w-4xl max-h-[90vh] w-full relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white text-2xl"
            >
              <CloseIcon size={14} />
            </button>
            {lightbox.type === "video" ? (
              <video src={lightbox.url} controls className="w-full max-h-[80vh] rounded-xl" />
            ) : (
              <img src={lightbox.url} alt={lightbox.caption || ""} className="w-full max-h-[80vh] object-contain rounded-xl" />
            )}
            <div className="mt-3 text-center">
              {lightbox.caption && (
                <p className="text-white/90 mb-1">{lightbox.caption}</p>
              )}
              <p className="text-sm text-white/50">
                by {lightbox.user.name} &middot; {new Date(lightbox.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                {lightbox.album && <span> &middot; {lightbox.album.name}</span>}
              </p>
            </div>
          </div>
        </div>
      )}
    </MotionPage>
  );
}