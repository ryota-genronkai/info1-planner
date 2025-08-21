"use client";
/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Target,
  ChevronRight,
  Undo2,
  Trophy,
  Notebook,
  BookOpen,
  Workflow,
  Code2,
  ArrowRight,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// =============================================================
// 学習計画 UI v15.1（安定版：重なり防止 + 問題解決を全教科対応 + 週間列をコンパクト化）
// =============================================================

const PRIMARY = "#00a0e9";
const SECONDARY = "#ffcf7f";

// ---------- ヘルパー ----------
const toISO = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (dateStr: string, n: number) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
const uid = () => Math.random().toString(36).slice(2, 10);

// ---------- 型 ----------
type Subject =
  | "英語"
  | "数学IA"
  | "数学IAIIBC"
  | "数学IAIIBCIII"
  | "現代文"
  | "古文"
  | "漢文"
  | "小論文"
  | "物理基礎"
  | "化学基礎"
  | "生物基礎"
  | "地学基礎"
  | "物理_物理基礎"
  | "化学_化学基礎"
  | "生物_生物基礎"
  | "地学_地学基礎"
  | "日本史探究_歴史総合"
  | "世界史探究_歴史総合"
  | "地理総合_地理探究"
  | "公共_政治経済"
  | "公共_倫理"
  | "情報I"
  | "その他";

const SUBJECTS: Subject[] = [
  "英語",
  "数学IA",
  "数学IAIIBC",
  "数学IAIIBCIII",
  "現代文",
  "古文",
  "漢文",
  "小論文",
  "物理基礎",
  "化学基礎",
  "生物基礎",
  "地学基礎",
  "物理_物理基礎",
  "化学_化学基礎",
  "生物_生物基礎",
  "地学_地学基礎",
  "日本史探究_歴史総合",
  "世界史探究_歴史総合",
  "地理総合_地理探究",
  "公共_政治経済",
  "公共_倫理",
  "情報I",
  "その他",
];

// 教材リンク
type LinkMap = Record<
  "A" | "Ov" | "Prac" | "Cet" | "Prog",
  { title: string; url?: string; img?: string }
>;

const LINKS: LinkMap = {
  A: {
    title: "過去問",
    url: "https://akahon.net/products/detail/26713",
    img: "https://akahon.net/images/cover/978-4-325-26713-3.jpg",
  },
  Ov: {
    title: "概要把握",
    url: "https://bookclub.kodansha.co.jp/product?item=322109000547",
    img: "https://cdn.kdkw.jp/cover_1000/322109/322109000547_01.webp",
  },
  Prac: {
    title: "問題演習",
    img: "https://storage.googleapis.com/studio-cms-assets/projects/9YWywY00qM/s-311x445_webp_fbce2ae6-6375-4e30-8a69-c559d0e024e0.webp",
  },
  Cet: {
    title: "共通テスト対策",
    img: "https://www.obunsha.co.jp/img/product/detail/035262.jpg",
  },
  Prog: {
    title: "プログラミング演習",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSwZuIas28PUqgYzs5HFn-LWKTQ3IwCUm6fmQ&s",
  },
};

// 大学レベル（ラベル→難度）
const UNIVERSITY_LEVELS: Record<"標準" | "応用" | "発展", string[]> = {
  標準: ["共通テスト", "日東駒専", "日大", "東洋", "駒澤", "専修"],
  応用: [
    "MARCH",
    "明治",
    "青山",
    "立教",
    "中央",
    "法政",
    "関関同立",
    "関西",
    "関西学院",
    "同志社",
    "立命館",
    "地方国立",
    "地方国公立",
  ],
  発展: [
    "早稲田",
    "慶應",
    "早慶",
    "東大",
    "京大",
    "阪大",
    "名大",
    "東北大",
    "九大",
    "北大",
    "東京大学",
    "京都大学",
    "大阪大学",
    "名古屋大学",
    "東北大学",
    "九州大学",
    "北海道大学",
    "一橋",
    "東京工業",
    "東工",
    "神戸大学",
    "難関国公立",
    "最難関国公立",
  ],
};

function getExamTierFromLabel(label?: string): "標準" | "応用" | "発展" | null {
  if (!label) return null;
  for (const tier of ["発展", "応用", "標準"] as const) {
    if (UNIVERSITY_LEVELS[tier].some((k) => label.includes(k))) return tier;
  }
  if (label.includes("共通テスト")) return "標準";
  return null;
}

// ---------- 原因マップ（科目別） ----------
// 汎用
const CAUSE_COMMON = [
  { key: "unlearned", label: "未修/定義あいまい", to: "Ov", icon: BookOpen, hint: "まだ学んでいない範囲_定義整理から" },
  { key: "practice", label: "演習不足", to: "Prac", icon: Notebook, hint: "典型問題〜実戦演習の量が不足" },
  { key: "format", label: "形式_時間配分に不慣れ", to: "Cet", icon: Workflow, hint: "マーク/設問形式_時間最適化" },
] as const;

// 英語（詳細）
const CAUSE_EN = [
  { key: "unlearned", label: "未修（単語/文法など）", to: "Ov", icon: BookOpen, hint: "基礎→標準の順に底上げ" },
  { key: "reading", label: "長文読解不足", to: "Prac", icon: Notebook, hint: "標準→応用→発展へ段階練習" },
  { key: "grammar", label: "文法_語法が弱い", to: "Prac", icon: Notebook, hint: "標準文法→応用文法+語法→総合英文法" },
  { key: "vocab", label: "単語_熟語が弱い", to: "Prac", icon: Notebook, hint: "基礎→標準→応用→発展" },
  { key: "listening", label: "リスニングが弱い", to: "Prac", icon: Notebook, hint: "発音→標準(L)過去問→共通(L)対策" },
  { key: "writing", label: "英作文が弱い", to: "Prac", icon: Notebook, hint: "例文暗記→標準作文→応用作文" },
  { key: "conversation", label: "会話問題が苦手", to: "Prac", icon: Notebook, hint: "会話問題の定型練習" },
  { key: "format", label: "形式/時間配分に不慣れ", to: "Cet", icon: Workflow, hint: "共通テスト/標準私大の最適化" },
  { key: "school", label: "志望校別対策が必要", to: "A", icon: Target, hint: "志望校過去問→傾向対策" },
] as const;

// 数学（代表）
const CAUSE_MATH = [
  ...CAUSE_COMMON,
  { key: "calc", label: "計算ミスが多い", to: "Prac", icon: Notebook, hint: "計算演習_途中式の型化" },
  { key: "method", label: "典型手法の未習熟", to: "Prac", icon: Notebook, hint: "例題→類題ドリル→入試演習" },
] as const;

// 国語（代表）
const CAUSE_JA = [
  ...CAUSE_COMMON,
  { key: "vocab", label: "語彙/評論用語不足", to: "Ov", icon: BookOpen, hint: "語彙_用語の基礎固め" },
  { key: "logic", label: "要旨把握が曖昧", to: "Prac", icon: Notebook, hint: "段落要約→設問根拠トレーニング" },
] as const;

// 理科_社会（代表）
const CAUSE_SCI = [
  ...CAUSE_COMMON,
  { key: "formula", label: "公式/定義の未整理", to: "Ov", icon: BookOpen, hint: "定義→例題→練習の順で" },
  { key: "experiment", label: "実験考察に弱い", to: "Prac", icon: Notebook, hint: "設問パターン別演習" },
] as const;

const CAUSES_BY_SUBJECT: Partial<Record<Subject, readonly any[]>> = {
  英語: CAUSE_EN,
  数学IA: CAUSE_MATH,
  数学IAIIBC: CAUSE_MATH,
  数学IAIIBCIII: CAUSE_MATH,
  現代文: CAUSE_JA,
  古文: CAUSE_JA,
  漢文: CAUSE_JA,
  小論文: CAUSE_JA,
  物理基礎: CAUSE_SCI,
  化学基礎: CAUSE_SCI,
  生物基礎: CAUSE_SCI,
  地学基礎: CAUSE_SCI,
  物理_物理基礎: CAUSE_SCI,
  化学_化学基礎: CAUSE_SCI,
  生物_生物基礎: CAUSE_SCI,
  地学_地学基礎: CAUSE_SCI,
  日本史探究_歴史総合: CAUSE_SCI,
  世界史探究_歴史総合: CAUSE_SCI,
  地理総合_地理探究: CAUSE_SCI,
  公共_政治経済: CAUSE_SCI,
  公共_倫理: CAUSE_SCI,
  情報I: CAUSE_COMMON,
  その他: CAUSE_COMMON,
};

// ---------- ノードメタ ----------
type NodeKey = "A" | "Ov" | "Prac" | "Cet" | "Prog" | "Done";

const NODE_META: Record<string, { title: string; icon: LucideIcon; color: string; img?: string }> = {
  A: { title: "過去問", icon: Target, color: "border-sky-400", img: LINKS.A.img },
  Ov: { title: "概要把握", icon: BookOpen, color: "border-emerald-400", img: LINKS.Ov.img },
  Prac: { title: "問題演習", icon: Notebook, color: "border-indigo-400", img: LINKS.Prac.img },
  Cet: { title: "共通テスト対策", icon: Workflow, color: "border-amber-400", img: LINKS.Cet.img },
  Prog: { title: "プログラミング演習", icon: Code2, color: "border-fuchsia-400", img: LINKS.Prog.img },
  Done: { title: "目標達成", icon: Trophy, color: "border-yellow-500" },
};

// ---------- 英語：ステージ候補 ----------
type Tier = "基礎" | "標準" | "応用" | "発展";
const EN_TIERS: Record<Tier, string[]> = {
  基礎: ["基礎単語", "基礎文法", "基礎解釈"],
  標準: [
    "標準単語",
    "標準文法",
    "熟語",
    "標準解釈",
    "標準長文",
    "標準(R)過去問",
    "共通テスト(R)対策",
    "標準私立対策",
    "発音",
    "標準(L)過去問",
    "共通テスト(L)対策",
    "基礎リスニング対策",
    "会話問題対策",
  ],
  応用: [
    "例文暗記",
    "応用単語",
    "応用長文",
    "標準作文",
    "応用過去問",
    "難関私立対策",
    "地方国公立対策",
    "応用文法+語法対策",
    "総合英文法対策",
    "応用解釈対策",
    "理系テーマ対策",
    "最新テーマ対策",
    "応用作文",
  ],
  発展: [
    "発展長文",
    "発展過去問",
    "発展単語対策",
    "発展文法+語法対策",
    "発展解釈対策",
    "発展リスニング対策",
    "発展作文対策",
    "要約対策",
    "早稲田対策",
    "慶應対策",
    "難関国公立対策",
    "北大対策",
    "東北大対策",
    "名大対策",
    "阪大対策",
    "九大対策",
    "京大対策",
    "東大対策",
  ],
};

function examLabelToTier(label?: string | null): Tier {
  const s = (label || "").toLowerCase();
  const adv = ["早稲田", "慶應", "東大", "京大", "阪大", "名大", "北大", "東北大", "九大", "最難関", "難関国公立"];
  if (adv.some((k) => s.includes(k.toLowerCase()))) return "発展";
  const appl = ["march", "関関同立", "地方国立", "地方国公立"];
  if (appl.some((k) => s.includes(k.toLowerCase()))) return "応用";
  const std = ["共通テスト", "日東駒専"];
  if (std.some((k) => s.includes(k.toLowerCase()))) return "標準";
  return "標準";
}

function fallbackChainFromTier(start: Tier): Tier[] {
  const order: Tier[] = ["発展", "応用", "標準"];
  const i = order.indexOf(start);
  return i >= 0 ? order.slice(i) : order;
}

function shortlistEN(tier: Tier, n = 3) {
  return (EN_TIERS[tier] || []).slice(0, n);
}

// ---------- ストレージフック ----------
function useLocalStorage<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(state));
      }
    } catch { }
  }, [key, state]);
  return [state, setState] as const;
}

// ---------- 状態型 ----------
type ISODate = string;
type Solution = { node: NodeKey; reason: string };

type StrategyItem = {
  node: NodeKey;
  reason: string;
  at: string;
  subject: Subject;
  monthsRange?: { start: number; end: number } | null; // 期間は月グリッドで指定
  weekly?: boolean;
  weekCells?: Record<number, string>; // 0..6
};

type WeekSnapshot = {
  at: string;
  weekStart: ISODate;
  rows: Array<{ subject: string; title: string; cells: Record<number, string> }>;
};

type Goal = { id: string; title: string; progress: number };

type ExamType = "共通テスト 本試験" | "共通テスト 追試験" | "模試";
type ExamYear = 2025 | 2024 | 2023 | 2022;

type HistoryItem = {
  at: string;
  target: number;
  prevScore: number;
  solutions: Solution[];
  subject: Subject;
  label?: string;
  examType?: ExamType;
};

type Session = {
  // 目的_目標
  purposeNote: string;
  goals: Goal[];

  // 設定
  subject: Subject;
  target: number;
  score: number;
  examType?: ExamType;
  examYear?: ExamYear;
  examLabel?: string;

  // 学習開始日（全体の開始）
  studyStart?: ISODate;

  // 問題原因
  causes: Record<string, boolean>;
  memo: string;

  // 戦略_週
  strategy: StrategyItem[];
  weekSnapshots: WeekSnapshot[];
  weeklyStart?: ISODate; // 週の開始（デフォは studyStart）

  // 履歴
  history: HistoryItem[];
};

const initialSession: Session = {
  purposeNote: "",
  goals: [],
  subject: "英語",
  target: 80,
  score: 0,
  examType: "共通テスト 本試験",
  examYear: 2025,
  examLabel: "2025 共通テスト 本試験",
  studyStart: toISO(new Date()),
  causes: {},
  memo: "",
  strategy: [],
  weekSnapshots: [],
  weeklyStart: toISO(new Date()),
  history: [],
};

// ---------- 解決策ビルダー ----------
function buildEnglishSolutions(session: Session): Solution[] {
  const actions: Solution[] = [];
  const label = session.examLabel || "";
  const tier = examLabelToTier(label);
  if (session.score >= session.target) return [{ node: "Done", reason: "目標達成。振り返り→次目標へ。" }];

  if (session.causes?.["unlearned"]) {
    actions.push({ node: "Ov", reason: "未修：基礎→標準の順に底上げ。例：" + shortlistEN("基礎", 3).join(" / ") });
  }

  // 演習不足
  if (session.causes?.["practice"]) {
    const pick = shortlistEN(tier, 3).join(" / ");
    actions.push({ node: "Prac", reason: `演習不足：まずは${tier}帯の演習（例：${pick}）。` });
  }

  // 形式
  if (session.causes?.["format"]) {
    actions.push({ node: "Cet", reason: "形式最適化：共通(R/L)で時間配分_設問形式の馴化。" });
  }

  // 過去問入口（常に提示）
  const chain = fallbackChainFromTier(tier);
  const msg = chain
    .map((t, i) => {
      const head = t === "発展" ? "発展過去問" : t === "応用" ? "応用過去問" : "標準過去問";
      const pick2 = shortlistEN(t, 2).join(" / ");
      return `${i === 0 ? "まず" : "→ 次に"}「${head}」で検証（推奨：${pick2}）`;
    })
    .join(" ");
  actions.push({ node: "A", reason: `${session.examLabel || "目標レベル"} を想定。${msg}。` });

  return actions;
}

function buildGenericSolutions(session: Session): Solution[] {
  const out: Solution[] = [];
  if (session.score >= session.target) return [{ node: "Done", reason: "目標達成。振り返り→次目標へ。" }];

  const causes = session.causes || {};
  if (causes["unlearned"]) out.push({ node: "Ov", reason: "未修/定義あいまい：教科書レベルの定義→例題で土台固め。" });
  if (causes["practice"]) out.push({ node: "Prac", reason: "演習不足：典型問題→入試形式の段階演習で手数を増やす。" });
  if (causes["format"]) out.push({ node: "Cet", reason: "形式_時間配分：共通テスト/模試形式で最適化。" });
  if (causes["calc"]) out.push({ node: "Prac", reason: "計算精度：途中式テンプレ/計算ルーチンの反復。" });
  if (causes["method"]) out.push({ node: "Prac", reason: "典型解法：例題→類題ドリルでパターン化。" });
  if (causes["vocab"]) out.push({ node: "Ov", reason: "語彙_用語：頻出語彙と用語の整理。" });
  if (causes["logic"]) out.push({ node: "Prac", reason: "要旨把握：段落要約→設問根拠トレーニング。" });
  if (causes["formula"]) out.push({ node: "Ov", reason: "公式_定義：体系整理→例題適用。" });
  if (causes["experiment"]) out.push({ node: "Prac", reason: "実験考察：出題パターン別の演習。" });

  // いつでも最後に過去問入口
  const tier = getExamTierFromLabel(session.examLabel) || "標準";
  const tail = tier === "発展" ? "発展→応用→標準" : tier === "応用" ? "応用→標準" : "標準（安定後に引き上げ）";
  out.push({ node: "A", reason: `過去問入口：${tier}レベルから開始。厳しい場合は ${tail} にフォールバック。` });
  return out;
}

// ---------- メイン ----------
export default function PlannerUI() {
  const [session, setSession] = useLocalStorage<Session>("study_planner_v15_1", initialSession);
  const [tab, setTab] = useState<"plan" | "strategy" | "weekly" | "history">("plan");

  // 目的_目標
  function addGoal() {
    const title = prompt("目標を入力（例：共通テストで80点）");
    if (!title) return;
    setSession((s) => ({ ...s, goals: [...s.goals, { id: uid(), title, progress: 0 }] }));
  }
  function setGoalProgress(id: string, p: number) {
    setSession((s) => ({
      ...s,
      goals: s.goals.map((g) => (g.id === id ? { ...g, progress: Math.max(0, Math.min(100, p)) } : g)),
    }));
  }
  function removeGoal(id: string) {
    setSession((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) }));
  }

  const ACTIVE_CAUSES = (CAUSES_BY_SUBJECT[session.subject] || CAUSE_COMMON) as any[];

  // 解決策
  const solutions: Solution[] = useMemo(() => {
    if (session.subject === "英語") return buildEnglishSolutions(session);
    return buildGenericSolutions(session);
  }, [session]);

  const weekDates = useMemo(() => {
    const base = session.weeklyStart || session.studyStart || toISO(new Date());
    return Array.from({ length: 7 }, (_, i) => addDays(base, i));
  }, [session.weeklyStart, session.studyStart]);

  // === 戦略操作 ===
  function addToStrategy(step: Solution) {
    const exists = session.strategy.some((it) => it.subject === session.subject && it.node === step.node);
    if (exists) {
      toast("同じ学習段階は既に全体戦略に入っています");
      return;
    }
    setSession((s) => ({
      ...s,
      strategy: [
        ...s.strategy,
        {
          ...step,
          at: new Date().toISOString(),
          subject: s.subject,
          monthsRange: null,
          weekly: false,
          weekCells: {},
        },
      ],
    }));
    toast.success("全体戦略に追加しました（期間は12ヶ月グリッドで指定）");
  }

  function toggleStrategyMonthFill(idx: number, m: number) {
    setSession((s) => ({
      ...s,
      strategy: s.strategy.map((st, i) => {
        if (i !== idx) return st;
        const cur = st.monthsRange || { start: m, end: m };
        if (cur.start == null || cur.end == null) return { ...st, monthsRange: { start: m, end: m } };
        if (m < cur.start) return { ...st, monthsRange: { start: m, end: cur.end } };
        if (m > cur.end) return { ...st, monthsRange: { start: cur.start, end: m } };
        return { ...st, monthsRange: { start: m, end: m } }; // レンジ内クリックで単点に戻す
      }),
    }));
  }
  function setStrategyWeekly(index: number, weekly: boolean) {
    setSession((s) => ({ ...s, strategy: s.strategy.map((it, i) => (i === index ? { ...it, weekly } : it)) }));
  }
  function setWeekCell(index: number, day: number, text: string) {
    setSession((s) => ({
      ...s,
      strategy: s.strategy.map((it, i) => {
        if (i !== index) return it;
        const cells = { ...(it.weekCells || {}) };
        cells[day] = text;
        return { ...it, weekCells: cells } as StrategyItem;
      }),
    }));
  }
  function removeStrategy(index: number) {
    setSession((s) => ({ ...s, strategy: s.strategy.filter((_, i) => i !== index) }));
  }
  function clearStrategy() {
    setSession((s) => ({ ...s, strategy: [] }));
  }

  function saveWeekSnapshot() {
    const rows = session.strategy
      .filter((s) => s.weekly)
      .map((st) => ({ subject: st.subject, title: NODE_META[st.node]?.title || (st.node as string), cells: st.weekCells || {} }));
    if (!rows.length) return toast("週間戦略に項目がありません");
    const weekStart = session.weeklyStart || session.studyStart || toISO(new Date());
    setSession((s) => ({
      ...s,
      weekSnapshots: [...(s.weekSnapshots || []), { at: new Date().toISOString(), weekStart, rows }],
    }));
    toast.success("この週の計画を保存しました");
  }
  function removeWeekSnapshot(index: number) {
    setSession((s) => ({ ...s, weekSnapshots: (s.weekSnapshots || []).filter((_, i) => i !== index) }));
  }

  function resetToRetry() {
    const solutionsNow = solutions;
    setSession((s) => ({
      ...s,
      score: 0,
      causes: {},
      memo: "",
      history: [
        ...s.history,
        {
          at: new Date().toISOString(),
          target: s.target,
          prevScore: s.score,
          solutions: solutionsNow,
          subject: s.subject,
          label: s.examLabel,
          examType: s.examType,
        },
      ],
    }));
    setTab("plan");
    toast.success("再挑戦：過去問へ");
  }

  // ============ UI ============
  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8">
      <div className="rounded-2xl shadow-lg ring-1 ring-black/5 bg-white text-slate-900">
        <header className="flex items-center gap-3 p-4 md:p-6 border-b">
          <Target className="w-6 h-6" />
          <h1 className="text-xl md:text-2xl font-bold">学習計画 UI</h1>
          <Badge variant="outline" className="ml-auto">v15.1</Badge>
        </header>

        <div className="p-4 md:p-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="relative">
            <TabsList className="grid grid-cols-4 w-full md:w-auto rounded-lg p-1" style={{ background: "#e6f7fd" }}>
              {([
                { v: "plan", t: "問題解決" },
                { v: "strategy", t: "全体戦略" },
                { v: "weekly", t: "週間戦略" },
                { v: "history", t: "履歴" },
              ] as const).map((x) => (
                <TabsTrigger
                  key={x.v}
                  value={x.v}
                  className="rounded-md"
                  style={{ color: tab === x.v ? "white" : "#036086", background: tab === x.v ? PRIMARY : "transparent" }}
                >
                  {x.t}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* 問題解決タブ */}
            <TabsContent value="plan" className="relative mt-6 space-y-6 data-[state=inactive]:hidden">
              {/* 目的_目標 */}
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">目的_目標</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="md:col-span-3">
                      <label className="text-sm text-slate-700">目的</label>
                      <Textarea
                        placeholder="例）MARCH合格。そのための英語安定80点。"
                        value={session.purposeNote}
                        onChange={(e) => setSession((s) => ({ ...s, purposeNote: e.target.value }))}
                        className="bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-sm text-slate-700">目標一覧</div>
                    <Button size="sm" onClick={addGoal} style={{ background: PRIMARY, color: "white" }}>追加</Button>
                  </div>
                  {session.goals.length === 0 ? (
                    <div className="text-sm text-slate-600">まだ目標がありません。追加してください。</div>
                  ) : (
                    <ul className="space-y-2">
                      {session.goals.map((g) => (
                        <li key={g.id} className="rounded-lg border p-3 flex items-center gap-3">
                          <div className="text-sm font-medium min-w-[10rem] truncate">{g.title}</div>
                          <div className="flex-1">
                            <div className="h-2 rounded bg-slate-100 overflow-hidden">
                              <div className="h-full" style={{ width: `${g.progress}%`, background: PRIMARY }} />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 w-44">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={1}
                              value={g.progress}
                              onChange={(e) => setGoalProgress(g.id, Number(e.target.value))}
                              className="w-full"
                            />
                            <span className="text-xs w-10 text-right">{g.progress}%</span>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removeGoal(g.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* 設定 */}
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">設定</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm text-slate-700">教科</label>
                      <div className="border rounded-lg overflow-hidden bg-white">
                        <select
                          className="w-full p-2 bg-white"
                          value={session.subject}
                          onChange={(e) => setSession((s) => ({ ...s, subject: e.target.value as Subject, causes: {} }))}
                        >
                          {SUBJECTS.map((sub) => (
                            <option key={sub} value={sub}>{sub}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-slate-700">目標点</label>
                      <div className="mt-2 flex items-center gap-3">
                        <input type="range" min={0} max={100} step={1} value={session.target} onChange={(e) => setSession((s) => ({ ...s, target: Number(e.target.value) }))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                        <Input type="number" value={session.target} onChange={(e) => setSession((s) => ({ ...s, target: Number(e.target.value || 0) }))} className="w-24 bg-white" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-slate-700">今回のスコア（過去問）</label>
                      <div className="mt-2 flex items-center gap-3">
                        <input type="range" min={0} max={100} step={1} value={session.score} onChange={(e) => setSession((s) => ({ ...s, score: Number(e.target.value) }))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                        <Input type="number" value={session.score} onChange={(e) => setSession((s) => ({ ...s, score: Number(e.target.value || 0) }))} className="w-24 bg-white" />
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm text-slate-700">年度</label>
                      <div className="border rounded-lg overflow-hidden bg-white mt-1">
                        <select
                          className="w-full p-2 bg-white"
                          value={session.examYear}
                          onChange={(e) => setSession((s) => ({ ...s, examYear: Number(e.target.value) as ExamYear, examLabel: `${e.target.value} ${s.examType || ""}` }))}
                        >
                          {[2025, 2024, 2023, 2022].map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-slate-700">試験種別</label>
                      <div className="border rounded-lg overflow-hidden bg-white mt-1">
                        <select
                          className="w-full p-2 bg-white"
                          value={session.examType}
                          onChange={(e) => setSession((s) => ({ ...s, examType: e.target.value as ExamType, examLabel: `${s.examYear || ""} ${e.target.value}` }))}
                        >
                          {["共通テスト 本試験", "共通テスト 追試験", "模試"].map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-slate-700">記録ラベル</label>
                      <Input className="bg-white mt-1" value={session.examLabel || ""} onChange={(e) => setSession((s) => ({ ...s, examLabel: e.target.value }))} placeholder="例) 2025 共通テスト 本試験" />
                    </div>
                  </div>

                  {/* 目標達成 or 原因分析 */}
                  {session.score >= session.target ? (
                    <div className="rounded-2xl border p-4" style={{ borderColor: "#e6b800", background: "#fff8db" }}>
                      <div className="flex items-center gap-2 mb-2"><Trophy className="w-5 h-5" /><b>目標達成！</b></div>
                      <p className="text-sm mb-2">📝 振り返り_反省_次目標をメモできます。</p>
                      <Textarea placeholder="良かった点 / 反省点 / 次の目標…" value={session.memo} onChange={(e) => setSession((s) => ({ ...s, memo: e.target.value }))} className="bg-white" />
                      <div className="mt-3 flex gap-2">
                        <Button onClick={resetToRetry} className="text-white" style={{ background: PRIMARY }}>
                          <Undo2 className="w-4 h-4 mr-1" /> 再挑戦（過去問へ）
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-sm text-slate-700">目標未達：原因分析（{session.subject}）</div>
                      <div className="grid md:grid-cols-2 gap-3">
                        {ACTIVE_CAUSES.map((c) => {
                          const Icon = c.icon as LucideIcon;
                          const checked = !!session.causes[c.key];
                          return (
                            <label key={c.key} className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${checked ? "ring-2" : "hover:border-slate-300"}`} style={checked ? { borderColor: PRIMARY, boxShadow: `0 0 0 2px ${PRIMARY}33` } : {}}>
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => setSession((s) => ({ ...s, causes: { ...s.causes, [c.key]: !!v } }))}
                              />
                              <div className="space-y-1">
                                <div className="flex items-center gap-2"><Icon className="w-4 h-4" /><b>{c.label}</b></div>
                                <div className="text-xs text-slate-600">{c.hint}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>

                      {/* 解決策 */}
                      {solutions?.length > 0 && (
                        <Card className="bg-white">
                          <CardHeader><CardTitle className="flex items-center gap-2">解決策</CardTitle></CardHeader>
                          <CardContent className="space-y-3">
                            <div className="grid md:grid-cols-2 gap-3">
                              {solutions.map((step, i) => {
                                const meta = NODE_META[step.node];
                                const Icon = (meta?.icon || ArrowRight) as LucideIcon;
                                const link = step.node === "Done" ? undefined : (LINKS as any)[step.node];
                                return (
                                  <button key={i} onClick={() => addToStrategy(step)} className="text-left rounded-xl border p-3 bg-white/60 group relative hover:shadow-md transition" style={{ borderColor: "#e2e8f0" }}>
                                    <div className="flex items-center gap-2 mb-1">
                                      <Icon className="w-4 h-4" />
                                      <b>{meta?.title || step.node}</b>
                                      <Badge variant="outline" className="ml-auto">{i + 1}</Badge>
                                    </div>
                                    <div className="text-xs text-slate-600 mb-2">{step.reason}</div>
                                    {link?.img ? (
                                      <img src={link.img} alt={`${link.title} cover`} className="w-20 h-24 object-cover rounded-md border mb-2" />
                                    ) : (
                                      <div className="w-20 h-24 flex items-center justify-center border rounded-md text-slate-40 mb-2">
                                        <BookOpen className="w-5 h-5" />
                                      </div>
                                    )}
                                    <span className="absolute right-3 top-3 opacity-80 group-hover:translate-x-0.5 transition-transform" aria-hidden>
                                      <ChevronRight style={{ color: PRIMARY }} />
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button className="text-white" style={{ background: PRIMARY }} onClick={resetToRetry}>
                                <Undo2 className="w-4 h-4 mr-1" /> 過去問に再挑戦
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 全体戦略タブ */}
            <TabsContent value="strategy" className="relative mt-6 space-y-4 data-[state=inactive]:hidden">
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">全体戦略</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    <label className="flex items-center gap-2">
                      <span>学習開始日:</span>
                      <Input type="date" className="h-7 w-[160px] bg-white" value={session.studyStart || toISO(new Date())} onChange={(e) => setSession((s) => ({ ...s, studyStart: e.target.value, weeklyStart: e.target.value }))} />
                    </label>
                  </div>

                  {session.strategy.length === 0 ? (
                    <div className="text-sm text-slate-600">まだ何も追加されていません。問題解決の「解決策」から追加してください。</div>
                  ) : (
                    <ul className="space-y-2">
                      {session.strategy.map((st, idx) => (
                        <li key={idx} className="grid items-center gap-2 p-2 rounded-lg border bg-white hover:shadow-sm transition" style={{ gridTemplateColumns: "auto 10rem 1fr minmax(240px,1fr)", borderColor: "#e2e8f0" }}>
                          <span className="text-xs rounded px-2 py-0.5 border bg-white" style={{ borderColor: SECONDARY }}>{idx + 1}</span>
                          <Badge style={{ background: "#e6f7fd", color: "#036086", borderColor: PRIMARY }}>{st.subject}</Badge>
                          <div className="truncate text-sm font-medium">
                            {NODE_META[st.node]?.title || st.node} — <span className="font-normal text-slate-600 truncate inline-block max-w-full align-bottom">{st.reason}</span>
                          </div>
                          {/* 12ヶ月フィル（クリックで範囲指定） */}
                          <div className="grid grid-cols-12 gap-1">
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((m, i) => {
                              const col = i + 1;
                              const on = st.monthsRange ? col >= st.monthsRange.start! && col <= st.monthsRange.end! : false;
                              return (
                                <div key={`m-${m}`} title={`${m}月`} className="h-6 rounded border" onClick={() => toggleStrategyMonthFill(idx, col)} style={{ background: on ? PRIMARY : "#fff", borderColor: on ? PRIMARY : "#e2e8f0", cursor: "pointer" }} />
                              );
                            })}
                          </div>
                          <label className="col-span-full inline-flex items-center gap-2 text-xs text-slate-700 mt-1">
                            <input type="checkbox" className="accent-[#00a0e9]" checked={!!st.weekly} onChange={(e) => setStrategyWeekly(idx, e.target.checked)} /> 週間戦略に入れる
                            <Button size="icon" variant="ghost" className="ml-auto" onClick={() => removeStrategy(idx)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                  {session.strategy.length > 0 && (
                    <div className="pt-1 flex gap-2">
                      <Button variant="secondary" className="text-white hover:opacity-90 focus:ring-2 focus:ring-[#00a0e9]/30" style={{ background: PRIMARY, borderColor: PRIMARY }} onClick={clearStrategy}>
                        <Trash2 className="w-4 h-4 mr-1" /> 全削除
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 週間戦略タブ */}
            <TabsContent value="weekly" className="relative mt-6 space-y-4 data-[state=inactive]:hidden">
              <Card className="bg-white">
                <CardHeader className="flex flex-col gap-2">
                  <CardTitle className="flex items-center gap-2">週間戦略</CardTitle>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    <label className="flex items-center gap-2">
                      <span>週の開始日:</span>
                      <Input type="date" className="h-7 w-[160px] bg-white" value={session.weeklyStart || session.studyStart || toISO(new Date())} onChange={(e) => setSession((s) => ({ ...s, weeklyStart: e.target.value }))} />
                    </label>
                    <div className="ml-auto text-slate-500">※ 学習開始日に同期（必要なら個別調整）</div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {session.strategy.filter((s) => s.weekly).length === 0 ? (
                    <div className="text-sm text-slate-600">まだ週間戦略に入っている項目はありません。全体戦略でチェックしてください。</div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="min-w-full text-sm">
                        <thead style={{ background: "#f0fbff", color: "#036086" }}>
                          <tr>
                            <th className="px-2 py-2 text-left sticky left-0 z-10 bg-white border-r w-44">教科 / 学習段階</th>
                            {weekDates.map((d, i) => {
                              const dt = new Date(d);
                              const label = `${(dt.getMonth() + 1).toString().padStart(2, "0")}/${dt.getDate().toString().padStart(2, "0")}`;
                              const wday = ["月", "火", "水", "木", "金", "土", "日"][i % 7];
                              return (
                                <th key={d} className="px-2 py-2 text-center min-w-[7rem]">{label}<div className="text-[11px] text-slate-500">{wday}</div></th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody className="[&>tr:nth-child(even)]:bg-slate-50">
                          {session.strategy.filter((st) => st.weekly).map((st, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="px-2 py-2 align-top sticky left-0 z-10 bg-white border-r w-44">
                                <div className="flex flex-col gap-1">
                                  <Badge style={{ background: "#e6f7fd", color: "#036086", borderColor: PRIMARY, width: "fit-content" }}>{st.subject}</Badge>
                                  <div className="text-xs text-slate-700">{NODE_META[st.node]?.title}</div>
                                </div>
                              </td>
                              {weekDates.map((_, day) => (
                                <td key={day} className="px-1 py-1 align-top min-w-[7rem]">
                                  <Textarea
                                    placeholder="やること…"
                                    value={st.weekCells?.[day] || ""}
                                    onChange={(e) => setWeekCell(idx, day, e.target.value)}
                                    className="bg-white h-16 resize-y border-slate-300 focus-visible:ring-slate-400"
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button onClick={saveWeekSnapshot} className="text-white" style={{ background: PRIMARY }}>この週を保存</Button>
                  </div>

                  {(session.weekSnapshots?.length || 0) > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="text-sm font-medium text-slate-700">保存済みの週プラン</div>
                      {[...session.weekSnapshots].map((snap, rawIdx) => {
                        const idx = session.weekSnapshots.length - 1 - rawIdx; // 新しい順
                        const item = session.weekSnapshots[idx];
                        const start = item.weekStart || session.weeklyStart || session.studyStart || toISO(new Date());
                        const end = addDays(start, 6);
                        return (
                          <div key={idx} className="rounded-lg border bg-white">
                            <div className="flex items-center gap-3 px-3 py-2 border-b">
                              <Badge className="bg-slate-100 text-slate-900 border-slate-200">{new Date(item.at).toLocaleString()}</Badge>
                              <div className="text-sm text-slate-700">週: {start} - {end}</div>
                              <Button size="sm" variant="ghost" className="ml-auto text-slate-600 hover:text-red-600" onClick={() => removeWeekSnapshot(idx)}>削除</Button>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-sm">
                                <thead className="sticky top-0" style={{ background: "#f8fbff" }}>
                                  <tr>
                                    <th className="px-2 py-2 text-left sticky left-0 z-10 bg-white border-r w-40">教科 / タイトル</th>
                                    {Array.from({ length: 7 }, (_, i) => {
                                      const d = addDays(start, i);
                                      const dt = new Date(d);
                                      const label = `${(dt.getMonth() + 1).toString().padStart(2, "0")}/${dt.getDate().toString().padStart(2, "0")}`;
                                      const wday = ["月", "火", "水", "木", "金", "土", "日"][i];
                                      return (
                                        <th key={i} className="px-2 py-2 text-center min-w-[7rem]">{label}<div className="text-[11px] text-slate-500">{wday}</div></th>
                                      );
                                    })}
                                  </tr>
                                </thead>
                                <tbody className="[&>tr:nth-child(even)]:bg-slate-50">
                                  {item.rows.map((row, rIdx) => (
                                    <tr key={rIdx} className="border-t">
                                      <td className="px-2 py-2 align-top sticky left-0 z-10 bg-white border-r w-40">
                                        <div className="flex flex-col gap-1">
                                          <Badge style={{ background: "#e6f7fd", color: "#036086", borderColor: PRIMARY, width: "fit-content" }}>{row.subject}</Badge>
                                          <div className="text-xs text-slate-700">{row.title}</div>
                                        </div>
                                      </td>
                                      {Array.from({ length: 7 }, (_, day) => (
                                        <td key={day} className="px-2 py-2 align-top min-w-[7rem]">
                                          <div className="text-xs whitespace-pre-wrap text-slate-800">{row.cells?.[day] || ""}</div>
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 履歴タブ */}
            <TabsContent value="history" className="relative mt-6 space-y-4 data-[state=inactive]:hidden">
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle>学習サイクル履歴</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {session.history?.length ? (
                    <ul className="space-y-3">
                      {session.history.map((h, idx) => (
                        <li key={idx} className="rounded-xl border p-3 bg-white">
                          <div className="text-sm flex items-center gap-2">
                            <Badge className="bg-slate-100 text-slate-900 border-slate-200">{new Date(h.at).toLocaleString()}</Badge>
                            <span className="text-slate-700">目標{h.target}点 → 前回{h.prevScore}点</span>
                          </div>
                          <div className="mt-2 grid md:grid-cols-2 gap-2">
                            {h.solutions?.map((st: Solution, i: number) => (
                              <div key={i} className="text-xs text-slate-600 flex items-center gap-2">
                                <ArrowRight className="w-3 h-3" />
                                <span>{NODE_META[st.node]?.title || st.node}</span>
                                <span className="opacity-70">— {st.reason}</span>
                              </div>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-slate-600">まだ履歴はありません。</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
