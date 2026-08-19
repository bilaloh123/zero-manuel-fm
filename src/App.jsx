import React, { useState, useMemo, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
import {
  Sprout, Cherry, Droplets, ThermometerSun, AlertTriangle, Users, Truck,
  Wallet, LayoutGrid, FileText, Bell, LogOut, ChevronLeft, Trash2, ChevronDown,
  Plus, X, Clock, ShieldCheck, Building2, Receipt, Download, CheckCircle2, TrendingUp, Package, ArrowDownCircle, ArrowUpCircle, ClipboardList, Mail, FileCheck, FileSpreadsheet, Percent, Lock, Mic, Square, Play, CalendarClock, Store, Phone, ArrowRight, Brain, Send, Scissors, SprayCan, Type, Grid3x3,
} from "lucide-react";

const c = {
  bg: "#F3F4F6", headerGreen: "#0D6B49", headerGreenLight: "#12855C", cardGreen: "#11996B", cardGreenLight: "#1CB37D", cardGreenDeep: "#0A6B49",
  orange: "#EC9F32", orangeLight: "#F5B85C", white: "#FFFFFF", ink: "#1A2420", inkSoft: "#4B5D55",
  inkMuted: "#9CAE8C", inkMuted2: "#8B9490", line: "#E5E8E5", danger: "#D64550", blue: "#3B82C4",
};

// ---------- mock users (simulated auth) ----------
const users = [
  { id: 1, nom: "الهاشمي", role: "Owner", farms: ["zm", "atlas"] },
  { id: 2, nom: "سعيد", role: "Manager", farms: ["zm"] },
  { id: 3, nom: "يوسف", role: "Supervisor", farms: ["zm"] },
  { id: 4, nom: "خديجة", role: "Accountant", farms: ["zm", "atlas"] },
  { id: 5, nom: "أحمد", role: "Worker", farms: ["zm"] },
];
const roleLabel = { Owner: "المالك", Manager: "مدير", Supervisor: "مشرف ميداني", Accountant: "محاسب", Worker: "عامل" };
const initMarketplace = [
  { id: 1, farmId: "zm", farmNom: "زيرو مانويل", type: "أعرض", produit: "مبيد فطريات (نحاس)", kammiya: 15, wehda: "كيلو", prix: 45, description: "زايد عندنا من الشرا الأخير، جودة زوينة", contactNom: "الهاشمي", contactTel: "0661-00-00-00", date: "19 يوليوز" },
  { id: 2, farmId: "atlas", farmNom: "فيرمة الأطلس", type: "محتاج", produit: "كياس تعبئة", kammiya: 300, wehda: "كيس", prix: "", description: "خاصنا بسرعة قبل الجني الجاي", contactNom: "رشيد", contactTel: "0662-00-00-00", date: "18 يوليوز" },
];

const initIncidents = [
  { id: 1, farmNom: "فيرمة بنعبد الله (مستخدم آخر)", gps: { lat: 34.95, lng: -6.05 }, produit: "أفوكا", probleme: "عنكبوت أحمر", severite: "متوسط", date: "18 يوليوز" },
  { id: 2, farmNom: "فيرمة تادلة (مستخدم آخر)", gps: { lat: 32.35, lng: -6.85 }, produit: "فريز", probleme: "عفن رمادي", severite: "خطير", date: "17 يوليوز" },
];

function distanceKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const s1 = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(s1), Math.sqrt(1 - s1)));
}

const rolePermissions = {
  Owner: ["لوحة", "الفيرمات", "الطلبات", "السوق", "القطع", "العمال", "المخزون", "الوزينات", "الفواتير", "CNSS", "التكلفة", "المصاريف", "الربحية", "المحلل الذكي", "السجل", "الصلاحيات"],
  Manager: ["لوحة", "الفيرمات", "الطلبات", "السوق", "القطع", "العمال", "المخزون", "الوزينات", "الفواتير", "CNSS", "التكلفة", "المصاريف", "الربحية", "المحلل الذكي", "السجل"],
  Supervisor: ["لوحة", "الطلبات", "السوق", "القطع", "العمال", "المخزون", "الوزينات"],
  Accountant: ["لوحة", "الوزينات", "الفواتير", "CNSS", "التكلفة", "المصاريف", "الربحية", "المحلل الذكي"],
  Worker: ["العمال"],
};

const MODULES = ["لوحة", "الفيرمات", "الطلبات", "السوق", "القطع", "العمال", "المخزون", "الوزينات", "الفواتير", "CNSS", "التكلفة", "المصاريف", "الربحية", "المحلل الذكي", "السجل"];
const ROLES_LIST = ["Owner", "Manager", "Supervisor", "Accountant", "Worker"];

// Fine-grained permissions: which roles can EDIT (add/modify) vs just VIEW each module by default.
// The Owner can adjust this live from the "الصلاحيات" tab.
const defaultEditRights = {
  Owner: ["لوحة", "الفيرمات", "الطلبات", "السوق", "القطع", "العمال", "المخزون", "الوزينات", "الفواتير", "CNSS", "التكلفة", "المصاريف", "المحلل الذكي", "السجل"],
  Manager: ["الفيرمات", "الطلبات", "السوق", "القطع", "العمال", "المخزون", "الوزينات", "الفواتير", "CNSS", "التكلفة", "المصاريف", "المحلل الذكي", "السجل"],
  Supervisor: ["الطلبات", "السوق", "العمال", "المخزون", "الوزينات"],
  Accountant: ["الفواتير", "CNSS", "المحلل الذكي"],
  Worker: ["العمال"],
};

function buildPermMatrixInit() {
  const matrix = {};
  ROLES_LIST.forEach((role) => {
    matrix[role] = {};
    MODULES.forEach((m) => {
      if (!rolePermissions[role].includes(m)) matrix[role][m] = "بلا وصول";
      else if (defaultEditRights[role].includes(m)) matrix[role][m] = "تعديل";
      else matrix[role][m] = "عرض فقط";
    });
  });
  return matrix;
}

const initDepenses = [
  { id: 1, dayOffset: 0, dateLabel: "20 يوليوز", type: "عمال", detail: "أحمد — سقي (القطعة A1)", montant: 120 },
  { id: 2, dayOffset: 0, dateLabel: "20 يوليوز", type: "عمال", detail: "محمد — قطع الربيع (القطعة A2)", montant: 150 },
  { id: 3, dayOffset: 0, dateLabel: "20 يوليوز", type: "عمال", detail: "الحسن — سلفة نقدية", montant: 300 },
  { id: 4, dayOffset: 0, dateLabel: "20 يوليوز", type: "دواء", detail: "مبيد فطريات (نحاس) — القطعة A2", montant: 450 },
  { id: 5, dayOffset: 1, dateLabel: "19 يوليوز", type: "عمال", detail: "فاطمة — جني (القطعة S1)", montant: 90 },
  { id: 6, dayOffset: 1, dateLabel: "19 يوليوز", type: "دواء", detail: "مبيد ضد الحشرة القشرية — القطعة S2", montant: 600 },
  { id: 7, dayOffset: 1, dateLabel: "19 يوليوز", type: "ماء", detail: "سقي بالضخ — القطعة A3", montant: 80 },
  { id: 8, dayOffset: 2, dateLabel: "18 يوليوز", type: "عمال", detail: "يوسف — رش ومعالجة (القطعة A2)", montant: 120 },
  { id: 9, dayOffset: 2, dateLabel: "18 يوليوز", type: "دواء", detail: "تسميد ورقي — القطعة A3", montant: 350 },
];

const initStock = [
  { id: 1, nom: "مبيد فطريات (نحاس)", categorie: "دواء", kammiya: 45, wehda: "كيلو", seuil: 20 },
  { id: 2, nom: "مبيد ضد الحشرة القشرية", categorie: "دواء", kammiya: 12, wehda: "لتر", seuil: 15 },
  { id: 3, nom: "تسميد ورقي NPK", categorie: "سماد", kammiya: 80, wehda: "كيلو", seuil: 30 },
  { id: 4, nom: "كياس تعبئة", categorie: "تعبئة", kammiya: 300, wehda: "كيس", seuil: 100 },
  { id: 5, nom: "مبيد ضد العنكبوت", categorie: "دواء", kammiya: 6, wehda: "لتر", seuil: 10 },
];

const initCommandesGlobal = [
  { id: 1, farmId: "zm", farmNom: "زيرو مانويل", demandePar: "يوسف", produit: "مبيد ضد الحشرة القشرية", qte: 20, wehda: "لتر", motif: "المخزون وصل تحت الحد", date: "20 يوليوز", statut: "جديد", fournisseur: "", fournisseurEmail: "", prix: "", poNumero: "" },
  { id: 2, farmId: "atlas", farmNom: "فيرمة الأطلس", demandePar: "رشيد", produit: "كياس تعبئة", qte: 500, wehda: "كيس", motif: "تحضير موسم الجني", date: "19 يوليوز", statut: "تم الطلب", fournisseur: "مؤسسة التعبئة الحديثة", fournisseurEmail: "contact@packaging-example.ma", prix: "1500", poNumero: "PO-0619" },
];

const initInvoices = [
  { id: 1, numero: "FAC-0619", date: "19 يوليوز", client: "وزان سيدي بنور", produit: "أفوكا", qte: 640, prixUnitaire: 6.2, tva: 0, montantHT: 3968, montantTVA: 0, montantTTC: 3968 },
];

const initAchatsGlobal = [
  { id: 1, farmId: "atlas", farmNom: "فيرمة الأطلس", produit: "مبيد فطريات", kammiya: 10, wehda: "لتر", prix: 1200, fournisseur: "أكرو فارم", date: "19 يوليوز", vu: true },
];

// ---------- farm datasets ----------
const farmsInit = {
  zm: {
    nom: "زيرو مانويل",
    gps: { lat: 34.9200, lng: -6.1000 },
    parcelles: [
      { code: "A1", crop: "avocat", nom: "أفوكا - حاس", ha: 3.2, statut: "ok", irrigation: "اليوم 06:00", recolte: 20, dernierTraitement: "12 يوليوز", secu: 0 },
      { code: "A2", crop: "avocat", nom: "أفوكا - وسط", ha: 2.8, statut: "attention", irrigation: "غدا 06:00", recolte: 55, dernierTraitement: "17 يوليوز", secu: 2 },
      { code: "A3", crop: "avocat", nom: "أفوكا - جنوب", ha: 4.0, statut: "ok", irrigation: "اليوم 18:00", recolte: 10, dernierTraitement: "10 يوليوز", secu: 0 },
      { code: "A4", crop: "avocat", nom: "أفوكا - جديدة", ha: 1.6, statut: "recolte", irrigation: "اليوم 06:00", recolte: 92, dernierTraitement: "05 يوليوز", secu: 0 },
      { code: "S1", crop: "fraise", nom: "الفريز - نفق 1", ha: 0.8, statut: "recolte", irrigation: "اليوم 05:30", recolte: 88, dernierTraitement: "18 يوليوز", secu: 1 },
      { code: "S2", crop: "fraise", nom: "الفريز - نفق 2", ha: 0.8, statut: "alerte", irrigation: "متأخر", recolte: 40, dernierTraitement: "19 يوليوز", secu: 4 },
    ],
    workers: [
      { id: 1, nom: "أحمد", parcelle: "A4", tache: "جني", type: "ساعات", dukhul: "06:00", khuruj: "14:00", qte: 8, taux: 15, moisQte: 96, dawra: "15", statut: "مؤدى", affilieCNSS: true, cnssNumero: "AF-10234" },
      { id: 2, nom: "فاطمة", parcelle: "S1", tache: "جني", type: "ساعات", dukhul: "06:00", khuruj: "12:00", qte: 6, taux: 15, moisQte: 84, dawra: "15", statut: "غير مؤدى", affilieCNSS: true, cnssNumero: "AF-10235" },
      { id: 3, nom: "يوسف", parcelle: "A2", tache: "رش ومعالجة", type: "نهار", dukhul: "-", khuruj: "-", qte: 1, taux: 120, moisQte: 18, dawra: "شهر", statut: "غير مؤدى", affilieCNSS: false, cnssNumero: "" },
    ],
    wazin: [
      { id: 1, date: "19 يوليوز", parcelle: "A4", wazan: "وزان سيدي بنور", patron: "الحاج مصطفى", kg: 640, prixKg: 6.2, statut: "مؤدى" },
      { id: 2, date: "19 يوليوز", parcelle: "S1", wazan: "وزان الجديدة", patron: "الحاج مصطفى", kg: 310, prixKg: 9.5, statut: "فالانتظار" },
    ],
    costs: [
      { code: "A1", dawa: 800, ma: 450, omal: 600 },
      { code: "A2", dawa: 1200, ma: 500, omal: 700 },
      { code: "A3", dawa: 600, ma: 600, omal: 500 },
      { code: "A4", dawa: 900, ma: 400, omal: 900 },
      { code: "S1", dawa: 1500, ma: 700, omal: 1400 },
      { code: "S2", dawa: 2000, ma: 650, omal: 1100 },
    ],
    plan: [
      { code: "A2", produit: "مبيد فطريات (نحاس)", dozParHa: 3, wehda: "كيلو", tarikh: "22 يوليوز" },
      { code: "S2", produit: "مبيد فطريات", dozParHa: 2.5, wehda: "لتر", tarikh: "26 يوليوز" },
    ],
    depenses: initDepenses,
    stock: initStock,
    invoices: initInvoices,
    cnss: { echeanceJour: 10, moisLabel: "يوليوز 2026", declare: false, dateDeclare: "" },
    employees: [
      { id: 1, nom: "أحمد", prenom: "", cin: "", dateEntree: "", situationFamiliale: "", nombreEnfants: "", cnssNumero: "AF-10234", affilieCNSS: true },
      { id: 2, nom: "فاطمة", prenom: "", cin: "", dateEntree: "", situationFamiliale: "", nombreEnfants: "", cnssNumero: "AF-10235", affilieCNSS: true },
      { id: 3, nom: "يوسف", prenom: "", cin: "", dateEntree: "", situationFamiliale: "", nombreEnfants: "", cnssNumero: "", affilieCNSS: false },
    ],
  },
  atlas: {
    nom: "فيرمة الأطلس",
    gps: { lat: 32.2833, lng: -6.9000 },
    parcelles: [
      { code: "B1", crop: "avocat", nom: "أفوكا - الربوة", ha: 2.0, statut: "ok", irrigation: "اليوم 07:00", recolte: 35, dernierTraitement: "14 يوليوز", secu: 0 },
      { code: "B2", crop: "fraise", nom: "الفريز - القبة", ha: 1.1, statut: "recolte", irrigation: "اليوم 06:00", recolte: 80, dernierTraitement: "16 يوليوز", secu: 0 },
    ],
    workers: [
      { id: 1, nom: "رشيد", parcelle: "B1", tache: "سقي", type: "نهار", dukhul: "-", khuruj: "-", qte: 1, taux: 100, moisQte: 22, dawra: "شهر", statut: "مؤدى", affilieCNSS: true, cnssNumero: "AF-20011" },
      { id: 2, nom: "سلمى", parcelle: "B2", tache: "جني", type: "ساعات", dukhul: "06:00", khuruj: "11:00", qte: 5, taux: 15, moisQte: 60, dawra: "15", statut: "غير مؤدى", affilieCNSS: false, cnssNumero: "" },
    ],
    wazin: [{ id: 1, date: "19 يوليوز", parcelle: "B2", wazan: "وزان تادلة", patron: "شركة تادلة للفواكه", kg: 210, prixKg: 8.8, statut: "مؤدى" }],
    costs: [{ code: "B1", dawa: 400, ma: 300, omal: 400 }, { code: "B2", dawa: 650, ma: 250, omal: 500 }],
    plan: [{ code: "B1", produit: "تسميد ورقي", dozParHa: 1.5, wehda: "لتر", tarikh: "27 يوليوز" }],
    depenses: [],
    stock: [],
    invoices: [],
    cnss: { echeanceJour: 10, moisLabel: "يوليوز 2026", declare: true, dateDeclare: "05 يوليوز" },
    employees: [
      { id: 1, nom: "رشيد", prenom: "", cin: "", dateEntree: "", situationFamiliale: "", nombreEnfants: "", cnssNumero: "AF-20011", affilieCNSS: true },
      { id: 2, nom: "سلمى", prenom: "", cin: "", dateEntree: "", situationFamiliale: "", nombreEnfants: "", cnssNumero: "", affilieCNSS: false },
    ],
  },
};

const statutColor = { ok: c.cardGreen, attention: c.orange, recolte: "#3B82C4", alerte: c.danger };
const taskOptions = [
  { key: "سقي", icon: Droplets },
  { key: "جني", icon: Scissors },
  { key: "رش", icon: SprayCan },
  { key: "تسميد", icon: Sprout },
  { key: "تعبئة", icon: Package },
];
const statutLabel = { ok: "طبيعي", attention: "يتبع", recolte: "جاهز للقطف", alerte: "تنبيه" };
const alertes = [
  { icon: AlertTriangle, texte: "S2 — رش يوم 19 يوليوز، خاص التزام مدة الأمان قبل الجني" },
  { icon: ThermometerSun, texte: "موجة حر متوقعة الخميس — زيدو الري" },
];

function hoursBetween(t1, t2) {
  const [h1, m1] = t1.split(":").map(Number);
  const [h2, m2] = t2.split(":").map(Number);
  const diff = (h2 * 60 + m2 - (h1 * 60 + m1)) / 60;
  return diff > 0 ? Math.round(diff * 10) / 10 : 0;
}
function Field({ label, children }) {
  return <div className="flex flex-col gap-1"><span style={{ fontSize: "0.7rem", color: c.inkMuted2, fontWeight: 700 }}>{label}</span>{children}</div>;
}
const inputStyle = { background: c.bg, border: `1px solid ${c.line}`, borderRadius: 8, padding: "8px 10px", fontSize: "0.82rem", color: c.ink, width: "100%" };

function AddButton({ label, open, onClick }) {
  return (
    <button onClick={onClick} style={{ background: open ? c.line : c.cardGreen, color: open ? c.ink : "#fff", borderRadius: 11, padding: "9px 15px", boxShadow: open ? "none" : "0 4px 12px -3px rgba(17,153,107,0.4)" }} className="flex items-center gap-1.5 hover:opacity-90">
      {open ? <X size={15} /> : <Plus size={15} />}<span style={{ fontSize: "0.8rem", fontWeight: 700 }}>{open ? "إلغاء" : label}</span>
    </button>
  );
}
function StatCard({ title, value, unit, sub, footer, variant = "green" }) {
  const bg = variant === "orange"
    ? `linear-gradient(145deg, ${c.orangeLight} 0%, ${c.orange} 100%)`
    : variant === "white" ? c.white
    : `linear-gradient(145deg, ${c.cardGreenLight} 0%, ${c.cardGreen} 100%)`;
  const textColor = variant === "white" ? c.ink : c.white;
  const subMuted = variant === "white" ? c.inkMuted2 : "rgba(255,255,255,0.75)";
  const shadowColor = variant === "orange" ? "rgba(236,159,50,0.28)" : "rgba(17,153,107,0.24)";
  return (
    <div style={{ background: bg, borderRadius: 22, padding: "19px 21px", color: textColor, boxShadow: variant !== "white" ? `0 10px 24px -6px ${shadowColor}` : "0 1px 3px rgba(0,0,0,0.04)", border: variant === "white" ? `1px solid ${c.line}` : "none" }} className="flex flex-col gap-1">
      <div className="flex items-center justify-between mb-2">
        <div style={{ background: variant === "white" ? c.bg : "rgba(255,255,255,0.2)", borderRadius: 11, padding: 7 }}>{title.icon}</div>
        <ChevronLeft size={16} color={subMuted} />
      </div>
      <div className="flex items-end gap-1"><span className="font-display" style={{ fontSize: "2rem", fontWeight: 800, lineHeight: 1 }}>{value}</span>{unit && <span style={{ fontSize: "0.85rem", fontWeight: 600, opacity: 0.85 }}>{unit}</span>}</div>
      <span style={{ fontSize: "0.8rem", fontWeight: 600, opacity: variant === "white" ? 0.65 : 0.92 }}>{title.label}</span>
      {sub && (
        <div style={{ borderTop: `1px solid ${variant === "white" ? c.line : "rgba(255,255,255,0.28)"}`, marginTop: 9, paddingTop: 9 }} className="grid grid-cols-2 gap-2">
          {sub.map((s, i) => (<div key={i} className="flex flex-col"><span style={{ fontSize: "0.66rem", fontWeight: 700, color: subMuted, letterSpacing: "0.02em" }}>{s.label}</span><span className="font-mono" style={{ fontSize: "1rem", fontWeight: 800 }}>{s.value}</span></div>))}
        </div>
      )}
      {footer && (<div style={{ background: variant === "white" ? c.bg : "rgba(0,0,0,0.15)", borderRadius: 11, marginTop: 10, padding: "8px 10px" }} className="flex items-center gap-2">{footer.icon}<span style={{ fontSize: "0.75rem", fontWeight: 600 }}>{footer.text}</span></div>)}
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) { setError("البريد ولا كلمة السر غلط، عاود جرب"); return; }
    onLogin(data.session);
  }

  return (
    <div dir="rtl" style={{ background: `linear-gradient(160deg, ${c.headerGreenLight} 0%, ${c.headerGreen} 55%, #094433 100%)`, minHeight: "100vh", position: "relative", overflow: "hidden" }} className="flex flex-col items-center justify-center p-6">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@700;800;900&family=Inter:wght@400;600;700;800;900&display=swap');`}</style>
      <div style={{ position: "absolute", top: -80, right: -80, width: 260, height: 260, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
      <div style={{ position: "absolute", bottom: -100, left: -60, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
      <div style={{ background: "rgba(255,255,255,0.14)", borderRadius: 18, width: 68, height: 68, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }} className="flex items-center justify-center mb-4 relative">
        <Sprout size={30} color="#fff" strokeWidth={2.2} />
      </div>
      <h1 className="font-display" style={{ color: "#fff", fontWeight: 800, fontSize: "1.55rem", position: "relative" }}>زيرو مانويل</h1>
      <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.8rem", position: "relative" }} className="mb-8">دخل بالبريد وكلمة السر ديالك</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full relative" style={{ maxWidth: 340 }}>
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="البريد الإلكتروني"
          style={{ background: "#fff", borderRadius: 12, padding: "13px 16px", fontSize: "0.85rem", border: "none", outline: "none" }}
        />
        <input
          type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة السر"
          style={{ background: "#fff", borderRadius: 12, padding: "13px 16px", fontSize: "0.85rem", border: "none", outline: "none" }}
        />
        {error && <p style={{ color: "#FCA5A5", fontSize: "0.76rem", textAlign: "center" }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ background: c.cardGreen, color: "#fff", borderRadius: 12, padding: "13px 0", fontWeight: 700, fontSize: "0.86rem", boxShadow: "0 8px 20px rgba(18,167,104,0.35)" }}>
          {loading ? "كيدخل..." : "تسجيل الدخول"}
        </button>
      </form>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.7rem", maxWidth: 300 }} className="mt-6 text-center">ماعندكش حساب؟ تواصل مع مسؤول الفيرمة باش يزيدك.</p>
    </div>
  );
}

const emptyFarmData = {
  nom: "", gps: { lat: 34.92, lng: -6.10 },
  parcelles: [], workers: [], wazin: [], costs: [], plan: [], depenses: [], stock: [], invoices: [],
  cnss: { echeanceJour: 10, moisLabel: "يوليوز 2026", declare: false, dateDeclare: "" },
  employees: [],
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentFarmId, setCurrentFarmId] = useState(null);
  const [farms, setFarms] = useState({});
  const [loadingData, setLoadingData] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [commandesGlobal, setCommandesGlobal] = useState(initCommandesGlobal);
  const [achatsGlobal, setAchatsGlobal] = useState(initAchatsGlobal);
  const [marketplaceGlobal, setMarketplaceGlobal] = useState(initMarketplace);
  const [incidentsGlobal, setIncidentsGlobal] = useState(initIncidents);
  const [showReportIssue, setShowReportIssue] = useState(false);
  const [issueForm, setIssueForm] = useState({ produit: "avocat", probleme: "", severite: "متوسط" });
  const [analystMessages, setAnalystMessages] = useState([]);
  const [analystQuestion, setAnalystQuestion] = useState("");
  const [analystLoading, setAnalystLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [iconMode, setIconMode] = useState(true);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const recognitionRef = useRef(null);
  const [alertesIncompletes, setAlertesIncompletes] = useState([]);
  const [permMatrix, setPermMatrix] = useState(buildPermMatrixInit());
  const [tab, setTab] = useState("لوحة");
  const [selected, setSelected] = useState(farmsInit.zm.parcelles[0]);

  const [showAddWorker, setShowAddWorker] = useState(false);
  const [showAddWazin, setShowAddWazin] = useState(false);
  const [showAddCost, setShowAddCost] = useState(false);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [wForm, setWForm] = useState({ nom: "", parcelle: "", tache: "", type: "ساعات", dukhul: "06:00", khuruj: "14:00", nahar: 1, taux: 15, dawra: "15", audioNote: "" });
  const [isRecording, setIsRecording] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [zForm, setZForm] = useState({ parcelle: "", wazan: "", patron: "", kg: "", prixKg: "", statut: "فالانتظار" });
  const [cForm, setCForm] = useState({ parcelle: "", naw3: "دواء", mablagh: "" });
  const [pForm, setPForm] = useState({ parcelle: "", produit: "", dozParHa: "", wehda: "لتر", tarikh: "" });
  const [showAddFarm, setShowAddFarm] = useState(false);
  const [showAddListing, setShowAddListing] = useState(false);
  const [mForm, setMForm] = useState({ type: "أعرض", produit: "", kammiya: "", wehda: "كيلو", prix: "", description: "", contactTel: "" });
  const [mFilter, setMFilter] = useState("الكل");
  const [fForm, setFForm] = useState({ nom: "", lat: "", lng: "" });
  const [showAddStock, setShowAddStock] = useState(false);
  const [sForm, setSForm] = useState({ nom: "", categorie: "دواء", wehda: "كيلو", mouvement: "دخول", kammiya: "", seuil: "", prix: "", fournisseur: "", factureFile: "", factureNom: "", poNumero: "" });
  const [showAddCommande, setShowAddCommande] = useState(false);
  const [cmdForm, setCmdForm] = useState({ produit: "", qte: "", wehda: "كيلو", motif: "", destFarmId: "" });
  const [processingId, setProcessingId] = useState(null);
  const [poForm, setPoForm] = useState({ fournisseur: "", fournisseurEmail: "", prix: "" });
  const [showAddInvoice, setShowAddInvoice] = useState(false);
  const [invForm, setInvForm] = useState({ client: "", produit: "avocat", qte: "", prixUnitaire: "", tva: "" });
  const [periode, setPeriode] = useState(2);
  const [showAddDepense, setShowAddDepense] = useState(false);
  const [dForm, setDForm] = useState({ type: "عمال", detail: "", montant: "" });
  const [showAddParcelle, setShowAddParcelle] = useState(false);
  const [pcForm, setPcForm] = useState({ code: "", nom: "", crop: "avocat", ha: "" });

  const data = farms[currentFarmId] || emptyFarmData;

  async function loadFarmDetails(farmId) {
    const [{ data: parcellesData }, { data: workersData }] = await Promise.all([
      supabase.from("parcelles").select("*").eq("farm_id", farmId),
      supabase.from("workers_log").select("*").eq("farm_id", farmId).order("created_at", { ascending: false }).limit(200),
    ]);
    const parcelles = (parcellesData || []).map((p) => ({
      id: p.id, code: p.code, nom: p.nom, crop: p.crop, ha: Number(p.superficie_ha) || 0,
      statut: p.statut || "ok", irrigation: "—", recolte: 0, dernierTraitement: "—", secu: 0,
    }));
    const codeById = {}; parcelles.forEach((p) => { codeById[p.id] = p.code; });
    const sums = {};
    const workers = (workersData || []).map((w) => ({
      id: w.id, nom: w.nom_ouvrier, parcelle: codeById[w.parcelle_id] || "—", parcelleId: w.parcelle_id,
      tache: w.tache, type: w.type_paie, dukhul: w.heure_entree || "-", khuruj: w.heure_sortie || "-",
      qte: Number(w.quantite) || 0, taux: Number(w.taux) || 0, dawra: w.dawra || "شهر",
      statut: w.statut_paiement || "غير مؤدى", audioNote: w.audio_note_url || "",
    }));
    workers.forEach((w) => { sums[w.nom] = (sums[w.nom] || 0) + w.qte; });
    workers.forEach((w) => { w.moisQte = sums[w.nom]; });

    setFarms((prev) => ({ ...prev, [farmId]: { ...(prev[farmId] || emptyFarmData), parcelles, workers } }));
    setSelected(parcelles[0] || null);
  }

  async function loginWithSession(session) {
    setLoadingData(true);
    const userId = session.user.id;
    const { data: memberships, error } = await supabase
      .from("farm_members")
      .select("role, nom_affiche, farms(id, nom, gps_lat, gps_lng, cnss_echeance_jour, cnss_declare)")
      .eq("user_id", userId);
    if (error || !memberships || memberships.length === 0) {
      alert("ماكاينش فيرمة مرتبطة بهاد الحساب — تواصل مع المسؤول ديالك باش يزيدك فـ farm_members.");
      setLoadingData(false);
      setCheckingSession(false);
      return;
    }
    const role = memberships[0].role;
    const nom = memberships[0].nom_affiche || session.user.email;
    const farmIds = memberships.map((m) => m.farms.id);
    const newFarms = {};
    memberships.forEach((m) => {
      newFarms[m.farms.id] = {
        ...emptyFarmData,
        nom: m.farms.nom,
        gps: { lat: Number(m.farms.gps_lat) || 34.92, lng: Number(m.farms.gps_lng) || -6.10 },
        cnss: { ...emptyFarmData.cnss, echeanceJour: m.farms.cnss_echeance_jour || 10, declare: m.farms.cnss_declare || false },
      };
    });
    setFarms(newFarms);
    setCurrentUser({ id: userId, nom, role, farms: farmIds });
    const firstFarm = farmIds[0];
    setCurrentFarmId(firstFarm);
    const perms = MODULES.filter((m) => permMatrix[role][m] !== "بلا وصول");
    setTab(perms[0] || "لوحة");
    await loadFarmDetails(firstFarm);
    setLoadingData(false);
    setCheckingSession(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) loginWithSession(session);
      else setCheckingSession(false);
    });
  }, []);

  const kpis = useMemo(() => {
    const totalHarvest = data.parcelles.reduce((s, p) => s + (p.statut === "recolte" ? p.recolte * 4 : 0), 0);
    const totalCost = data.costs.reduce((s, cp) => s + cp.dawa + cp.ma + cp.omal, 0);
    const totalDawa = data.costs.reduce((s, cp) => s + cp.dawa, 0);
    const totalMaOmal = data.costs.reduce((s, cp) => s + cp.ma + cp.omal, 0);
    const totalHeures = data.workers.filter((w) => w.type === "ساعات").reduce((s, w) => s + w.qte, 0);
    const totalKhlas = data.workers.reduce((s, w) => s + w.qte * w.taux, 0);
    const enAttente = data.wazin.filter((w) => w.statut === "فالانتظار").length;
    return { totalHarvest, totalCost, totalDawa, totalMaOmal, totalHeures, totalKhlas, enAttente };
  }, [data]);

  const rentabilite = useMemo(() => {
    return data.parcelles.map((p) => {
      const revenu = data.wazin.filter((w) => w.parcelle === p.code).reduce((s, w) => s + w.kg * w.prixKg, 0);
      const cp = data.costs.find((x) => x.code === p.code);
      const cout = cp ? cp.dawa + cp.ma + cp.omal : 0;
      const profit = revenu - cout;
      const marge = revenu > 0 ? Math.round((profit / revenu) * 100) : 0;
      return { code: p.code, nom: p.nom, revenu, cout, profit, marge };
    });
  }, [data]);

  if (checkingSession || loadingData) {
    return (
      <div style={{ minHeight: "100vh", background: c.headerGreen }} className="flex items-center justify-center">
        <span style={{ color: "#fff", fontSize: "0.85rem", fontWeight: 700 }}>كيحمل...</span>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={loginWithSession} />;
  }

  const permTabs = MODULES.filter((m) => permMatrix[currentUser.role][m] !== "بلا وصول");
  const isWorker = currentUser.role === "Worker";
  const canManageFarms = currentUser.role === "Owner" || currentUser.role === "Manager";
  const myFarmIds = canManageFarms ? Object.keys(farms) : currentUser.farms;
  function canEdit(moduleKey) { return permMatrix[currentUser.role][moduleKey] === "تعديل"; }

  function updateFarm(patch) { setFarms((prev) => ({ ...prev, [currentFarmId]: { ...prev[currentFarmId], ...patch } })); }
  function parcelleNom(code) { const p = data.parcelles.find((p) => p.code === code); return p ? p.nom : code; }
  function CropIcon({ crop, size = 16, color }) { return crop === "avocat" ? <Sprout size={size} color={color} /> : <Cherry size={size} color={color} />; }

  const visibleWorkers = isWorker ? data.workers.filter((w) => w.nom === currentUser.nom) : data.workers;

  const allTabs = [
    { key: "لوحة", icon: LayoutGrid }, { key: "الفيرمات", icon: Building2 }, { key: "الطلبات", icon: ClipboardList }, { key: "السوق", icon: Store }, { key: "القطع", icon: Sprout }, { key: "العمال", icon: Users },
    { key: "المخزون", icon: Package }, { key: "الوزينات", icon: Truck }, { key: "الفواتير", icon: FileSpreadsheet }, { key: "CNSS", icon: CalendarClock }, { key: "التكلفة", icon: Wallet }, { key: "المصاريف", icon: Receipt }, { key: "الربحية", icon: TrendingUp }, { key: "المحلل الذكي", icon: Brain }, { key: "السجل", icon: FileText },
  ];
  const tabs = allTabs.filter((t) => permTabs.includes(t.key));
  if (currentUser.role === "Owner") tabs.push({ key: "الصلاحيات", icon: Lock });

  function switchFarm(fid) { setCurrentFarmId(fid); loadFarmDetails(fid); }

  function toggleAffiliation(id) {
    updateFarm({ employees: data.employees.map((e) => e.id === id ? { ...e, affilieCNSS: !e.affilieCNSS } : e) });
  }
  function marquerDeclare() {
    updateFarm({ cnss: { ...data.cnss, declare: true, dateDeclare: "20 يوليوز" } });
  }
  function updateEcheance(jour) {
    updateFarm({ cnss: { ...data.cnss, echeanceJour: Number(jour) } });
  }

  function exportOmageModele() {
    const headers = ["Matricule", "Nom", "Prénom", "J/H Travaillé", "HS 0%", "HS 25%", "HS 50%", "HS 100%", "J/H  récup. - Rappel", "J. Férié", "Congé", "Congé payé", "Congés restants", "Congé Familial", "Avance", "Jours CNSS", "Net", "Catégorie", "Type salaire", "Date entrée", "Mode de Paiement", "Salaire base", "Situation Familiale", "Nombre d'enfants", "Abattement", "Poste", "Service", "Compte", "Nature contrat", "CIN", "N°CNSS"];
    const rows = data.workers.map((w, i) => {
      const emp = getEmployee(w.nom);
      const joursTravailles = w.type === "ساعات" ? Math.round(w.moisQte / 8) : w.moisQte;
      const net = w.moisQte * w.taux;
      return [
        String(w.id).slice(-6).padStart(6, "0"), w.nom, emp.prenom || "", joursTravailles, "", "", "", "", "", 0, 0, 0, 0, 0, 0,
        joursTravailles, net, w.dawra === "شهر" ? "Permanent" : "Occasionnel", w.dawra === "شهر" ? "Mensuel" : "Quinzaine",
        emp.dateEntree || "", "", w.taux, emp.situationFamiliale || "", emp.nombreEnfants || "", "", w.tache, w.parcelle, "", "", emp.cin || "", emp.cnssNumero || "",
      ];
    });
    const totalRow = ["", "", "", rows.reduce((s, r) => s + r[3], 0), "", "", "", "", "", rows.reduce((s, r) => s + r[9], 0), 0, "", "", "", "", rows.reduce((s, r) => s + r[15], 0), rows.reduce((s, r) => s + r[16], 0)];
    const aoa = [headers, ...rows, [], totalRow];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "A");
    XLSX.writeFile(wb, `omage-${data.nom.replace(/\s/g, "-")}-${data.cnss.moisLabel.replace(/\s/g, "-")}.xlsx`);
  }

  function exportBDS() {
    const headers = ["رقم CNSS", "الاسم", "مسجل؟", "أيام/ساعات هاد الشهر", "الأجرة المصرحة (DH)"];
    const rows = data.workers.map((w) => {
      const emp = getEmployee(w.nom);
      const joursEquiv = w.type === "ساعات" ? Math.round((w.moisQte / 8) * 10) / 10 : w.moisQte;
      return [emp.cnssNumero || "—", w.nom, emp.affilieCNSS ? "نعم" : "لا", `${w.moisQte} ${w.type === "ساعات" ? "سا (" + joursEquiv + " يوم تقريبا)" : "نهار"}`, w.moisQte * w.taux];
    });
    const totalSalaire = data.workers.reduce((s, w) => s + w.moisQte * w.taux, 0);
    const aoa = [
      [`جدول التصريح CNSS — ${data.nom}`],
      [`الشهر: ${data.cnss.moisLabel}`],
      [],
      headers,
      ...rows,
      [],
      ["", "المجموع", "", "", totalSalaire],
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 14 }, { wch: 18 }, { wch: 10 }, { wch: 24 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CNSS");
    XLSX.writeFile(wb, `cnss-${data.nom.replace(/\s/g, "-")}-${data.cnss.moisLabel.replace(/\s/g, "-")}.xlsx`);
  }

  function startRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => setWForm((prev) => ({ ...prev, audioNote: reader.result }));
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setIsRecording(true);
    }).catch(() => alert("ماقدرناش نوصلو للميكروفون — تأكد من صلاحية الميكروفون فالمتصفح"));
  }
  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  function ensureEmployee(nom) {
    if (data.employees.some((e) => e.nom === nom)) return;
    updateFarm({ employees: [...data.employees, { id: Date.now(), nom, prenom: "", cin: "", dateEntree: "", situationFamiliale: "", nombreEnfants: "", cnssNumero: "", affilieCNSS: false }] });
  }
  function getEmployee(nom) { return data.employees.find((e) => e.nom === nom) || { prenom: "", cin: "", dateEntree: "", situationFamiliale: "", nombreEnfants: "", cnssNumero: "", affilieCNSS: false }; }
  function updateEmployee(id, patch) { updateFarm({ employees: data.employees.map((e) => e.id === id ? { ...e, ...patch } : e) }); }

  async function insertPointage(nom) {
    const qte = wForm.type === "ساعات" ? hoursBetween(wForm.dukhul, wForm.khuruj) : Number(wForm.nahar) || 1;
    const parcelleCode = wForm.parcelle || (data.parcelles[0] && data.parcelles[0].code) || "";
    const parcelleObj = data.parcelles.find((p) => p.code === parcelleCode);
    const { error } = await supabase.from("workers_log").insert({
      farm_id: currentFarmId,
      nom_ouvrier: nom,
      parcelle_id: parcelleObj ? parcelleObj.id : null,
      tache: wForm.tache || "—",
      type_paie: wForm.type,
      heure_entree: wForm.type === "ساعات" ? wForm.dukhul : null,
      heure_sortie: wForm.type === "ساعات" ? wForm.khuruj : null,
      quantite: qte,
      taux: Number(wForm.taux) || 0,
      dawra: wForm.dawra,
      statut_paiement: "غير مؤدى",
      audio_note_url: wForm.audioNote || null,
    });
    if (error) { alert("وقع مشكل فالتسجيل: " + error.message); return; }
    ensureEmployee(nom);
    setWForm({ nom: "", parcelle: "", tache: "", type: "ساعات", dukhul: "06:00", khuruj: "14:00", nahar: 1, taux: 15, dawra: "15", audioNote: "" });
    setShowAddWorker(false);
    loadFarmDetails(currentFarmId);
  }
  async function addParcelle() {
    if (!pcForm.code.trim()) return;
    const { error } = await supabase.from("parcelles").insert({
      farm_id: currentFarmId, code: pcForm.code, nom: pcForm.nom || pcForm.code,
      crop: pcForm.crop, superficie_ha: Number(pcForm.ha) || 0, statut: "ok",
    });
    if (error) { alert("وقع مشكل: " + error.message); return; }
    setPcForm({ code: "", nom: "", crop: "avocat", ha: "" });
    setShowAddParcelle(false);
    loadFarmDetails(currentFarmId);
  }

  function addWorker() {
    if (isWorker) return;
    if (!wForm.nom.trim()) return;
    insertPointage(wForm.nom);
  }
  function addMyPointage() {
    insertPointage(currentUser.nom);
  }
  async function removeWorker(id) {
    const { error } = await supabase.from("workers_log").delete().eq("id", id);
    if (error) { alert("وقع مشكل: " + error.message); return; }
    loadFarmDetails(currentFarmId);
  }
  async function toggleStatut(id) {
    const w = data.workers.find((x) => x.id === id);
    const newStatut = w.statut === "مؤدى" ? "غير مؤدى" : "مؤدى";
    const { error } = await supabase.from("workers_log").update({ statut_paiement: newStatut }).eq("id", id);
    if (error) { alert("وقع مشكل: " + error.message); return; }
    updateFarm({ workers: data.workers.map((x) => x.id === id ? { ...x, statut: newStatut } : x) });
  }
  function exportJournalPaie() {
    const headers = ["#", "الاسم", "المهمة", "القطعة", "نوع الخلاص", "الكمية اليوم", "الأجرة", "مجموع اليوم (DH)", "مجموع الدورة (DH)", "الدورة", "الحالة"];
    const rows = data.workers.map((w, i) => [
      i + 1, w.nom, w.tache, w.parcelle, w.type === "ساعات" ? "بالساعة" : "بالنهار",
      w.qte, w.taux, w.qte * w.taux, w.moisQte * w.taux, w.dawra === "15" ? "كل 15 يوم" : "بالشهر", w.statut,
    ]);
    const totalRow = ["", "المجموع", "", "", "", "", "", data.workers.reduce((s, w) => s + w.qte * w.taux, 0), data.workers.reduce((s, w) => s + w.moisQte * w.taux, 0), "", ""];
    const aoa = [
      [`جورنال دو باي — ${data.nom}`],
      ["تاريخ الإصدار: 20 يوليوز 2026"],
      [],
      headers,
      ...rows,
      [],
      totalRow,
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 4 }, { wch: 16 }, { wch: 16 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Journal de Paie");
    XLSX.writeFile(wb, `journal-de-paie-${data.nom.replace(/\s/g, "-")}-20-07-2026.xlsx`);
  }
  function addWazin() {
    if (!zForm.wazan.trim() || !zForm.kg) return;
    updateFarm({ wazin: [{ id: Date.now(), date: "20 يوليوز", parcelle: zForm.parcelle || data.parcelles[0].code, wazan: zForm.wazan, patron: zForm.patron || zForm.wazan, kg: Number(zForm.kg), prixKg: Number(zForm.prixKg) || 0, statut: zForm.statut }, ...data.wazin] });
    setZForm({ parcelle: "", wazan: "", patron: "", kg: "", prixKg: "", statut: "فالانتظار" });
    setShowAddWazin(false);
  }
  function addCost() {
    if (!cForm.mablagh) return;
    const target = cForm.parcelle || data.parcelles[0].code;
    const key = cForm.naw3 === "دواء" ? "dawa" : cForm.naw3 === "ماء" ? "ma" : "omal";
    updateFarm({ costs: data.costs.map((cp) => cp.code === target ? { ...cp, [key]: cp[key] + Number(cForm.mablagh) } : cp) });
    setCForm({ parcelle: "", naw3: "دواء", mablagh: "" });
    setShowAddCost(false);
  }
  function addPlan() {
    if (!pForm.produit.trim() || !pForm.dozParHa) return;
    updateFarm({ plan: [...data.plan, { code: pForm.parcelle || data.parcelles[0].code, produit: pForm.produit, dozParHa: Number(pForm.dozParHa), wehda: pForm.wehda, tarikh: pForm.tarikh || "—" }] });
    setPForm({ parcelle: "", produit: "", dozParHa: "", wehda: "لتر", tarikh: "" });
    setShowAddPlan(false);
  }

  function addDepense() {
    if (!dForm.detail.trim() || !dForm.montant) return;
    updateFarm({ depenses: [{ id: Date.now(), dayOffset: 0, dateLabel: "20 يوليوز", type: dForm.type, detail: dForm.detail, montant: Number(dForm.montant) }, ...data.depenses] });
    setDForm({ type: "عمال", detail: "", montant: "" });
    setShowAddDepense(false);
  }

  function handleFactureFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSForm((prev) => ({ ...prev, factureFile: reader.result, factureNom: file.name }));
    reader.readAsDataURL(file);
  }

  function addStockMovement() {
    if (!sForm.nom.trim() || !sForm.kammiya) return;
    const n = Number(sForm.kammiya);
    const existing = data.stock.find((s) => s.nom === sForm.nom);
    let nouvelleKammiya = n;
    let seuilItem = Number(sForm.seuil) || 10;
    if (existing) {
      nouvelleKammiya = sForm.mouvement === "دخول" ? existing.kammiya + n : Math.max(0, existing.kammiya - n);
      seuilItem = existing.seuil;
      updateFarm({ stock: data.stock.map((s) => s.nom === sForm.nom ? { ...s, kammiya: nouvelleKammiya } : s) });
    } else {
      updateFarm({ stock: [...data.stock, { id: Date.now(), nom: sForm.nom, categorie: sForm.categorie, kammiya: n, wehda: sForm.wehda, seuil: seuilItem }] });
    }

    // طلب أوطوماتيكي ملي المخزون يوصل لحد التنبيه — بلا تكرار إذا كان عندو طلب مفتوح ديجا
    if (nouvelleKammiya <= seuilItem) {
      const dejaTalab = commandesGlobal.some((cmd) => cmd.farmId === currentFarmId && cmd.produit === sForm.nom && (cmd.statut === "جديد" || cmd.statut === "تم الطلب"));
      if (!dejaTalab) {
        setCommandesGlobal((prev) => [{ id: Date.now() + 1, farmId: currentFarmId, farmNom: data.nom, demandePar: "النظام (أوطوماتيكي)", produit: sForm.nom, qte: seuilItem * 2, wehda: sForm.wehda || "كيلو", motif: `المخزون وصل ${nouvelleKammiya} (حد التنبيه ${seuilItem}) — طلب تلقائي`, date: "20 يوليوز", statut: "جديد", fournisseur: "", fournisseurEmail: "", prix: "", poNumero: "" }, ...prev]);
      }
    }

    if (sForm.mouvement === "دخول" && sForm.prix) {
      const bonReceptionNumero = `BR-${Math.floor(Math.random() * 9000 + 1000)}`;
      const manque = [];
      if (!sForm.poNumero) manque.push("بون الكوموند");
      if (!sForm.factureFile) manque.push("صورة بون التسليم/الفاتورة");
      const complet = manque.length === 0;
      setAchatsGlobal([{ id: Date.now(), farmId: currentFarmId, farmNom: data.nom, produit: sForm.nom, kammiya: n, wehda: sForm.wehda, prix: Number(sForm.prix), fournisseur: sForm.fournisseur || "—", date: "20 يوليوز", vu: false, factureFile: sForm.factureFile, factureNom: sForm.factureNom, poNumero: sForm.poNumero, bonReceptionNumero, complet }, ...achatsGlobal]);
      if (!complet) {
        setAlertesIncompletes([{ id: Date.now(), farmNom: data.nom, personne: currentUser.nom, produit: sForm.nom, manque, date: "20 يوليوز" }, ...alertesIncompletes]);
      }
    }
    setSForm({ nom: "", categorie: "دواء", wehda: "كيلو", mouvement: "دخول", kammiya: "", seuil: "", prix: "", fournisseur: "", factureFile: "", factureNom: "", poNumero: "" });
    setShowAddStock(false);
  }

  function addInvoice() {
    if (!invForm.client.trim() || !invForm.qte || !invForm.prixUnitaire) return;
    const qte = Number(invForm.qte), pu = Number(invForm.prixUnitaire), tva = Number(invForm.tva) || 0;
    const montantHT = qte * pu;
    const montantTVA = montantHT * (tva / 100);
    const numero = `FAC-${Math.floor(Math.random() * 9000 + 1000)}`;
    updateFarm({ invoices: [{ id: Date.now(), numero, date: "20 يوليوز", client: invForm.client, produit: invForm.produit, qte, prixUnitaire: pu, tva, montantHT, montantTVA, montantTTC: montantHT + montantTVA }, ...data.invoices] });
    setInvForm({ client: "", produit: "avocat", qte: "", prixUnitaire: "", tva: "" });
    setShowAddInvoice(false);
  }

  function exportInvoice(inv) {
    const aoa = [
      [`زيرو مانويل — ${data.nom}`],
      ["فاتورة / Facture"],
      [`رقم: ${inv.numero}`],
      [`التاريخ: ${inv.date}`],
      [],
      ["الزبون / Client", inv.client],
      [],
      ["المنتج", "الكمية (كلغ)", "سعر الوحدة (DH)", "المبلغ HT (DH)"],
      [inv.produit, inv.qte, inv.prixUnitaire, inv.montantHT],
      [],
      ["مجموع HT", inv.montantHT],
      [`TVA (${inv.tva}%)`, inv.montantTVA],
      ["المجموع TTC", inv.montantTTC],
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 22 }, { wch: 18 }, { wch: 16 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Facture");
    XLSX.writeFile(wb, `facture-${inv.numero}.xlsx`);
  }

  function exportTaxSummary() {
    const totalHT = data.invoices.reduce((s, i) => s + i.montantHT, 0);
    const totalTVA = data.invoices.reduce((s, i) => s + i.montantTVA, 0);
    const totalTTC = data.invoices.reduce((s, i) => s + i.montantTTC, 0);
    const aoa = [
      [`ملخص TVA مبسط — ${data.nom}`],
      ["ملاحظة: هذا ملخص داخلي وليس تصريحا ضريبيا رسميا — راجع محاسبك المعتمد"],
      [],
      ["رقم الفاتورة", "التاريخ", "الزبون", "HT", "TVA", "TTC"],
      ...data.invoices.map((i) => [i.numero, i.date, i.client, i.montantHT, i.montantTVA, i.montantTTC]),
      [],
      ["المجموع", "", "", totalHT, totalTVA, totalTTC],
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tax Summary");
    XLSX.writeFile(wb, `tva-summary-${data.nom.replace(/\s/g, "-")}.xlsx`);
  }

  function addCommande() {
    if (!cmdForm.produit.trim() || !cmdForm.qte) return;
    const destId = cmdForm.destFarmId || currentFarmId;
    setCommandesGlobal([{ id: Date.now(), farmId: currentFarmId, farmNom: data.nom, destFarmId: destId, destFarmNom: farms[destId].nom, demandePar: currentUser.nom, produit: cmdForm.produit, qte: Number(cmdForm.qte), wehda: cmdForm.wehda, motif: cmdForm.motif || "—", date: "20 يوليوز", statut: "جديد", fournisseur: "", fournisseurEmail: "", prix: "", poNumero: "" }, ...commandesGlobal]);
    setCmdForm({ produit: "", qte: "", wehda: "كيلو", motif: "", destFarmId: "" });
    setShowAddCommande(false);
  }

  function exportBonCommande(cmd) {
    const aoa = [
      ["زيرو مانويل — بون دي كوموند"],
      [`رقم البون: ${cmd.poNumero}`],
      [`التاريخ: ${cmd.date}`],
      [],
      ["الفيرمة الطالبة", cmd.farmNom],
      ["الشخص الطالب", cmd.demandePar],
      ["السبب", cmd.motif],
      [],
      ["المنتج", "الكمية", "الوحدة", "السعر الإجمالي (DH)"],
      [cmd.produit, cmd.qte, cmd.wehda, cmd.prix],
      [],
      ["المورد", cmd.fournisseur],
      ["بريد المورد", cmd.fournisseurEmail],
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 22 }, { wch: 26 }, { wch: 14 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bon de Commande");
    XLSX.writeFile(wb, `bon-commande-${cmd.poNumero}.xlsx`);
  }

  function processCommande(id) {
    if (!poForm.fournisseur.trim() || !poForm.prix) return;
    const poNumero = `PO-${Math.floor(Math.random() * 9000 + 1000)}`;
    let updated = null;
    setCommandesGlobal(commandesGlobal.map((cmd) => {
      if (cmd.id === id) {
        updated = { ...cmd, statut: "تم الطلب", fournisseur: poForm.fournisseur, fournisseurEmail: poForm.fournisseurEmail, prix: poForm.prix, poNumero };
        return updated;
      }
      return cmd;
    }));
    setPoForm({ fournisseur: "", fournisseurEmail: "", prix: "" });
    setProcessingId(null);
    if (updated) setTimeout(() => exportBonCommande(updated), 100);
  }

  function mailtoLink(cmd) {
    const subject = encodeURIComponent(`بون دي كوموند ${cmd.poNumero} — ${cmd.produit}`);
    const body = encodeURIComponent(`السلام عليكم،\n\nمرفق بون دي كوموند رقم ${cmd.poNumero}:\n- المنتج: ${cmd.produit}\n- الكمية: ${cmd.qte} ${cmd.wehda}\n- السعر الإجمالي: ${cmd.prix} DH\n- الفيرمة الطالبة: ${cmd.farmNom}\n\nشكرا،\nزيرو مانويل`);
    return `mailto:${cmd.fournisseurEmail}?subject=${subject}&body=${body}`;
  }

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("المتصفح ديالك ماكيدعمش التعرف على الصوت — جرب Chrome"); return; }
    const rec = new SR();
    rec.lang = "ar-MA";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.onresult = (e) => setAnalystQuestion((prev) => (prev ? prev + " " : "") + e.results[0][0].transcript);
    recognitionRef.current = rec;
    rec.start();
  }
  function stopListening() { recognitionRef.current?.stop(); setListening(false); }

  function speakText(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const arVoice = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith("ar"));
    if (arVoice) utter.voice = arVoice;
    utter.lang = "ar-MA";
    utter.rate = 0.98;
    window.speechSynthesis.speak(utter);
  }

  async function askAnalyst(question) {
    if (!question.trim() || analystLoading) return;
    setAnalystMessages((prev) => [...prev, { role: "user", text: question }]);
    setAnalystQuestion("");
    setAnalystLoading(true);

    const stockAlerts = data.stock.filter((s) => s.kammiya <= s.seuil).map((s) => `${s.nom}: باقي ${s.kammiya} ${s.wehda} (حد ${s.seuil})`);
    const wazinAttente = data.wazin.filter((w) => w.statut === "فالانتظار").map((w) => `${w.wazan}: ${w.kg}كلغ × ${w.prixKg}DH`);
    const context = `
معطيات فيرمة "${data.nom}" اليوم (20 يوليوز 2026):
- إنتاج اليوم: ${kpis.totalHarvest} كلغ
- تكلفة الشهر: ${kpis.totalCost} DH (دواء: ${kpis.totalDawa}, ماء+عمال: ${kpis.totalMaOmal})
- عدد العمال اليوم: ${data.workers.length}, مجموع خلاصهم: ${kpis.totalKhlas} DH
- الربحية لكل قطعة: ${rentabilite.map((r) => `${r.code}(${r.nom}): مدخول ${r.revenu}DH، تكلفة ${r.cout}DH، ربح ${r.profit}DH (${r.marge}%)`).join(" | ")}
- تنبيهات المخزون: ${stockAlerts.length ? stockAlerts.join(", ") : "ماكاينش"}
- وزينات فالانتظار الأداء: ${wazinAttente.length ? wazinAttente.join(", ") : "ماكاينش"}
- تصريح CNSS لهاد الشهر: ${data.cnss.declare ? "تم" : "ماتداروش بعد"}
`.trim();

    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-5",
          max_tokens: 700,
          messages: [{
            role: "user",
            content: `أنت محلل مالي وفلاحي خبير كتخدم مع فيرمة أفوكا وفريز فالمغرب. جاوب بالدارجة المغربية، مختصر ومباشر، بنقط واضحة، بناء على المعطيات الحقيقية التالية فقط (لا تخترع أرقام):\n\n${context}\n\nسؤال المستخدم: ${question}`,
          }],
        }),
      });
      const json = await resp.json();
      const textBlocks = (json.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
      const finalText = textBlocks || "ماقدرتش نجاوب دابا، عاود جرب.";
      setAnalystMessages((prev) => [...prev, { role: "assistant", text: finalText }]);
      if (autoSpeak) speakText(finalText);
    } catch (err) {
      setAnalystMessages((prev) => [...prev, { role: "assistant", text: "وقع مشكل فالاتصال بالمحلل. عاود جرب من بعد." }]);
    }
    setAnalystLoading(false);
  }

  function addIncident() {
    if (!issueForm.probleme.trim()) return;
    setIncidentsGlobal([{ id: Date.now(), farmNom: data.nom, gps: data.gps, produit: issueForm.produit, probleme: issueForm.probleme, severite: issueForm.severite, date: "20 يوليوز" }, ...incidentsGlobal]);
    setIssueForm({ produit: "avocat", probleme: "", severite: "متوسط" });
    setShowReportIssue(false);
  }

  function addListing() {
    if (!mForm.produit.trim() || !mForm.kammiya) return;
    setMarketplaceGlobal([{ id: Date.now(), farmId: currentFarmId, farmNom: data.nom, type: mForm.type, produit: mForm.produit, kammiya: Number(mForm.kammiya), wehda: mForm.wehda, prix: mForm.prix, description: mForm.description, contactNom: currentUser.nom, contactTel: mForm.contactTel || "—", date: "20 يوليوز" }, ...marketplaceGlobal]);
    setMForm({ type: "أعرض", produit: "", kammiya: "", wehda: "كيلو", prix: "", description: "", contactTel: "" });
    setShowAddListing(false);
  }
  function removeListing(id) {
    setMarketplaceGlobal(marketplaceGlobal.filter((l) => l.id !== id));
  }

  function addFarm() {
    if (!fForm.nom.trim()) return;
    const id = `farm_${Date.now()}`;
    setFarms((prev) => ({
      ...prev,
      [id]: {
        nom: fForm.nom,
        gps: { lat: Number(fForm.lat) || 34.9200, lng: Number(fForm.lng) || -6.1000 },
        parcelles: [], workers: [], wazin: [], costs: [], plan: [], depenses: [], stock: [], invoices: [], cnss: { echeanceJour: 10, moisLabel: "يوليوز 2026", declare: false, dateDeclare: "" }, employees: [],
      },
    }));
    setFForm({ nom: "", lat: "", lng: "" });
    setShowAddFarm(false);
    switchFarm(id);
  }

  return (
    <div dir="rtl" style={{ background: c.bg, minHeight: "100vh", color: c.ink, fontFamily: "'Inter', sans-serif", paddingBottom: 80 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@700;800;900&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@600&display=swap');
        .font-display { font-family: 'Manrope', sans-serif; letter-spacing: -0.01em; }
        button { transition: all 0.15s ease; cursor: pointer; }
        button:active { transform: scale(0.98); }
        ::selection { background: #11996B; color: #fff; }
        @keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(214,69,80,0.5); } 50% { box-shadow: 0 0 0 8px rgba(214,69,80,0); } }
        #bottomNav { scroll-snap-type: x proximity; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        #bottomNav::-webkit-scrollbar { display: none; }`}</style>

      <header style={{ background: `linear-gradient(135deg, ${c.headerGreenLight} 0%, ${c.headerGreen} 100%)`, boxShadow: "0 4px 20px rgba(13,107,73,0.18)" }} className="px-5 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div style={{ background: "rgba(255,255,255,0.16)", borderRadius: 12, width: 40, height: 40 }} className="flex items-center justify-center"><Sprout size={18} color="#fff" /></div>
          <div>
            <div className="font-display" style={{ color: "#fff", fontWeight: 800, fontSize: "1.05rem" }}>{data.nom}</div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.68rem" }}>{currentUser.nom} · {roleLabel[currentUser.role]}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {myFarmIds.length > 1 && (
            <select value={currentFarmId} onChange={(e) => switchFarm(e.target.value)} style={{ background: "rgba(255,255,255,0.16)", color: "#fff", border: "none", borderRadius: 10, padding: "6px 10px", fontSize: "0.75rem", fontWeight: 700 }}>
              {myFarmIds.map((fid) => (<option key={fid} value={fid} style={{ color: "#000" }}>{farms[fid].nom}</option>))}
            </select>
          )}
          <div style={{ position: "relative" }}>
            <Bell size={19} color="#fff" />
            <span style={{ position: "absolute", top: -5, left: -6, background: c.danger, color: "#fff", fontSize: "0.6rem", fontWeight: 700, borderRadius: 999, width: 15, height: 15 }} className="flex items-center justify-center">{alertes.length + (canManageFarms ? commandesGlobal.filter((cmd) => myFarmIds.includes(cmd.farmId) && cmd.statut === "جديد").length : 0) + ((canManageFarms || currentUser.role === "Accountant") ? achatsGlobal.filter((a) => myFarmIds.includes(a.farmId) && !a.vu).length : 0) + (currentUser.role === "Owner" ? alertesIncompletes.length : 0) + ((permTabs.includes("CNSS") && !data.cnss.declare && data.cnss.echeanceJour && (data.cnss.echeanceJour - 20) <= 3) ? 1 : 0)}</span>
          </div>
          <button onClick={async () => { await supabase.auth.signOut(); setCurrentUser(null); setFarms({}); setCurrentFarmId(null); }}><LogOut size={18} color="rgba(255,255,255,0.85)" /></button>
        </div>
      </header>

      <main className="p-4">
        {tab === "لوحة" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard title={{ icon: <Sprout size={17} color="#fff" />, label: "إنتاج اليوم" }} value={kpis.totalHarvest.toLocaleString()} unit="كلغ"
                sub={[{ label: "قطع", value: data.parcelles.length }, { label: "هكتار", value: data.parcelles.reduce((s, p) => s + p.ha, 0).toFixed(1) }]} />
              <StatCard title={{ icon: <Wallet size={17} color="#fff" />, label: "تكلفة الشهر" }} value={kpis.totalCost.toLocaleString()} unit="DH"
                sub={[{ label: "دواء", value: `${kpis.totalDawa} DH` }, { label: "ماء + عمال", value: `${kpis.totalMaOmal} DH` }]} />
              <StatCard title={{ icon: <Users size={17} color="#fff" />, label: "اللجنة اليوم" }} value={data.workers.length} unit="عمال"
                sub={[{ label: "سوايع", value: `${kpis.totalHeures} س` }, { label: "خلاص اليوم", value: `${kpis.totalKhlas} DH` }]} />
              <StatCard title={{ icon: <AlertTriangle size={17} color="#fff" />, label: "شحنة فالانتظار الأداء" }} value={kpis.enAttente} unit="شحنة" variant="orange" />
            </div>
            <div className="mt-6">
              <h2 className="font-display mb-3" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>التنبيهات</h2>
              <div className="flex flex-col gap-2">
                {alertes.map((a, i) => { const Icon = a.icon; return (
                  <div key={i} style={{ background: c.white, border: `1px solid ${c.line}`, borderRight: `4px solid ${c.orange}`, borderRadius: 12 }} className="p-3 flex items-center gap-3">
                    <Icon size={17} color={c.orange} /><span style={{ fontSize: "0.82rem", color: c.inkSoft }}>{a.texte}</span>
                  </div>
                );})}
              </div>
            </div>
          </>
        )}

        {tab === "الفيرمات" && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>الفيرمات ديالي ({myFarmIds.length})</h2>
              <AddButton label="زيد فيرمة" open={showAddFarm} onClick={() => setShowAddFarm(!showAddFarm)} />
            </div>
            <p style={{ color: c.inkMuted2, fontSize: "0.72rem" }} className="mb-3">كل فيرمة معزولة تماما — لا حد يشوف بيانات فيرمة أخرى غير اللي عندو وصول ليها</p>
            {showAddFarm && (
              <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-4 grid grid-cols-3 gap-3">
                <Field label="اسم الفيرمة"><input value={fForm.nom} onChange={(e) => setFForm({ ...fForm, nom: e.target.value })} placeholder="مثلا فيرمة سوس" style={inputStyle} /></Field>
                <Field label="GPS Lat (اختياري)"><input value={fForm.lat} onChange={(e) => setFForm({ ...fForm, lat: e.target.value })} placeholder="34.92" style={inputStyle} /></Field>
                <Field label="GPS Lng (اختياري)"><input value={fForm.lng} onChange={(e) => setFForm({ ...fForm, lng: e.target.value })} placeholder="-6.10" style={inputStyle} /></Field>
                <div className="col-span-3"><button onClick={addFarm} style={{ background: c.cardGreen, color: "#fff", borderRadius: 11, padding: "10px 0", boxShadow: "0 4px 14px -3px rgba(17,153,107,0.4)", fontWeight: 700, width: "100%" }}>إنشاء الفيرمة</button></div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              {myFarmIds.map((fid) => {
                const f = farms[fid]; const active = fid === currentFarmId;
                return (
                  <button key={fid} onClick={() => switchFarm(fid)} style={{ background: c.white, border: `1.5px solid ${active ? c.cardGreen : c.line}`, borderRadius: 14, textAlign: "right" }} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div style={{ background: c.bg, borderRadius: 10, width: 36, height: 36 }} className="flex items-center justify-center"><Building2 size={16} color={c.cardGreen} /></div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>{f.nom}</div>
                        <div style={{ fontSize: "0.68rem", color: c.inkMuted2 }}>{f.parcelles.length} قطع · {f.workers.length} عمال</div>
                      </div>
                    </div>
                    {active && <span style={{ fontSize: "0.68rem", fontWeight: 700, color: c.cardGreenDeep }}>مفتوحة دابا</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {tab === "الطلبات" && (() => {
          const mesCommandes = canManageFarms ? commandesGlobal.filter((cmd) => myFarmIds.includes(cmd.farmId)) : commandesGlobal.filter((cmd) => cmd.farmId === currentFarmId);
          const nouvelles = mesCommandes.filter((cmd) => cmd.statut === "جديد");
          return (
            <div>
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-display" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>{canManageFarms ? "الطلبات — كل الفيرمات" : "طلبات الفيرمة"}</h2>
                <AddButton label="طلب جديد" open={showAddCommande} onClick={() => setShowAddCommande(!showAddCommande)} />
              </div>
              <p style={{ color: c.inkMuted2, fontSize: "0.72rem" }} className="mb-4">{canManageFarms ? "كل طلب من أي فيرمة كيطيح ليك هنا — دير بون دي كوموند وصيفطو للمورد" : "دير طلب وغادي يوصل للمسؤول باش يشري ليك"}</p>

              {showAddCommande && (
                <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-4 grid grid-cols-2 gap-3">
                  <Field label="المنتج"><input value={cmdForm.produit} onChange={(e) => setCmdForm({ ...cmdForm, produit: e.target.value })} placeholder="مثلا: مبيد فطريات" style={inputStyle} /></Field>
                  <Field label="الكمية"><input type="number" value={cmdForm.qte} onChange={(e) => setCmdForm({ ...cmdForm, qte: e.target.value })} style={inputStyle} /></Field>
                  <Field label="الوحدة"><select value={cmdForm.wehda} onChange={(e) => setCmdForm({ ...cmdForm, wehda: e.target.value })} style={inputStyle}><option>كيلو</option><option>لتر</option><option>كيس</option><option>وحدة</option></select></Field>
                  <Field label="السبب"><input value={cmdForm.motif} onChange={(e) => setCmdForm({ ...cmdForm, motif: e.target.value })} placeholder="مثلا: المخزون خلص" style={inputStyle} /></Field>
                  {canManageFarms && myFarmIds.length > 1 && (
                    <Field label="الفيرمة الوجهة (فين غادي تدخل السلعة)">
                      <select value={cmdForm.destFarmId} onChange={(e) => setCmdForm({ ...cmdForm, destFarmId: e.target.value })} style={inputStyle}>
                        <option value="">نفس الفيرمة الحالية ({data.nom})</option>
                        {myFarmIds.filter((fid) => fid !== currentFarmId).map((fid) => (<option key={fid} value={fid}>{farms[fid].nom}</option>))}
                      </select>
                    </Field>
                  )}
                  <div className="col-span-2"><button onClick={addCommande} style={{ background: c.cardGreen, color: "#fff", borderRadius: 11, padding: "10px 0", fontWeight: 700, width: "100%", boxShadow: "0 4px 14px -3px rgba(17,153,107,0.4)" }}>إرسال الطلب</button></div>
                </div>
              )}

              {canManageFarms && nouvelles.length > 0 && (
                <div style={{ background: "rgba(240,169,60,0.1)", border: `1px solid ${c.orange}`, borderRadius: 14 }} className="p-3 mb-4 flex items-center gap-2">
                  <Bell size={16} color={c.orange} /><span style={{ fontSize: "0.82rem", fontWeight: 700, color: c.inkSoft }}>عندك {nouvelles.length} طلب جديد كيتسنى المعالجة</span>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {mesCommandes.map((cmd) => (
                  <div key={cmd.id} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {canManageFarms && <span style={{ background: c.bg, borderRadius: 999, padding: "2px 9px", fontSize: "0.68rem", fontWeight: 700, color: c.inkSoft }}>{cmd.farmNom}</span>}
                        <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>{cmd.produit}</span>
                      </div>
                      <span style={{ fontSize: "0.68rem", fontWeight: 700, color: cmd.statut === "جديد" ? c.orange : c.cardGreenDeep, background: cmd.statut === "جديد" ? "rgba(240,169,60,0.14)" : "rgba(17,153,107,0.12)", borderRadius: 999, padding: "3px 9px" }}>{cmd.statut}</span>
                    </div>
                    {cmd.destFarmId && cmd.destFarmId !== cmd.farmId && (
                      <div className="flex items-center gap-1.5 mb-2" style={{ fontSize: "0.74rem", color: c.blue, fontWeight: 700 }}>
                        <ArrowRight size={12} /> متجهة لفيرمة: {cmd.destFarmNom}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 mb-2" style={{ fontSize: "0.78rem" }}>
                      <div className="flex justify-between"><span style={{ color: c.inkMuted2 }}>طلب بواسطة</span><span style={{ fontWeight: 600, color: cmd.demandePar.includes("أوطوماتيكي") ? c.blue : c.ink }}>{cmd.demandePar.includes("أوطوماتيكي") ? "🤖 " : ""}{cmd.demandePar}</span></div>
                      <div className="flex justify-between"><span style={{ color: c.inkMuted2 }}>الكمية</span><span className="font-mono" style={{ fontWeight: 600 }}>{cmd.qte} {cmd.wehda}</span></div>
                      <div className="flex justify-between"><span style={{ color: c.inkMuted2 }}>السبب</span><span>{cmd.motif}</span></div>
                      <div className="flex justify-between"><span style={{ color: c.inkMuted2 }}>التاريخ</span><span>{cmd.date}</span></div>
                    </div>

                    {cmd.statut === "تم الطلب" && (
                      <div style={{ background: c.bg, borderRadius: 10 }} className="p-2.5 flex items-center justify-between">
                        <div style={{ fontSize: "0.76rem" }}><span style={{ color: c.inkMuted2 }}>المورد: </span><span style={{ fontWeight: 700 }}>{cmd.fournisseur}</span><span style={{ color: c.inkMuted2 }}> · {cmd.poNumero} · {cmd.prix} DH</span></div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => exportBonCommande(cmd)} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 8, padding: "5px 9px" }} className="flex items-center gap-1"><Download size={13} color={c.cardGreenDeep} /><span style={{ fontSize: "0.7rem", fontWeight: 700, color: c.cardGreenDeep }}>البون</span></button>
                          {cmd.fournisseurEmail && <a href={mailtoLink(cmd)} style={{ background: c.cardGreen, borderRadius: 8, padding: "5px 9px" }} className="flex items-center gap-1"><Mail size={13} color="#fff" /><span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#fff" }}>صيفط للمورد</span></a>}
                        </div>
                      </div>
                    )}

                    {cmd.statut === "جديد" && canManageFarms && processingId !== cmd.id && (
                      <button onClick={() => setProcessingId(cmd.id)} style={{ background: c.orange, color: "#fff", borderRadius: 10, padding: "8px 0", fontWeight: 700, fontSize: "0.8rem", width: "100%" }} className="flex items-center justify-center gap-1.5"><FileCheck size={14} />إنشاء بون دي كوموند</button>
                    )}
                    {cmd.statut === "جديد" && canManageFarms && processingId === cmd.id && (
                      <div style={{ background: c.bg, borderRadius: 12 }} className="p-3 grid grid-cols-3 gap-2 mt-1">
                        <Field label="المورد (اسم الشركة)"><input value={poForm.fournisseur} onChange={(e) => setPoForm({ ...poForm, fournisseur: e.target.value })} style={inputStyle} /></Field>
                        <Field label="بريد المورد"><input value={poForm.fournisseurEmail} onChange={(e) => setPoForm({ ...poForm, fournisseurEmail: e.target.value })} placeholder="supplier@example.com" style={inputStyle} /></Field>
                        <Field label="السعر الإجمالي (DH)"><input type="number" value={poForm.prix} onChange={(e) => setPoForm({ ...poForm, prix: e.target.value })} style={inputStyle} /></Field>
                        <div className="col-span-3 flex gap-2">
                          <button onClick={() => processCommande(cmd.id)} style={{ background: c.cardGreen, color: "#fff", borderRadius: 9, padding: "9px 0", fontWeight: 700, fontSize: "0.8rem", flex: 1 }}>تأكيد وتوليد البون</button>
                          <button onClick={() => setProcessingId(null)} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 9, padding: "9px 14px", fontWeight: 700, fontSize: "0.8rem" }}>إلغاء</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {mesCommandes.length === 0 && <p style={{ color: c.inkMuted2, fontSize: "0.82rem" }}>ماكاينش طلبات دابا</p>}
              </div>
            </div>
          );
        })()}

        {tab === "السوق" && (() => {
          const filtered = marketplaceGlobal.filter((l) => mFilter === "الكل" ? true : mFilter === "إعلاناتي" ? l.farmId === currentFarmId : l.type === mFilter);
          return (
            <div>
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-display" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>سوق التبادل بين الفيرمات</h2>
                <AddButton label="زيد إعلان" open={showAddListing} onClick={() => setShowAddListing(!showAddListing)} />
              </div>
              <p style={{ color: c.inkMuted2, fontSize: "0.72rem" }} className="mb-4">فيرمة عندها زايد، فيرمة أخرى محتاجة — تبادل مباشر بلا وسيط</p>

              <div className="flex gap-2 mb-4 flex-wrap">
                {["الكل", "أعرض", "محتاج", "إعلاناتي"].map((f) => (
                  <button key={f} onClick={() => setMFilter(f)} style={{ background: mFilter === f ? c.cardGreen : c.white, color: mFilter === f ? "#fff" : c.ink, border: `1px solid ${mFilter === f ? c.cardGreen : c.line}`, borderRadius: 10, padding: "7px 12px", fontSize: "0.78rem", fontWeight: 700 }}>{f}</button>
                ))}
              </div>

              {showAddListing && (
                <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-4 grid grid-cols-3 gap-3">
                  <Field label="النوع"><select value={mForm.type} onChange={(e) => setMForm({ ...mForm, type: e.target.value })} style={inputStyle}><option value="أعرض">أعرض للبيع/التبادل</option><option value="محتاج">محتاج نشري</option></select></Field>
                  <Field label="المنتج"><input list="stockNamesM" value={mForm.produit} onChange={(e) => setMForm({ ...mForm, produit: e.target.value })} placeholder="مبيد فطريات..." style={inputStyle} />
                    <datalist id="stockNamesM">{data.stock.map((s) => <option key={s.id} value={s.nom} />)}</datalist>
                  </Field>
                  <Field label="الوحدة"><select value={mForm.wehda} onChange={(e) => setMForm({ ...mForm, wehda: e.target.value })} style={inputStyle}><option>كيلو</option><option>لتر</option><option>كيس</option><option>وحدة</option></select></Field>
                  <Field label="الكمية"><input type="number" value={mForm.kammiya} onChange={(e) => setMForm({ ...mForm, kammiya: e.target.value })} style={inputStyle} /></Field>
                  <Field label="السعر/وحدة (DH) — اختياري"><input type="number" value={mForm.prix} onChange={(e) => setMForm({ ...mForm, prix: e.target.value })} style={inputStyle} /></Field>
                  <Field label="رقم الهاتف للتواصل"><input value={mForm.contactTel} onChange={(e) => setMForm({ ...mForm, contactTel: e.target.value })} placeholder="0661-..." style={inputStyle} /></Field>
                  <div className="col-span-3"><Field label="وصف قصير"><input value={mForm.description} onChange={(e) => setMForm({ ...mForm, description: e.target.value })} style={inputStyle} /></Field></div>
                  <div className="col-span-3"><button onClick={addListing} style={{ background: c.cardGreen, color: "#fff", borderRadius: 11, padding: "10px 0", boxShadow: "0 4px 14px -3px rgba(17,153,107,0.4)", fontWeight: 700, width: "100%" }}>نشر الإعلان</button></div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {filtered.map((l) => (
                  <div key={l.id} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span style={{ background: l.type === "أعرض" ? "rgba(17,153,107,0.12)" : "rgba(240,169,60,0.14)", color: l.type === "أعرض" ? c.cardGreenDeep : c.orange, borderRadius: 999, padding: "3px 10px", fontSize: "0.68rem", fontWeight: 700 }}>{l.type}</span>
                        <span style={{ background: c.bg, borderRadius: 999, padding: "2px 9px", fontSize: "0.66rem", fontWeight: 700, color: c.inkSoft }}>{l.farmNom}</span>
                      </div>
                      <span style={{ fontSize: "0.7rem", color: c.inkMuted2 }}>{l.date}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "0.92rem" }}>{l.produit}</div>
                        <div style={{ fontSize: "0.78rem", color: c.inkMuted2 }} className="mt-0.5">{l.kammiya} {l.wehda}{l.prix ? ` · ${l.prix} DH/${l.wehda}` : ""} — {l.description}</div>
                      </div>
                      {l.farmId === currentFarmId ? (
                        <button onClick={() => removeListing(l.id)}><Trash2 size={16} color={c.danger} /></button>
                      ) : (
                        <a href={`tel:${l.contactTel}`} style={{ background: c.cardGreen, borderRadius: 9, padding: "8px 14px" }} className="flex items-center gap-1.5">
                          <Phone size={13} color="#fff" /><span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#fff" }}>تواصل مع {l.contactNom}</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && <p style={{ color: c.inkMuted2, fontSize: "0.82rem" }}>ماكاينش إعلانات فهاد الفئة دابا</p>}
              </div>
            </div>
          );
        })()}

        {tab === "القطع" && (() => {
          const nearby = incidentsGlobal
            .map((inc) => ({ ...inc, dist: distanceKm(data.gps, inc.gps) }))
            .filter((inc) => inc.dist <= 60)
            .sort((a, b) => a.dist - b.dist);
          return (
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>إنذار مبكر — آفات وأمراض قريبة منك</h2>
              <AddButton label="بلّغ عن مشكل" open={showReportIssue} onClick={() => setShowReportIssue(!showReportIssue)} />
            </div>
            <p style={{ color: c.inkMuted2, fontSize: "0.72rem" }} className="mb-3">مبني على القرب الجغرافي الحقيقي (GPS) بين كل مستخدمي زيرو مانويل — دائرة 60 كلم</p>

            {showReportIssue && (
              <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-4 grid grid-cols-3 gap-3">
                <Field label="المحصول المتأثر"><select value={issueForm.produit} onChange={(e) => setIssueForm({ ...issueForm, produit: e.target.value })} style={inputStyle}><option value="avocat">أفوكا</option><option value="fraise">فريز</option></select></Field>
                <Field label="اسم الآفة/المرض"><input value={issueForm.probleme} onChange={(e) => setIssueForm({ ...issueForm, probleme: e.target.value })} placeholder="مثلا: عنكبوت أحمر" style={inputStyle} /></Field>
                <Field label="الشدة"><select value={issueForm.severite} onChange={(e) => setIssueForm({ ...issueForm, severite: e.target.value })} style={inputStyle}><option>خفيف</option><option>متوسط</option><option>خطير</option></select></Field>
                <div className="col-span-3"><button onClick={addIncident} style={{ background: c.danger, color: "#fff", borderRadius: 11, padding: "10px 0", fontWeight: 700, width: "100%" }}>نشر التنبيه للجيران</button></div>
              </div>
            )}

            {nearby.length > 0 ? (
              <div className="flex flex-col gap-2 mb-6">
                {nearby.map((inc) => (
                  <div key={inc.id} style={{ background: "rgba(214,69,80,0.08)", border: `1px solid ${c.danger}`, borderRadius: 12 }} className="p-3 flex items-center gap-3">
                    <AlertTriangle size={17} color={c.danger} />
                    <span style={{ fontSize: "0.82rem", color: c.inkSoft }}>
                      <b>{inc.probleme}</b> فـ{inc.produit === "avocat" ? "الأفوكا" : "الفريز"} — بلغ عنه <b>{inc.farmNom}</b> على بعد <b>{inc.dist} كلم</b> منك (شدة: {inc.severite}) · {inc.date}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: c.inkMuted2, fontSize: "0.8rem" }} className="mb-6">ماكاينش تنبيهات قريبة منك دابا — الوضعية هادئة فمنطقتك 👍</p>
            )}

            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>موقع الفيرمة بالقمر الصناعي</h2>
              <span style={{ color: c.inkMuted2, fontSize: "0.68rem" }}>موقع تجريبي — عطينا الإحداثيات الحقيقية باش نبدلوه</span>
            </div>
            <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)", overflow: "hidden" }} className="mb-5">
              <iframe
                title="satellite-map"
                src={`https://www.google.com/maps?q=${data.gps.lat},${data.gps.lng}&z=17&output=embed&t=k`}
                style={{ width: "100%", height: 260, border: 0, display: "block" }}
                loading="lazy"
              />
            </div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>خريطة القطع</h2>
              <div className="flex items-center gap-2">
                <span style={{ color: c.inkMuted2, fontSize: "0.75rem" }}>{data.parcelles.reduce((s, p) => s + p.ha, 0).toFixed(1)} هكتار</span>
                {canEdit("القطع") && <AddButton label="زيد قطعة" open={showAddParcelle} onClick={() => setShowAddParcelle(!showAddParcelle)} />}
              </div>
            </div>

            {showAddParcelle && (
              <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-3 grid grid-cols-3 gap-3">
                <Field label="الرمز (مثلا A1)"><input value={pcForm.code} onChange={(e) => setPcForm({ ...pcForm, code: e.target.value })} style={inputStyle} /></Field>
                <Field label="الاسم"><input value={pcForm.nom} onChange={(e) => setPcForm({ ...pcForm, nom: e.target.value })} style={inputStyle} /></Field>
                <Field label="المحصول"><select value={pcForm.crop} onChange={(e) => setPcForm({ ...pcForm, crop: e.target.value })} style={inputStyle}><option value="avocat">أفوكا</option><option value="fraise">فريز</option></select></Field>
                <Field label="المساحة (هكتار)"><input type="number" step="0.1" value={pcForm.ha} onChange={(e) => setPcForm({ ...pcForm, ha: e.target.value })} style={inputStyle} /></Field>
                <div className="col-span-2 flex items-end"><button onClick={addParcelle} style={{ background: c.cardGreen, color: "#fff", borderRadius: 11, padding: "10px 0", fontWeight: 700, width: "100%", boxShadow: "0 4px 14px -3px rgba(17,153,107,0.4)" }}>إضافة القطعة</button></div>
              </div>
            )}

            {data.parcelles.length === 0 ? (
              <p style={{ color: c.inkMuted2, fontSize: "0.82rem" }} className="mb-4">ماكاينش قطع مسجلة فهاد الفيرمة بعد — زيد أول قطعة بزر "زيد قطعة" فوق</p>
            ) : (
            <div className="grid grid-cols-4 gap-2.5">
              {data.parcelles.map((p) => { const active = selected && selected.code === p.code; return (
                <button key={p.code} onClick={() => setSelected(p)} style={{ background: c.white, border: `1.5px solid ${active ? statutColor[p.statut] : c.line}`, textAlign: "right", boxShadow: active ? `0 0 0 3px ${statutColor[p.statut]}22, 0 4px 12px rgba(0,0,0,0.06)` : "0 1px 3px rgba(0,0,0,0.03)" }} className="rounded-2xl p-3 flex flex-col gap-2 hover:opacity-90">
                  <div className="flex items-center justify-between"><span className="font-mono" style={{ fontSize: "0.85rem", fontWeight: 700 }}>{p.code}</span><CropIcon crop={p.crop} color={p.crop === "avocat" ? c.cardGreen : c.danger} /></div>
                  <div style={{ height: 5, borderRadius: 4, background: c.bg, overflow: "hidden" }}><div style={{ width: `${p.recolte}%`, height: "100%", background: statutColor[p.statut] }} /></div>
                  <span style={{ fontSize: "0.65rem", color: c.inkMuted2, fontWeight: 600 }}>{statutLabel[p.statut]} · {p.recolte}%</span>
                </button>
              );})}
            </div>
            )}
            {selected && (
            <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="mt-3 p-4">
              <div className="flex items-center justify-between mb-2"><h3 style={{ fontWeight: 800, fontSize: "0.95rem" }}>{selected.nom}</h3><span className="font-mono" style={{ fontSize: "0.78rem", color: c.inkMuted2 }}>{selected.code}</span></div>
              <div className="grid grid-cols-2 gap-2" style={{ fontSize: "0.8rem" }}>
                <div className="flex justify-between"><span style={{ color: c.inkMuted2 }}>المساحة</span><span style={{ fontWeight: 700 }}>{selected.ha} هكتار</span></div>
                <div className="flex justify-between"><span style={{ color: c.inkMuted2 }}>الري القادم</span><span style={{ fontWeight: 700 }}>{selected.irrigation}</span></div>
                <div className="flex justify-between"><span style={{ color: c.inkMuted2 }}>آخر معالجة</span><span style={{ fontWeight: 700 }}>{selected.dernierTraitement}</span></div>
                <div className="flex justify-between"><span style={{ color: c.inkMuted2 }}>أمان القطف</span><span style={{ fontWeight: 700, color: selected.secu > 0 ? c.danger : c.cardGreen }}>{selected.secu > 0 ? `${selected.secu} أيام` : "جاهز"}</span></div>
              </div>
            </div>
            )}
          </div>
          );
        })()}

        {tab === "العمال" && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>{isWorker ? "البونطاج ديالي" : "بونتاج العمال اليوم"}</h2>
              <div className="flex items-center gap-2">
                {!isWorker && (
                  <button onClick={exportJournalPaie} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 10, padding: "8px 12px" }} className="flex items-center gap-1.5">
                    <Download size={15} color={c.cardGreenDeep} /><span style={{ fontSize: "0.8rem", fontWeight: 700, color: c.cardGreenDeep }}>جورنال دو باي</span>
                  </button>
                )}
                <AddButton label="بونتي" open={showAddWorker} onClick={() => setShowAddWorker(!showAddWorker)} />
              </div>
            </div>

            {!isWorker && (() => {
              const w15 = data.workers.filter((w) => w.dawra === "15");
              const wMois = data.workers.filter((w) => w.dawra === "شهر");
              const total15 = w15.reduce((s, w) => s + w.moisQte * w.taux, 0);
              const totalMois = wMois.reduce((s, w) => s + w.moisQte * w.taux, 0);
              return (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-3">
                    <div className="flex items-center justify-between mb-1"><span style={{ fontWeight: 700, fontSize: "0.82rem" }}>دورة 15 يوم</span><span style={{ fontSize: "0.68rem", color: c.orange, fontWeight: 700 }}>الخلاص: 31 يوليوز</span></div>
                    <div style={{ fontWeight: 800, fontSize: "1.1rem", color: c.cardGreenDeep }}>{total15} DH</div>
                    <div style={{ fontSize: "0.7rem", color: c.inkMuted2 }}>{w15.length} عمال: {w15.map((w) => w.nom).join("، ") || "—"}</div>
                  </div>
                  <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-3">
                    <div className="flex items-center justify-between mb-1"><span style={{ fontWeight: 700, fontSize: "0.82rem" }}>دورة الشهر</span><span style={{ fontSize: "0.68rem", color: c.orange, fontWeight: 700 }}>الخلاص: 31 يوليوز</span></div>
                    <div style={{ fontWeight: 800, fontSize: "1.1rem", color: c.cardGreenDeep }}>{totalMois} DH</div>
                    <div style={{ fontSize: "0.7rem", color: c.inkMuted2 }}>{wMois.length} عمال: {wMois.map((w) => w.nom).join("، ") || "—"}</div>
                  </div>
                </div>
              );
            })()}

            {showAddWorker && (
              <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-4 flex flex-col gap-3">
                {isWorker && (
                  <button onClick={() => setIconMode(!iconMode)} style={{ alignSelf: "flex-end", background: c.bg, borderRadius: 999, padding: "5px 11px" }} className="flex items-center gap-1.5">
                    {iconMode ? <Type size={12} color={c.inkMuted2} /> : <Grid3x3 size={12} color={c.inkMuted2} />}
                    <span style={{ fontSize: "0.66rem", fontWeight: 700, color: c.inkMuted2 }}>{iconMode ? "الوضع بالنص" : "الوضع بالأيقونات"}</span>
                  </button>
                )}

                {isWorker && iconMode ? (
                  <>
                    <div>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: c.inkMuted2 }} className="mb-2 block">القطعة</span>
                      <div className="grid grid-cols-4 gap-2">
                        {data.parcelles.map((p) => {
                          const active = wForm.parcelle === p.code;
                          return (
                            <button key={p.code} onClick={() => setWForm({ ...wForm, parcelle: p.code })}
                              style={{ background: active ? statutColor[p.statut] : c.bg, border: `2px solid ${active ? statutColor[p.statut] : c.line}`, borderRadius: 14, padding: "16px 4px" }}
                              className="flex flex-col items-center gap-1.5">
                              <CropIcon crop={p.crop} size={22} color={active ? "#fff" : c.inkSoft} />
                              <span className="font-mono" style={{ fontSize: "0.9rem", fontWeight: 800, color: active ? "#fff" : c.ink }}>{p.code}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: c.inkMuted2 }} className="mb-2 block">المهمة</span>
                      <div className="grid grid-cols-5 gap-2">
                        {taskOptions.map((t) => {
                          const Icon = t.icon; const active = wForm.tache === t.key;
                          return (
                            <button key={t.key} onClick={() => setWForm({ ...wForm, tache: t.key })}
                              style={{ background: active ? c.cardGreen : c.bg, border: `2px solid ${active ? c.cardGreen : c.line}`, borderRadius: 14, padding: "14px 2px" }}
                              className="flex flex-col items-center gap-1.5">
                              <Icon size={22} color={active ? "#fff" : c.inkSoft} />
                              <span style={{ fontSize: "0.68rem", fontWeight: 800, color: active ? "#fff" : c.ink }}>{t.key}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: c.inkMuted2 }} className="mb-2 block">نوع الوقت</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setWForm({ ...wForm, type: "ساعات" })} style={{ background: wForm.type === "ساعات" ? c.cardGreen : c.bg, border: `2px solid ${wForm.type === "ساعات" ? c.cardGreen : c.line}`, borderRadius: 14, padding: "14px 4px" }} className="flex flex-col items-center gap-1.5">
                          <Clock size={22} color={wForm.type === "ساعات" ? "#fff" : c.inkSoft} /><span style={{ fontSize: "0.78rem", fontWeight: 800, color: wForm.type === "ساعات" ? "#fff" : c.ink }}>بالساعة</span>
                        </button>
                        <button onClick={() => setWForm({ ...wForm, type: "نهار" })} style={{ background: wForm.type === "نهار" ? c.cardGreen : c.bg, border: `2px solid ${wForm.type === "نهار" ? c.cardGreen : c.line}`, borderRadius: 14, padding: "14px 4px" }} className="flex flex-col items-center gap-1.5">
                          <CalendarClock size={22} color={wForm.type === "نهار" ? "#fff" : c.inkSoft} /><span style={{ fontSize: "0.78rem", fontWeight: 800, color: wForm.type === "نهار" ? "#fff" : c.ink }}>بالنهار</span>
                        </button>
                      </div>
                    </div>
                    {wForm.type === "ساعات" ? (
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="وقت الدخول"><input type="time" value={wForm.dukhul} onChange={(e) => setWForm({ ...wForm, dukhul: e.target.value })} style={{ ...inputStyle, fontSize: "1.1rem", textAlign: "center", padding: "14px 8px" }} /></Field>
                        <Field label="وقت الخروج"><input type="time" value={wForm.khuruj} onChange={(e) => setWForm({ ...wForm, khuruj: e.target.value })} style={{ ...inputStyle, fontSize: "1.1rem", textAlign: "center", padding: "14px 8px" }} /></Field>
                      </div>
                    ) : (
                      <div>
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: c.inkMuted2 }} className="mb-2 block">عدد النهارات</span>
                        <div className="flex items-center justify-center gap-4">
                          <button onClick={() => setWForm({ ...wForm, nahar: Math.max(0.5, Number(wForm.nahar) - 0.5) })} style={{ background: c.bg, borderRadius: 999, width: 44, height: 44, fontSize: "1.4rem", fontWeight: 800, color: c.ink }}>−</button>
                          <span className="font-mono" style={{ fontSize: "1.4rem", fontWeight: 800, minWidth: 50, textAlign: "center" }}>{wForm.nahar}</span>
                          <button onClick={() => setWForm({ ...wForm, nahar: Number(wForm.nahar) + 0.5 })} style={{ background: c.cardGreen, borderRadius: 999, width: 44, height: 44, fontSize: "1.4rem", fontWeight: 800, color: "#fff" }}>+</button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                <div className="grid grid-cols-2 gap-3">
                  {!isWorker && (<Field label="اسم العامل"><input value={wForm.nom} onChange={(e) => setWForm({ ...wForm, nom: e.target.value })} placeholder="اسم العامل" style={inputStyle} /></Field>)}
                  <Field label="القطعة"><select value={wForm.parcelle} onChange={(e) => setWForm({ ...wForm, parcelle: e.target.value })} style={inputStyle}><option value="">اختار</option>{data.parcelles.map((p) => <option key={p.code} value={p.code}>{p.code} — {p.nom}</option>)}</select></Field>
                  <Field label="المهمة"><input value={wForm.tache} onChange={(e) => setWForm({ ...wForm, tache: e.target.value })} placeholder="جني، سقي، تعبئة..." style={inputStyle} /></Field>
                  <Field label="نوع الخلاص"><select value={wForm.type} onChange={(e) => setWForm({ ...wForm, type: e.target.value })} style={inputStyle}><option value="ساعات">بالساعة</option><option value="نهار">بالنهار</option></select></Field>
                  {wForm.type === "ساعات" ? (
                    <>
                      <Field label="وقت الدخول"><input type="time" value={wForm.dukhul} onChange={(e) => setWForm({ ...wForm, dukhul: e.target.value })} style={inputStyle} /></Field>
                      <Field label="وقت الخروج"><input type="time" value={wForm.khuruj} onChange={(e) => setWForm({ ...wForm, khuruj: e.target.value })} style={inputStyle} /></Field>
                    </>
                  ) : (<Field label="عدد النهارات"><input type="number" min="0.5" step="0.5" value={wForm.nahar} onChange={(e) => setWForm({ ...wForm, nahar: e.target.value })} style={inputStyle} /></Field>)}
                  {!isWorker && (<Field label={wForm.type === "ساعات" ? "الأجرة/ساعة (DH)" : "الأجرة/نهار (DH)"}><input type="number" value={wForm.taux} onChange={(e) => setWForm({ ...wForm, taux: e.target.value })} style={inputStyle} /></Field>)}
                  {!isWorker && (<Field label="دورة الخلاص"><select value={wForm.dawra} onChange={(e) => setWForm({ ...wForm, dawra: e.target.value })} style={inputStyle}><option value="15">كل 15 يوم</option><option value="شهر">بالشهر</option></select></Field>)}
                </div>
                )}
                {wForm.type === "ساعات" && (<div className="flex items-center gap-2" style={{ color: c.inkMuted2, fontSize: "0.78rem" }}><Clock size={14} /><span>مجموع الساعات: {hoursBetween(wForm.dukhul, wForm.khuruj)} سا</span></div>)}

                <div style={{ background: c.bg, borderRadius: 12 }} className="p-3 flex items-center gap-3">
                  {!isRecording ? (
                    <button onClick={startRecording} style={{ background: c.danger, borderRadius: 999, width: 40, height: 40 }} className="flex items-center justify-center flex-shrink-0"><Mic size={17} color="#fff" /></button>
                  ) : (
                    <button onClick={stopRecording} style={{ background: c.danger, borderRadius: 999, width: 40, height: 40, animation: "pulse 1.2s infinite" }} className="flex items-center justify-center flex-shrink-0"><Square size={15} color="#fff" fill="#fff" /></button>
                  )}
                  <div className="flex flex-col gap-1 flex-1">
                    <span style={{ fontSize: "0.76rem", fontWeight: 700, color: c.inkSoft }}>{isRecording ? "🔴 كيسجل... كليك باش توقف" : wForm.audioNote ? "✓ ملاحظة صوتية مسجلة" : "ملاحظة صوتية (اختياري) — هضر بالدارجة"}</span>
                    {wForm.audioNote && !isRecording && (
                      <div className="flex items-center gap-2">
                        <audio controls src={wForm.audioNote} style={{ height: 32, maxWidth: 220 }} />
                        <button onClick={() => setWForm({ ...wForm, audioNote: "" })}><Trash2 size={14} color={c.danger} /></button>
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={isWorker ? addMyPointage : addWorker} style={{ background: c.cardGreen, color: "#fff", borderRadius: 11, padding: "11px 0", boxShadow: "0 4px 14px -3px rgba(17,153,107,0.4)", fontWeight: 700, fontSize: "0.85rem" }}>تسجيل البونطاج</button>
              </div>
            )}
            <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)", overflow: "hidden" }}>
              <div className="grid" style={{ gridTemplateColumns: isWorker ? "1.2fr 1.3fr 1.2fr 0.3fr" : "0.9fr 0.5fr 1fr 0.9fr 0.6fr 0.7fr 0.9fr 0.3fr", background: c.bg, fontSize: "0.66rem", color: c.inkMuted2, fontWeight: 700 }}>
                {(isWorker ? ["القطعة", "المهمة", "الوقت / الكمية", ""] : ["العامل", "القطعة", "المهمة", "الوقت / الكمية", "الدورة", "الخلاص", "الحالة", ""]).map((h) => (<div key={h} className="px-2 py-2">{h}</div>))}
              </div>
              {visibleWorkers.map((w) => (
                <React.Fragment key={w.id}>
                <div className="grid items-center" style={{ gridTemplateColumns: isWorker ? "1.2fr 1.3fr 1.2fr 0.3fr" : "0.9fr 0.5fr 1fr 0.9fr 0.6fr 0.7fr 0.9fr 0.3fr", borderTop: `1px solid ${c.line}`, fontSize: "0.78rem" }}>
                  {!isWorker && <div className="px-2 py-2" style={{ fontWeight: 600 }}>{w.nom}</div>}
                  <div className="px-2 py-2 font-mono" style={{ color: c.inkMuted2 }}>{w.parcelle}</div>
                  <div className="px-2 py-2 flex items-center gap-1.5">
                    <span>{w.tache}</span>
                    {w.audioNote && (
                      <button onClick={() => setPlayingAudioId(playingAudioId === w.id ? null : w.id)} style={{ background: "rgba(214,69,80,0.12)", borderRadius: 999, width: 20, height: 20 }} className="flex items-center justify-center flex-shrink-0">
                        <Mic size={11} color={c.danger} />
                      </button>
                    )}
                  </div>
                  <div className="px-2 py-2" style={{ color: c.inkMuted2, fontSize: "0.72rem" }}>{w.type === "ساعات" ? `${w.dukhul}–${w.khuruj} (${w.qte}سا)` : `${w.qte} نهار`}</div>
                  {!isWorker && <div className="px-2 py-2"><span style={{ background: c.bg, borderRadius: 999, padding: "2px 7px", fontSize: "0.65rem", fontWeight: 700, color: c.inkSoft }}>{w.dawra === "15" ? "15 يوم" : "الشهر"}</span></div>}
                  {!isWorker && <div className="px-2 py-2 font-mono" style={{ color: c.cardGreenDeep, fontWeight: 700 }}>{w.qte * w.taux} DH</div>}
                  {!isWorker && (
                    <div className="px-2 py-2">
                      <button onClick={() => toggleStatut(w.id)} style={{ background: w.statut === "مؤدى" ? "rgba(18,167,104,0.12)" : "rgba(240,169,60,0.15)", borderRadius: 999, padding: "3px 8px" }} className="flex items-center gap-1">
                        <CheckCircle2 size={12} color={w.statut === "مؤدى" ? c.cardGreenDeep : c.orange} />
                        <span style={{ fontSize: "0.66rem", fontWeight: 700, color: w.statut === "مؤدى" ? c.cardGreenDeep : c.orange }}>{w.statut}</span>
                      </button>
                    </div>
                  )}
                  <div className="px-2 py-2">{!isWorker && <button onClick={() => removeWorker(w.id)}><Trash2 size={14} color={c.danger} /></button>}</div>
                </div>
                {playingAudioId === w.id && w.audioNote && (
                  <div style={{ borderTop: `1px solid ${c.line}`, background: c.bg }} className="px-3 py-2 flex items-center gap-2">
                    <Mic size={13} color={c.danger} /><audio controls autoPlay src={w.audioNote} style={{ height: 30, maxWidth: 260 }} />
                  </div>
                )}
                </React.Fragment>
              ))}
            </div>
            {!isWorker && <div className="flex justify-end mt-2"><span style={{ fontWeight: 800, fontSize: "0.85rem" }}>مجموع خلاص اليوم: {kpis.totalKhlas} DH</span></div>}
          </div>
        )}

        {tab === "المخزون" && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>مخزون المدخلات</h2>
              {canEdit("المخزون") && <AddButton label="حركة مخزون" open={showAddStock} onClick={() => setShowAddStock(!showAddStock)} />}
            </div>

            {data.stock.filter((s) => s.kammiya <= s.seuil).length > 0 && (
              <div className="flex flex-col gap-2 mb-4">
                {data.stock.filter((s) => s.kammiya <= s.seuil).map((s) => (
                  <div key={s.id} style={{ background: c.white, border: `1px solid ${c.line}`, borderRight: `4px solid ${c.danger}`, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-3 flex items-center gap-3">
                    <AlertTriangle size={17} color={c.danger} />
                    <span style={{ fontSize: "0.82rem", color: c.inkSoft }}>{s.nom} — باقي غير {s.kammiya} {s.wehda} (حد التنبيه {s.seuil}) — خاص تشري</span>
                  </div>
                ))}
              </div>
            )}

            {showAddStock && (
              <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-4 grid grid-cols-3 gap-3">
                <Field label="اسم المنتج"><input list="stockNames" value={sForm.nom} onChange={(e) => setSForm({ ...sForm, nom: e.target.value })} placeholder="مبيد فطريات..." style={inputStyle} />
                  <datalist id="stockNames">{data.stock.map((s) => <option key={s.id} value={s.nom} />)}</datalist>
                </Field>
                <Field label="الفئة"><select value={sForm.categorie} onChange={(e) => setSForm({ ...sForm, categorie: e.target.value })} style={inputStyle}><option>دواء</option><option>سماد</option><option>تعبئة</option><option>أخرى</option></select></Field>
                <Field label="نوع الحركة"><select value={sForm.mouvement} onChange={(e) => setSForm({ ...sForm, mouvement: e.target.value })} style={inputStyle}><option value="دخول">دخول (شراء)</option><option value="خروج">خروج (استعمال)</option></select></Field>
                <Field label="الكمية"><input type="number" value={sForm.kammiya} onChange={(e) => setSForm({ ...sForm, kammiya: e.target.value })} style={inputStyle} /></Field>
                <Field label="الوحدة"><select value={sForm.wehda} onChange={(e) => setSForm({ ...sForm, wehda: e.target.value })} style={inputStyle}><option>كيلو</option><option>لتر</option><option>كيس</option></select></Field>
                <Field label="حد التنبيه (لمنتج جديد)"><input type="number" value={sForm.seuil} onChange={(e) => setSForm({ ...sForm, seuil: e.target.value })} style={inputStyle} /></Field>
                {sForm.mouvement === "دخول" && (
                  <>
                    <Field label="سعر الشراء الإجمالي (DH)"><input type="number" value={sForm.prix} onChange={(e) => setSForm({ ...sForm, prix: e.target.value })} placeholder="اختياري — كيصيفط فاتورة للمحاسب" style={inputStyle} /></Field>
                    <Field label="المورد"><input value={sForm.fournisseur} onChange={(e) => setSForm({ ...sForm, fournisseur: e.target.value })} style={inputStyle} /></Field>
                    <Field label="بون الكوموند المرتبط">
                      <select value={sForm.poNumero} onChange={(e) => setSForm({ ...sForm, poNumero: e.target.value })} style={inputStyle}>
                        <option value="">— بلا بون (كيولي ناقص) —</option>
                        {commandesGlobal.filter((cmd) => (cmd.farmId === currentFarmId || cmd.destFarmId === currentFarmId) && cmd.statut === "تم الطلب").map((cmd) => (<option key={cmd.id} value={cmd.poNumero}>{cmd.poNumero} — {cmd.produit}{cmd.farmId !== currentFarmId ? ` (من ${cmd.farmNom})` : ""}</option>))}
                      </select>
                    </Field>
                    <Field label="صورة/سكان بون التسليم أو الفاتورة">
                      <input type="file" accept="image/*,application/pdf" capture="environment" onChange={handleFactureFile} style={{ ...inputStyle, padding: "6px 8px" }} />
                      {sForm.factureNom && <span style={{ fontSize: "0.68rem", color: c.cardGreenDeep, fontWeight: 700 }}>✓ {sForm.factureNom}</span>}
                    </Field>
                    <div className="col-span-3" style={{ background: "rgba(240,169,60,0.1)", borderRadius: 10, padding: "8px 10px" }}>
                      <span style={{ fontSize: "0.7rem", color: c.inkSoft }}>⚠️ خاص التلاتة: بون الريسيبسيون (كيتولد وحدو) + بون الكوموند + صورة بون التسليم/الفاتورة. إيلا ناقص واحد، غادي يوصل تنبيه للمالك.</span>
                    </div>
                  </>
                )}
                <div className="col-span-3"><button onClick={addStockMovement} style={{ background: c.cardGreen, color: "#fff", borderRadius: 11, padding: "10px 0", fontWeight: 700, width: "100%", boxShadow: "0 4px 14px -3px rgba(17,153,107,0.4)" }}>تسجيل الحركة</button></div>
              </div>
            )}

            <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
              <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr 1fr 1fr 1fr", background: c.bg, fontSize: "0.68rem", color: c.inkMuted2, fontWeight: 700 }}>
                {["المنتج", "الفئة", "الكمية المتوفرة", "حد التنبيه", "الحالة"].map((h) => (<div key={h} className="px-3 py-2">{h}</div>))}
              </div>
              {data.stock.map((s) => {
                const low = s.kammiya <= s.seuil;
                return (
                  <div key={s.id} className="grid items-center" style={{ gridTemplateColumns: "1.6fr 1fr 1fr 1fr 1fr", borderTop: `1px solid ${c.line}`, fontSize: "0.8rem" }}>
                    <div className="px-3 py-2" style={{ fontWeight: 700 }}>{s.nom}</div>
                    <div className="px-3 py-2" style={{ color: c.inkMuted2 }}>{s.categorie}</div>
                    <div className="px-3 py-2 font-mono" style={{ fontWeight: 700, color: low ? c.danger : c.ink }}>{s.kammiya} {s.wehda}</div>
                    <div className="px-3 py-2 font-mono" style={{ color: c.inkMuted2 }}>{s.seuil} {s.wehda}</div>
                    <div className="px-3 py-2">
                      <span style={{ background: low ? "rgba(214,69,80,0.12)" : "rgba(17,153,107,0.12)", color: low ? c.danger : c.cardGreenDeep, borderRadius: 999, padding: "3px 9px", fontSize: "0.68rem", fontWeight: 700 }}>{low ? "منخفض" : "كافي"}</span>
                    </div>
                  </div>
                );
              })}
              {data.stock.length === 0 && <div className="px-3 py-4" style={{ color: c.inkMuted2, fontSize: "0.82rem" }}>ماكاينش منتجات مسجلة فالمخزون</div>}
            </div>
          </div>
        )}

        {tab === "الوزينات" && (() => {
          const uniquePatrons = [...new Set(data.wazin.map((w) => w.patron || w.wazan))];
          const parPatron = uniquePatrons.map((patron) => {
            const lignes = data.wazin.filter((w) => (w.patron || w.wazan) === patron);
            const totalKg = lignes.reduce((s, w) => s + w.kg, 0);
            const totalDH = lignes.reduce((s, w) => s + w.kg * w.prixKg, 0);
            const enAttente = lignes.filter((w) => w.statut === "فالانتظار").reduce((s, w) => s + w.kg * w.prixKg, 0);
            return { patron, wazins: [...new Set(lignes.map((w) => w.wazan))], totalKg, totalDH, enAttente };
          });
          return (
          <div>
            <h2 className="font-display mb-1" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>حسب الباطرون (مجمّع)</h2>
            <p style={{ color: c.inkMuted2, fontSize: "0.72rem" }} className="mb-3">عدة وزينات ممكن يرجعو لنفس الشخص/الشركة — هنا المجموع الحقيقي المستحق ليه</p>
            <div className="flex flex-col gap-2 mb-6">
              {parPatron.map((pp) => (
                <div key={pp.patron} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ fontWeight: 800, fontSize: "0.88rem" }}>{pp.patron}</span>
                    <span className="font-mono" style={{ fontWeight: 800, color: c.cardGreenDeep }}>{pp.totalDH.toLocaleString()} DH</span>
                  </div>
                  <div style={{ fontSize: "0.72rem", color: c.inkMuted2 }} className="flex items-center justify-between">
                    <span>الوزينات: {pp.wazins.join(" · ")} — {pp.totalKg} كلغ</span>
                    {pp.enAttente > 0 && <span style={{ color: c.orange, fontWeight: 700 }}>فالانتظار: {pp.enAttente.toLocaleString()} DH</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mb-3"><h2 className="font-display" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>سجل الوزينات — تفصيل</h2><AddButton label="زيد شحنة" open={showAddWazin} onClick={() => setShowAddWazin(!showAddWazin)} /></div>
            {showAddWazin && (
              <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-4 grid grid-cols-2 gap-3">
                <Field label="القطعة"><select value={zForm.parcelle} onChange={(e) => setZForm({ ...zForm, parcelle: e.target.value })} style={inputStyle}><option value="">اختار</option>{data.parcelles.map((p) => <option key={p.code} value={p.code}>{p.code}</option>)}</select></Field>
                <Field label="الوزان"><input value={zForm.wazan} onChange={(e) => setZForm({ ...zForm, wazan: e.target.value })} placeholder="وزان سيدي بنور..." style={inputStyle} /></Field>
                <Field label="الباطرون (اختياري إيلا كيفرق عن اسم الوزان)">
                  <input list="patronsList" value={zForm.patron} onChange={(e) => setZForm({ ...zForm, patron: e.target.value })} placeholder="مثلا: الحاج مصطفى" style={inputStyle} />
                  <datalist id="patronsList">{uniquePatrons.map((p) => <option key={p} value={p} />)}</datalist>
                </Field>
                <Field label="الكمية (كلغ)"><input type="number" value={zForm.kg} onChange={(e) => setZForm({ ...zForm, kg: e.target.value })} style={inputStyle} /></Field>
                <Field label="السعر/كلغ (DH)"><input type="number" step="0.1" value={zForm.prixKg} onChange={(e) => setZForm({ ...zForm, prixKg: e.target.value })} style={inputStyle} /></Field>
                <Field label="الحالة"><select value={zForm.statut} onChange={(e) => setZForm({ ...zForm, statut: e.target.value })} style={inputStyle}><option>فالانتظار</option><option>مؤدى</option></select></Field>
                <div className="flex items-end"><button onClick={addWazin} style={{ background: c.cardGreen, color: "#fff", borderRadius: 11, padding: "10px 0", boxShadow: "0 4px 14px -3px rgba(17,153,107,0.4)", fontWeight: 700, fontSize: "0.85rem", width: "100%" }}>تسجيل الشحنة</button></div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              {data.wazin.map((w) => (
                <div key={w.id} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-3 flex items-center justify-between">
                  <div className="flex flex-col"><span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{w.wazan}</span><span className="font-mono" style={{ fontSize: "0.7rem", color: c.inkMuted2 }}>{w.patron || w.wazan} · {w.parcelle} · {w.date}</span></div>
                  <div className="flex flex-col items-end"><span className="font-mono" style={{ fontSize: "0.82rem", fontWeight: 700 }}>{w.kg} كلغ · {w.prixKg} DH</span><span style={{ fontSize: "0.7rem", fontWeight: 700, color: w.statut === "مؤدى" ? c.cardGreenDeep : c.orange }}>{w.statut}</span></div>
                </div>
              ))}
            </div>
          </div>
          );
        })()}

        {tab === "الفواتير" && (() => {
          const totalHT = data.invoices.reduce((s, i) => s + i.montantHT, 0);
          const totalTVA = data.invoices.reduce((s, i) => s + i.montantTVA, 0);
          const totalTTC = data.invoices.reduce((s, i) => s + i.montantTTC, 0);
          const mesAchats = canManageFarms ? achatsGlobal.filter((a) => myFarmIds.includes(a.farmId)) : achatsGlobal.filter((a) => a.farmId === currentFarmId);
          const nouveauxAchats = mesAchats.filter((a) => !a.vu);
          const showAchats = canManageFarms || currentUser.role === "Accountant";
          return (
            <div>
              {currentUser.role === "Owner" && alertesIncompletes.length > 0 && (
                <div className="mb-5">
                  <h2 className="font-display mb-2" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>⚠️ عمليات ناقصة — تنبيه للمالك</h2>
                  <div className="flex flex-col gap-2">
                    {alertesIncompletes.map((al) => (
                      <div key={al.id} style={{ background: "rgba(214,69,80,0.08)", border: `1px solid ${c.danger}`, borderRadius: 12 }} className="p-3">
                        <span style={{ fontSize: "0.82rem", color: c.inkSoft }}><b>{al.personne}</b> دخل سلعة (<b>{al.produit}</b>) فـ<b>{al.farmNom}</b> ولكن ماكملش خدمتو — ناقصو: <span style={{ color: c.danger, fontWeight: 700 }}>{al.manque.join(" و ")}</span> · {al.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {showAchats && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="font-display" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>مشتريات المدخلات — كل الفيرمات</h2>
                    {nouveauxAchats.length > 0 && <span style={{ background: "rgba(214,69,80,0.12)", color: c.danger, borderRadius: 999, padding: "3px 10px", fontSize: "0.7rem", fontWeight: 700 }}>{nouveauxAchats.length} جديد</span>}
                  </div>
                  <p style={{ color: c.inkMuted2, fontSize: "0.72rem" }} className="mb-3">توصل هنا مباشرة ملي أي فيرمة تشري دواء/مدخلات — بغض النظر على المدينة</p>
                  <div className="flex flex-col gap-2">
                    {mesAchats.map((a) => (
                      <div key={a.id} style={{ background: c.white, border: `1px solid ${c.line}`, borderRight: `4px solid ${a.vu ? c.cardGreen : c.danger}`, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {a.factureFile && (
                            <a href={a.factureFile} target="_blank" rel="noreferrer" style={{ display: "block", width: 44, height: 44, borderRadius: 8, overflow: "hidden", border: `1px solid ${c.line}`, flexShrink: 0 }}>
                              {a.factureFile.startsWith("data:image") ? (
                                <img src={a.factureFile} alt="فاتورة" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                <div style={{ width: "100%", height: "100%", background: c.bg }} className="flex items-center justify-center"><FileText size={18} color={c.inkMuted2} /></div>
                              )}
                            </a>
                          )}
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span style={{ background: c.bg, borderRadius: 999, padding: "2px 8px", fontSize: "0.66rem", fontWeight: 700, color: c.inkSoft }}>{a.farmNom}</span>
                              <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{a.produit}</span>
                              {a.complet === false && <span style={{ background: "rgba(214,69,80,0.12)", color: c.danger, borderRadius: 999, padding: "2px 8px", fontSize: "0.62rem", fontWeight: 700 }}>ناقص</span>}
                              {a.complet === true && <span style={{ background: "rgba(17,153,107,0.12)", color: c.cardGreenDeep, borderRadius: 999, padding: "2px 8px", fontSize: "0.62rem", fontWeight: 700 }}>مكتمل</span>}
                            </div>
                            <span className="font-mono" style={{ fontSize: "0.7rem", color: c.inkMuted2 }}>{a.kammiya} {a.wehda} · {a.fournisseur} · {a.date} · {a.bonReceptionNumero}{a.poNumero ? ` · ${a.poNumero}` : ""}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono" style={{ fontWeight: 700 }}>{a.prix.toLocaleString()} DH</span>
                          {!a.vu && <button onClick={() => setAchatsGlobal(achatsGlobal.map((x) => x.id === a.id ? { ...x, vu: true } : x))} style={{ background: c.cardGreen, borderRadius: 8, padding: "5px 10px" }}><span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#fff" }}>تمت المراجعة</span></button>}
                        </div>
                      </div>
                    ))}
                    {mesAchats.length === 0 && <p style={{ color: c.inkMuted2, fontSize: "0.82rem" }}>ماكاينش مشتريات دابا</p>}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>الفواتير</h2>
                {canEdit("الفواتير") && <AddButton label="فاتورة جديدة" open={showAddInvoice} onClick={() => setShowAddInvoice(!showAddInvoice)} />}
              </div>

              {showAddInvoice && (
                <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-4 grid grid-cols-3 gap-3">
                  <Field label="الزبون (وزان/عميل)"><input value={invForm.client} onChange={(e) => setInvForm({ ...invForm, client: e.target.value })} style={inputStyle} /></Field>
                  <Field label="المنتج"><select value={invForm.produit} onChange={(e) => setInvForm({ ...invForm, produit: e.target.value })} style={inputStyle}><option value="avocat">أفوكا</option><option value="fraise">فريز</option></select></Field>
                  <Field label="الكمية (كلغ)"><input type="number" value={invForm.qte} onChange={(e) => setInvForm({ ...invForm, qte: e.target.value })} style={inputStyle} /></Field>
                  <Field label="سعر الوحدة (DH)"><input type="number" step="0.1" value={invForm.prixUnitaire} onChange={(e) => setInvForm({ ...invForm, prixUnitaire: e.target.value })} style={inputStyle} /></Field>
                  <Field label="TVA % (تأكد من المحاسب)"><input type="number" value={invForm.tva} onChange={(e) => setInvForm({ ...invForm, tva: e.target.value })} placeholder="0 إذا معفى" style={inputStyle} /></Field>
                  <div className="flex items-end"><button onClick={addInvoice} style={{ background: c.cardGreen, color: "#fff", borderRadius: 11, padding: "9px 0", fontWeight: 700, width: "100%", boxShadow: "0 4px 14px -3px rgba(17,153,107,0.4)" }}>إصدار الفاتورة</button></div>
                </div>
              )}

              <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>ملخص TVA (مبسط)</span>
                  <button onClick={exportTaxSummary} style={{ background: c.bg, borderRadius: 9, padding: "6px 11px" }} className="flex items-center gap-1.5"><Download size={13} color={c.cardGreenDeep} /><span style={{ fontSize: "0.72rem", fontWeight: 700, color: c.cardGreenDeep }}>تصدير</span></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><div style={{ fontSize: "0.68rem", color: c.inkMuted2 }}>مجموع HT</div><div className="font-mono" style={{ fontWeight: 800 }}>{totalHT.toLocaleString()} DH</div></div>
                  <div><div style={{ fontSize: "0.68rem", color: c.inkMuted2 }}>مجموع TVA</div><div className="font-mono" style={{ fontWeight: 800 }}>{totalTVA.toLocaleString()} DH</div></div>
                  <div><div style={{ fontSize: "0.68rem", color: c.inkMuted2 }}>مجموع TTC</div><div className="font-mono" style={{ fontWeight: 800, color: c.cardGreenDeep }}>{totalTTC.toLocaleString()} DH</div></div>
                </div>
                <p style={{ fontSize: "0.68rem", color: c.inkMuted2 }} className="mt-2">⚠️ ملخص داخلي فقط — ماشي تصريح ضريبي رسمي، تأكد دائما من محاسبك المعتمد قبل أي تصريح لدى الإدارة الضريبية.</p>
              </div>

              <div className="flex flex-col gap-2">
                {data.invoices.map((inv) => (
                  <div key={inv.id} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-3 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{inv.client}</span>
                      <span className="font-mono" style={{ fontSize: "0.7rem", color: c.inkMuted2 }}>{inv.numero} · {inv.date} · {inv.produit}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono" style={{ fontWeight: 700 }}>{inv.montantTTC.toLocaleString()} DH</span>
                      <button onClick={() => exportInvoice(inv)}><Download size={16} color={c.cardGreenDeep} /></button>
                    </div>
                  </div>
                ))}
                {data.invoices.length === 0 && <p style={{ color: c.inkMuted2, fontSize: "0.82rem" }}>ماكاينش فواتير مسجلة</p>}
              </div>
            </div>
          );
        })()}

        {tab === "CNSS" && (() => {
          const joursRestants = data.cnss.echeanceJour ? data.cnss.echeanceJour - 20 : null;
          const urgent = joursRestants !== null && joursRestants <= 3;
          const nonAffilies = data.employees.filter((e) => e.affilieCNSS === false);
          return (
            <div>
              <h2 className="font-display mb-4" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>التصاريح الاجتماعية (CNSS)</h2>

              <div style={{ background: data.cnss.declare ? "rgba(17,153,107,0.08)" : urgent ? "rgba(214,69,80,0.08)" : "rgba(240,169,60,0.08)", border: `1px solid ${data.cnss.declare ? c.cardGreen : urgent ? c.danger : c.orange}`, borderRadius: 16 }} className="p-4 mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>تصريح {data.cnss.moisLabel}</span>
                  {data.cnss.declare ? (
                    <span style={{ background: "rgba(17,153,107,0.15)", color: c.cardGreenDeep, borderRadius: 999, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700 }}>✓ تم — {data.cnss.dateDeclare}</span>
                  ) : (
                    <span style={{ background: urgent ? "rgba(214,69,80,0.15)" : "rgba(240,169,60,0.15)", color: urgent ? c.danger : c.orange, borderRadius: 999, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700 }}>
                      {joursRestants === null ? "الأجل ماحددش" : joursRestants < 0 ? `متأخر ${Math.abs(joursRestants)} يوم` : joursRestants === 0 ? "الأجل اليوم" : `باقي ${joursRestants} يوم`}
                    </span>
                  )}
                </div>
                <div className="flex items-end gap-3">
                  <Field label="يوم الأجل الشهري (تأكد منو مع المحاسب/CNSS)">
                    <input type="number" min="1" max="31" value={data.cnss.echeanceJour} onChange={(e) => updateEcheance(e.target.value)} style={{ ...inputStyle, width: 90 }} disabled={!canEdit("CNSS")} />
                  </Field>
                  {!data.cnss.declare && canEdit("CNSS") && (
                    <button onClick={marquerDeclare} style={{ background: c.cardGreen, color: "#fff", borderRadius: 10, padding: "9px 16px", fontWeight: 700, fontSize: "0.8rem", boxShadow: "0 4px 14px -3px rgba(17,153,107,0.4)" }}>تسجيل التصريح كمنجز</button>
                  )}
                </div>
                <p style={{ fontSize: "0.68rem", color: c.inkMuted2 }} className="mt-2">⚠️ هذا تذكير داخلي فقط — تأكد دائما من التاريخ الرسمي الصحيح مع محاسبك أو موقع CNSS.</p>
              </div>

              {nonAffilies.length > 0 && (
                <div style={{ background: "rgba(214,69,80,0.08)", border: `1px solid ${c.danger}`, borderRadius: 14 }} className="p-3 mb-4 flex items-center gap-2">
                  <AlertTriangle size={16} color={c.danger} />
                  <span style={{ fontSize: "0.8rem", color: c.inkSoft }}>{nonAffilies.length} عامل غير مسجلين فـ CNSS — خطر قانوني محتمل</span>
                </div>
              )}

              <div className="flex items-center justify-between mb-2">
                <h3 style={{ fontWeight: 700, fontSize: "0.88rem" }}>جدول التصريح الكامل — كيتبنى وحدو من كل بونطاج</h3>
                <div className="flex items-center gap-2">
                  <button onClick={exportOmageModele} style={{ background: c.blue, color: "#fff", borderRadius: 10, padding: "7px 13px", boxShadow: "0 4px 14px -3px rgba(59,130,196,0.4)" }} className="flex items-center gap-1.5"><Download size={14} /><span style={{ fontSize: "0.78rem", fontWeight: 700 }}>تصدير OMAGE</span></button>
                  <button onClick={exportBDS} style={{ background: c.cardGreen, color: "#fff", borderRadius: 10, padding: "7px 13px", boxShadow: "0 4px 14px -3px rgba(17,153,107,0.4)" }} className="flex items-center gap-1.5"><Download size={14} /><span style={{ fontSize: "0.78rem", fontWeight: 700 }}>جدول عادي</span></button>
                </div>
              </div>
              <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="mb-5">
                <div className="grid" style={{ gridTemplateColumns: "1fr 1.1fr 0.7fr 1.3fr 1fr", background: c.bg, fontSize: "0.66rem", color: c.inkMuted2, fontWeight: 700 }}>
                  {["رقم CNSS", "الاسم", "مسجل", "أيام/ساعات هاد الشهر", "الأجرة (DH)"].map((h) => (<div key={h} className="px-3 py-2">{h}</div>))}
                </div>
                {data.workers.map((w) => { const emp = getEmployee(w.nom); return (
                  <div key={w.id} className="grid items-center" style={{ gridTemplateColumns: "1fr 1.1fr 0.7fr 1.3fr 1fr", borderTop: `1px solid ${c.line}`, fontSize: "0.78rem" }}>
                    <div className="px-3 py-2 font-mono" style={{ color: c.inkMuted2 }}>{emp.cnssNumero || "—"}</div>
                    <div className="px-3 py-2" style={{ fontWeight: 700 }}>{w.nom}</div>
                    <div className="px-3 py-2">{emp.affilieCNSS ? "✓" : <span style={{ color: c.danger }}>✕</span>}</div>
                    <div className="px-3 py-2 font-mono" style={{ color: c.inkMuted2 }}>{w.moisQte} {w.type === "ساعات" ? "سا" : "نهار"}</div>
                    <div className="px-3 py-2 font-mono" style={{ fontWeight: 700, color: c.cardGreenDeep }}>{w.moisQte * w.taux} DH</div>
                  </div>
                );})}
              </div>

              <h3 style={{ fontWeight: 700, fontSize: "0.88rem" }} className="mb-1">ملفات العمال — معلومات ثابتة (كتتعمر أوطوماتيكيا فكل تصدير)</h3>
              <p style={{ color: c.inkMuted2, fontSize: "0.7rem" }} className="mb-2">عمر هاد المعلومات مرة وحدة لكل عامل، وغادي تبقى تتستعمل فكل الأشهر الجاية</p>
              <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, overflow: "auto", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.74rem" }}>
                  <thead>
                    <tr style={{ background: c.bg }}>
                      {["العامل", "الاسم الشخصي", "CIN", "تاريخ الدخول", "الحالة العائلية", "عدد الأولاد", "رقم CNSS", "الحالة"].map((h) => (<th key={h} className="px-2 py-2 text-right" style={{ color: c.inkMuted2, fontSize: "0.66rem" }}>{h}</th>))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.employees.map((e) => (
                      <tr key={e.id} style={{ borderTop: `1px solid ${c.line}` }}>
                        <td className="px-2 py-1.5" style={{ fontWeight: 700 }}>{e.nom}</td>
                        <td className="px-2 py-1.5"><input value={e.prenom} onChange={(ev) => updateEmployee(e.id, { prenom: ev.target.value })} disabled={!canEdit("CNSS")} style={{ ...inputStyle, padding: "4px 6px", width: 100 }} /></td>
                        <td className="px-2 py-1.5"><input value={e.cin} onChange={(ev) => updateEmployee(e.id, { cin: ev.target.value })} disabled={!canEdit("CNSS")} style={{ ...inputStyle, padding: "4px 6px", width: 90 }} /></td>
                        <td className="px-2 py-1.5"><input type="date" value={e.dateEntree} onChange={(ev) => updateEmployee(e.id, { dateEntree: ev.target.value })} disabled={!canEdit("CNSS")} style={{ ...inputStyle, padding: "4px 6px", width: 130 }} /></td>
                        <td className="px-2 py-1.5">
                          <select value={e.situationFamiliale} onChange={(ev) => updateEmployee(e.id, { situationFamiliale: ev.target.value })} disabled={!canEdit("CNSS")} style={{ ...inputStyle, padding: "4px 6px", width: 90 }}>
                            <option value="">—</option><option value="عازب">عازب</option><option value="متزوج">متزوج</option>
                          </select>
                        </td>
                        <td className="px-2 py-1.5"><input type="number" min="0" value={e.nombreEnfants} onChange={(ev) => updateEmployee(e.id, { nombreEnfants: ev.target.value })} disabled={!canEdit("CNSS")} style={{ ...inputStyle, padding: "4px 6px", width: 60 }} /></td>
                        <td className="px-2 py-1.5"><input value={e.cnssNumero} onChange={(ev) => updateEmployee(e.id, { cnssNumero: ev.target.value })} disabled={!canEdit("CNSS")} style={{ ...inputStyle, padding: "4px 6px", width: 100 }} /></td>
                        <td className="px-2 py-1.5">
                          <button onClick={() => canEdit("CNSS") && toggleAffiliation(e.id)} style={{ background: e.affilieCNSS ? "rgba(17,153,107,0.12)" : "rgba(214,69,80,0.12)", borderRadius: 999, padding: "3px 9px" }} className="flex items-center gap-1">
                            <CheckCircle2 size={12} color={e.affilieCNSS ? c.cardGreenDeep : c.danger} />
                            <span style={{ fontSize: "0.66rem", fontWeight: 700, color: e.affilieCNSS ? c.cardGreenDeep : c.danger }}>{e.affilieCNSS ? "مسجل" : "غير مسجل"}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {tab === "التكلفة" && (() => {
          const withPerHa = data.costs.map((cp) => {
            const p = data.parcelles.find((x) => x.code === cp.code);
            const total = cp.dawa + cp.ma + cp.omal;
            const parHa = p && p.ha ? total / p.ha : total;
            return { ...cp, total, parHa };
          });
          const avgParHa = withPerHa.length ? withPerHa.reduce((s, x) => s + x.parHa, 0) / withPerHa.length : 0;
          const anomalies = withPerHa.filter((x) => avgParHa > 0 && x.parHa > avgParHa * 1.4);
          return (
          <div>
            <div className="flex items-center justify-between mb-3"><h2 className="font-display" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>تكلفة القطع — يوليوز 2026</h2>{canEdit("التكلفة") && <AddButton label="زيد تكلفة" open={showAddCost} onClick={() => setShowAddCost(!showAddCost)} />}</div>

            {anomalies.length > 0 && (
              <div className="mb-4 flex flex-col gap-2">
                {anomalies.map((a) => (
                  <div key={a.code} style={{ background: "rgba(214,69,80,0.08)", border: `1px solid ${c.danger}`, borderRadius: 12 }} className="p-3 flex items-center gap-2">
                    <AlertTriangle size={16} color={c.danger} />
                    <span style={{ fontSize: "0.8rem", color: c.inkSoft }}>⚠️ القطعة <b>{a.code} — {parcelleNom(a.code)}</b> تكلفتها للهكتار ({Math.round(a.parHa)} DH) أعلى من المعدل ({Math.round(avgParHa)} DH) بـ{Math.round((a.parHa / avgParHa - 1) * 100)}% — تأكد منها، ممكن غلط ولا سرقة</span>
                  </div>
                ))}
              </div>
            )}

            {showAddCost && (
              <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-4 grid grid-cols-3 gap-3">
                <Field label="القطعة"><select value={cForm.parcelle} onChange={(e) => setCForm({ ...cForm, parcelle: e.target.value })} style={inputStyle}><option value="">اختار</option>{data.parcelles.map((p) => <option key={p.code} value={p.code}>{p.code}</option>)}</select></Field>
                <Field label="النوع"><select value={cForm.naw3} onChange={(e) => setCForm({ ...cForm, naw3: e.target.value })} style={inputStyle}><option>دواء</option><option>ماء</option><option>عمال</option></select></Field>
                <Field label="المبلغ (DH)"><input type="number" value={cForm.mablagh} onChange={(e) => setCForm({ ...cForm, mablagh: e.target.value })} style={inputStyle} /></Field>
                <div className="col-span-3"><button onClick={addCost} style={{ background: c.cardGreen, color: "#fff", borderRadius: 11, padding: "10px 0", boxShadow: "0 4px 14px -3px rgba(17,153,107,0.4)", fontWeight: 700, fontSize: "0.85rem", width: "100%" }}>إضافة للتكلفة</button></div>
              </div>
            )}
            <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)", overflow: "hidden" }}>
              <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr 1fr 1fr 1fr", background: c.bg, fontSize: "0.68rem", color: c.inkMuted2, fontWeight: 700 }}>
                {["القطعة", "دواء", "ماء", "عمال", "المجموع"].map((h) => (<div key={h} className="px-3 py-2">{h}</div>))}
              </div>
              {withPerHa.map((cp) => { const isAnomaly = anomalies.some((a) => a.code === cp.code); return (
                <div key={cp.code} className="grid items-center" style={{ gridTemplateColumns: "1.6fr 1fr 1fr 1fr 1fr", borderTop: `1px solid ${c.line}`, fontSize: "0.8rem" }}>
                  <div className="px-3 py-2 flex items-center gap-2">
                    <span className="font-mono" style={{ color: c.inkMuted2 }}>{cp.code}</span><span>{parcelleNom(cp.code)}</span>
                    {isAnomaly && <AlertTriangle size={13} color={c.danger} />}
                  </div>
                  <div className="px-3 py-2 font-mono">{cp.dawa} DH</div><div className="px-3 py-2 font-mono">{cp.ma} DH</div><div className="px-3 py-2 font-mono">{cp.omal} DH</div>
                  <div className="px-3 py-2 font-mono" style={{ fontWeight: 700, color: isAnomaly ? c.danger : c.cardGreenDeep }}>{cp.total} DH</div>
                </div>
              );})}
            </div>
          </div>
          );
        })()}

        {tab === "المصاريف" && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>المصاريف اليومية بالتفصيل</h2>
              {canEdit("المصاريف") && <AddButton label="زيد مصروف" open={showAddDepense} onClick={() => setShowAddDepense(!showAddDepense)} />}
            </div>

            <div className="flex gap-2 mb-4">
              {[{ l: "اليوم", v: 0 }, { l: "آخر 3 أيام", v: 2 }, { l: "آخر أسبوع", v: 6 }, { l: "الكل", v: 999 }].map((p) => (
                <button key={p.v} onClick={() => setPeriode(p.v)} style={{ background: periode === p.v ? c.cardGreen : c.white, color: periode === p.v ? "#fff" : c.ink, border: `1px solid ${periode === p.v ? c.cardGreen : c.line}`, borderRadius: 10, padding: "7px 12px", fontSize: "0.78rem", fontWeight: 700 }}>{p.l}</button>
              ))}
            </div>

            {showAddDepense && (
              <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-4 grid grid-cols-3 gap-3">
                <Field label="النوع"><select value={dForm.type} onChange={(e) => setDForm({ ...dForm, type: e.target.value })} style={inputStyle}><option>عمال</option><option>دواء</option><option>ماء</option></select></Field>
                <Field label="التفاصيل"><input value={dForm.detail} onChange={(e) => setDForm({ ...dForm, detail: e.target.value })} placeholder="مثلا: أحمد — سقي (A1)" style={inputStyle} /></Field>
                <Field label="المبلغ (DH)"><input type="number" value={dForm.montant} onChange={(e) => setDForm({ ...dForm, montant: e.target.value })} style={inputStyle} /></Field>
                <div className="col-span-3"><button onClick={addDepense} style={{ background: c.cardGreen, color: "#fff", borderRadius: 11, padding: "10px 0", boxShadow: "0 4px 14px -3px rgba(17,153,107,0.4)", fontWeight: 700, width: "100%" }}>تسجيل المصروف</button></div>
              </div>
            )}

            {(() => {
              const filtered = data.depenses.filter((d) => d.dayOffset <= periode);
              const parType = { عمال: 0, دواء: 0, ماء: 0 };
              filtered.forEach((d) => { parType[d.type] = (parType[d.type] || 0) + d.montant; });
              const total = filtered.reduce((s, d) => s + d.montant, 0);
              return (
                <>
                  <div className="grid grid-cols-4 gap-3 mb-5">
                    <div style={{ background: c.cardGreen, borderRadius: 16, padding: "14px 16px", color: "#fff" }}><div style={{ fontSize: "0.68rem", opacity: 0.85 }}>المجموع الكلي</div><div style={{ fontWeight: 800, fontSize: "1.3rem" }}>{total} DH</div></div>
                    <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)", padding: "14px 16px" }}><div style={{ fontSize: "0.68rem", color: c.inkMuted2 }}>عمال</div><div style={{ fontWeight: 800, fontSize: "1.15rem" }}>{parType["عمال"]} DH</div></div>
                    <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)", padding: "14px 16px" }}><div style={{ fontSize: "0.68rem", color: c.inkMuted2 }}>دواء</div><div style={{ fontWeight: 800, fontSize: "1.15rem" }}>{parType["دواء"]} DH</div></div>
                    <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)", padding: "14px 16px" }}><div style={{ fontSize: "0.68rem", color: c.inkMuted2 }}>ماء</div><div style={{ fontWeight: 800, fontSize: "1.15rem" }}>{parType["ماء"]} DH</div></div>
                  </div>

                  {["20 يوليوز", "19 يوليوز", "18 يوليوز"].filter((dl) => filtered.some((d) => d.dateLabel === dl)).map((dl) => (
                    <div key={dl} className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 style={{ fontWeight: 700, fontSize: "0.85rem", color: c.inkSoft }}>{dl}</h3>
                        <span className="font-mono" style={{ fontSize: "0.78rem", fontWeight: 700, color: c.cardGreenDeep }}>{filtered.filter((d) => d.dateLabel === dl).reduce((s, d) => s + d.montant, 0)} DH</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {filtered.filter((d) => d.dateLabel === dl).map((d) => (
                          <div key={d.id} style={{ background: c.white, border: `1px solid ${c.line}`, borderRight: `4px solid ${d.type === "عمال" ? c.blue : d.type === "دواء" ? c.orange : c.cardGreen}`, borderRadius: 12 }} className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span style={{ background: c.bg, borderRadius: 999, padding: "2px 8px", fontSize: "0.65rem", fontWeight: 700, color: c.inkMuted2 }}>{d.type}</span>
                              <span style={{ fontSize: "0.82rem" }}>{d.detail}</span>
                            </div>
                            <span className="font-mono" style={{ fontWeight: 700 }}>{d.montant} DH</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {filtered.length === 0 && <p style={{ color: c.inkMuted2, fontSize: "0.82rem" }}>ماكاينش مصاريف مسجلة فهاد الفترة</p>}
                </>
              );
            })()}
          </div>
        )}

        {tab === "الربحية" && (
          <div>
            <h2 className="font-display mb-1" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>الربحية لكل قطعة</h2>
            <p style={{ color: c.inkMuted2, fontSize: "0.72rem" }} className="mb-4">المدخول (من الوزينات) ناقص التكلفة (دواء + ماء + عمال) = الربح الصافي — هاد الشهر</p>

            <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-5">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={rentabilite} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={c.line} vertical={false} />
                  <XAxis dataKey="code" tick={{ fontSize: 11, fill: c.inkMuted2 }} axisLine={{ stroke: c.line }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: c.inkMuted2 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [`${v} DH`, "الربح"]} labelFormatter={(l) => `القطعة ${l}`} contentStyle={{ borderRadius: 10, border: `1px solid ${c.line}`, fontSize: "0.78rem" }} />
                  <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
                    {rentabilite.map((r, i) => (<Cell key={i} fill={r.profit >= 0 ? c.cardGreen : c.danger} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
              <div className="grid" style={{ gridTemplateColumns: "1.5fr 1fr 1fr 1fr 0.8fr", background: c.bg, fontSize: "0.68rem", color: c.inkMuted2, fontWeight: 700 }}>
                {["القطعة", "المدخول", "التكلفة", "الربح الصافي", "الهامش"].map((h) => (<div key={h} className="px-3 py-2">{h}</div>))}
              </div>
              {rentabilite.map((r) => (
                <div key={r.code} className="grid items-center" style={{ gridTemplateColumns: "1.5fr 1fr 1fr 1fr 0.8fr", borderTop: `1px solid ${c.line}`, fontSize: "0.8rem" }}>
                  <div className="px-3 py-2 flex items-center gap-2"><span className="font-mono" style={{ color: c.inkMuted2 }}>{r.code}</span><span>{r.nom}</span></div>
                  <div className="px-3 py-2 font-mono">{r.revenu.toLocaleString()} DH</div>
                  <div className="px-3 py-2 font-mono">{r.cout.toLocaleString()} DH</div>
                  <div className="px-3 py-2 font-mono" style={{ fontWeight: 700, color: r.profit >= 0 ? c.cardGreenDeep : c.danger }}>{r.profit.toLocaleString()} DH</div>
                  <div className="px-3 py-2" style={{ fontWeight: 700, color: r.marge >= 0 ? c.cardGreenDeep : c.danger }}>{r.marge}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "المحلل الذكي" && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div style={{ background: "rgba(18,167,104,0.12)", borderRadius: 10, padding: 7 }}><Brain size={17} color={c.cardGreenDeep} /></div>
                <h2 className="font-display" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>المحلل الذكي</h2>
              </div>
              <button onClick={() => setAutoSpeak(!autoSpeak)} style={{ background: autoSpeak ? "rgba(18,167,104,0.12)" : c.white, border: `1px solid ${autoSpeak ? c.cardGreen : c.line}`, borderRadius: 999, padding: "5px 11px" }} className="flex items-center gap-1.5">
                <Play size={12} color={autoSpeak ? c.cardGreenDeep : c.inkMuted2} />
                <span style={{ fontSize: "0.68rem", fontWeight: 700, color: autoSpeak ? c.cardGreenDeep : c.inkMuted2 }}>قراءة الجواب صوتيا {autoSpeak ? "✓" : ""}</span>
              </button>
            </div>
            <p style={{ color: c.inkMuted2, fontSize: "0.72rem" }} className="mb-4">كيقرا بيانات الفيرمة الحقيقية (الربحية، التكلفة، المخزون، الوزينات) ويجاوبك بالدارجة — سؤال حر، بالكتابة ولا بالصوت</p>

            <div className="flex gap-2 flex-wrap mb-4">
              {["حلل ليا الربحية هاد الشهر", "فين الخطر الأكبر دابا؟", "شنو خاصني نديرو هاد الأسبوع؟"].map((q) => (
                <button key={q} onClick={() => askAnalyst(q)} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 999, padding: "7px 13px", fontSize: "0.74rem", fontWeight: 600, color: c.inkSoft }}>{q}</button>
              ))}
            </div>

            <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)", minHeight: 260 }} className="p-4 mb-4 flex flex-col gap-3">
              {analystMessages.length === 0 && !analystLoading && (
                <div className="flex flex-col items-center justify-center py-10" style={{ color: c.inkMuted2 }}>
                  <Brain size={28} color={c.inkMuted2} />
                  <p style={{ fontSize: "0.8rem" }} className="mt-2">اسأل المحلل أي سؤال على بيانات الفيرمة ديالك</p>
                </div>
              )}
              {analystMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} items-end gap-1.5`}>
                  {m.role === "assistant" && (
                    <button onClick={() => speakText(m.text)} style={{ background: c.bg, borderRadius: 999, width: 26, height: 26, flexShrink: 0 }} className="flex items-center justify-center">
                      <Play size={11} color={c.cardGreenDeep} />
                    </button>
                  )}
                  <div style={{
                    maxWidth: "85%", padding: "10px 14px", borderRadius: 14, fontSize: "0.84rem", lineHeight: 1.6, whiteSpace: "pre-wrap",
                    background: m.role === "user" ? c.cardGreen : c.bg,
                    color: m.role === "user" ? "#fff" : c.ink,
                  }}>{m.text}</div>
                </div>
              ))}
              {analystLoading && (
                <div className="flex justify-start"><div style={{ background: c.bg, borderRadius: 14, padding: "10px 14px", fontSize: "0.82rem", color: c.inkMuted2 }}>كيحلل...</div></div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => (listening ? stopListening() : startListening())}
                style={{ background: listening ? c.danger : c.white, border: `1px solid ${listening ? c.danger : c.line}`, borderRadius: 11, padding: "11px 13px", animation: listening ? "pulse 1.2s infinite" : "none" }}
              >
                <Mic size={16} color={listening ? "#fff" : c.inkMuted2} />
              </button>
              <input
                value={analystQuestion}
                onChange={(e) => setAnalystQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && askAnalyst(analystQuestion)}
                placeholder={listening ? "كنسمع... هضر دابا" : "اكتب سؤالك هنا ولا كليكي الميكرو..."}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button onClick={() => askAnalyst(analystQuestion)} disabled={analystLoading} style={{ background: c.cardGreen, borderRadius: 11, padding: "11px 16px", boxShadow: "0 4px 14px -3px rgba(17,153,107,0.4)" }}>
                <Send size={16} color="#fff" />
              </button>
            </div>
          </div>
        )}

        {tab === "السجل" && (
          <div>
            <div className="flex items-center justify-between mb-1"><h2 className="font-display" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>خطة المعالجة</h2><AddButton label="زيد معالجة" open={showAddPlan} onClick={() => setShowAddPlan(!showAddPlan)} /></div>
            <p style={{ color: c.inkMuted2, fontSize: "0.72rem" }} className="mb-3">الجرعة/هكتار كتدخلها نتا، والكمية الكلية كتتحسب أوطوماتيكيا</p>
            {showAddPlan && (
              <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-4 grid grid-cols-2 gap-3">
                <Field label="القطعة"><select value={pForm.parcelle} onChange={(e) => setPForm({ ...pForm, parcelle: e.target.value })} style={inputStyle}><option value="">اختار</option>{data.parcelles.map((p) => <option key={p.code} value={p.code}>{p.code} — {p.nom}</option>)}</select></Field>
                <Field label="المنتج"><input value={pForm.produit} onChange={(e) => setPForm({ ...pForm, produit: e.target.value })} style={inputStyle} /></Field>
                <Field label="الجرعة/هكتار"><input type="number" step="0.1" value={pForm.dozParHa} onChange={(e) => setPForm({ ...pForm, dozParHa: e.target.value })} style={inputStyle} /></Field>
                <Field label="الوحدة"><select value={pForm.wehda} onChange={(e) => setPForm({ ...pForm, wehda: e.target.value })} style={inputStyle}><option>لتر</option><option>كيلو</option></select></Field>
                <Field label="التاريخ"><input value={pForm.tarikh} onChange={(e) => setPForm({ ...pForm, tarikh: e.target.value })} placeholder="مثلا 25 يوليوز" style={inputStyle} /></Field>
                <div className="flex items-end"><button onClick={addPlan} style={{ background: c.cardGreen, color: "#fff", borderRadius: 11, padding: "10px 0", boxShadow: "0 4px 14px -3px rgba(17,153,107,0.4)", fontWeight: 700, fontSize: "0.85rem", width: "100%" }}>إضافة للخطة</button></div>
              </div>
            )}
            <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)", overflow: "hidden" }}>
              <div className="grid" style={{ gridTemplateColumns: "1.6fr 0.9fr 1fr 1fr 1.1fr", background: c.bg, fontSize: "0.66rem", color: c.inkMuted2, fontWeight: 700 }}>
                {["القطعة", "المساحة", "المنتج", "الجرعة/هكتار", "الكمية + التاريخ"].map((h) => (<div key={h} className="px-3 py-2">{h}</div>))}
              </div>
              {data.plan.map((k, i) => { const p = data.parcelles.find((p) => p.code === k.code); const kammiya = p ? (p.ha * k.dozParHa).toFixed(1) : "-"; return (
                <div key={i} className="grid items-center" style={{ gridTemplateColumns: "1.6fr 0.9fr 1fr 1fr 1.1fr", borderTop: `1px solid ${c.line}`, fontSize: "0.8rem" }}>
                  <div className="px-3 py-2 flex items-center gap-2"><span className="font-mono" style={{ color: c.inkMuted2 }}>{k.code}</span><span>{parcelleNom(k.code)}</span></div>
                  <div className="px-3 py-2 font-mono" style={{ color: c.inkMuted2 }}>{p ? p.ha : "-"} ه</div>
                  <div className="px-3 py-2">{k.produit}</div>
                  <div className="px-3 py-2 font-mono">{k.dozParHa} {k.wehda}/ه</div>
                  <div className="px-3 py-2 font-mono" style={{ fontWeight: 700, color: c.cardGreenDeep }}>{kammiya} {k.wehda} · {k.tarikh}</div>
                </div>
              );})}
            </div>
          </div>
        )}

        {tab === "الصلاحيات" && currentUser.role === "Owner" && (
          <div>
            <h2 className="font-display mb-1" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>صلاحيات الأدوار</h2>
            <p style={{ color: c.inkMuted2, fontSize: "0.72rem" }} className="mb-4">حدد لكل دور: بلا وصول / عرض فقط / عرض وتعديل — التغيير كيطبق مباشرة</p>
            <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, overflow: "auto", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-3">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.76rem" }}>
                <thead>
                  <tr>
                    <th className="px-2 py-2 text-right" style={{ color: c.inkMuted2, fontSize: "0.68rem" }}>الوحدة</th>
                    {ROLES_LIST.map((r) => (<th key={r} className="px-2 py-2 text-right" style={{ color: c.inkMuted2, fontSize: "0.68rem" }}>{roleLabel[r]}</th>))}
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map((m) => (
                    <tr key={m} style={{ borderTop: `1px solid ${c.line}` }}>
                      <td className="px-2 py-1.5" style={{ fontWeight: 700 }}>{m}</td>
                      {ROLES_LIST.map((r) => (
                        <td key={r} className="px-2 py-1.5">
                          <select
                            value={permMatrix[r][m]}
                            onChange={(e) => setPermMatrix((prev) => ({ ...prev, [r]: { ...prev[r], [m]: e.target.value } }))}
                            style={{ background: c.bg, border: `1px solid ${c.line}`, borderRadius: 7, padding: "4px 6px", fontSize: "0.7rem" }}
                          >
                            <option value="بلا وصول">بلا وصول</option>
                            <option value="عرض فقط">عرض فقط</option>
                            <option value="تعديل">تعديل</option>
                          </select>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

            <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: c.white, borderTop: `1px solid ${c.line}`, boxShadow: "0 -4px 16px rgba(0,0,0,0.05)" }} className="flex overflow-x-auto py-2.5 px-3 gap-4" id="bottomNav">
        {tabs.map((t) => { const Icon = t.icon; const active = tab === t.key; return (
          <button key={t.key} onClick={() => setTab(t.key)} className="flex flex-col items-center gap-1 flex-shrink-0" style={{ scrollSnapAlign: "center" }}>
            <Icon size={19} color={active ? c.cardGreen : c.inkMuted2} /><span style={{ fontSize: "0.62rem", fontWeight: 700, color: active ? c.cardGreen : c.inkMuted2, whiteSpace: "nowrap" }}>{t.key}</span>
          </button>
        );})}
      </nav>
    </div>
  );
}
