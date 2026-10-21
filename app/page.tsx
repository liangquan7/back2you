"use client";

import React, { useState, useRef } from "react";
import {
  MapPin,
  Plus,
  Video,
  Camera,
  X,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Upload,
  Compass,
  Sparkles,
  Trash2,
  Play,
  Image as ImageIcon,
} from "lucide-react";

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
  itemPhotoUrl: string; // 没点击前：显示在 Apple Watch 圆形 Icon 上的失物照片
  envVideoUrl: string; // 点击后：播放失物周围环境的视频
  locationTag: string; // 点击后：显示的发现地址/地点
  note: string;
  createdAt: number;
  status: "Active" | "Claimed";
  claims: ClaimReply[];
  // 蜂窝坐标偏移
  x: number;
  y: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// 预设 FCSIT 演示数据（自带物品照片 + 周围环境演示视频）
const INITIAL_ITEMS: LostItem[] = [
  {
    id: "1",
    title: "AirPods Pro (2nd Gen)",
    itemPhotoUrl:
      "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=500&q=80",
    envVideoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    locationTag: "FCSIT Block A - Microcomputer Lab 1 (Row 3 Desk)",
    note: "Found beside the monitor power plug.",
    createdAt: Date.now() - 2 * DAY_MS,
    status: "Active",
    x: 0,
    y: 0,
    claims: [
      {
        id: "c1",
        claimantName: "Ahmad (2400192)",
        description: "Has a small scratch on the bottom near the charging port!",
        proofImageUrl:
          "https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?auto=format&fit=crop&w=300&q=80",
        createdAt: "15m ago",
        isVerified: false,
      },
    ],
  },
  {
    id: "2",
    title: "Apple Pencil Gen 2",
    itemPhotoUrl:
      "https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&w=500&q=80",
    envVideoUrl: "https://www.w3schools.com/html/movie.mp4",
    locationTag: "The Cube (FCSIT Student Lounge Sofa)",
    note: "Left between the grey sofa cushions.",
    createdAt: Date.now() - 4 * DAY_MS,
    status: "Active",
    x: 115,
    y: 0,
    claims: [],
  },
  {
    id: "3",
    title: "HydroFlask Blue Bottle",
    itemPhotoUrl:
      "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=500&q=80",
    envVideoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    locationTag: "Dewan Kuliah 1 (DK1) - Front Left Staircase",
    note: "Standing next to the fire extinguisher.",
    createdAt: Date.now() - 1 * DAY_MS,
    status: "Active",
    x: -115,
    y: 0,
    claims: [],
  },
  {
    id: "4",
    title: "Sony WH-1000XM4",
    itemPhotoUrl:
      "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=500&q=80",
    envVideoUrl: "https://www.w3schools.com/html/movie.mp4",
    locationTag: "FCSIT Block B - Level 2 Corridor Bench",
    note: "Inside a black hard case on the wooden bench.",
    createdAt: Date.now() - 8 * DAY_MS,
    status: "Claimed",
    x: 58,
    y: 100,
    claims: [],
  },
  {
    id: "5",
    title: "Mechanical Keychain",
    itemPhotoUrl:
      "https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=500&q=80",
    envVideoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    locationTag: "Block A Foyer - Near Vending Machine",
    note: "Hanging on the side rack near the drink machine.",
    createdAt: Date.now() - 6 * DAY_MS,
    status: "Active",
    x: -58,
    y: 100,
    claims: [],
  },
  {
    id: "6",
    title: "Logitech MX Master Mouse",
    itemPhotoUrl:
      "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=500&q=80",
    envVideoUrl: "https://www.w3schools.com/html/movie.mp4",
    locationTag: "AI Lab 2 - Corner Table",
    note: "Left next to the desktop keyboard.",
    createdAt: Date.now() - 32 * DAY_MS, // 超过30天的演示数据
    status: "Active",
    x: 58,
    y: -100,
    claims: [],
  },
  {
    id: "7",
    title: "Casio Scientific Calculator",
    itemPhotoUrl:
      "https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=500&q=80",
    envVideoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    locationTag: "Dewan Kuliah 2 (DK2) - Back Row",
    note: "Found under seat #42 after lecture.",
    createdAt: Date.now() - 3 * DAY_MS,
    status: "Active",
    x: -58,
    y: -100,
    claims: [],
  },
];

// 自动生成新气泡的蜂窝螺旋坐标
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
  ];
  return (
    ringPositions[index % ringPositions.length] || {
      x: (index % 3) * 110,
      y: Math.floor(index / 3) * 100,
    }
  );
};

export default function MobileBack2YouWatchUI() {
  const [items, setItems] = useState<LostItem[]>(INITIAL_ITEMS);
  const [selectedItem, setSelectedItem] = useState<LostItem | null>(null);
  const [activeMediaTab, setActiveMediaTab] = useState<"video" | "photo">("video");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Apple Watch 桌面画布拖拽状态
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  // 上传表单状态
  const [newTitle, setNewTitle] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newItemPhoto, setNewItemPhoto] = useState("");
  const [newEnvVideo, setNewEnvVideo] = useState("");

  // 认领回复状态
  const [claimName, setClaimName] = useState("");
  const [claimDesc, setClaimDesc] = useState("");
  const [claimProof, setClaimProof] = useState("");

  const getDaysRemaining = (createdAt: number) => {
    const now = typeof window !== 'undefined' ? Date.now() : createdAt;
    const elapsed = Math.floor((now - createdAt) / DAY_MS);
    return Math.max(0, 30 - elapsed);
  };

  // 画布触摸/鼠标拖拽逻辑
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
      x: Math.max(-260, Math.min(260, dx)),
      y: Math.max(-280, Math.min(280, dy)),
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // 处理照片或视频文件本地预览
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setter(URL.createObjectURL(file));
    }
  };

  // 发布新拾获物品
  const handlePublishItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newLocation) return;
    const pos = getHexPosition(items.length);
    const created: LostItem = {
      id: Date.now().toString(),
      title: newTitle,
      itemPhotoUrl:
        newItemPhoto ||
        "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=500&q=80",
      envVideoUrl:
        newEnvVideo || "https://www.w3schools.com/html/mov_bbb.mp4",
      locationTag: newLocation,
      note: newNote || "Found at FCSIT campus.",
      createdAt: Date.now(),
      status: "Active",
      claims: [],
      x: pos.x,
      y: pos.y,
    };
    setItems([...items, created]);
    setNewTitle("");
    setNewLocation("");
    setNewNote("");
    setNewItemPhoto("");
    setNewEnvVideo("");
    setIsUploadOpen(false);
    setPan({ x: -pos.x, y: -pos.y }); // 镜头自动聚焦到新生成的气泡上
    showToast("New Found Item Bubble Added!");
  };

  // 30天自动清理演示
  const handleAutoPurge = () => {
    const before = items.length;
    const valid = items.filter((item) => getDaysRemaining(item.createdAt) > 0);
    setItems(valid);
    const removed = before - valid.length;
    showToast(
      removed > 0
        ? `30-Day Auto-Purge: Removed ${removed} expired item bubble(s).`
        : "All bubbles are within the 30-day retention period."
    );
  };

  // 提交认领回复
  const handleAddClaim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !claimName || !claimDesc) return;
    const reply: ClaimReply = {
      id: Date.now().toString(),
      claimantName: claimName,
      description: claimDesc,
      proofImageUrl:
        claimProof ||
        "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=300&q=80",
      createdAt: "Just now",
      isVerified: false,
    };
    const updated = {
      ...selectedItem,
      claims: [...selectedItem.claims, reply],
    };
    setSelectedItem(updated);
    setItems(items.map((i) => (i.id === updated.id ? updated : i)));
    setClaimName("");
    setClaimDesc("");
    setClaimProof("");
  };

  const handleVerifyClaim = (claimId: string) => {
    if (!selectedItem) return;
    const updated: LostItem = {
      ...selectedItem,
      status: "Claimed",
      claims: selectedItem.claims.map((c) =>
        c.id === claimId ? { ...c, isVerified: true } : c
      ),
    };
    setSelectedItem(updated);
    setItems(items.map((i) => (i.id === updated.id ? updated : i)));
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  return (
    <div className="min-h-screen bg-black text-white flex justify-center items-center select-none overflow-hidden">
      {/* 手机端容器 (在电脑上看是手机壳预览，在手机浏览器打开自动铺满全屏) */}
      <div className="relative w-full max-w-[430px] h-screen sm:h-[860px] sm:rounded-[48px] sm:border-[8px] sm:border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl flex flex-col">
        {/* 顶部悬浮栏 */}
        <header className="absolute top-0 inset-x-0 z-20 px-5 pt-5 pb-3 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto">
            <h1 className="text-lg font-extrabold tracking-tight flex items-center gap-1.5">
              Back2You
              <span className="text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full">
                FCSIT WatchOS UI
              </span>
            </h1>
            <p className="text-[11px] text-zinc-400">
              Drag bubbles • Tap any item photo to view location & video
            </p>
          </div>

          <button
            onClick={handleAutoPurge}
            className="pointer-events-auto p-2 rounded-full bg-zinc-900/90 border border-zinc-700 text-amber-400 hover:bg-zinc-800 transition"
            title="Simulate 30-Day Auto-Purge"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </header>

        {/* 顶部通知提示 */}
        {toastMsg && (
          <div className="absolute top-20 inset-x-4 z-30 bg-indigo-600/95 text-white text-xs font-medium px-4 py-2.5 rounded-2xl shadow-lg flex items-center justify-center gap-2 animate-bounce">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* 核心区域：Apple Watch 蜂窝气泡桌面 (未点击时只显示失物照片圆形Icon) */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="relative flex-1 w-full h-full overflow-hidden cursor-grab active:cursor-grabbing bg-[radial-gradient(circle_at_center,_rgba(49,46,129,0.22)_0%,_rgba(9,9,11,1)_75%)]"
        >
          {/* 中心参考光晕 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-72 h-72 rounded-full border border-zinc-800/40" />
            <div className="position absolute w-40 h-40 rounded-full border border-indigo-500/10" />
          </div>

          {/* 蜂窝气泡层 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {items.map((item) => {
              // 计算当前气泡距离屏幕中心的距离，实现 Apple Watch 中心放大、边缘缩小的鱼眼效果
              const currentX = item.x + pan.x;
              const currentY = item.y + pan.y;
              const distanceFromCenter = Math.sqrt(
                currentX * currentX + currentY * currentY
              );
              const scale = Math.max(
                0.58,
                Math.min(1.12, 1.12 - distanceFromCenter / 420)
              );
              const daysLeft = getDaysRemaining(item.createdAt);
              const isExpired = daysLeft <= 0;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (!hasMovedRef.current) {
                      setSelectedItem(item);
                      setActiveMediaTab("video"); // 点击后默认展示周围环境视频
                    }
                  }}
                  style={{
                    transform: `translate3d(${currentX}px, ${currentY}px, 0) scale(${scale})`,
                  }}
                  className={`pointer-events-auto absolute w-24 h-24 rounded-full p-1 transition-transform duration-75 ease-out shadow-2xl group focus:outline-none ${
                    item.status === "Claimed"
                      ? "bg-gradient-to-tr from-emerald-500 to-teal-300"
                      : isExpired
                      ? "bg-gradient-to-tr from-rose-600 to-orange-500 opacity-75"
                      : "bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400"
                  }`}
                >
                  {/* 圆形 Icon 内部：纯失物特写图片 */}
                  <div className="relative w-full h-full rounded-full overflow-hidden bg-zinc-900">
                    <img
                      src={item.itemPhotoUrl}
                      alt={item.title}
                      draggable={false}
                      className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                    />
                    {/* 已认领或过期的小角标 */}
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

        {/* 底部手机悬浮操作栏 */}
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
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-xs px-5 py-3 rounded-2xl shadow-lg shadow-indigo-500/30 transition transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Report Found Item</span>
          </button>

          <div className="flex flex-col items-center text-[10px] text-zinc-400 px-2">
            <span className="font-bold text-sm text-white">{items.length}</span>
            <span>Bubbles</span>
          </div>
        </footer>

        {/* ============================================================== */}
        {/* 弹窗 1：点击 Apple Watch 圆形图标后展开 —— 显示发现地址 + 播放周围环境视频 */}
        {/* ============================================================== */}
        {selectedItem && (
          <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex flex-col justify-end animate-in fade-in duration-200">
            <div className="bg-zinc-900 border-t border-zinc-800 rounded-t-[32px] max-h-[88%] overflow-y-auto p-5 space-y-4 shadow-2xl">
              {/* 顶部标题与关闭 */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full">
                    {selectedItem.status === "Claimed"
                      ? "✓ Claimed & Verified"
                      : `Expires in ${getDaysRemaining(selectedItem.createdAt)} days`}
                  </span>
                  <h2 className="text-lg font-extrabold text-white mt-1">
                    {selectedItem.title}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 1. 醒目显示发现地址/地点 */}
              <div className="bg-indigo-950/50 border border-indigo-500/40 rounded-2xl p-3.5 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 shrink-0 mt-0.5">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wide">
                    Found Location / Address
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {selectedItem.locationTag}
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    {selectedItem.note}
                  </div>
                </div>
              </div>

              {/* 2. 周围环境视频 & 失物特写切换器 */}
              <div>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setActiveMediaTab("video")}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      activeMediaTab === "video"
                        ? "bg-cyan-500 text-slate-950 shadow"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Surrounding
                    Environment Video
                  </button>
                  <button
                    onClick={() => setActiveMediaTab("photo")}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      activeMediaTab === "photo"
                        ? "bg-indigo-600 text-white shadow"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Item Close-up Photo
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
                      muted
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

              {/* 3. Padlet 风格盖楼认领验证区 */}
              <div className="border-t border-zinc-800 pt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Ownership
                  Verification Replies ({selectedItem.claims.length})
                </h3>

                <div className="space-y-2.5 mb-4">
                  {selectedItem.claims.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic">
                      Is this yours? Reply below with details & a proof photo to claim.
                    </p>
                  ) : (
                    selectedItem.claims.map((claim) => (
                      <div
                        key={claim.id}
                        className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={claim.proofImageUrl}
                            alt="Proof"
                            className="w-12 h-12 rounded-xl object-cover border border-zinc-700 shrink-0"
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
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg shrink-0">
                            ✓ Verified
                          </span>
                        ) : (
                          <button
                            onClick={() => handleVerifyClaim(claim.id)}
                            className="text-[10px] font-bold bg-indigo-600 text-white px-2.5 py-1.5 rounded-lg shrink-0"
                          >
                            Approve
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* 提交认领表单 */}
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
                    placeholder="Proof details (e.g., wallpaper, serial number)..."
                    value={claimDesc}
                    onChange={(e) => setClaimDesc(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                    required
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1 text-xs text-indigo-400 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      {claimProof ? "Proof Photo Ready ✓" : "Upload Proof Photo"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, setClaimProof)}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="submit"
                      className="bg-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-xl"
                    >
                      Claim Item
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 弹窗 2：拾获者上传抽屉（传失物照片做Icon + 传周围环境视频 + 标地点） */}
        {/* ============================================================== */}
        {isUploadOpen && (
          <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex flex-col justify-end">
            <form
              onSubmit={handlePublishItem}
              className="bg-zinc-900 border-t border-zinc-800 rounded-t-[32px] p-5 space-y-3.5 max-h-[90%] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-white">
                  Report Found Item
                </h2>
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="p-1.5 rounded-full bg-zinc-800 text-zinc-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 步骤 1：上传失物照片（将作为 Apple Watch 圆形 Icon） */}
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-indigo-500/40 bg-indigo-500/5 hover:bg-indigo-500/10 rounded-2xl p-3 text-center cursor-pointer transition">
                  <Camera className="w-6 h-6 text-indigo-400" />
                  <span className="text-[11px] font-bold text-white">
                    1. Item Photo (Icon)
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {newItemPhoto ? "Photo Selected ✓" : "Shown as Watch Bubble"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleFileChange(e, setNewItemPhoto)}
                    className="hidden"
                  />
                </label>

                {/* 步骤 2：上传周围环境视频（点击 Icon 后播放） */}
                <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-cyan-500/40 bg-cyan-500/5 hover:bg-cyan-500/10 rounded-2xl p-3 text-center cursor-pointer transition">
                  <Video className="w-6 h-6 text-cyan-400" />
                  <span className="text-[11px] font-bold text-white">
                    2. Surroundings Video
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {newEnvVideo ? "Video Selected ✓" : "Plays when clicked"}
                  </span>
                  <input
                    type="file"
                    accept="video/*"
                    capture="environment"
                    onChange={(e) => handleFileChange(e, setNewEnvVideo)}
                    className="hidden"
                  />
                </label>
              </div>

              {/* 步骤 3：物品名称与地点标注 */}
              <input
                type="text"
                placeholder="Item Name (e.g., Apple Pencil / Blue Wallet)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                required
              />

              <input
                type="text"
                placeholder="Found Location / Address (e.g., Block A - Lab 2 Desk 5)"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                required
              />

              <textarea
                placeholder="Additional note about the surrounding environment..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white h-16"
              />

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold py-3 rounded-2xl text-xs shadow-lg shadow-indigo-500/30"
              >
                Publish Bubble to Watch Board
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}