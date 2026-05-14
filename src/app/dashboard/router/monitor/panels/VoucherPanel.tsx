"use client";

import { useCallback, useEffect, useState } from "react";

const inputClass = "w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500";

type Form = {
  qty: number;
  userMode: "up" | "vc";
  userLen: number;
  charMode: string;
  prefix: string;
  profile: string;
  server: string;
  timeLimit: string;
  dataLimit: string;
  comment: string;
};

type Generated = { user: string; password: string };

const CHAR_MODES_UP = [
  { value: "lower", label: "abcd (lower)" },
  { value: "upper", label: "ABCD (upper)" },
  { value: "upplow", label: "aBcD (mixed case)" },
  { value: "mix", label: "5ab2c (lower+num)" },
  { value: "mix1", label: "5AB2C (upper+num)" },
  { value: "mix2", label: "5aB2c (all)" },
];
const CHAR_MODES_VC = [
  ...CHAR_MODES_UP,
  { value: "num", label: "1234 (number only)" },
];

export default function VoucherPanel({ routerId }: { routerId: string }) {
  const [profiles, setProfiles] = useState<string[]>([]);
  const [form, setForm] = useState<Form>({
    qty: 5,
    userMode: "vc",
    userLen: 5,
    charMode: "mix",
    prefix: "",
    profile: "",
    server: "all",
    timeLimit: "",
    dataLimit: "",
    comment: "",
  });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ created: Generated[]; errors: string[]; batchComment: string } | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/account/router/${routerId}/hotspot/profiles`, { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      const names = ((json.data?.profiles ?? []) as Array<{ name: string }>).map((p) => p.name);
      setProfiles(names);
      if (names.length > 0 && !form.profile) setForm((f) => ({ ...f, profile: names[0] }));
    } catch {}
  }, [routerId, form.profile]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) void fetchProfiles(); });
    return () => { cancelled = true; };
  }, [fetchProfiles]);

  const generate = async () => {
    if (!form.profile) { showMsg("err", "Pilih profile dulu"); return; }
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`/api/account/router/${routerId}/hotspot/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        showMsg("err", json?.error ?? "Gagal generate");
        return;
      }
      const data = json.data ?? json;
      setResult(data);
      showMsg("ok", `${data.created.length} voucher dibikin${data.errors.length ? ` (${data.errors.length} gagal)` : ""}`);
    } catch (e) {
      showMsg("err", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const copyAll = () => {
    if (!result) return;
    const text = result.created.map((v) => `${v.user}\t${v.password}`).join("\n");
    navigator.clipboard.writeText(text).then(() => showMsg("ok", "Daftar voucher di-copy"));
  };

  return (
    <div className="space-y-3">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-5 shadow-sm space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Generate Voucher</h2>
          <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5">
            Bikin user hotspot massal dengan pola random. Mode <strong>vc</strong> = user &amp; password sama (1 kode di voucher). Mode <strong>up</strong> = user dan password beda.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-gray-500 dark:text-white/40">Quantity</label>
            <input type="number" min={1} max={500} value={form.qty} onChange={(e) => setForm({ ...form, qty: parseInt(e.target.value, 10) || 1 })} className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-white/40">User Mode</label>
            <select value={form.userMode} onChange={(e) => setForm({ ...form, userMode: e.target.value as "up" | "vc" })} className={inputClass}>
              <option value="vc">vc (user = pass)</option>
              <option value="up">up (user beda pass)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-white/40">Length</label>
            <input type="number" min={3} max={10} value={form.userLen} onChange={(e) => setForm({ ...form, userLen: parseInt(e.target.value, 10) || 4 })} className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-white/40">Character</label>
            <select value={form.charMode} onChange={(e) => setForm({ ...form, charMode: e.target.value })} className={inputClass}>
              {(form.userMode === "vc" ? CHAR_MODES_VC : CHAR_MODES_UP).map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-white/40">Prefix (opsional)</label>
            <input value={form.prefix} onChange={(e) => setForm({ ...form, prefix: e.target.value })} className={inputClass} placeholder="" />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-white/40">Profile</label>
            <select value={form.profile} onChange={(e) => setForm({ ...form, profile: e.target.value })} className={inputClass}>
              {profiles.length === 0 && <option value="">(belum ada profile)</option>}
              {profiles.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-white/40">Time Limit</label>
            <input value={form.timeLimit} onChange={(e) => setForm({ ...form, timeLimit: e.target.value })} className={inputClass} placeholder="kosong / 1d / 12h" />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-white/40">Data Limit (bytes)</label>
            <input type="number" min={0} value={form.dataLimit} onChange={(e) => setForm({ ...form, dataLimit: e.target.value })} className={inputClass} placeholder="kosong = unlimited" />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-white/40">Comment Tambahan</label>
            <input value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} className={inputClass} placeholder="opsional" />
          </div>
        </div>

        <button onClick={generate} disabled={busy} className="w-full px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium">
          {busy ? "Generating..." : "Generate"}
        </button>
      </div>

      {message && (
        <div className={`text-sm px-4 py-3 rounded-lg ${message.type === "ok" ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20"}`}>
          {message.text}
        </div>
      )}

      {result && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-white/5 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-white/80">Hasil ({result.created.length})</h2>
              <p className="text-[11px] text-gray-400 dark:text-white/30 font-mono mt-0.5">batch: {result.batchComment}</p>
            </div>
            <button onClick={copyAll} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 text-gray-700 dark:text-white/70 font-medium">Copy semua (TSV)</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-white/5 text-[10px] uppercase tracking-wider text-gray-500 dark:text-white/40">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold w-12">#</th>
                  <th className="text-left px-4 py-2 font-semibold">User</th>
                  <th className="text-left px-4 py-2 font-semibold">Password</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {result.created.map((v, i) => (
                  <tr key={`${v.user}-${i}`}>
                    <td className="px-4 py-2 text-gray-400 dark:text-white/30 font-mono">{i + 1}</td>
                    <td className="px-4 py-2 font-mono text-gray-900 dark:text-white">{v.user}</td>
                    <td className="px-4 py-2 font-mono text-gray-700 dark:text-white/70">{v.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.errors.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 dark:border-white/5 bg-red-50 dark:bg-red-500/5">
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">Gagal ({result.errors.length}):</p>
              <ul className="text-[11px] text-red-600 dark:text-red-400/80 space-y-0.5">
                {result.errors.map((e, i) => <li key={i} className="font-mono">{e}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
