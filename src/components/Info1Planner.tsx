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
import { Trophy, Undo2, ArrowRight, Notebook, BookOpen, Code2, Target, Workflow, Plus, Trash2, ExternalLink, ImageIcon, CalendarDays } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * 改訂 v7（ビジュアル強化）
 * - 週間戦略：スプレッドシート風をさらに強化（ストライプ行、sticky ヘッダ、セル枠、オート保存トグル）
 * - 全体戦略：12ヶ月カラー棒の視認性UP（ラベル/凡例付き、ハイライト強化）
 * - バッジ配色を濃色文字に固定（白背景でも読める）
 * - 画像サムネ維持
 */

type Subject = "情報I" | "数学IA" | "英語" | "国語" | "化学基礎" | "物理基礎" | "生物基礎" | "地理" | "日本史" | "世界史" | "その他";

const SUBJECTS: Subject[] = [
  "その他", "情報I", "数学IA", "英語", "国語", "化学基礎", "物理基礎", "生物基礎", "地理", "日本史", "世界史",
];

type LinkMap = Record<
  "A" | "Ov" | "Prac" | "Cet" | "Prog",
  { title: string; url?: string; img?: string }
>;

const LINKS: LinkMap = {
  A: { title: "過去問", url: "https://akahon.net/products/detail/26713", img: "https://akahon.net/images/cover/978-4-325-26713-3.jpg" },
  Ov: { title: "概要把握", url: "https://bookclub.kodansha.co.jp/product?item=322109000547", img: "https://cdn.kdkw.jp/cover_1000/322109/322109000547_01.webp" },
  Prac: { title: "問題演習", img: "https://storage.googleapis.com/studio-cms-assets/projects/9YWywY00qM/s-311x445_webp_fbce2ae6-6375-4e30-8a69-c559d0e024e0.webp" },
  Cet:  { title: "共通テスト対策", img: "https://www.obunsha.co.jp/img/product/detail/035262.jpg" },
  Prog: { title: "プログラミング演習", img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSwZuIas28PUqgYzs5HFn-LWKTQ3IwCUm6fmQ&s" },
};


const CAUSE_MAP = [
  { key: "unlearned", label: "未修", to: "Ov", icon: BookOpen, hint: "まだ学んでいない単元がある / 定義や用語が曖昧" },
  { key: "practice", label: "演習不足", to: "Prac", icon: Notebook, hint: "量が足りない・解法の手数が出ない" },
  { key: "format", label: "形式不慣れ", to: "Cet", icon: Workflow, hint: "マーク式の時間配分/設問形式に慣れていない" },
  { key: "coding", label: "プログラミング練習不足", to: "Prog", icon: Code2, hint: "実装経験が少ない・エラー対処が苦手" },
] as const;

const NODE_META: Record<string, { title: string; icon: LucideIcon; color: string; img?: string }> = {
  A: { title: "過去問", icon: Target, color: "border-sky-400", img: LINKS.A.img },
  Ov: { title: "概要把握", icon: BookOpen, color: "border-emerald-400", img: LINKS.Ov.img },
  Prac: { title: "問題演習", icon: Notebook, color: "border-indigo-400", img: LINKS.Prac.img },
  Cet: { title: "共通テスト対策", icon: Workflow, color: "border-amber-400", img: LINKS.Cet.img },
  Prog: { title: "プログラミング演習", icon: Code2, color: "border-fuchsia-400", img: LINKS.Prog.img },
  Done: { title: "目標達成", icon: Trophy, color: "border-yellow-500" },
};

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
    } catch {}
  }, [key, state, isBrowser]);

  return [state, setState] as const;
}


// 状態
type StrategyItem = {
  node: NodeKey;
  reason: string;
  at: string;
  subject: Subject;
  months?: number[];
  monthsRange?: { start: number; end: number } | null;
  weekly?: boolean;
  weekCells?: Record<number, string>;
  mergedRanges?: Array<{ start: number; end: number }>;
};

type WeekSnapshot = { at: string; rows: Array<{ subject: string; title: string; cells: Record<number,string> }> };

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
  timelineStart?: ISODate;
  timelineDays?: number;

  // ▼ 追加
  examType?: ExamType;
  examYear?: ExamYear;
  examLabel?: string;   // 例: "2025 共通テスト 本試験"
  strategyMonths?: number[]; // 全体戦略 共通の実施月（固定行）
  weeklyStart?: ISODate;     // 週間ヘッダの開始日
};


type NodeKey = "A" | "Ov" | "Prac" | "Cet" | "Prog" | "Done";
type Solution = { node: NodeKey; reason: string };

// 追記: 試験メタ
type ExamType = "共通テスト 本試験" | "共通テスト 追試験" | "模試";
type ExamYear = 2025 | 2024 | 2023 | 2022;

// 追記: 週間の開始日（連続日付ヘッダ用）
type ISODate = string; // "2025-08-19" のような文字列

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
  timelineStart: new Date().toISOString().slice(0, 10),
  timelineDays: 365,

  // ▼ 追加
  examType: "共通テスト 本試験",
  examYear: 2025,
  examLabel: "2025 共通テスト 本試験",
  strategyMonths: [],
  weeklyStart: new Date().toISOString().slice(0,10),
};

// 月バー（1..12）: マルチトグル
function MultiMonthBar({ values = [], onToggle }: { values?: number[]; onToggle: (m: number)=>void }) {
  const set = new Set(values);
  return (
    <div className="flex gap-1 flex-wrap">
      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
        const active = set.has(m);
        return (
          <button
            key={m}
            type="button"
            onClick={() => onToggle(m)}
            className={`px-2 py-1 text-xs rounded border transition ${active?"bg-sky-600 text-white border-sky-700 shadow-sm":"bg-white text-slate-700 hover:bg-slate-100"}`}
            aria-label={`2026年${m}月を切替`}
            title={`${m}月`}
          >
            {m}月
          </button>
        );
      })}
    </div>
  );
}

// 週間バー（月〜日）
function DayBar({ value, onChange }: { value?: number; onChange: (d: number)=>void }) {
  const labels = ["月","火","水","木","金","土","日"]; // 0..6
  return (
    <div className="flex gap-1">
      {labels.map((lbl, i) => (
        <button key={i} type="button" onClick={()=>onChange(i)}
          className={`px-2 py-1 text-xs rounded border transition ${value===i?"bg-slate-900 text-white border-slate-900":"bg-white text-slate-700 hover:bg-slate-100"}`}
          aria-label={`週間: ${lbl}`}
          title={lbl}
        >{lbl}</button>
      ))}
    </div>
  );
}

export default function Info1Planner() {
  const [session, setSession] = useLocalStorage<Session>("info1_planner_v7", initialSession);
  const [tab, setTab] = useState("plan");
  const [activeDay, setActiveDay] = useState<number | undefined>(undefined);

  const achieved = session.score >= session.target;
  const isInfo = session.subject === "情報I";
  const isUnlearned = !!session.causes["unlearned"]; // 未修ON時

  const selectedCauses = useMemo(() => CAUSE_MAP.filter(c => session.causes[c.key]), [session.causes]);

  const solutions: Solution[] = useMemo(() => {
    const actions: Solution[] = [];
    if (!isInfo) return actions;
    if (achieved) return [{ node: "Done", reason: "目標点数に到達。振り返り・次の目標設定へ。" }];

    if (isUnlearned) {
      actions.push({ node: "Ov", reason: "未修のため、まずは定義・範囲の把握" });
      return actions;
    }

    if (selectedCauses.length > 0) {
      for (const c of selectedCauses) actions.push({ node: c.to as NodeKey, reason: c.label });
    }
    return actions;
  }, [isInfo, achieved, isUnlearned, selectedCauses]);
  
  const filteredHistory = useMemo(() => {
    const list = session.history || [];
    return list.filter((h) =>
      (session.examType ? (h.label?.includes(session.examType) ?? false) : true) &&
      (session.subject ? h.subject === session.subject : true)
    );
  }, [session.history, session.examType, session.subject]);

  // handlers
  function resetToRetry() {
    setSession(s => ({
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
    setSession(s => ({
      ...s,
      strategy: [
        ...s.strategy,
        {
          ...step,
          at: new Date().toISOString(),
          subject: s.subject,
          months: [] as number[],   // ← 型を明示
        },
      ],      
    }));
    toast("全体戦略に追加しました（実施月は全体戦略タブで設定）");
  }

  function toggleStrategyMonth(index: number, m: number) {
    setSession(s => ({
      ...s,
      strategy: s.strategy.map((it, i) => {
        if (i !== index) return it;
        const set = new Set(it.months || []);
        if (set.has(m)) set.delete(m); else set.add(m);
        return { ...it, months: Array.from(set).sort((a,b)=>a-b) } as StrategyItem;
      }),
    }));
  }

  function setStrategyWeekly(index: number, weekly: boolean) {
    setSession(s => ({
      ...s,
      strategy: s.strategy.map((it, i) => i === index ? { ...it, weekly } : it),
    }));
  }

  function setWeekCell(index: number, day: number, text: string) {
    setSession(s => ({
      ...s,
      strategy: s.strategy.map((it, i) => {
        if (i !== index) return it;
        const cells = { ...(it.weekCells || {}) };
        cells[day] = text;
        return { ...it, weekCells: cells } as StrategyItem;
      })
    }));
  }

  function saveWeekSnapshot() {
    const rows = session.strategy.filter(s=>s.weekly).map(st => ({
      subject: st.subject,
      title: NODE_META[st.node]?.title || st.node,
      cells: st.weekCells || {},
    }));
    if (rows.length === 0) { toast("週間戦略に項目がありません"); return; }
    setSession(s => ({
      ...s,
      weekSnapshots: [...(s.weekSnapshots||[]), { at: new Date().toISOString(), rows }],
    }));
    toast.success("この週の計画を保存しました（履歴に残りました）");
  }

  function removeStrategy(index: number) {
    setSession(s => ({ ...s, strategy: s.strategy.filter((_, i) => i !== index) }));
  }

  function clearStrategy() {
    setSession(s => ({ ...s, strategy: [] }));
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8">
      {/* 明背景固定。黒背景でも読みやすい */}
      <div className="rounded-2xl shadow-lg ring-1 ring-black/5 bg-white text-slate-900">
        <header className="flex items-center gap-3 p-4 md:p-6 border-b">
          <Target className="w-6 h-6" />
          <h1 className="text-xl md:text-2xl font-bold">学習計画 UI</h1>
          <Badge variant="outline" className="ml-auto">v7</Badge>
        </header>

        <div className="p-4 md:p-6">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid grid-cols-4 w-full md:w-auto bg-slate-100 rounded-lg p-1">
              <TabsTrigger value="plan" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-700 rounded-md">問題解決</TabsTrigger>
              <TabsTrigger value="strategy" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-700 rounded-md">全体戦略</TabsTrigger>
              <TabsTrigger value="weekly" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-700 rounded-md">週間戦略</TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-700 rounded-md">履歴</TabsTrigger>
            </TabsList>

            {/* 問題解決 */}
            <TabsContent value="plan" className="mt-6 space-y-6">
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">設定</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 教科選択 */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm text-slate-700">教科</label>
                      <div className="border rounded-lg overflow-hidden bg-white">
                        <select
                          className="w-full p-2 bg-white"
                          value={session.subject}
                          onChange={(e)=>setSession(s=>({...s, subject: e.target.value as Subject, causes: {} }))}
                        >
                          {SUBJECTS.map(sub => (
                            <option key={sub} value={sub}>{sub}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* 目標点 */}
                    <div>
                      <label className="text-sm text-slate-700">目標点</label>
                      <div className="mt-2 flex items-center gap-3">
                        <input type="range" min={0} max={100} step={1}
                          value={session.target}
                          onChange={(e)=>setSession(s=>({...s,target:Number(e.target.value)}))}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"/>
                        <Input type="number" value={session.target}
                          onChange={(e)=>setSession(s=>({...s,target:Number(e.target.value||0)}))}
                          className="w-24 bg-white" />
                      </div>
                    </div>

                    {/* 今回のスコア */}
                    <div>
                      <label className="text-sm text-slate-700">今回のスコア（過去問）</label>
                      <div className="mt-2 flex items-center gap-3">
                        <input type="range" min={0} max={100} step={1}
                          value={session.score}
                          onChange={(e)=>setSession(s=>({...s,score:Number(e.target.value)}))}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"/>
                        <Input type="number" value={session.score}
                          onChange={(e)=>setSession(s=>({...s,score:Number(e.target.value||0)}))}
                          className="w-24 bg-white" />
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
                          onChange={(e) => setSession(s => ({ ...s, examYear: Number(e.target.value) as ExamYear, examLabel: `${e.target.value} ${s.examType || ""}` }))}
                        >
                          {[2025, 2024, 2023, 2022].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-slate-700">試験種別</label>
                      <div className="border rounded-lg overflow-hidden bg-white mt-1">
                        <select
                          className="w-full p-2 bg-white"
                          value={session.examType}
                          onChange={(e) => setSession(s => ({ ...s, examType: e.target.value as ExamType, examLabel: `${s.examYear || ""} ${e.target.value}` }))}
                        >
                          {["共通テスト 本試験", "共通テスト 追試験", "模試"].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-slate-700">記録ラベル</label>
                      <Input
                        className="bg-white mt-1"
                        value={session.examLabel || ""}
                        onChange={(e) => setSession(s => ({ ...s, examLabel: e.target.value }))}
                        placeholder="例) 2025 共通テスト 本試験"
                      />
                    </div>
                  </div>

                  {/* 達成 or 原因分析（情報Iのみ） */}
                  {session.score >= session.target ? (
                    <div className="rounded-2xl border border-yellow-500/60 p-4 bg-yellow-50">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-5 h-5" />
                        <b>目標達成！</b>
                      </div>
                      <p className="text-sm mb-2">📝 振り返り・反省・次目標をメモできます。</p>
                      <Textarea
                        placeholder="良かった点 / 反省点 / 次の目標…"
                        value={session.memo}
                        onChange={(e)=>setSession(s=>({...s,memo:e.target.value}))}
                        className="bg-white"
                      />
                      <div className="mt-3 flex gap-2">
                        <Button onClick={resetToRetry} variant="default" className="bg-slate-900 text-white"><Undo2 className="w-4 h-4 mr-1"/>再挑戦（過去問へ）</Button>
                        <Button asChild variant="secondary" className="bg-slate-100 hover:bg-slate-200 text-slate-900">
                          <a href={LINKS.A.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">
                            赤本ページを開く <ExternalLink className="w-3 h-3"/>
                          </a>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {isInfo ? (
                        <div className="space-y-3">
                          <div className="text-sm text-slate-700">目標未達：原因分析（情報I）</div>

                          {/* 行分け：未修段 */}
                          <div className="grid md:grid-cols-2 gap-3">
                            {CAUSE_MAP.filter(c=>c.key==="unlearned").map((c)=>{
                              const Icon = c.icon; const checked = !!session.causes[c.key];
                              return (
                                <label key={c.key} className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${checked?"border-sky-400 bg-sky-50":"hover:border-slate-300"}`}>
                                  <Checkbox checked={checked}
                                    onCheckedChange={(v)=>{
                                      setSession(s=>{
                                        const next = { ...s.causes } as Record<string, boolean>;
                                        if (v) {
                                          next["unlearned"] = true;
                                          CAUSE_MAP.forEach(x=>{ if (x.key !== "unlearned") next[x.key] = false; });
                                        } else {
                                          next["unlearned"] = false;
                                        }
                                        return { ...s, causes: next };
                                      });
                                    }} />
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2"><Icon className="w-4 h-4" /><b>{c.label}</b></div>
                                    <div className="text-xs text-slate-600">{c.hint}</div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>

                          {/* 行分け：既習前提段 */}
                          <div className="text-xs text-slate-500">— ここからは既習前提の対策 —</div>
                          <div className="grid md:grid-cols-2 gap-3">
                            {CAUSE_MAP.filter(c=>c.key!=="unlearned").map((c)=>{
                              const Icon = c.icon; const checked = !!session.causes[c.key];
                              const disabled = !!session.causes["unlearned"]; // 未修ONで無効化
                              return (
                                <label key={c.key} className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${checked?"border-sky-400 bg-sky-50":"hover:border-slate-300"} ${disabled?"opacity-50 cursor-not-allowed":""}`}>
                                  <Checkbox checked={checked}
                                    disabled={disabled}
                                    onCheckedChange={(v)=>{
                                      setSession(s=>{
                                        const next = { ...s.causes } as Record<string, boolean>;
                                        next[c.key] = !!v;
                                        if (v) next["unlearned"] = false;
                                        return { ...s, causes: next };
                                      });
                                    }} />
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2"><Icon className="w-4 h-4" /><b>{c.label}</b></div>
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

                      {/* 解決策（原因が選ばれたときのみ） */}
                      {solutions?.length > 0 && (
                        <Card className="mt-2 bg-white">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">解決策</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="grid md:grid-cols-2 gap-3">
                              {solutions.map((step, i) => {
                                const meta = NODE_META[step.node];
                                const Icon = meta?.icon || ArrowRight;
                                const link = step.node === "Done" ? undefined : LINKS[step.node];
                                return (
                                  <div key={i} className={`rounded-xl border ${meta?.color||""} p-3 bg-white/60`}>                                    
                                    <div className="flex items-center gap-2 mb-1">
                                      <Icon className="w-4 h-4" />
                                      <b>{meta?.title || step.node}</b>
                                      <Badge variant="outline" className="ml-auto">{i+1}</Badge>
                                    </div>
                                    <div className="text-xs text-slate-600 mb-2">{step.reason}</div>
                                    {/* 画像サムネ */}
                                    {link?.img ? (
                                      <img src={link.img} alt={`${link.title} cover`} className="w-24 h-28 object-cover rounded-md border mb-2" />
                                    ) : (
                                      <div className="w-24 h-28 flex items-center justify-center border rounded-md text-slate-400 mb-2">
                                        <ImageIcon className="w-5 h-5" />
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                      {link?.url ? (
                                        <a className="text-sm underline inline-flex items-center gap-1" href={link.url} target="_blank" rel="noreferrer">
                                          {link.title}のページへ <ExternalLink className="w-3 h-3"/>
                                        </a>
                                      ) : (
                                        <span className="text-xs text-slate-500">教材リンクは任意（後で設定可）</span>
                                      )}
                                    </div>
                                    <div className="mt-3 flex items-center gap-2">
                                      <Button size="sm" variant="default" className="ml-auto bg-slate-900 text-white inline-flex items-center gap-1"
                                        onClick={()=>addToStrategy(step)}>
                                        <Plus className="w-4 h-4"/> 全体戦略に追加
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button variant="default" className="bg-slate-900 text-white" onClick={resetToRetry}><Undo2 className="w-4 h-4 mr-1"/>過去問に再挑戦</Button>
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
                <CardContent className="space-y-4">

                  {session.strategy.length === 0 ? (
                    <div className="text-sm text-slate-600">まだ何も追加されていません。問題解決の「解決策」から追加してください。</div>
                  ) : (
                      <ul className="space-y-2 border border-slate-200 rounded-lg p-1">
                      {session.strategy.map((st, idx) => (
                        <li key={idx} className="flex items-start gap-3 rounded-xl border p-3 bg-white hover:shadow-sm transition-shadow">
                          <span className="text-xs rounded-full px-2 py-0.5 border bg-slate-50">{idx+1}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-sky-100 text-sky-800 border-sky-200">{st.subject}</Badge>
                              <div className="text-sm font-semibold">{NODE_META[st.node]?.title || st.node}</div>
                              {st.months?.length ? (
                                <Badge className="ml-2 bg-emerald-100 text-emerald-800 border-emerald-200">実施: 2026年 {st.months.join("・")}月</Badge>
                              ) : (
                                <Badge className="ml-2 bg-slate-100 text-slate-700 border-slate-200">実施月 未設定</Badge>
                              )}
                            </div>
                            <div className="text-xs text-slate-700 mb-2">{st.reason}</div>
                            <div className="flex items-center gap-2 text-xs mb-1">
                              <label className="text-slate-600">期間:</label>
                              <select
                                className="border rounded px-1 py-0.5 bg-white"
                                value={st.monthsRange?.start ?? ""}
                                onChange={(e) => {
                                  const v = Number(e.target.value) || 1;
                                  setSession(s => ({
                                    ...s,
                                    strategy: s.strategy.map((x, i) => {
                                      if (i !== idx) return x;
                                      const end = x.monthsRange?.end ?? v;
                                      return { ...x, monthsRange: { start: v, end: Math.max(v, end) } };
                                    })
                                  }))
                                }}
                              >
                                <option value="">-</option>
                                {Array.from({ length: 12 }, (_, m) => m + 1).map(m => <option key={m} value={m}>{m}月</option>)}
                              </select>
                              <span>〜</span>
                              <select
                                className="border rounded px-1 py-0.5 bg-white"
                                value={st.monthsRange?.end ?? ""}
                                onChange={(e) => {
                                  const v = Number(e.target.value) || 12;
                                  setSession(s => ({
                                    ...s,
                                    strategy: s.strategy.map((x, i) => {
                                      if (i !== idx) return x;
                                      const start = x.monthsRange?.start ?? v;
                                      return { ...x, monthsRange: { start: Math.min(start, v), end: v } };
                                    })
                                  }))
                                }}
                              >
                                <option value="">-</option>
                                {Array.from({ length: 12 }, (_, m) => m + 1).map(m => <option key={m} value={m}>{m}月</option>)}
                              </select>
                            </div>
                            {/* 12ヶ月グリッド（表っぽい見た目） */}
                            <div className="mt-2">
                              <div className="grid grid-cols-[auto_repeat(12,1fr)] items-stretch border rounded">
                                {/* 見出し（左端） */}
                                <div className="px-2 py-1 text-xs bg-slate-50 border-r">
                                  2026年
                                </div>
                                {/* 1〜12月ヘッダ */}
                                {Array.from({ length: 12 }, (_, m) => m + 1).map(m => (
                                  <div key={`h-${m}`} className="px-1 py-1 text-[11px] text-center bg-slate-50 border-l">{m}月</div>
                                ))}

                                {/* 行本体：学習段階見出し */}
                                <div className="px-2 py-2 text-sm border-t border-r font-medium">
                                  {NODE_META[st.node]?.title || st.node}
                                </div>
                                {/* 12セル：期間を帯で塗る */}
                                {Array.from({ length: 12 }, (_, m) => m + 1).map(m => {
                                  const on = st.monthsRange
                                    ? m >= st.monthsRange.start && m <= st.monthsRange.end
                                    : false; // 期間未設定なら未塗り
                                  return (
                                    <div
                                      key={`m-${m}`}
                                      className={`h-6 border-t border-l ${on ? "bg-sky-300" : "bg-white"}`}
                                      title={`${m}月`}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                            <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-700">
                              <input type="checkbox" className="accent-slate-900" checked={!!st.weekly}
                                onChange={(e)=>setStrategyWeekly(idx, e.target.checked)} /> 週間戦略に入れる
                            </label>
                          </div>
                          {/* 月バー（マルチ） */}
                          <div className="flex flex-col items-end gap-2">
                            <Button size="icon" variant="ghost" className="text-slate-700" onClick={()=>removeStrategy(idx)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {session.strategy.length > 0 && (
                    <div className="pt-2 flex gap-2">
                      <Button variant="secondary" className="bg-slate-100 hover:bg-slate-200 text-slate-900" onClick={clearStrategy}><Trash2 className="w-4 h-4 mr-1"/>全削除</Button>
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
                      <span>開始日:</span>
                      <Input
                        type="date"
                        className="h-7 w-[160px] bg-white"
                        value={session.timelineStart || ""}
                        onChange={(e) => setSession(s => ({ ...s, timelineStart: e.target.value }))}
                      />
                    </label>
                    <label className="flex items-center gap-2">
                      <span>表示日数:</span>
                      <select
                        className="border rounded px-1 py-0.5 bg-white h-7"
                        value={session.timelineDays || 730}
                        onChange={(e) => setSession(s => ({ ...s, timelineDays: Number(e.target.value) }))}
                      >
                        {[365, 730, 1095, 1460].map(n => <option key={n} value={n}>{n}日</option>)}
                      </select>
                    </label>
                    <label className="inline-flex items-center gap-2 ml-auto">
                      <input
                        type="checkbox"
                        className="accent-slate-900"
                        checked={!!session.weeklyAutosave}
                        onChange={(e) => setSession(s => ({ ...s, weeklyAutosave: e.target.checked }))}
                      />
                      セル入力を自動保存
                    </label>
                    <div className="ml-2 flex items-center gap-2">
                      <Button size="sm" variant="secondary" className="h-7"
                        onClick={() => setSession(s => {
                          const d = new Date(s.timelineStart || new Date().toISOString().slice(0, 10));
                          d.setDate(d.getDate() - 7);
                          return { ...s, timelineStart: d.toISOString().slice(0, 10) };
                        })}
                      >← 1週</Button>
                      <Button size="sm" variant="secondary" className="h-7"
                        onClick={() => setSession(s => {
                          const d = new Date(s.timelineStart || new Date().toISOString().slice(0, 10));
                          d.setDate(d.getDate() + 7);
                          return { ...s, timelineStart: d.toISOString().slice(0, 10) };
                        })}
                      >1週 →</Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {session.strategy.filter(s => s.weekly).length === 0 ? (
                    <div className="text-sm text-slate-600">
                      まだ週間戦略に入っている項目はありません。全体戦略でチェックしてください。
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10">
                          <tr className="[&>th]:px-2 [&>th]:py-2 [&>th]:text-left">
                            <th className="w-40 sticky left-0 z-20 bg-slate-100 border-r">教科</th>
                            <th className="w-64 sticky left-40 z-20 bg-slate-100 border-r">学習段階</th>
                            {Array.from({ length: session.timelineDays || 730 }, (_, i) => {
                              const baseStr = session.timelineStart || new Date().toISOString().slice(0, 10);
                              const base = new Date(baseStr);
                              const d = new Date(base); d.setDate(base.getDate() + i);
                              const label = `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}`;
                              const youbi = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
                              return (
                                <th key={i} className="w-48 text-center">
                                  <div className="font-medium">{label}</div>
                                  <div className="text-[11px] text-slate-500">{youbi}</div>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody className="[&>tr:nth-child(even)]:bg-slate-50">
                          {session.strategy.map((st, idx) => (
                            st.weekly ? (
                              <tr key={idx} className="border-t">
                                <td className="px-2 py-2 align-top sticky left-0 z-10 bg-white border-r">
                                  <Badge className="bg-sky-100 text-sky-800 border-sky-200">{st.subject}</Badge>
                                </td>
                                <td className="px-2 py-2 align-top font-medium sticky left-40 z-10 bg-white border-r">
                                  {NODE_META[st.node]?.title || st.node}
                                </td>
                                {Array.from({ length: session.timelineDays || 730 }, (_, i) => i).map(day => (
                                  <td key={day} className="px-1 py-1 align-top">
                                    <Textarea
                                      placeholder="やること…"
                                      value={st.weekCells?.[day] || ""}
                                      onChange={(e) => setWeekCell(idx, day, e.target.value)}
                                      className="bg-white h-20 resize-y border-slate-300 focus-visible:ring-slate-400"
                                    />
                                  </td>
                                ))}
                              </tr>
                            ) : null
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button onClick={saveWeekSnapshot} className="bg-slate-900 text-white">この週を保存</Button>
                  </div>

                  {/* 週間スナップショット履歴（そのままでOKなら既存を残す） */}
                  {session.weekSnapshots?.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm text-slate-700 font-semibold">保存済みの週</div>
                      {/* …ここは今のままでOK… */}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>


            {/* 履歴（達成サイクル） */}
            <TabsContent value="history" className="mt-6">
              <Card className="bg-white">
                <CardHeader>
                  <div className="flex flex-wrap gap-3 p-3 pt-0 text-xs text-slate-600">
                    <div className="border rounded-lg overflow-hidden bg-white">
                      <select
                        className="p-2 bg-white"
                        value={session.examType || ""}
                        onChange={(e) => setSession(s => ({ ...s, examType: e.target.value as ExamType }))}
                      >
                        <option value="">（種別を選択）</option>
                        {["共通テスト 本試験", "共通テスト 追試験", "模試"].map(t =>
                          <option key={t} value={t}>{t}</option>
                        )}
                      </select>
                    </div>
                    <div className="border rounded-lg overflow-hidden bg-white">
                      <select
                        className="p-2 bg-white"
                        value={session.subject}
                        onChange={(e) => setSession(s => ({ ...s, subject: e.target.value as Subject }))}
                      >
                        {SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
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
                            <Badge className="bg-slate-100 text-slate-900 border-slate-200">{new Date(h.at).toLocaleString()}</Badge>
                            <span className="text-slate-700">目標{h.target}点 → 前回{h.prevScore}点</span>
                          </div>
                          <div className="mt-2 grid md:grid-cols-2 gap-2">
                          {h.solutions?.map((st: Solution, i: number) => (
                                <div key={i} className="text-xs text-slate-600 flex items-center gap-2">
                                <ArrowRight className="w-3 h-3"/>
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
