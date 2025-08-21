"use client";
/* eslint-disable @next/next/no-img-element */
import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Trophy,
  Undo2,
  ArrowRight,
  Notebook,
  BookOpen,
  Code2,
  Target,
  Workflow,
  Trash2,
  ExternalLink,
  ImageIcon,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * 改訂 v9（build fix）
 * - 週間戦略テーブル内の余計な {"}"} を削除（構文エラー修正）
 * - 月フィルの未実装ハンドラ（throw）を削除して click トグルに統一
 */

const PRIMARY = "#00a0e9";
const SECONDARY = "#ffcf7f";

// ヘルパー
const toISO = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (dateStr: string, n: number) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

// 型
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
  | "物理・物理基礎"
  | "化学・化学基礎"
  | "生物・生物基礎"
  | "地学・地学基礎"
  | "日本史探究・歴史総合"
  | "世界史探究・歴史総合"
  | "地理総合・地理探究"
  | "公共・政治経済"
  | "公共・倫理"
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
  "物理・物理基礎",
  "化学・化学基礎",
  "生物・生物基礎",
  "地学・地学基礎",
  "日本史探究・歴史総合",
  "世界史探究・歴史総合",
  "地理総合・地理探究",
  "公共・政治経済",
  "公共・倫理",
  "情報I",
  "その他"
];

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

const UNIVERSITY_LEVELS: Record<"標準" | "応用" | "発展", string[]> = {
  標準: ["共通テスト", "日東駒専", "日大", "東洋", "駒澤", "専修"],
  応用: [
    "MARCH", "明治", "青山", "立教", "中央", "法政",
    "関関同立", "関西", "関西学院", "同志社", "立命館",
    "地方国立", "地方国公立",
  ],
  発展: [
    "早稲田", "慶應", "早慶",
    "東大", "京大", "阪大", "名大", "東北大", "九大", "北大",
    "東京大学", "京都大学", "大阪大学", "名古屋大学", "東北大学",
    "九州大学", "北海道大学", "一橋", "東京工業", "東工", "神戸大学",
    "難関国公立", "最難関国公立",
  ],
};

function getExamTierFromLabel(label?: string): "標準" | "応用" | "発展" | null {
  if (!label) return null;
  for (const tier of ["発展", "応用", "標準"] as const) {
    if (UNIVERSITY_LEVELS[tier].some((k) => label.includes(k))) return tier;
  }
  // 共通テスト系は無条件で標準扱い
  if (label.includes("共通テスト")) return "標準";
  return null;
}

const CAUSE_MAP = [
  {
    key: "unlearned",
    label: "未修",
    to: "Ov",
    icon: BookOpen,
    hint: "まだ学んでいない単元がある / 定義や用語が曖昧",
  },
  {
    key: "practice",
    label: "演習不足",
    to: "Prac",
    icon: Notebook,
    hint: "量が足りない・解法の手数が出ない",
  },
  {
    key: "format",
    label: "形式不慣れ",
    to: "Cet",
    icon: Workflow,
    hint: "マーク式の時間配分/設問形式に慣れていない",
  },
  {
    key: "coding",
    label: "プログラミング練習不足",
    to: "Prog",
    icon: Code2,
    hint: "実装経験が少ない・エラー対処が苦手",
  },
] as const;

const NODE_META: Record<
  string,
  { title: string; icon: LucideIcon; color: string; img?: string }
> = {
  A: { title: "過去問", icon: Target, color: "border-sky-400", img: LINKS.A.img },
  Ov: {
    title: "概要把握",
    icon: BookOpen,
    color: "border-emerald-400",
    img: LINKS.Ov.img,
  },
  Prac: {
    title: "問題演習",
    icon: Notebook,
    color: "border-indigo-400",
    img: LINKS.Prac.img,
  },
  Cet: {
    title: "共通テスト対策",
    icon: Workflow,
    color: "border-amber-400",
    img: LINKS.Cet.img,
  },
  Prog: {
    title: "プログラミング演習",
    icon: Code2,
    color: "border-fuchsia-400",
    img: LINKS.Prog.img,
  },
  Done: { title: "目標達成", icon: Trophy, color: "border-yellow-500" },
};

function buildPastFallbackReason(target: "標準" | "応用" | "発展"): string {
  if (target === "発展") return "発展過去問で検証→厳しければ 応用→標準 に遡る";
  if (target === "応用") return "応用過去問で検証→厳しければ 標準 に遡る";
  return "標準過去問で検証（安定後に上位へ進む）";
}

type Tier = "基礎" | "標準" | "応用" | "発展";

// 英語ステージの簡易マップ（提案に使う“代表セット”）
const EN_TIERS: Record<Tier, string[]> = {
  基礎: [
    "基礎単語", "基礎文法", "基礎解釈",
  ],
  標準: [
    "標準単語", "標準文法", "熟語", "標準解釈", "標準長文",
    "標準(R)過去問", "共通テスト(R)対策", "標準私立対策",
    "発音", "標準(L)過去問", "共通テスト(L)対策", "基礎リスニング対策",
    "会話問題対策",
  ],
  応用: [
    "例文暗記", "応用単語", "応用長文", "標準作文",
    "応用過去問", "難関私立対策", "地方国公立対策",
    "応用文法+語法対策", "総合英文法対策", "応用解釈対策",
    "理系テーマ対策", "最新テーマ対策", "応用作文",
  ],
  発展: [
    "発展長文", "発展過去問", "発展単語対策", "発展文法+語法対策",
    "発展解釈対策", "発展リスニング対策", "発展作文対策",
    "要約対策",
    // 大学別
    "早稲田対策", "慶應対策", "難関国公立対策",
    "北大対策", "東北大対策", "名大対策", "阪大対策",
    "九大対策", "京大対策", "東大対策",
  ],
};

// examLabel などの文字列から想定 tier を推定
function examLabelToTier(label?: string | null): Tier {
  const s = (label || "").toLowerCase();

  // 発展（早慶・難関国立）
  const advKeys = [
    "早稲田", "慶應", "東大", "京大", "阪大", "名大", "北大", "東北大", "九大",
    "最難関", "難関国公立"
  ];
  if (advKeys.some(k => s.includes(k.toLowerCase()))) return "発展";

  // 応用（MARCH・関関同立・地方国立）
  const applKeys = ["march", "関関同立", "地方国立", "地方国公立"];
  if (applKeys.some(k => s.includes(k.toLowerCase()))) return "応用";

  // 標準（共通テスト・日東駒専）
  const stdKeys = ["共通テスト", "日東駒専"];
  if (stdKeys.some(k => s.includes(k.toLowerCase()))) return "標準";

  // 何もなければ標準に寄せる
  return "標準";
}

// 指定 tier から“遡り順”を作る（発展→応用→標準）
function fallbackChainFromTier(start: Tier): Tier[] {
  const order: Tier[] = ["発展", "応用", "標準"];
  const i = order.indexOf(start);
  return i >= 0 ? order.slice(i) : order;
}

// 英語の “次にやる候補” を短く作る（UI は reason 文で提示）
function englishNextShortlist(tier: Tier, count = 3): string[] {
  const arr = EN_TIERS[tier] || [];
  return arr.slice(0, count);
}

// 英語用 solutions を作成（既存 Solution 型 {node, reason} に合わせる）
function buildEnglishSolutions(session: Session): Solution[] {
  const actions: Solution[] = [];

  // 目標到達なら Done
  if (session.score >= session.target) {
    return [{ node: "Done", reason: "目標点に到達。振り返り・次の目標設定へ。" }];
  }

  const tier = examLabelToTier(session.examLabel);
  const chain = fallbackChainFromTier(tier);

  // 未修 → まず基礎セット
  if (session.causes?.["unlearned"]) {
    const picks = englishNextShortlist("基礎", 3).join(" / ");
    actions.push({
      node: "Ov",
      reason: `未修があるため、まずは基礎の定義整理と最低限セット：${picks}`,
    });
  }

  // “過去問で検証 → ダメなら遡る” を 1つの A ノードに集約して提示
  {
    const msg = chain
      .map((t, idx) => {
        const head =
          t === "発展" ? "発展過去問" :
            t === "応用" ? "応用過去問" : "標準過去問";
        const pick = englishNextShortlist(t, 2).join(" / ");
        return `${idx === 0 ? "まず" : "→ 次に"}「${head}」で検証（推奨：${pick}）`;
      })
      .join(" ");

    actions.push({
      node: "A",
      reason: `${session.examLabel || "目標レベル"} を想定。${msg}。`,
    });
  }

  // 演習不足 → 問題演習（tier に応じて代表セット名を混ぜる）
  if (session.causes?.["practice"]) {
    const pick = englishNextShortlist(tier, 3).join(" / ");
    actions.push({
      node: "Prac",
      reason: `演習不足：まずは ${tier} 帯の演習を増やす（例：${pick}）。`,
    });
  }

  // 形式不慣れ → 共通テスト対策（R/L）
  if (session.causes?.["format"]) {
    actions.push({
      node: "Cet",
      reason: "形式不慣れ：共通テスト(R/L)の時間配分・設問形式に最適化。",
    });
  }

  return actions;
}

function useLocalStorage<T>(key: string, initial: T) {
  const isBrowser = typeof window !== "undefined";
  const [state, setState] = useState<T>(() => {
    if (!isBrowser) return initial;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    if (!isBrowser) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch { }
  }, [key, state, isBrowser]);
  return [state, setState] as const;
}

// 状態
type NodeKey = "A" | "Ov" | "Prac" | "Cet" | "Prog" | "Done";
type ISODate = string;

type StrategyItem = {
  node: NodeKey;
  reason: string;
  at: string;
  subject: Subject;
  monthsRange?: { start: number; end: number } | null;
  weekly?: boolean;
  weekCells?: Record<number, string>;
  startDate?: ISODate;
};

type WeekSnapshot = {
  at: string;  
  weekStart: ISODate;
  rows: Array<{ subject: string; title: string; cells: Record<number, string> }>;
};

type Solution = { node: NodeKey; reason: string };
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
  subject: Subject;
  target: number;
  score: number;
  causes: Record<string, boolean>;
  memo: string;
  history: HistoryItem[];
  strategy: StrategyItem[];
  weekSnapshots: WeekSnapshot[];
  weeklyAutosave?: boolean;
  weeklySpanDays?: number;
  weeklyStart?: ISODate;
  examType?: ExamType;
  examYear?: ExamYear;
  examLabel?: string;
};

const initialSession: Session = {
  subject: "その他",
  target: 80,
  score: 0,
  causes: {},
  memo: "",
  history: [],
  strategy: [],
  weekSnapshots: [],
  weeklyAutosave: true,
  weeklySpanDays: 7,
  weeklyStart: toISO(new Date()),
  examType: "共通テスト 本試験",
  examYear: 2025,
  examLabel: "2025 共通テスト 本試験",
};

export default function Info1Planner() {
  const [session, setSession] = useLocalStorage<Session>(
    "info1_planner_v9",
    initialSession
  );
  const [tab, setTab] = useState("plan");

  const achieved = session.score >= session.target;
  const isInfo = session.subject === "情報I";
  const isUnlearned = !!session.causes["unlearned"];

  const selectedCauses = useMemo(
    () => CAUSE_MAP.filter((c) => session.causes[c.key]),
    [session.causes]
  );

  function detectEnglishTargetTier(label: string | undefined): "標準" | "応用" | "発展" | null {
    const L = label ?? "";
    // 発展：早慶・難関国立
    if (/(早稲田|慶應|東大|京大|阪大|名大|北大|東北大|九大|最難関|難関国公立)/.test(L)) return "発展";
    // 応用：MARCH/関関同立・地方国公立
    if (/(MARCH|関関同立|地方国公立|難関私立)/.test(L)) return "応用";
    // 標準：共通テスト・日東駒専・中堅私大
    if (/(共通テスト|日東駒専|中堅私立)/.test(L)) return "標準";
    return null;
  }

  // === 英語：原因分析→解決アクション組み立て ===
  function buildEnglishSolutions(session: Session): Solution[] {
    const actions: Solution[] = [];
    const label = session.examLabel || "";
    const tier = detectEnglishTargetTier(label);

    // 1) 目標到達
    if (session.score >= session.target) {
      return [{ node: "Done", reason: "目標点数に到達。振り返り・次の目標設定へ。" }];
    }

    // 2) 未修（基礎穴埋め）
    if (session.causes?.["unlearned"]) {
      actions.push({
        node: "Ov",
        reason:
          "未修：基礎→標準の順に底上げ。推奨: 基礎単語→基礎文法→基礎解釈→標準単語→標準文法→熟語→標準解釈→標準長文",
      });
    }

    // 3) 練習量不足（レベル別ラダー）
    if (session.causes?.["practice"]) {
      // リーディング寄り
      if (tier === "発展") {
        actions.push({
          node: "Prac",
          reason:
            "演習不足（発展）：発展長文→発展過去問（早慶/難関国公立）。厳しければ 応用長文→応用過去問（難関私立/地方国公立）→標準長文→標準(R)過去問 の順に遡る",
        });
      } else if (tier === "応用") {
        actions.push({
          node: "Prac",
          reason:
            "演習不足（応用）：応用長文→応用過去問。厳しければ 標準長文→標準(R)過去問 に遡る",
        });
      } else {
        actions.push({
          node: "Prac",
          reason:
            "演習不足（標準）：標準長文→標準(R)過去問（共通テスト/中堅私大）。安定後に 応用長文→応用過去問 へ進む",
        });
      }

      // 作文/文法・語法の強化も補助ラインで提示
      actions.push({
        node: "Prac",
        reason:
          "表現力補強：例文暗記→標準作文→（必要に応じて）応用作文。文法が不安なら 応用文法+語法対策→総合英文法対策 で底上げ",
      });
    }

    // 4) 形式不慣れ（マーク・時間配分）
    if (session.causes?.["format"]) {
      actions.push({
        node: "Cet",
        reason:
          "形式最適化：標準(R)過去問で時間配分→共通テスト(R)対策/標準私立対策。会話問題対策も並行して得点の取りこぼしを防ぐ",
      });
    }

    // 5) リスニング絡み（examLabelやメモにヒントがある場合）
    const looksListening = /(L\)|リスニング|Listening)/i.test(label);
    if (looksListening) {
      // リスニング系ラダーを追加（重複してもOK：UIでは複数カード表示想定）
      actions.push({
        node: "Prac",
        reason:
          "リスニング演習：発音→標準(L)過去問→共通テスト(L)対策。足りなければ基礎リスニング対策で音素/チャンクを固める",
      });
    } else {
      // リスニング苦手をメモ等で示す場合の汎用補助
      if (session.memo?.includes("リスニング") || session.memo?.includes("聴")) {
        actions.push({
          node: "Prac",
          reason:
            "リスニング補助：発音→標準(L)過去問→共通テスト(L)対策。音声速度と設問先読みの型を固める",
        });
      }
    }

    // 6) 過去問の開始レベル（常に最後に1枚だけ出す）
    //   「A」ノードは“今の志望レンジでまず過去問に触れる→無理なら応用→標準に降りる”という意思表示カード
    if (tier === "発展") {
      actions.push({
        node: "A",
        reason: "過去問入口：発展過去問（早慶/難関国公立）→無理なら 応用→標準 にフォールバック",
      });
    } else if (tier === "応用") {
      actions.push({
        node: "A",
        reason: "過去問入口：応用過去問（難関私立/地方国公立）→無理なら 標準 にフォールバック",
      });
    } else {
      actions.push({
        node: "A",
        reason: "過去問入口：標準(R)過去問（共通テスト/中堅私大）。安定後に 応用→発展 へ進む",
      });
    }

    return actions;
  }

  const solutions: Solution[] = useMemo(() => {
    // 情報Iの既存ロジックは温存
    if (isInfo) {
      const actions: Solution[] = [];
      if (achieved) return [{ node: "Done", reason: "目標点数に到達。振り返り・次の目標設定へ。" }];
      if (isUnlearned) return [{ node: "Ov", reason: "未修のため、まずは定義・範囲の把握" }];
      if (selectedCauses.length > 0) {
        for (const c of selectedCauses) actions.push({ node: c.to as NodeKey, reason: c.label });
      }
      return actions;
    }

    // 英語の原因分析（レベルに応じて標準→応用→発展へ/からの遡り）
    if (session.subject === "英語") {
      return buildEnglishSolutions(session);
    }

    // 他科目は今は未実装
    return [];
  }, [session, isInfo, achieved, isUnlearned, selectedCauses]);

  const filteredHistory = useMemo(() => {
    const list = session.history || [];
    return list.filter(
      (h) =>
        (session.examType ? h.label?.includes(session.examType) ?? false : true) &&
        (session.subject ? h.subject === session.subject : true)
    );
  }, [session.history, session.examType, session.subject]);

  // 全体戦略の最小開始日で weeklyStart を同期
  useEffect(() => {
    const dates = (session.strategy || [])
      .map((s) => s.startDate)
      .filter(Boolean) as string[];
    if (dates.length) {
      const min = dates.sort()[0];
      if (min && session.weeklyStart !== min)
        setSession((s) => ({ ...s, weeklyStart: min }));
    }
  }, [session.strategy, setSession, session.weeklyStart]);

  function resetToRetry() {
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
          solutions,
          subject: s.subject,
          label: s.examLabel,
          examType: s.examType,
        },
      ],
    }));
    setTab("plan");
    toast.success("再挑戦：過去問へ戻しました");
  }

  function addToStrategy(step: Solution) {
    const exists = session.strategy.some(
      (it) => it.subject === session.subject && it.node === step.node
    );
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
          startDate: toISO(new Date()),
          monthsRange: null,
        },
      ],
    }));
    toast("全体戦略に追加しました（開始日と期間は全体戦略タブで編集）");
  }

  // 12ヶ月帯フィル：クリックでレンジ更新
  function toggleStrategyMonthFill(idx: number, m: number) {
    setSession((s) => ({
      ...s,
      strategy: s.strategy.map((st, i) => {
        if (i !== idx) return st;
        const cur = st.monthsRange || { start: m, end: m };
        if (cur.start == null || cur.end == null)
          return { ...st, monthsRange: { start: m, end: m } };
        if (m < cur.start) return { ...st, monthsRange: { start: m, end: cur.end } };
        if (m > cur.end) return { ...st, monthsRange: { start: cur.start, end: m } };
        // クリックが現在レンジ内の場合は単点に戻す
        return { ...st, monthsRange: { start: m, end: m } };
      }),
    }));
  }

  function setStrategyWeekly(index: number, weekly: boolean) {
    setSession((s) => ({
      ...s,
      strategy: s.strategy.map((it, i) => (i === index ? { ...it, weekly } : it)),
    }));
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

  function saveWeekSnapshot() {
    const rows = session.strategy
      .filter((s) => s.weekly)
      .map((st) => ({
        subject: st.subject,
        title: NODE_META[st.node]?.title || st.node,
        cells: st.weekCells || {},
      }));

    if (rows.length === 0) {
      toast("週間戦略に項目がありません");
      return;
    }

    const weekStart = session.weeklyStart || toISO(new Date()); // ★ 保存時に週開始を記録

    setSession((s) => ({
      ...s,
      weekSnapshots: [
        ...(s.weekSnapshots || []),
        { at: new Date().toISOString(), weekStart, rows },
      ],
    }));
    toast.success("この週の計画を保存しました（下に履歴として追加されました）");
  }

  function removeWeekSnapshot(index: number) {
    setSession((s) => ({
      ...s,
      weekSnapshots: (s.weekSnapshots || []).filter((_, i) => i !== index),
    }));
  }

  function removeStrategy(index: number) {
    setSession((s) => ({ ...s, strategy: s.strategy.filter((_, i) => i !== index) }));
  }
  function clearStrategy() {
    setSession((s) => ({ ...s, strategy: [] }));
  }

  // 週間：週ヘッダ（weeklyStart から7日）
  const weekDates = useMemo(() => {
    const base = session.weeklyStart || toISO(new Date());
    return Array.from({ length: 7 }, (_, i) => addDays(base, i));
  }, [session.weeklyStart]);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8">
      <div className="rounded-2xl shadow-lg ring-1 ring-black/5 bg-white text-slate-900">
        <header className="flex items-center gap-3 p-4 md:p-6 border-b">
          <Target className="w-6 h-6" />
          <h1 className="text-xl md:text-2xl font-bold">学習計画 UI</h1>
          <Badge variant="outline" className="ml-auto">
            v9
          </Badge>
        </header>

        <div className="p-4 md:p-6">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList
              className="grid grid-cols-4 w-full md:w-auto rounded-lg p-1"
              style={{ background: "#e6f7fd" }}
            >
              {(["plan", "strategy", "weekly", "history"] as const).map((val) => (
                <TabsTrigger
                  key={val}
                  value={val}
                  className="rounded-md"
                  style={{
                    color: tab === val ? "white" : "#036086",
                    background: tab === val ? PRIMARY : "transparent",
                  }}
                >
                  {
                    (
                      {
                        plan: "問題解決",
                        strategy: "全体戦略",
                        weekly: "週間戦略",
                        history: "履歴",
                      } as const
                    )[val]
                  }
                </TabsTrigger>
              ))}
            </TabsList>

            {/* 問題解決 */}
            <TabsContent value="plan" className="mt-6 space-y-6">
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
                          onChange={(e) =>
                            setSession((s) => ({
                              ...s,
                              subject: e.target.value as Subject,
                              causes: {},
                            }))
                          }
                        >
                          {SUBJECTS.map((sub) => (
                            <option key={sub} value={sub}>
                              {sub}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-slate-700">目標点</label>
                      <div className="mt-2 flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={session.target}
                          onChange={(e) =>
                            setSession((s) => ({
                              ...s,
                              target: Number(e.target.value),
                            }))
                          }
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <Input
                          type="number"
                          value={session.target}
                          onChange={(e) =>
                            setSession((s) => ({
                              ...s,
                              target: Number(e.target.value || 0),
                            }))
                          }
                          className="w-24 bg-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-slate-700">今回のスコア（過去問）</label>
                      <div className="mt-2 flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={session.score}
                          onChange={(e) =>
                            setSession((s) => ({
                              ...s,
                              score: Number(e.target.value),
                            }))
                          }
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <Input
                          type="number"
                          value={session.score}
                          onChange={(e) =>
                            setSession((s) => ({
                              ...s,
                              score: Number(e.target.value || 0),
                            }))
                          }
                          className="w-24 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ▼ 試験メタ（年・種別・ラベル） */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm text-slate-700">年度</label>
                      <div className="border rounded-lg overflow-hidden bg-white mt-1">
                        <select
                          className="w-full p-2 bg-white"
                          value={session.examYear}
                          onChange={(e) =>
                            setSession((s) => ({
                              ...s,
                              examYear: Number(e.target.value) as ExamYear,
                              examLabel: `${e.target.value} ${s.examType || ""}`,
                            }))
                          }
                        >
                          {[2025, 2024, 2023, 2022].map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
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
                          onChange={(e) =>
                            setSession((s) => ({
                              ...s,
                              examType: e.target.value as ExamType,
                              examLabel: `${s.examYear || ""} ${e.target.value}`,
                            }))
                          }
                        >
                          {["共通テスト 本試験", "共通テスト 追試験", "模試"].map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-slate-700">記録ラベル</label>
                      <Input
                        className="bg-white mt-1"
                        value={session.examLabel || ""}
                        onChange={(e) =>
                          setSession((s) => ({ ...s, examLabel: e.target.value }))
                        }
                        placeholder="例) 2025 共通テスト 本試験"
                      />
                    </div>
                  </div>

                  {/* 達成 or 原因分析（情報Iのみ） */}
                  {session.score >= session.target ? (
                    <div
                      className="rounded-2xl border p-4"
                      style={{ borderColor: "#e6b800", background: "#fff8db" }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-5 h-5" />
                        <b>目標達成！</b>
                      </div>
                      <p className="text-sm mb-2">
                        📝 振り返り・反省・次目標をメモできます。
                      </p>
                      <Textarea
                        placeholder="良かった点 / 反省点 / 次の目標…"
                        value={session.memo}
                        onChange={(e) =>
                          setSession((s) => ({ ...s, memo: e.target.value }))
                        }
                        className="bg-white"
                      />
                      <div className="mt-3 flex gap-2">
                        <Button
                          onClick={resetToRetry}
                          variant="default"
                          className="text-white"
                          style={{ background: PRIMARY }}
                        >
                          <Undo2 className="w-4 h-4 mr-1" />
                          再挑戦（過去問へ）
                        </Button>
                        <Button asChild variant="secondary" style={{ background: SECONDARY }}>
                          <a
                            href={LINKS.A.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1"
                          >
                            赤本ページを開く <ExternalLink className="w-3 h-3" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {isInfo ? (
                        <div className="space-y-3">
                          <div className="text-sm text-slate-700">
                            目標未達：原因分析（情報I）
                          </div>
                          <div className="grid md:grid-cols-2 gap-3">
                            {CAUSE_MAP.filter((c) => c.key === "unlearned").map((c) => {
                              const Icon = c.icon;
                              const checked = !!session.causes[c.key];
                              return (
                                <label
                                  key={c.key}
                                  className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${checked ? "ring-2" : "hover:border-slate-300"
                                    }`}
                                  style={
                                    checked
                                      ? { borderColor: PRIMARY, boxShadow: `0 0 0 2px ${PRIMARY}33` }
                                      : {}
                                  }
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(v) => {
                                      setSession((s) => {
                                        const next = { ...s.causes } as Record<
                                          string,
                                          boolean
                                        >;
                                        if (v) {
                                          next["unlearned"] = true;
                                          CAUSE_MAP.forEach((x) => {
                                            if (x.key !== "unlearned") next[x.key] = false;
                                          });
                                        } else {
                                          next["unlearned"] = false;
                                        }
                                        return { ...s, causes: next };
                                      });
                                    }}
                                  />
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Icon className="w-4 h-4" />
                                      <b>{c.label}</b>
                                    </div>
                                    <div className="text-xs text-slate-600">{c.hint}</div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                          <div className="text-xs text-slate-500">
                            — ここからは既習前提の対策 —
                          </div>
                          <div className="grid md:grid-cols-2 gap-3">
                            {CAUSE_MAP.filter((c) => c.key !== "unlearned").map((c) => {
                              const Icon = c.icon;
                              const checked = !!session.causes[c.key];
                              const disabled = !!session.causes["unlearned"]; // 未修ONで無効化
                              return (
                                <label
                                  key={c.key}
                                  className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${checked ? "ring-2" : "hover:border-slate-300"
                                    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                                  style={
                                    checked
                                      ? { borderColor: PRIMARY, boxShadow: `0 0 0 2px ${PRIMARY}33` }
                                      : {}
                                  }
                                >
                                  <Checkbox
                                    checked={checked}
                                    disabled={disabled}
                                    onCheckedChange={(v) => {
                                      setSession((s) => {
                                        const next = { ...s.causes } as Record<
                                          string,
                                          boolean
                                        >;
                                        next[c.key] = !!v;
                                        if (v) next["unlearned"] = false;
                                        return { ...s, causes: next };
                                      });
                                    }}
                                  />
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Icon className="w-4 h-4" />
                                      <b>{c.label}</b>
                                    </div>
                                    <div className="text-xs text-slate-600">{c.hint}</div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg border p-3 text-sm text-slate-700 bg-slate-50">
                          情報I を選択すると原因分析が表示されます。
                        </div>
                      )}

                      {/* 解決策 */}
                      {solutions?.length > 0 && (
                        <Card className="mt-2 bg-white">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              解決策
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="grid md:grid-cols-2 gap-3">
                              {solutions.map((step, i) => {
                                const meta = NODE_META[step.node];
                                const Icon = meta?.icon || ArrowRight;
                                const link =
                                  step.node === "Done"
                                    ? undefined
                                    : LINKS[step.node as keyof LinkMap];
                                return (
                                  <button
                                    key={i}
                                    onClick={() => addToStrategy(step)}
                                    className="text-left rounded-xl border p-3 bg-white/60 group relative hover:shadow-md transition"
                                    style={{ borderColor: "#e2e8f0" }}
                                  >
                                    <div className="flex items-center gap-2 mb-1">
                                      <Icon className="w-4 h-4" />
                                      <b>{meta?.title || step.node}</b>
                                      <Badge variant="outline" className="ml-auto">
                                        {i + 1}
                                      </Badge>
                                    </div>
                                    <div className="text-xs text-slate-600 mb-2">
                                      {step.reason}
                                    </div>
                                    {link?.img ? (
                                      <img
                                        src={link.img}
                                        alt={`${link.title} cover`}
                                        className="w-24 h-28 object-cover rounded-md border mb-2"
                                      />
                                    ) : (
                                      <div className="w-24 h-28 flex items-center justify-center border rounded-md text-slate-40 mb-2">
                                        <ImageIcon className="w-5 h-5" />
                                      </div>
                                    )}
                                    {link?.url ? (
                                      <span className="text-xs underline inline-flex items-center gap-1">
                                        教材: {link.title}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-slate-500">
                                        教材リンクは任意
                                      </span>
                                    )}
                                    <span
                                      className="absolute right-3 top-3 opacity-80 group-hover:translate-x-0.5 transition-transform"
                                      aria-hidden
                                    >
                                      <ChevronRight style={{ color: PRIMARY }} />
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="default"
                                className="text-white"
                                style={{ background: PRIMARY }}
                                onClick={resetToRetry}
                              >
                                <Undo2 className="w-4 h-4 mr-1" />
                                過去問に再挑戦
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 全体戦略 */}
            <TabsContent value="strategy" className="mt-6">
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">全体戦略</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {session.strategy.length === 0 ? (
                    <div className="text-sm text-slate-600">
                      まだ何も追加されていません。問題解決の「解決策」から追加してください。
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {session.strategy.map((st, idx) => (
                        <li
                          key={idx}
                          className="grid items-center gap-2 p-2 rounded-lg border bg-white hover:shadow-sm transition"
                          style={{
                            gridTemplateColumns:
                              "auto 10rem 1fr 10rem minmax(240px,1fr)",
                            borderColor: "#e2e8f0",
                          }}
                        >
                          <span
                            className="text-xs rounded px-2 py-0.5 border bg-white"
                            style={{ borderColor: SECONDARY }}
                          >
                            {idx + 1}
                          </span>
                          <Badge
                            style={{
                              background: "#e6f7fd",
                              color: "#036086",
                              borderColor: PRIMARY,
                            }}
                          >
                            {st.subject}
                          </Badge>
                          <div className="truncate text-sm font-medium">
                            {NODE_META[st.node]?.title || st.node} —{" "}
                            <span className="font-normal text-slate-600 truncate inline-block max-w-full align-bottom">
                              {st.reason}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <span className="text-slate-600">開始日</span>
                            <Input
                              type="date"
                              className="h-7 bg-white"
                              value={st.startDate || session.weeklyStart || toISO(new Date())}
                              onChange={(e) =>
                                setSession((s) => ({
                                  ...s,
                                  strategy: s.strategy.map((x, i) =>
                                    i === idx ? { ...x, startDate: e.target.value } : x
                                  ),
                                  weeklyStart: s.weeklyStart || e.target.value,
                                }))
                              }
                            />
                          </div>
                          {/* 12ヶ月フィル（クリックで範囲指定） */}
                          <div className="grid grid-cols-12 gap-1">
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((m, i) => {
                              const col = i + 1; // 1..12
                              const on = st.monthsRange
                                ? col >= st.monthsRange.start! &&
                                col <= st.monthsRange.end!
                                : false;
                              return (
                                <div
                                  key={`m-${m}`}
                                  title={`${m}月`}
                                  className="h-6 rounded border"
                                  onClick={() => toggleStrategyMonthFill(idx, col)}
                                  style={{
                                    background: on ? PRIMARY : "#fff",
                                    borderColor: on ? PRIMARY : "#e2e8f0",
                                    cursor: "pointer",
                                  }}
                                />
                              );
                            })}
                          </div>
                          <label className="col-span-full inline-flex items-center gap-2 text-xs text-slate-700 mt-1">
                            <input
                              type="checkbox"
                              className="accent-[#00a0e9]"
                              checked={!!st.weekly}
                              onChange={(e) => setStrategyWeekly(idx, e.target.checked)}
                            />{" "}
                            週間戦略に入れる
                            <Button
                              size="icon"
                              variant="ghost"
                              className="ml-auto"
                              onClick={() => removeStrategy(idx)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                  {session.strategy.length > 0 && (
                    <div className="pt-1 flex gap-2">
                      <Button
                        variant="secondary"
                        className="text-white hover:opacity-90 focus:ring-2 focus:ring-[#00a0e9]/30"
                        style={{ background: PRIMARY, borderColor: PRIMARY }}
                        onClick={clearStrategy}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        全削除
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 週間戦略 */}
            <TabsContent value="weekly" className="mt-6">
              <Card className="bg-white">
                <CardHeader className="flex flex-col gap-2">
                  <CardTitle className="flex items-center gap-2">週間戦略</CardTitle>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    <label className="flex items-center gap-2">
                      <span>週の開始日:</span>
                      <Input
                        type="date"
                        className="h-7 w-[160px] bg-white"
                        value={session.weeklyStart || toISO(new Date())}
                        onChange={(e) =>
                          setSession((s) => ({ ...s, weeklyStart: e.target.value }))
                        }
                      />
                    </label>
                    <div className="ml-auto text-slate-500">
                      全体戦略の最小開始日と自動同期
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {session.strategy.filter((s) => s.weekly).length === 0 ? (
                    <div className="text-sm text-slate-600">
                      まだ週間戦略に入っている項目はありません。全体戦略でチェックしてください。
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="min-w-full text-sm">
                        <thead style={{ background: "#f0fbff", color: "#036086" }}>
                          <tr>
                            <th className="px-2 py-2 text-left sticky left-0 z-10 bg-white border-r w-40">
                              教科
                            </th>
                            {weekDates.map((d, i) => {
                              const dt = new Date(d);
                              const label = `${(dt.getMonth() + 1)
                                .toString()
                                .padStart(2, "0")}/${dt
                                  .getDate()
                                  .toString()
                                  .padStart(2, "0")}`;
                              const wday = ["月", "火", "水", "木", "金", "土", "日"][i % 7];
                              return (
                                <th key={d} className="px-2 py-2 text-center min-w-[10rem]">
                                  {label}
                                  <div className="text-[11px] text-slate-500">{wday}</div>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                          <tbody className="[&>tr:nth-child(even)]:bg-slate-50">
                            {session.strategy
                              .filter((st) => st.weekly)
                              .map((st, idx) => (
                                <tr key={idx} className="border-t">
                                  <td className="px-2 py-2 align-top sticky left-0 z-10 bg-white border-r w-40">
                                    <Badge style={{ background: "#e6f7fd", color: "#036086", borderColor: PRIMARY }}>
                                      {st.subject}
                                    </Badge>
                                  </td>
                                  {weekDates.map((_, day) => (
                                    <td key={day} className="px-1 py-1 align-top min-w-[10rem]">
                                      <Textarea
                                        placeholder="やること…"
                                        value={st.weekCells?.[day] || ""}
                                        onChange={(e) => setWeekCell(idx, day, e.target.value)}
                                        className="bg-white h-20 resize-y border-slate-300 focus-visible:ring-slate-400"
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
                    <Button onClick={saveWeekSnapshot} className="text-white" style={{ background: PRIMARY }}>
                      この週を保存
                    </Button>
                    {(session.weekSnapshots?.length || 0) > 0 && (
                      <div className="space-y-3 pt-2">
                        <div className="text-sm font-medium text-slate-700">保存済みの週プラン</div>

                        {[...session.weekSnapshots].map((snap, rawIdx) => {
                          // 新しい順に見せたい → 描画順を逆転
                          const idx = session.weekSnapshots.length - 1 - rawIdx;
                          const item = session.weekSnapshots[idx];
                          const start = item.weekStart ?? session.weeklyStart ?? toISO(new Date());
                          const end = addDays(start, 6);

                          return (
                            <div key={idx} className="rounded-lg border bg-white">
                              <div className="flex items-center gap-3 px-3 py-2 border-b">
                                <Badge className="bg-slate-100 text-slate-900 border-slate-200">
                                  {new Date(item.at).toLocaleString()}
                                </Badge>
                                <div className="text-sm text-slate-700">
                                  週: {start} - {end}
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="ml-auto text-slate-600 hover:text-red-600"
                                  onClick={() => removeWeekSnapshot(idx)}
                                >
                                  削除
                                </Button>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                  <thead className="sticky top-0" style={{ background: "#f8fbff" }}>
                                    <tr>
                                      <th className="px-2 py-2 text-left sticky left-0 z-10 bg-white border-r w-40">
                                        教科 / タイトル
                                      </th>
                                      {Array.from({ length: 7 }, (_, i) => {
                                        const d = addDays(start, i);
                                        const dt = new Date(d);
                                        const label = `${(dt.getMonth() + 1).toString().padStart(2, "0")}/${dt
                                          .getDate()
                                          .toString()
                                          .padStart(2, "0")}`;
                                        const wday = ["月", "火", "水", "木", "金", "土", "日"][i];
                                        return (
                                          <th key={i} className="px-2 py-2 text-center min-w-[10rem]">
                                            {label}
                                            <div className="text-[11px] text-slate-500">{wday}</div>
                                          </th>
                                        );
                                      })}
                                    </tr>
                                  </thead>
                                  <tbody className="[&>tr:nth-child(even)]:bg-slate-50">
                                    {item.rows.map((row, rIdx) => (
                                      <tr key={rIdx} className="border-t">
                                        <td className="px-2 py-2 align-top sticky left-0 z-10 bg-white border-r w-40">
                                          <div className="flex flex-col gap-1">
                                            <Badge
                                              style={{
                                                background: "#e6f7fd",
                                                color: "#036086",
                                                borderColor: PRIMARY,
                                                width: "fit-content",
                                              }}
                                            >
                                              {row.subject}
                                            </Badge>
                                            <div className="text-xs text-slate-700">{row.title}</div>
                                          </div>
                                        </td>
                                        {Array.from({ length: 7 }, (_, day) => (
                                          <td key={day} className="px-2 py-2 align-top min-w-[10rem]">
                                            <div className="text-xs whitespace-pre-wrap text-slate-800">
                                              {row.cells?.[day] || ""}
                                            </div>
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
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 履歴 */}
            <TabsContent value="history" className="mt-6">
              <Card className="bg-white">
                <CardHeader>
                  <div className="flex flex-wrap gap-3 p-3 pt-0 text-xs text-slate-600">
                    <div className="border rounded-lg overflow-hidden bg-white">
                      <select
                        className="p-2 bg-white"
                        value={session.examType || ""}
                        onChange={(e) =>
                          setSession((s) => ({
                            ...s,
                            examType: e.target.value as ExamType,
                          }))
                        }
                      >
                        <option value="">（種別を選択）</option>
                        {["共通テスト 本試験", "共通テスト 追試験", "模試"].map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="border rounded-lg overflow-hidden bg-white">
                      <select
                        className="p-2 bg-white"
                        value={session.subject}
                        onChange={(e) =>
                          setSession((s) => ({
                            ...s,
                            subject: e.target.value as Subject,
                          }))
                        }
                      >
                        {SUBJECTS.map((sub) => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <CardTitle>学習サイクル履歴</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {session.history?.length ? (
                    <ul className="space-y-3">
                      {filteredHistory.map((h, idx) => (
                        <li key={idx} className="rounded-xl border p-3 bg-white">
                          <div className="text-sm flex items-center gap-2">
                            <Badge className="bg-slate-100 text-slate-900 border-slate-200">
                              {new Date(h.at).toLocaleString()}
                            </Badge>
                            <span className="text-slate-700">
                              目標{h.target}点 → 前回{h.prevScore}点
                            </span>
                          </div>
                          <div className="mt-2 grid md:grid-cols-2 gap-2">
                            {h.solutions?.map((st: Solution, i: number) => (
                              <div
                                key={i}
                                className="text-xs text-slate-600 flex items-center gap-2"
                              >
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
