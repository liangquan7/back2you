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
  User,
  BadgeCheck,
  Lock,
  Clock,
} from "lucide-react";

// 已预填你的 Supabase 云端配置
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://dyizklsfuxxvoyaxlchl.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_KymmF28a4pePeF5IC4xcrw_imdzwcm8";

const isSupabaseConfigured = SUPABASE_URL.startsWith("https://");
const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

interface ClaimReply {
  id: string;
  claimantName: string;
  matricNo?: string;
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

// 标准 Apple Watch 六边形蜂窝螺旋坐标算法（支持无限个气泡不重叠）
const getHexPosition = (index: number) => {
  if (index === 0) return { x: 0, y: 0 };
  const spacing = 112; // 气泡间距
  let layer = 1;
  let countInPrevLayers = 1;

  while (countInPrevLayers + layer * 6 <= index) {
    countInPrevLayers += layer * 6;
    layer++;
  }

  const posInLayer = index - countInPrevLayers;
  const side = Math.floor(posInLayer / layer);
  const step = posInLayer % layer;

  const angles = [0, 60, 120, 180, 240, 300].map((d) => (d * Math.PI) / 180);
  const startAngle = angles[side];
  const nextAngle = angles[(side + 1) % 6];

  const startX = Math.cos(startAngle) * layer * spacing;
  const startY = Math.sin(startAngle) * layer * spacing;
  const endX = Math.cos(nextAngle) * layer * spacing;
  const endY = Math.sin(nextAngle) * layer * spacing;

  const ratio = step / layer;
  return {
    x: Math.round(startX + (endX - startX) * ratio),
    y: Math.round(startY + (endY - startY) * ratio),
  };
};

const FALLBACK_ITEMS: LostItem[] = [
  {
    id: "demo-1",
    title: "AirPods Pro (2nd Gen)",
    itemPhotoUrl:
      "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=500&q=80",
    envVideoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    locationTag: "FCSIT Block A - Lab 1",
    note: "Found beside the monitor power plug.",
    createdAt: 1761000000000,
    status: "Active",
    x: 0,
    y: 0,
    claims: [],
  },
];

export default function MobileBack2YouCloud() {
  const [items, setItems] = useState<LostItem[]>(FALLBACK_ITEMS);
  const [selectedItem, setSelectedItem] = useState<LostItem | null>(null);
  const [activeMediaTab, setActiveMediaTab] = useState<"video" | "photo">(
    "video"
  );
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // 丝滑拖拽与惯性滑动状态
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const panRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const lastPointRef = useRef({ x: 0, y: 0, time: 0 });
  const velocityRef = useRef({ vx: 0, vy: 0 });
  const rafRef = useRef<number | null>(null);
  const hasMovedRef = useRef(false);

  // 上传失物表单状态
  const [newTitle, setNewTitle] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newNote, setNewNote] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  // 认领表单状态（拆分为姓名 + 学号 Matric No）
  const [claimName, setClaimName] = useState("");
  const [claimMatric, setClaimMatric] = useState("");
  const [claimDesc, setClaimDesc] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);

  // 从云端加载数据
  const fetchCloudItems = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("lost_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const mapped: LostItem[] = data.map((row: any, index: number) => {
        const pos = getHexPosition(index);
        const rowClaims: ClaimReply[] = row.claims || [];
        return {
          id: row.id,
          title: row.title,
          itemPhotoUrl: row.item_photo_url,
          envVideoUrl: row.env_video_url,
          locationTag: row.location_tag,
          note: row.note || "",
          createdAt: Number(row.created_at),
          // 只要有认领记录，状态即为 Claimed
          status: rowClaims.length > 0 ? "Claimed" : row.status,
          claims: rowClaims,
          x: pos.x,
          y: pos.y,
        };
      });
      setItems(mapped.length > 0 ? mapped : FALLBACK_ITEMS);
    }
  };

  useEffect(() => {
    fetchCloudItems();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const getDaysRemaining = (createdAt: number) => {
    const now = typeof window !== "undefined" ? Date.now() : createdAt;
    const elapsed = Math.floor((now - createdAt) / DAY_MS);
    return Math.max(0, 30 - elapsed);
  };

  // 根据气泡数量动态计算最大可拖动范围
  const maxPanLimit = Math.max(320, Math.ceil(Math.sqrt(items.length)) * 130);

  const clampPan = (x: number, y: number) => ({
    x: Math.max(-maxPanLimit, Math.min(maxPanLimit, x)),
    y: Math.max(-maxPanLimit, Math.min(maxPanLimit, y)),
  });

  // ============================================================================
  // 核心优化：60FPS 手机触控拖拽 + Apple Watch 惯性滑行引擎
  // ============================================================================
  const handlePointerDown = (e: React.PointerEvent) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setIsDragging(true);
    hasMovedRef.current = false;
    velocityRef.current = { vx: 0, vy: 0 };

    dragStartRef.current = {
      x: e.clientX - panRef.current.x,
      y: e.clientY - panRef.current.y,
    };
    lastPointRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: performance.now(),
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    const now = performance.now();
    const dt = Math.max(1, now - lastPointRef.current.time);

    const rawX = e.clientX - dragStartRef.current.x;
    const rawY = e.clientY - dragStartRef.current.y;

    if (
      Math.abs(rawX - panRef.current.x) > 5 ||
      Math.abs(rawY - panRef.current.y) > 5
    ) {
      hasMovedRef.current = true;
    }

    // 记录手指滑动速度用于松手后的惯性滑行
    velocityRef.current = {
      vx: ((e.clientX - lastPointRef.current.x) / dt) * 15,
      vy: ((e.clientY - lastPointRef.current.y) / dt) * 15,
    };

    lastPointRef.current = { x: e.clientX, y: e.clientY, time: now };

    const nextPan = clampPan(rawX, rawY);
    panRef.current = nextPan;
    setPan(nextPan);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // 启动惯性阻尼滑行动画
    const startInertia = () => {
      velocityRef.current.vx *= 0.92; // 摩擦系数
      velocityRef.current.vy *= 0.92;

      if (
        Math.abs(velocityRef.current.vx) < 0.3 &&
        Math.abs(velocityRef.current.vy) < 0.3
      ) {
        return;
      }

      const nextPan = clampPan(
        panRef.current.x + velocityRef.current.vx,
        panRef.current.y + velocityRef.current.vy
      );
      panRef.current = nextPan;
      setPan(nextPan);
      rafRef.current = requestAnimationFrame(startInertia);
    };

    rafRef.current = requestAnimationFrame(startInertia);
  };

  const centerBoard = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    panRef.current = { x: 0, y: 0 };
    setPan({ x: 0, y: 0 });
  };

  // 上传文件到 Supabase Storage
  const uploadFileToCloud = async (
    file: File,
    folder: string
  ): Promise<string> => {
    if (!supabase) return URL.createObjectURL(file);
    const ext = file.name.split(".").pop() || "bin";
    const filePath = `${folder}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from("media")
      .upload(filePath, file);
    if (error) throw error;

    const { data } = supabase.storage.from("media").getPublicUrl(filePath);
    return data.publicUrl;
  };

  // 发布新拾获物品
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
      centerBoard();
      showToast("Saved to Cloud! Everyone can see this bubble now.");
    } catch (err: any) {
      showToast("Upload failed: " + (err.message || "Error"));
    } finally {
      setIsUploading(false);
    }
  };

  // ============================================================================
  // 核心优化：只允许 1 人认领，认领后立即锁定并展示完整认领人姓名与 Matric 号码
  // ============================================================================
  const handleAddClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !claimName || !claimMatric || !claimDesc) return;

    // 防止重复认领保护
    if (selectedItem.claims.length > 0 || selectedItem.status === "Claimed") {
      showToast("This item has already been claimed!");
      return;
    }

    setIsUploading(true);
    try {
      const proofUrl = proofFile
        ? await uploadFileToCloud(proofFile, "proofs")
        : "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=300&q=80";

      const nowStr = new Date().toLocaleString("en-MY", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const singleClaim: ClaimReply = {
        id: Date.now().toString(),
        claimantName: claimName.trim(),
        matricNo: claimMatric.trim().toUpperCase(),
        description: claimDesc.trim(),
        proofImageUrl: proofUrl,
        createdAt: nowStr,
        isVerified: true,
      };

      const updatedClaims = [singleClaim];

      if (supabase && !selectedItem.id.startsWith("demo-")) {
        const { error } = await supabase
          .from("lost_items")
          .update({ status: "Claimed", claims: updatedClaims })
          .eq("id", selectedItem.id);
        if (error) throw error;
      }

      const updatedItem: LostItem = {
        ...selectedItem,
        status: "Claimed",
        claims: updatedClaims,
      };
      setSelectedItem(updatedItem);
      setItems(items.map((i) => (i.id === updatedItem.id ? updatedItem : i)));
      setClaimName("");
      setClaimMatric("");
      setClaimDesc("");
      setProofFile(null);
      showToast("Item Claimed Successfully! Claim locked.");
    } catch (err: any) {
      showToast("Claim failed: " + (err.message || "Error"));
    } finally {
      setIsUploading(false);
    }
  };

  // 30天自动清理过期记录
  const handleAutoPurge = async () => {
    const cutoff = Date.now() - 30 * DAY_MS;
    if (supabase) {
      await supabase.from("lost_items").delete().lt("created_at", cutoff);
      await fetchCloudItems();
    }
    showToast("30-Day Lifecycle Purge executed!");
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // 判断当前选中的物品是否已被认领
  const isItemAlreadyClaimed =
    selectedItem !== null &&
    (selectedItem.status === "Claimed" || selectedItem.claims.length > 0);
  const activeClaimRecord = selectedItem?.claims?.[0] || null;

  return (
    <div className="min-h-screen bg-black text-white flex justify-center items-center select-none overflow-hidden">
      <div className="relative w-full max-w-[430px] h-[100dvh] sm:h-[860px] sm:rounded-[48px] sm:border-[8px] sm:border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl flex flex-col">
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
              Swipe smoothly • Tap bubble for location & video
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

        {/* ============================================================== */}
        {/* Apple Watch 蜂窝桌面：加入 touch-none 与实时帧渲染，解决手机端卡顿 */}
        {/* ============================================================== */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="relative flex-1 w-full h-full overflow-hidden touch-none cursor-grab active:cursor-grabbing bg-[radial-gradient(circle_at_center,_rgba(49,46,129,0.24)_0%,_rgba(9,9,11,1)_75%)]"
        >
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {items.map((item) => {
              const currentX = item.x + pan.x;
              const currentY = item.y + pan.y;
              const dist = Math.sqrt(currentX * currentX + currentY * currentY);
              // Apple Watch 鱼眼缩放比例：中心最大，向屏幕边缘平滑缩小
              const scale = Math.max(0.52, Math.min(1.15, 1.15 - dist / 380));
              const isClaimed =
                item.status === "Claimed" || item.claims.length > 0;

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
                    // 拖动时 0 延迟跟随手指，松手居中时平滑过渡
                    transition: isDragging
                      ? "none"
                      : "transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                    willChange: "transform",
                  }}
                  className={`pointer-events-auto absolute w-24 h-24 rounded-full p-1 shadow-2xl group focus:outline-none ${
                    isClaimed
                      ? "bg-gradient-to-tr from-emerald-500 to-teal-300"
                      : "bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400"
                  }`}
                >
                  <div className="relative w-full h-full rounded-full overflow-hidden bg-zinc-900">
                    <img
                      src={item.itemPhotoUrl}
                      alt={item.title}
                      draggable={false}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                    {isClaimed && (
                      <div className="absolute inset-0 bg-emerald-950/65 flex flex-col items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        <span className="text-[8px] font-extrabold uppercase tracking-wider text-emerald-200 mt-0.5">
                          Claimed
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 底部导航栏 */}
        <footer className="absolute bottom-5 inset-x-5 z-20 flex items-center justify-between bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 px-4 py-2.5 rounded-3xl shadow-2xl">
          <button
            onClick={centerBoard}
            className="flex flex-col items-center gap-0.5 text-zinc-400 hover:text-white text-[10px] px-2"
          >
            <Compass className="w-5 h-5 text-indigo-400" />
            <span>Center</span>
          </button>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold text-xs px-5 py-3 rounded-2xl shadow-lg active:scale-95 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Report Found Item</span>
          </button>

          <div className="flex flex-col items-center text-[10px] text-zinc-400 px-2">
            <span className="font-bold text-sm text-white">{items.length}</span>
            <span>Items</span>
          </div>
        </footer>

        {/* ============================================================== */}
        {/* 详情弹窗：显示发现地址 + 环境视频 + 单人认领详情锁定区 */}
        {/* ============================================================== */}
        {selectedItem && (
          <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex flex-col justify-end">
            <div className="bg-zinc-900 border-t border-zinc-800 rounded-t-[32px] max-h-[88%] overflow-y-auto p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span
                    className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                      isItemAlreadyClaimed
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-indigo-500/10 text-indigo-400"
                    }`}
                  >
                    {isItemAlreadyClaimed
                      ? "✓ Claimed & Locked"
                      : `Auto-purge in ${getDaysRemaining(
                          selectedItem.createdAt
                        )}d`}
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

              {/* 发现地点 */}
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

              {/* 环境视频与物品照片切换 */}
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
                    <Play className="w-3.5 h-3.5 fill-current" /> Surroundings
                    Video
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

              {/* ============================================================== */}
              {/* 认领模块：如果已被认领，直接显示认领人详细资料卡并关闭表单 */}
              {/* ============================================================== */}
              <div className="border-t border-zinc-800 pt-4">
                <h3 className="text-xs font-bold uppercase text-zinc-400 mb-3 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Ownership
                  Claim Status
                </h3>

                {isItemAlreadyClaimed && activeClaimRecord ? (
                  <div className="rounded-2xl bg-emerald-950/25 border border-emerald-500/40 p-4 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                        <Lock className="w-4 h-4" />
                        <span>Item Claimed (Closed to Further Claims)</span>
                      </div>
                      <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full">
                        ✓ Verified Owner
                      </span>
                    </div>

                    {/* 认领人姓名与 Matric Number 详细资料 */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-2.5">
                        <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                          <User className="w-3 h-3 text-indigo-400" /> Claimant
                          Name
                        </div>
                        <div className="text-xs font-bold text-white mt-0.5 break-words">
                          {activeClaimRecord.claimantName}
                        </div>
                      </div>

                      <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-2.5">
                        <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                          <BadgeCheck className="w-3 h-3 text-cyan-400" />{" "}
                          Matric Number
                        </div>
                        <div className="text-xs font-bold text-cyan-300 mt-0.5 break-words">
                          {activeClaimRecord.matricNo || "Provided in Name"}
                        </div>
                      </div>
                    </div>

                    {/* 验证照片与说明详情 */}
                    <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 flex gap-3 items-start">
                      <img
                        src={activeClaimRecord.proofImageUrl}
                        alt="Proof"
                        className="w-16 h-16 rounded-xl object-cover border border-zinc-700 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-semibold text-zinc-400 uppercase">
                          Ownership Verification Proof
                        </div>
                        <p className="text-xs text-zinc-200 mt-0.5 break-words">
                          {activeClaimRecord.description}
                        </p>
                        <div className="text-[10px] text-zinc-500 mt-1.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Claimed:{" "}
                          {activeClaimRecord.createdAt}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 尚未有人认领时，才显示认领表单（仅限第一人认领） */
                  <form
                    onSubmit={handleAddClaim}
                    className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 space-y-2.5"
                  >
                    <div className="text-[11px] text-zinc-400 mb-1">
                      Is this your lost item? Submit your details below to claim
                      it (Once claimed, this item will be locked).
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Full Name (e.g., Tan Liang Chuan)"
                        value={claimName}
                        onChange={(e) => setClaimName(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Matric No. (e.g., 24231773)"
                        value={claimMatric}
                        onChange={(e) => setClaimMatric(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                        required
                      />
                    </div>

                    <input
                      type="text"
                      placeholder="Verification details (e.g., serial number, lockscreen)..."
                      value={claimDesc}
                      onChange={(e) => setClaimDesc(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                      required
                    />

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-1.5 text-xs text-indigo-400 cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        {proofFile
                          ? "Proof Photo Attached ✓"
                          : "Attach Proof Photo"}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            setProofFile(e.target.files?.[0] || null)
                          }
                          className="hidden"
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={isUploading}
                        className="bg-gradient-to-r from-indigo-600 to-cyan-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow"
                      >
                        {isUploading ? "Claiming..." : "Claim Item"}
                      </button>
                    </div>
                  </form>
                )}
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
                  <span className="text-[10px] text-zinc-400 truncate max-w-full px-1">
                    {photoFile ? photoFile.name : "Tap to take photo"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>

                <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-cyan-500/40 bg-cyan-500/5 rounded-2xl p-3 text-center cursor-pointer">
                  <Video className="w-6 h-6 text-cyan-400" />
                  <span className="text-[11px] font-bold text-white">
                    2. Surroundings Video
                  </span>
                  <span className="text-[10px] text-zinc-400 truncate max-w-full px-1">
                    {videoFile ? videoFile.name : "Tap to record video"}
                  </span>
                  <input
                    type="file"
                    accept="video/*"
                    capture="environment"
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
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading to
                    Cloud...
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