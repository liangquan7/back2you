"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  MapPin,
  Plus,
  Video,
  Camera,
  X,
  CheckCircle2,
  ShieldCheck,
  Upload,
  Compass,
  Sparkles,
  Trash2,
  Play,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";

// ============================================================================
// 👇 把下面这两个字符串替换为你自己在 Supabase -> Project Settings -> API 里的值
// ============================================================================
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dyizklsfuxxvoyaxlchl.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_KymmF28a4pePeF5IC4xcrw_imdzwcm8";

const isSupabaseConfigured = SUPABASE_URL.startsWith("https://");
const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

interface ClaimReply {
  id: string;
  claimantName: string;
  description: string;
  proofImageUrl: string;
  createdAt: string;
  isVerified: boolean;
}

interface LostItem {
  id: string;
  title: string;
  itemPhotoUrl: string;
  envVideoUrl: string;
  locationTag: string;
  note: string;
  createdAt: number;
  status: "Active" | "Claimed";
  claims: ClaimReply[];
  x: number;
  y: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// 自动计算 Apple Watch 蜂窝螺旋坐标
const getHexPosition = (index: number) => {
  const ringPositions = [
    { x: 0, y: 0 },
    { x: 115, y: 0 },
    { x: -115, y: 0 },
    { x: 58, y: 100 },
    { x: -58, y: 100 },
    { x: 58, y: -100 },
    { x: -58, y: -100 },
    { x: 0, y: 200 },
    { x: 0, y: -200 },
    { x: 172, y: 100 },
    { x: -172, y: 100 },
    { x: 172, y: -100 },
    { x: -172, y: -100 },
    { x: 115, y: 200 },
    { x: -115, y: 200 },
    { x: 115, y: -200 },
    { x: -115, y: -200 },
  ];
  return (
    ringPositions[index % ringPositions.length] || {
      x: (index % 4) * 110 - 150,
      y: Math.floor(index / 4) * 105 - 150,
    }
  );
};

// 默认初始展示数据
const FALLBACK_ITEMS: LostItem[] = [
  {
    id: "demo-1",
    title: "AirPods Pro (2nd Gen)",
    itemPhotoUrl:
      "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=500&q=80",
    envVideoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    locationTag: "FCSIT Block A - Lab 1 (Row 3)",
    note: "Found beside the monitor power plug.",
    createdAt: 1761000000000,
    status: "Active",
    x: 0,
    y: 0,
    claims: [],
  },
  {
    id: "demo-2",
    title: "Apple Pencil Gen 2",
    itemPhotoUrl:
      "https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&w=500&q=80",
    envVideoUrl: "https://www.w3schools.com/html/movie.mp4",
    locationTag: "The Cube (FCSIT Student Lounge)",
    note: "Left between the grey sofa cushions.",
    createdAt: 1761000000000,
    status: "Active",
    x: 115,
    y: 0,
    claims: [],
  },
];

export default function MobileBack2YouCloud() {
  const [items, setItems] = useState<LostItem[]>(FALLBACK_ITEMS);
  const [selectedItem, setSelectedItem] = useState<LostItem | null>(null);
  const [activeMediaTab, setActiveMediaTab] = useState<"video" | "photo">("video");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // 拖拽画布状态
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  // 上传失物表单状态（保存真实 File 对象用于上传到云端）
  const [newTitle, setNewTitle] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newNote, setNewNote] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  // 认领表单状态
  const [claimName, setClaimName] = useState("");
  const [claimDesc, setClaimDesc] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);

  // 1. 从云端数据库加载所有用户上传的失物气泡
  const fetchCloudItems = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("lost_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const mapped: LostItem[] = data.map((row: any, index: number) => {
        const pos = getHexPosition(index);
        return {
          id: row.id,
          title: row.title,
          itemPhotoUrl: row.item_photo_url,
          envVideoUrl: row.env_video_url,
          locationTag: row.location_tag,
          note: row.note || "",
          createdAt: Number(row.created_at),
          status: row.status,
          claims: row.claims || [],
          x: pos.x,
          y: pos.y,
        };
      });
      setItems(mapped.length > 0 ? mapped : FALLBACK_ITEMS);
    }
  };

  useEffect(() => {
    fetchCloudItems();
  }, []);

  const getDaysRemaining = (createdAt: number) => {
    const now = typeof window !== "undefined" ? Date.now() : createdAt;
    const elapsed = Math.floor((now - createdAt) / DAY_MS);
    return Math.max(0, 30 - elapsed);
  };

  // 上传单个文件到 Supabase Storage 并返回公开网址
  const uploadFileToCloud = async (file: File, folder: string): Promise<string> => {
    if (!supabase) return URL.createObjectURL(file);
    const ext = file.name.split(".").pop() || "bin";
    const filePath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from("media").upload(filePath, file);
    if (error) throw error;

    const { data } = supabase.storage.from("media").getPublicUrl(filePath);
    return data.publicUrl;
  };

  // 2. 发布新失物（上传照片+视频到云端，并写入数据库）
  const handlePublishItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newLocation) return;

    setIsUploading(true);
    try {
      const photoUrl = photoFile
        ? await uploadFileToCloud(photoFile, "photos")
        : "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=500&q=80";

      const videoUrl = videoFile
        ? await uploadFileToCloud(videoFile, "videos")
        : "https://www.w3schools.com/html/mov_bbb.mp4";

      if (supabase) {
        const { error } = await supabase.from("lost_items").insert([
          {
            title: newTitle,
            item_photo_url: photoUrl,
            env_video_url: videoUrl,
            location_tag: newLocation,
            note: newNote || "Found at FCSIT campus.",
            created_at: Date.now(),
            status: "Active",
            claims: [],
          },
        ]);
        if (error) throw error;
        await fetchCloudItems();
      }

      setNewTitle("");
      setNewLocation("");
      setNewNote("");
      setPhotoFile(null);
      setVideoFile(null);
      setIsUploadOpen(false);
      setPan({ x: 0, y: 0 });
      showToast("Saved to Cloud! Everyone can see this bubble now.");
    } catch (err: any) {
      showToast("Upload failed: " + (err.message || "Check Supabase keys"));
    } finally {
      setIsUploading(false);
    }
  };

  // 3. 提交认领回复并同步到数据库
  const handleAddClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !claimName || !claimDesc) return;

    setIsUploading(true);
    try {
      const proofUrl = proofFile
        ? await uploadFileToCloud(proofFile, "proofs")
        : "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=300&q=80";

      const reply: ClaimReply = {
        id: Date.now().toString(),
        claimantName: claimName,
        description: claimDesc,
        proofImageUrl: proofUrl,
        createdAt: "Just now",
        isVerified: false,
      };

      const updatedClaims = [...selectedItem.claims, reply];

      if (supabase && !selectedItem.id.startsWith("demo-")) {
        await supabase
          .from("lost_items")
          .update({ claims: updatedClaims })
          .eq("id", selectedItem.id);
      }

      const updatedItem = { ...selectedItem, claims: updatedClaims };
      setSelectedItem(updatedItem);
      setItems(items.map((i) => (i.id === updatedItem.id ? updatedItem : i)));
      setClaimName("");
      setClaimDesc("");
      setProofFile(null);
      showToast("Claim reply saved to database!");
    } finally {
      setIsUploading(false);
    }
  };

  // 4. 核实认领状态并同步到数据库
  const handleVerifyClaim = async (claimId: string) => {
    if (!selectedItem) return;
    const updatedClaims = selectedItem.claims.map((c) =>
      c.id === claimId ? { ...c, isVerified: true } : c
    );

    if (supabase && !selectedItem.id.startsWith("demo-")) {
      await supabase
        .from("lost_items")
        .update({ status: "Claimed", claims: updatedClaims })
        .eq("id", selectedItem.id);
    }

    const updatedItem: LostItem = {
      ...selectedItem,
      status: "Claimed",
      claims: updatedClaims,
    };
    setSelectedItem(updatedItem);
    setItems(items.map((i) => (i.id === updatedItem.id ? updatedItem : i)));
  };

  // 5. 30天自动清理过期记录
  const handleAutoPurge = async () => {
    const cutoff = Date.now() - 30 * DAY_MS;
    if (supabase) {
      await supabase.from("lost_items").delete().lt("created_at", cutoff);
      await fetchCloudItems();
    }
    showToast("30-Day Lifecycle Purge executed on database!");
  };

  // 画布触摸拖拽
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx - pan.x) > 6 || Math.abs(dy - pan.y) > 6) {
      hasMovedRef.current = true;
    }
    setPan({
      x: Math.max(-280, Math.min(280, dx)),
      y: Math.max(-300, Math.min(300, dy)),
    });
  };

  const handlePointerUp = () => setIsDragging(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  return (
    <div className="min-h-screen bg-black text-white flex justify-center items-center select-none overflow-hidden">
      <div className="relative w-full max-w-[430px] h-screen sm:h-[860px] sm:rounded-[48px] sm:border-[8px] sm:border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl flex flex-col">
        {/* 顶部栏 */}
        <header className="absolute top-0 inset-x-0 z-20 px-5 pt-5 pb-3 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto">
            <h1 className="text-lg font-extrabold tracking-tight flex items-center gap-1.5">
              Back2You
              <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                {isSupabaseConfigured ? "Cloud Live" : "Local Demo"}
              </span>
            </h1>
            <p className="text-[11px] text-zinc-400">
              Tap any item bubble to view address & surroundings video
            </p>
          </div>

          <button
            onClick={handleAutoPurge}
            className="pointer-events-auto p-2 rounded-full bg-zinc-900/90 border border-zinc-700 text-amber-400 hover:bg-zinc-800 transition"
            title="Run 30-Day Auto-Purge"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </header>

        {toastMsg && (
          <div className="absolute top-20 inset-x-4 z-30 bg-indigo-600/95 text-white text-xs font-medium px-4 py-2.5 rounded-2xl shadow-lg flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Apple Watch 气泡画布 */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="relative flex-1 w-full h-full overflow-hidden cursor-grab active:cursor-grabbing bg-[radial-gradient(circle_at_center,_rgba(49,46,129,0.22)_0%,_rgba(9,9,11,1)_75%)]"
        >
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {items.map((item) => {
              const currentX = item.x + pan.x;
              const currentY = item.y + pan.y;
              const dist = Math.sqrt(currentX * currentX + currentY * currentY);
              const scale = Math.max(0.58, Math.min(1.12, 1.12 - dist / 420));

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (!hasMovedRef.current) {
                      setSelectedItem(item);
                      setActiveMediaTab("video");
                    }
                  }}
                  style={{
                    transform: `translate3d(${currentX}px, ${currentY}px, 0) scale(${scale})`,
                  }}
                  className={`pointer-events-auto absolute w-24 h-24 rounded-full p-1 transition-transform duration-75 ease-out shadow-2xl group focus:outline-none ${
                    item.status === "Claimed"
                      ? "bg-gradient-to-tr from-emerald-500 to-teal-300"
                      : "bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400"
                  }`}
                >
                  <div className="relative w-full h-full rounded-full overflow-hidden bg-zinc-900">
                    <img
                      src={item.itemPhotoUrl}
                      alt={item.title}
                      draggable={false}
                      className="w-full h-full object-cover"
                    />
                    {item.status === "Claimed" && (
                      <div className="absolute inset-0 bg-emerald-950/60 flex items-center justify-center">
                        <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 底部导航 */}
        <footer className="absolute bottom-5 inset-x-5 z-20 flex items-center justify-between bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 px-4 py-2.5 rounded-3xl shadow-2xl">
          <button
            onClick={() => setPan({ x: 0, y: 0 })}
            className="flex flex-col items-center gap-0.5 text-zinc-400 hover:text-white text-[10px] px-2"
          >
            <Compass className="w-5 h-5 text-indigo-400" />
            <span>Center</span>
          </button>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold text-xs px-5 py-3 rounded-2xl shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Report Found Item</span>
          </button>

          <div className="flex flex-col items-center text-[10px] text-zinc-400 px-2">
            <span className="font-bold text-sm text-white">{items.length}</span>
            <span>Items</span>
          </div>
        </footer>

        {/* 详情弹窗：显示地点 + 周围环境视频 */}
        {selectedItem && (
          <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex flex-col justify-end">
            <div className="bg-zinc-900 border-t border-zinc-800 rounded-t-[32px] max-h-[88%] overflow-y-auto p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full">
                    {selectedItem.status === "Claimed"
                      ? "✓ Claimed"
                      : `Auto-purge in ${getDaysRemaining(selectedItem.createdAt)}d`}
                  </span>
                  <h2 className="text-lg font-extrabold text-white mt-1">
                    {selectedItem.title}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-2 rounded-full bg-zinc-800 text-zinc-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-indigo-950/50 border border-indigo-500/40 rounded-2xl p-3.5 flex items-start gap-3">
                <MapPin className="w-5 h-5 text-indigo-300 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[11px] font-semibold text-indigo-300 uppercase">
                    Found Location / Address
                  </div>
                  <div className="text-sm font-bold text-white">
                    {selectedItem.locationTag}
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    {selectedItem.note}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setActiveMediaTab("video")}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${
                      activeMediaTab === "video"
                        ? "bg-cyan-500 text-slate-950"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Surroundings Video
                  </button>
                  <button
                    onClick={() => setActiveMediaTab("photo")}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${
                      activeMediaTab === "photo"
                        ? "bg-indigo-600 text-white"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Item Photo
                  </button>
                </div>

                <div className="relative rounded-2xl overflow-hidden bg-black border border-zinc-800 h-56">
                  {activeMediaTab === "video" ? (
                    <video
                      key={selectedItem.envVideoUrl}
                      src={selectedItem.envVideoUrl}
                      controls
                      autoPlay
                      loop
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={selectedItem.itemPhotoUrl}
                      alt={selectedItem.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>

              {/* 认领区 */}
              <div className="border-t border-zinc-800 pt-4">
                <h3 className="text-xs font-bold uppercase text-zinc-400 mb-3 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Ownership
                  Claims ({selectedItem.claims.length})
                </h3>

                <div className="space-y-2.5 mb-4">
                  {selectedItem.claims.map((claim) => (
                    <div
                      key={claim.id}
                      className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={claim.proofImageUrl}
                          alt="Proof"
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                        <div>
                          <div className="text-xs font-bold text-white">
                            {claim.claimantName}
                          </div>
                          <p className="text-[11px] text-zinc-400">
                            {claim.description}
                          </p>
                        </div>
                      </div>
                      {claim.isVerified ? (
                        <span className="text-[10px] font-bold text-emerald-400">
                          ✓ Verified
                        </span>
                      ) : (
                        <button
                          onClick={() => handleVerifyClaim(claim.id)}
                          className="text-[10px] font-bold bg-indigo-600 text-white px-2.5 py-1.5 rounded-lg"
                        >
                          Approve
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={handleAddClaim}
                  className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 space-y-2.5"
                >
                  <input
                    type="text"
                    placeholder="Your Name & Matrix ID"
                    value={claimName}
                    onChange={(e) => setClaimName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Proof details..."
                    value={claimDesc}
                    onChange={(e) => setClaimDesc(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                    required
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1 text-xs text-indigo-400 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      {proofFile ? "Photo Ready ✓" : "Upload Proof Photo"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={isUploading}
                      className="bg-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-xl"
                    >
                      {isUploading ? "Saving..." : "Claim Item"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* 上传抽屉 */}
        {isUploadOpen && (
          <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex flex-col justify-end">
            <form
              onSubmit={handlePublishItem}
              className="bg-zinc-900 border-t border-zinc-800 rounded-t-[32px] p-5 space-y-3.5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-white">
                  Report Found Item (Cloud Sync)
                </h2>
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="p-1.5 rounded-full bg-zinc-800 text-zinc-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-indigo-500/40 bg-indigo-500/5 rounded-2xl p-3 text-center cursor-pointer">
                  <Camera className="w-6 h-6 text-indigo-400" />
                  <span className="text-[11px] font-bold text-white">
                    1. Item Photo (Icon)
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {photoFile ? photoFile.name : "Tap to take photo"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>

                <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-cyan-500/40 bg-cyan-500/5 rounded-2xl p-3 text-center cursor-pointer">
                  <Video className="w-6 h-6 text-cyan-400" />
                  <span className="text-[11px] font-bold text-white">
                    2. Surroundings Video
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {videoFile ? videoFile.name : "Tap to record video"}
                  </span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>

              <input
                type="text"
                placeholder="Item Name (e.g., Apple Pencil)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                required
              />

              <input
                type="text"
                placeholder="Found Location / Address (e.g., Block A - Lab 2)"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                required
              />

              <textarea
                placeholder="Additional note about surrounding environment..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white h-16"
              />

              <button
                type="submit"
                disabled={isUploading}
                className="w-full bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading to Cloud...
                  </>
                ) : (
                  "Publish Bubble to Watch Board"
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}