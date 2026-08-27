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
  Plus, X, Clock, ShieldCheck, Building2, Receipt, Download, CheckCircle2, TrendingUp, Package, ArrowDownCircle, ArrowUpCircle, ClipboardList, Mail, FileCheck, FileSpreadsheet, Percent, Lock, Mic, Square, Play, CalendarClock, Store, Phone, ArrowRight, Brain, Send, Scissors, SprayCan, Type, Grid3x3, WifiOff, RefreshCw, Search,
} from "lucide-react";

const c = {
  bg: "#FFFBF2", headerGreen: "#21665C", headerGreenLight: "#2A8577", cardGreen: "#2A9D8F", cardGreenLight: "#3DBBA8", cardGreenDeep: "#1F7A6C",
  orange: "#F4A261", orangeLight: "#F7B685", white: "#FFFFFF", ink: "#2E2A24", inkSoft: "#6B5F52",
  inkMuted: "#A79C87", inkMuted2: "#9C9186", line: "#F0E6D2", danger: "#C1594F", blue: "#5C86A8",
};

// ---------- mock users (simulated auth) ----------
const users = [
  { id: 1, nom: "El Hachimi", role: "Owner", farms: ["zm", "atlas"] },
  { id: 2, nom: "Said", role: "Manager", farms: ["zm"] },
  { id: 3, nom: "Youssef", role: "Supervisor", farms: ["zm"] },
  { id: 4, nom: "Khadija", role: "Accountant", farms: ["zm", "atlas"] },
  { id: 5, nom: "Ahmed", role: "Worker", farms: ["zm"] },
];
const roleLabel = { Owner: "Propriétaire", Manager: "Gérant", Supervisor: "Superviseur terrain", Accountant: "Comptable", Worker: "Ouvrier" };
const initMarketplace = [
  { id: 1, farmId: "zm", farmNom: "Zero Manuel", type: "J'offre", produit: "Fongicide (cuivre)", kammiya: 15, wehda: "kilo", prix: 45, description: "Excédent du dernier achat, bonne qualité", contactNom: "El Hachimi", contactTel: "0661-00-00-00", date: "19 juillet" },
  { id: 2, farmId: "atlas", farmNom: "Ferme Atlas", type: "Besoin", produit: "كياس Emballage", kammiya: 300, wehda: "sac", prix: "", description: "Besoin urgent avant la prochaine récolte", contactNom: "Rachid", contactTel: "0662-00-00-00", date: "18 juillet" },
];

const initIncidents = [
  { id: 1, farmNom: "Ferme Ben Abdellah (autre utilisateur)", gps: { lat: 34.95, lng: -6.05 }, produit: "Avocat", probleme: "Acarien rouge", severite: "Moyen", date: "18 juillet" },
  { id: 2, farmNom: "Ferme Tadla (autre utilisateur)", gps: { lat: 32.35, lng: -6.85 }, produit: "Fraise", probleme: "Pourriture grise", severite: "Grave", date: "17 juillet" },
];

function distanceKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const s1 = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(s1), Math.sqrt(1 - s1)));
}

const rolePermissions = {
  Owner: ["Tableau de bord", "Fermes", "Commandes", "Marché", "Parcelles", "Employés", "Stock", "Réceptions", "Factures", "CNSS", "Coûts", "Dépenses", "Rentabilité", "Assistant IA", "Plan de traitement", "Permissions"],
  Manager: ["Tableau de bord", "Fermes", "Commandes", "Marché", "Parcelles", "Employés", "Stock", "Réceptions", "Factures", "CNSS", "Coûts", "Dépenses", "Rentabilité", "Assistant IA", "Plan de traitement"],
  Supervisor: ["Tableau de bord", "Commandes", "Marché", "Parcelles", "Employés", "Stock", "Réceptions"],
  Accountant: ["Tableau de bord", "Réceptions", "Factures", "CNSS", "Coûts", "Dépenses", "Rentabilité", "Assistant IA"],
  Worker: ["Employés"],
};

const MODULES = ["Tableau de bord", "Fermes", "Commandes", "Marché", "Parcelles", "Employés", "Stock", "Réceptions", "Factures", "CNSS", "Coûts", "Dépenses", "Rentabilité", "Assistant IA", "Plan de traitement"];
const ROLES_LIST = ["Owner", "Manager", "Supervisor", "Accountant", "Worker"];

// Fine-grained permissions: which roles can EDIT (add/modify) vs just VIEW each module by default.
// The Owner can adjust this live from the "Permissions" tab.
const defaultEditRights = {
  Owner: ["Tableau de bord", "Fermes", "Commandes", "Marché", "Parcelles", "Employés", "Stock", "Réceptions", "Factures", "CNSS", "Coûts", "Dépenses", "Assistant IA", "Plan de traitement"],
  Manager: ["Fermes", "Commandes", "Marché", "Parcelles", "Employés", "Stock", "Réceptions", "Factures", "CNSS", "Coûts", "Dépenses", "Assistant IA", "Plan de traitement"],
  Supervisor: ["Commandes", "Marché", "Employés", "Stock", "Réceptions"],
  Accountant: ["Factures", "CNSS", "Assistant IA"],
  Worker: ["Employés"],
};

function buildPermMatrixInit() {
  const matrix = {};
  ROLES_LIST.forEach((role) => {
    matrix[role] = {};
    MODULES.forEach((m) => {
      if (!rolePermissions[role].includes(m)) matrix[role][m] = "Sans accès";
      else if (defaultEditRights[role].includes(m)) matrix[role][m] = "Modification";
      else matrix[role][m] = "Lecture seule";
    });
  });
  return matrix;
}

const initDepenses = [
  { id: 1, dayOffset: 0, dateLabel: "20 juillet", type: "Main-d'œuvre", detail: "Ahmed — Irrigation (parcelle A1)", montant: 120 },
  { id: 2, dayOffset: 0, dateLabel: "20 juillet", type: "Main-d'œuvre", detail: "محمد — parcelles الربيع (parcelle A2)", montant: 150 },
  { id: 3, dayOffset: 0, dateLabel: "20 juillet", type: "Main-d'œuvre", detail: "Hassan — avance en espèces", montant: 300 },
  { id: 4, dayOffset: 0, dateLabel: "20 juillet", type: "Produit phyto", detail: "Fongicide (cuivre) — parcelle A2", montant: 450 },
  { id: 5, dayOffset: 1, dateLabel: "19 juillet", type: "Main-d'œuvre", detail: "Fatima — Récolte (parcelle S1)", montant: 90 },
  { id: 6, dayOffset: 1, dateLabel: "19 juillet", type: "Produit phyto", detail: "Insecticide cochenille — parcelle S2", montant: 600 },
  { id: 7, dayOffset: 1, dateLabel: "19 juillet", type: "Eau", detail: "Irrigation par pompage — parcelle A3", montant: 80 },
  { id: 8, dayOffset: 2, dateLabel: "18 juillet", type: "Main-d'œuvre", detail: "Youssef — Pulvérisation ومعالجة (parcelle A2)", montant: 120 },
  { id: 9, dayOffset: 2, dateLabel: "18 juillet", type: "Produit phyto", detail: "Fertilisation ورقي — parcelle A3", montant: 350 },
];

const initStock = [
  { id: 1, nom: "Fongicide (cuivre)", categorie: "Produit phyto", kammiya: 45, wehda: "kilo", seuil: 20 },
  { id: 2, nom: "Insecticide cochenille", categorie: "Produit phyto", kammiya: 12, wehda: "litre", seuil: 15 },
  { id: 3, nom: "Fertilisation ورقي NPK", categorie: "Engrais", kammiya: 80, wehda: "kilo", seuil: 30 },
  { id: 4, nom: "كياس Emballage", categorie: "Emballage", kammiya: 300, wehda: "sac", seuil: 100 },
  { id: 5, nom: "Acaricide", categorie: "Produit phyto", kammiya: 6, wehda: "litre", seuil: 10 },
];

const initCommandesGlobal = [
  { id: 1, farmId: "zm", farmNom: "Zero Manuel", demandePar: "Youssef", produit: "Insecticide cochenille", qte: 20, wehda: "litre", motif: "Stock وصل تحت الحد", date: "20 juillet", statut: "Nouveau", fournisseur: "", fournisseurEmail: "", prix: "", poNumero: "" },
  { id: 2, farmId: "atlas", farmNom: "Ferme Atlas", demandePar: "Rachid", produit: "كياس Emballage", qte: 500, wehda: "sac", motif: "Préparation de la saison de récolte", date: "19 juillet", statut: "Commandé", fournisseur: "مؤسسة d'emballage moderne", fournisseurEmail: "contact@packaging-example.ma", prix: "1500", poNumero: "PO-0619" },
];

const initInvoices = [
  { id: 1, numero: "FAC-0619", date: "19 juillet", client: "Pesée Sidi Bennour", produit: "Avocat", qte: 640, prixUnitaire: 6.2, tva: 0, montantHT: 3968, montantTVA: 0, montantTTC: 3968 },
];

const initAchatsGlobal = [
  { id: 1, farmId: "atlas", farmNom: "Ferme Atlas", produit: "Fongicide", kammiya: 10, wehda: "litre", prix: 1200, fournisseur: "Agro Ferme", date: "19 juillet", vu: true },
];

// ---------- farm datasets ----------
const farmsInit = {
  zm: {
    nom: "Zero Manuel",
    gps: { lat: 34.9200, lng: -6.1000 },
    parcelles: [
      { code: "A1", crop: "avocat", nom: "Avocat - حاس", ha: 3.2, statut: "ok", irrigation: "Aujourd'hui 06:00", recolte: 20, dernierTraitement: "12 juillet", secu: 0 },
      { code: "A2", crop: "avocat", nom: "Avocat - وسط", ha: 2.8, statut: "attention", irrigation: "Demain 06:00", recolte: 55, dernierTraitement: "17 juillet", secu: 2 },
      { code: "A3", crop: "avocat", nom: "Avocat - جنوب", ha: 4.0, statut: "ok", irrigation: "Aujourd'hui 18:00", recolte: 10, dernierTraitement: "10 juillet", secu: 0 },
      { code: "A4", crop: "avocat", nom: "Avocat - Nouvelle", ha: 1.6, statut: "recolte", irrigation: "Aujourd'hui 06:00", recolte: 92, dernierTraitement: "05 juillet", secu: 0 },
      { code: "S1", crop: "fraise", nom: "Fraise - نفق 1", ha: 0.8, statut: "recolte", irrigation: "Aujourd'hui 05:30", recolte: 88, dernierTraitement: "18 juillet", secu: 1 },
      { code: "S2", crop: "fraise", nom: "Fraise - نفق 2", ha: 0.8, statut: "alerte", irrigation: "En retard", recolte: 40, dernierTraitement: "19 juillet", secu: 4 },
    ],
    workers: [
      { id: 1, nom: "Ahmed", parcelle: "A4", tache: "Récolte", type: "Heures", dukhul: "06:00", khuruj: "14:00", qte: 8, taux: 15, moisQte: 96, dawra: "15", statut: "Payé", affilieCNSS: true, cnssNumero: "AF-10234" },
      { id: 2, nom: "Fatima", parcelle: "S1", tache: "Récolte", type: "Heures", dukhul: "06:00", khuruj: "12:00", qte: 6, taux: 15, moisQte: 84, dawra: "15", statut: "Non payé", affilieCNSS: true, cnssNumero: "AF-10235" },
      { id: 3, nom: "Youssef", parcelle: "A2", tache: "Pulvérisation ومعالجة", type: "Jour", dukhul: "-", khuruj: "-", qte: 1, taux: 120, moisQte: 18, dawra: "Mois", statut: "Non payé", affilieCNSS: false, cnssNumero: "" },
    ],
    wazin: [
      { id: 1, date: "19 juillet", parcelle: "A4", wazan: "Pesée Sidi Bennour", patron: "Haj Mustapha", kg: 640, prixKg: 6.2, statut: "Payé" },
      { id: 2, date: "19 juillet", parcelle: "S1", wazan: "Pesée El Jadida", patron: "Haj Mustapha", kg: 310, prixKg: 9.5, statut: "En attente" },
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
      { code: "A2", produit: "Fongicide (cuivre)", dozParHa: 3, wehda: "kilo", tarikh: "22 juillet" },
      { code: "S2", produit: "Fongicide", dozParHa: 2.5, wehda: "litre", tarikh: "26 juillet" },
    ],
    depenses: initDepenses,
    stock: initStock,
    invoices: initInvoices,
    cnss: { echeanceJour: 10, moisLabel: "Juillet 2026", declare: false, dateDeclare: "" },
    employees: [
      { id: 1, nom: "Ahmed", prenom: "", cin: "", dateEntree: "", situationFamiliale: "", nombreEnfants: "", cnssNumero: "AF-10234", affilieCNSS: true },
      { id: 2, nom: "Fatima", prenom: "", cin: "", dateEntree: "", situationFamiliale: "", nombreEnfants: "", cnssNumero: "AF-10235", affilieCNSS: true },
      { id: 3, nom: "Youssef", prenom: "", cin: "", dateEntree: "", situationFamiliale: "", nombreEnfants: "", cnssNumero: "", affilieCNSS: false },
    ],
  },
  atlas: {
    nom: "Ferme Atlas",
    gps: { lat: 32.2833, lng: -6.9000 },
    parcelles: [
      { code: "B1", crop: "avocat", nom: "Avocat - الربوة", ha: 2.0, statut: "ok", irrigation: "Aujourd'hui 07:00", recolte: 35, dernierTraitement: "14 juillet", secu: 0 },
      { code: "B2", crop: "fraise", nom: "Fraise - القبة", ha: 1.1, statut: "recolte", irrigation: "Aujourd'hui 06:00", recolte: 80, dernierTraitement: "16 juillet", secu: 0 },
    ],
    workers: [
      { id: 1, nom: "Rachid", parcelle: "B1", tache: "Irrigation", type: "Jour", dukhul: "-", khuruj: "-", qte: 1, taux: 100, moisQte: 22, dawra: "Mois", statut: "Payé", affilieCNSS: true, cnssNumero: "AF-20011" },
      { id: 2, nom: "Salma", parcelle: "B2", tache: "Récolte", type: "Heures", dukhul: "06:00", khuruj: "11:00", qte: 5, taux: 15, moisQte: 60, dawra: "15", statut: "Non payé", affilieCNSS: false, cnssNumero: "" },
    ],
    wazin: [{ id: 1, date: "19 juillet", parcelle: "B2", wazan: "Pesée Tadla", patron: "Société Tadla Fruits", kg: 210, prixKg: 8.8, statut: "Payé" }],
    costs: [{ code: "B1", dawa: 400, ma: 300, omal: 400 }, { code: "B2", dawa: 650, ma: 250, omal: 500 }],
    plan: [{ code: "B1", produit: "Fertilisation ورقي", dozParHa: 1.5, wehda: "litre", tarikh: "27 juillet" }],
    depenses: [],
    stock: [],
    invoices: [],
    cnss: { echeanceJour: 10, moisLabel: "Juillet 2026", declare: true, dateDeclare: "05 juillet" },
    employees: [
      { id: 1, nom: "Rachid", prenom: "", cin: "", dateEntree: "", situationFamiliale: "", nombreEnfants: "", cnssNumero: "AF-20011", affilieCNSS: true },
      { id: 2, nom: "Salma", prenom: "", cin: "", dateEntree: "", situationFamiliale: "", nombreEnfants: "", cnssNumero: "", affilieCNSS: false },
    ],
  },
};

const statutColor = { ok: c.cardGreen, attention: c.orange, recolte: c.blue, alerte: c.danger };
function ZMLogo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="zmLogoGrad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3DBBA8" />
          <stop offset="100%" stopColor="#21665C" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="24" fill="url(#zmLogoGrad)" />
      <path d="M24 35c-7-2-11.5-8.5-10.5-17 8 0 14.5 4.5 17 11.5 1 3 0.5 5.5-1 7-2.5-6-7-9.5-12.5-11 3.5 2.5 6 6 7 9.5z" fill="#FFFBF2" />
      <circle cx="33.5" cy="14.5" r="3.2" fill="#F4A261" style={{ transformOrigin: "33.5px 14.5px", animation: "dotPop 0.9s ease 0.5s both" }} />
    </svg>
  );
}
const taskOptions = [
  { key: "Irrigation", icon: Droplets },
  { key: "Récolte", icon: Scissors },
  { key: "Pulvérisation", icon: SprayCan },
  { key: "Fertilisation", icon: Sprout },
  { key: "Emballage", icon: Package },
];
const statutLabel = { ok: "Normal", attention: "À surveiller", recolte: "Prêt à récolter", alerte: "Alerte" };
const alertes = [
  { icon: AlertTriangle, texte: "S2 — Traitement le 19 juillet, respecter le délai de sécurité avant récolte" },
  { icon: ThermometerSun, texte: "موجة حر متوقعة الخميس — augmentez l'irrigation" },
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

function FicheEmployeModal({ employe, equipes, onClose, onSave }) {
  const [tab, setTab] = useState("perso");
  const [form, setForm] = useState(employe);
  const [historique, setHistorique] = useState([]);
  const c2 = c;
  useEffect(() => {
    if (tab === "historique" && employe.id) {
      supabase.from("bulletins_paie").select("*, cycle:cycle_id(periode_debut, periode_fin, statut)").eq("employee_id", employe.id).order("created_at", { ascending: false })
        .then(({ data: rows }) => setHistorique(rows || []));
    }
  }, [tab, employe.id]);
  const field = (label, key, type = "text", extra = {}) => (
    <Field label={label}><input type={type} value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} style={inputStyle} {...extra} /></Field>
  );
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50 }} className="flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: c2.white, borderRadius: 20, width: "100%", maxWidth: 640, maxHeight: "88vh", overflowY: "auto" }} className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display" style={{ fontWeight: 800, fontSize: "1.1rem", color: c2.ink }}>Fiche employé — {employe.nom}</h2>
          <button onClick={onClose}><X size={20} color={c2.inkMuted2} /></button>
        </div>
        <div className="flex gap-2 mb-4 flex-wrap">
          {[["perso", "Infos personnelles"], ["pro", "Infos professionnelles"], ["salaire", "Infos salariales"], ["docs", "Documents"], ["historique", "Historique"]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ background: tab === k ? c2.cardGreen : c2.bg, color: tab === k ? "#fff" : c2.ink, borderRadius: 999, padding: "7px 14px", fontSize: "0.78rem", fontWeight: 700 }}>{l}</button>
          ))}
        </div>

        {tab === "perso" && (
          <div className="grid grid-cols-2 gap-3">
            {field("Matricule", "matricule")}
            {field("Nom", "nom")}
            {field("Prénom", "prenom")}
            {field("CIN", "cin")}
            {field("Téléphone", "telephone")}
            {field("Adresse", "adresse")}
            {field("Date de naissance", "dateNaissance", "date")}
            {field("URL Photo (اختياري)", "photoUrl")}
          </div>
        )}
        {tab === "pro" && (
          <div className="grid grid-cols-2 gap-3">
            {field("Poste", "poste")}
            <Field label="Type de contrat">
              <select value={form.typeContrat || ""} onChange={(e) => setForm({ ...form, typeContrat: e.target.value })} style={inputStyle}>
                <option value="">—</option><option value="CDI">CDI</option><option value="CDD">CDD</option><option value="Saisonnier">Saisonnier</option><option value="Journalier">Journalier</option>
              </select>
            </Field>
            {field("Date d'entrée", "dateEntree", "date")}
            {field("Date de sortie", "dateSortie", "date")}
            <Field label="Équipe">
              <select value={form.equipeId || ""} onChange={(e) => setForm({ ...form, equipeId: e.target.value })} style={inputStyle}>
                <option value="">—</option>
                {equipes.map((eq) => (<option key={eq.id} value={eq.id}>{eq.nom}</option>))}
              </select>
            </Field>
            {field("Responsable", "responsable")}
            <Field label="Statut">
              <select value={form.statut || "actif"} onChange={(e) => setForm({ ...form, statut: e.target.value })} style={inputStyle}>
                <option value="actif">Actif</option><option value="inactif">Inactif</option><option value="suspendu">Suspendu</option>
              </select>
            </Field>
            {field("Situation familiale", "situationFamiliale")}
            {field("Nombre d'enfants", "nombreEnfants", "number")}
          </div>
        )}
        {tab === "salaire" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type de salaire">
              <select value={form.typeSalaire || "journalier"} onChange={(e) => setForm({ ...form, typeSalaire: e.target.value })} style={inputStyle}>
                <option value="journalier">Journalier</option><option value="horaire">Horaire</option><option value="mensuel">Mensuel</option>
                <option value="tache">À la tâche</option><option value="production">À la production</option><option value="mixte">Mixte</option>
              </select>
            </Field>
            {field("Salaire journalier (DH)", "salaireJournalier", "number")}
            {field("Salaire horaire (DH)", "salaireHoraire", "number")}
            {field("Salaire mensuel (DH)", "salaireMensuel", "number")}
            {field("N° CNSS", "cnssNumero")}
            <Field label="Affilié CNSS">
              <select value={form.affilieCNSS ? "oui" : "non"} onChange={(e) => setForm({ ...form, affilieCNSS: e.target.value === "oui" })} style={inputStyle}>
                <option value="non">Non</option><option value="oui">Oui</option>
              </select>
            </Field>
            {field("RIB", "rib")}
          </div>
        )}
        {tab === "docs" && (
          <div className="grid grid-cols-1 gap-3">
            {field("URL document CIN", "docCinUrl")}
            {field("URL contrat de travail", "docContratUrl")}
            {field("URL attestation CNSS", "docCnssUrl")}
            <p style={{ fontSize: "0.7rem", color: c2.inkMuted2 }}>ملصق روابط الملفات دابا (رفع الملفات مباشرة غادي يتزاد فمرحلة قادمة مع Supabase Storage)</p>
          </div>
        )}
        {tab === "historique" && (
          <div className="flex flex-col gap-2">
            {historique.map((h) => (
              <div key={h.id} style={{ background: c2.bg, borderRadius: 12 }} className="p-3">
                <div className="flex items-center justify-between">
                  <span style={{ fontWeight: 700, fontSize: "0.82rem" }}>{h.cycle ? `${h.cycle.periode_debut} → ${h.cycle.periode_fin}` : "—"}</span>
                  <span style={{ fontSize: "0.68rem", color: c2.inkMuted2 }}>{h.cycle ? h.cycle.statut : ""}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-1.5" style={{ fontSize: "0.74rem" }}>
                  <span>Brut : {Number(h.total_brut).toFixed(0)} DH</span>
                  <span style={{ color: c2.danger }}>Déd. : -{Number(h.total_deductions).toFixed(0)} DH</span>
                  <span style={{ fontWeight: 800, color: c2.cardGreenDeep }}>Net : {Number(h.net_a_payer).toFixed(0)} DH</span>
                </div>
              </div>
            ))}
            {historique.length === 0 && <p style={{ color: c2.inkMuted2, fontSize: "0.8rem" }}>Aucun historique de paie pour cet employé</p>}
          </div>
        )}

        <button onClick={() => onSave(form)} style={{ background: c2.cardGreen, color: "#fff", borderRadius: 11, padding: "11px 0", fontWeight: 700, width: "100%", marginTop: 20, boxShadow: "0 4px 14px -3px rgba(42,157,143,0.4)" }}>Enregistrer la fiche</button>
      </div>
    </div>
  );
}

function BulletinPDF({ bulletin, farmNom, cycle, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50 }} className="flex items-center justify-center p-4">
      <style>{`@media print { body * { visibility: hidden; } #bulletin-print, #bulletin-print * { visibility: visible; } #bulletin-print { position: fixed; inset: 0; } .no-print { display: none !important; } }`}</style>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }} className="p-6">
        <div id="bulletin-print">
          <div className="flex items-center justify-between mb-5" style={{ borderBottom: "2px solid #2A9D8F", paddingBottom: 12 }}>
            <div><div style={{ fontWeight: 800, fontSize: "1.1rem" }}>{farmNom}</div><div style={{ fontSize: "0.72rem", color: "#888" }}>Bulletin de paie</div></div>
            <div style={{ textAlign: "left", fontSize: "0.74rem", color: "#666" }}>Période : {cycle ? `${cycle.periodeDebut} → ${cycle.periodeFin}` : "—"}</div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4" style={{ fontSize: "0.82rem" }}>
            <div><b>Employé :</b> {bulletin.nomEmploye}</div>
            <div><b>Jours travaillés :</b> {bulletin.jours || 0}</div>
            <div><b>Heures travaillées :</b> {bulletin.heures || 0}</div>
            <div><b>Date de paiement :</b> {cycle ? (cycle.datePaiement || "—") : "—"}</div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead><tr style={{ background: "#F5F5F5" }}><th style={{ textAlign: "right", padding: 6 }}>Rubrique</th><th style={{ textAlign: "left", padding: 6 }}>Montant</th></tr></thead>
            <tbody>
              {bulletin.gainsDetail.map((g, i) => (<tr key={"g" + i} style={{ borderBottom: "1px solid #eee" }}><td style={{ padding: 6 }}>{g.explication}</td><td style={{ padding: 6, fontFamily: "monospace" }}>{g.montant.toFixed(2)} DH</td></tr>))}
              {bulletin.deductionsDetail.map((d, i) => (<tr key={"d" + i} style={{ borderBottom: "1px solid #eee", color: "#C1594F" }}><td style={{ padding: 6 }}>{d.explication}</td><td style={{ padding: 6, fontFamily: "monospace" }}>-{d.montant.toFixed(2)} DH</td></tr>))}
            </tbody>
          </table>
          <div className="flex justify-between mt-4" style={{ fontSize: "0.85rem" }}><span>Total brut</span><span style={{ fontFamily: "monospace" }}>{bulletin.totalBrut.toFixed(2)} DH</span></div>
          <div className="flex justify-between" style={{ fontSize: "0.85rem", color: "#C1594F" }}><span>Total déductions</span><span style={{ fontFamily: "monospace" }}>-{bulletin.totalDeductions.toFixed(2)} DH</span></div>
          <div className="flex justify-between mt-2 pt-2" style={{ borderTop: "2px solid #2A9D8F", fontWeight: 800, fontSize: "1rem" }}><span>Net à payer</span><span style={{ fontFamily: "monospace", color: "#1F7A6C" }}>{bulletin.netAPayer.toFixed(2)} DH</span></div>
        </div>
        <div className="no-print flex gap-2 mt-5">
          <button onClick={() => window.print()} style={{ background: "#2A9D8F", color: "#fff", borderRadius: 10, padding: "10px 0", fontWeight: 700, flex: 1 }}>Imprimer / Enregistrer PDF</button>
          <button onClick={onClose} style={{ background: "#eee", color: "#333", borderRadius: 10, padding: "10px 16px", fontWeight: 700 }}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

function QualiteModal({ lot, form, setForm, onSave, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50 }} className="flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 460, maxHeight: "88vh", overflowY: "auto" }} className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div><div style={{ fontWeight: 800, fontSize: "1rem" }}>Contrôle qualité</div><div className="font-mono" style={{ fontSize: "0.72rem", color: "#888" }}>{lot.code}</div></div>
          <button onClick={onClose}><X size={20} color="#888" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Brix"><input type="number" value={form.brix} onChange={(e) => setForm({ ...form, brix: e.target.value })} style={inputStyle} /></Field>
          <Field label="pH"><input type="number" value={form.ph} onChange={(e) => setForm({ ...form, ph: e.target.value })} style={inputStyle} /></Field>
          <Field label="Taille"><input value={form.taille} onChange={(e) => setForm({ ...form, taille: e.target.value })} style={inputStyle} /></Field>
          <Field label="Couleur"><input value={form.couleur} onChange={(e) => setForm({ ...form, couleur: e.target.value })} style={inputStyle} /></Field>
          <Field label="Fermeté"><input value={form.fermete} onChange={(e) => setForm({ ...form, fermete: e.target.value })} style={inputStyle} /></Field>
          <Field label="Température (°C)"><input type="number" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} style={inputStyle} /></Field>
          <Field label="Défauts (%)"><input type="number" value={form.defautsPct} onChange={(e) => setForm({ ...form, defautsPct: e.target.value })} style={inputStyle} /></Field>
          <Field label="Moisissure (%)"><input type="number" value={form.moisissurePct} onChange={(e) => setForm({ ...form, moisissurePct: e.target.value })} style={inputStyle} /></Field>
          <Field label="Dommages (%)"><input type="number" value={form.dommagesPct} onChange={(e) => setForm({ ...form, dommagesPct: e.target.value })} style={inputStyle} /></Field>
          <Field label="Grade"><select value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} style={inputStyle}><option value="A">A</option><option value="B">B</option><option value="C">C</option></select></Field>
        </div>
        <p style={{ fontSize: "0.68rem", color: "#999" }} className="mt-2">Moisissure &gt;5% ou Défauts &gt;10% = rejet automatique. Entre 3-5% / 5-10% = accepté sous condition.</p>
        <button onClick={onSave} style={{ background: "#2A9D8F", color: "#fff", borderRadius: 11, padding: "11px 0", fontWeight: 700, width: "100%", marginTop: 16 }}>Enregistrer le contrôle</button>
      </div>
    </div>
  );
}

function LotTraceModal({ lot, parcelle, culture, seasonNom, farmNom, coolerNom, dernierControle, palette, expedition, onClose }) {
  const etapes = [
    { icon: "🌱", titre: "Culture", detail: culture ? `${culture.nom}${culture.variete ? " — " + culture.variete : ""}` : "—" },
    { icon: "📍", titre: "Ferme / Parcelle", detail: `${farmNom} — ${parcelle ? parcelle.code + " (" + parcelle.nom + ")" : "—"}` },
    { icon: "📅", titre: "Saison", detail: seasonNom || "—" },
    { icon: "🌾", titre: "Récolte", detail: `${lot.dateRecolte}${lot.heureRecolte ? " " + lot.heureRecolte : ""} — ${lot.quantiteKg} kg` },
    { icon: "🔬", titre: "Qualité", detail: dernierControle ? `${dernierControle.statut} — Grade ${dernierControle.grade || lot.grade}` : `Grade ${lot.grade} (pas encore contrôlé)` },
    { icon: "❄️", titre: "Cooling", detail: coolerNom ? `${coolerNom}${lot.heureDebutRefroidissement ? " — depuis " + new Date(lot.heureDebutRefroidissement).toLocaleString("fr-FR") : ""}` : "Pas encore assigné" },
    { icon: "📦", titre: "Palette", detail: palette ? `${palette.code} — ${palette.poidsKg} kg` : "Pas encore mis en palette" },
    { icon: "🚚", titre: "Expédition", detail: expedition ? `${expedition.code} — ${expedition.client} (${expedition.destination || "—"})` : "Pas encore expédié" },
    { icon: "✅", titre: "Statut actuel", detail: lot.statut },
  ];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50 }} className="flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto" }} className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div><div className="font-mono" style={{ fontWeight: 800, fontSize: "1rem" }}>{lot.code}</div><div style={{ fontSize: "0.72rem", color: "#888" }}>Traçabilité complète</div></div>
          <button onClick={onClose}><X size={20} color="#888" /></button>
        </div>
        <div style={{ position: "relative", paddingRight: 24 }}>
          <div style={{ position: "absolute", right: 11, top: 6, bottom: 6, width: 2, background: "linear-gradient(180deg, #2A9D8F, #F4A261)" }} />
          {etapes.map((e, i) => (
            <div key={i} style={{ position: "relative" }} className="pb-5">
              <div style={{ position: "absolute", right: -1, top: 0, width: 24, height: 24, borderRadius: "50%", background: "#fff", border: "2px solid #2A9D8F" }} className="flex items-center justify-center">
                <span style={{ fontSize: "11px" }}>{e.icon}</span>
              </div>
              <div style={{ marginRight: 34 }}>
                <div style={{ fontWeight: 700, fontSize: "0.82rem" }}>{e.titre}</div>
                <div style={{ fontSize: "0.76rem", color: "#666" }}>{e.detail}</div>
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: "0.68rem", color: "#999", marginTop: 10 }}>Traçabilité complète de la culture jusqu'à l'expédition.</p>
      </div>
    </div>
  );
}

function LockedFeature({ nom }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div style={{ background: "rgba(244,162,97,0.15)", borderRadius: 999, width: 64, height: 64 }} className="flex items-center justify-center mb-4">
        <Lock size={26} color="#F4A261" />
      </div>
      <h3 style={{ fontWeight: 800, fontSize: "1rem" }} className="mb-1.5">{nom} — fonctionnalité non activée</h3>
      <p style={{ color: "#9C9186", fontSize: "0.82rem", maxWidth: 320 }}>Ce module fait partie de Zero Manuel mais n'a pas encore été activé sur votre compte. Contactez votre fournisseur pour l'activer.</p>
    </div>
  );
}

function AddButton({ label, open, onClick }) {
  return (
    <button onClick={onClick} style={{ background: open ? c.line : c.cardGreen, color: open ? c.ink : "#fff", borderRadius: 11, padding: "9px 15px", boxShadow: open ? "none" : "0 4px 12px -3px rgba(42,157,143,0.4)" }} className="flex items-center gap-1.5 hover:opacity-90">
      {open ? <X size={15} /> : <Plus size={15} />}<span style={{ fontSize: "0.8rem", fontWeight: 700 }}>{open ? "Annuler" : label}</span>
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
  const shadowColor = variant === "orange" ? "rgba(244,162,97,0.28)" : "rgba(42,157,143,0.24)";
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
    if (authError) { setError("E-mail ou mot de passe incorrect, réessayez"); return; }
    onLogin(data.session);
  }

  return (
    <div dir="ltr" style={{ background: `linear-gradient(160deg, ${c.headerGreenLight} 0%, ${c.headerGreen} 55%, #163832 100%)`, minHeight: "100vh", position: "relative", overflow: "hidden" }} className="flex flex-col items-center justify-center p-6">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@700;800;900&family=Inter:wght@400;600;700;800;900&display=swap');
        @keyframes logoPop { 0% { transform: scale(0) rotate(-25deg); opacity: 0; } 60% { transform: scale(1.15) rotate(6deg); opacity: 1; } 80% { transform: scale(0.95) rotate(-3deg); } 100% { transform: scale(1) rotate(0deg); } }
        @keyframes logoBreathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes ringPulse { 0% { transform: scale(0.85); opacity: 0.55; } 100% { transform: scale(1.6); opacity: 0; } }
        @keyframes dotPop { 0%, 55% { transform: scale(0); opacity: 0; } 75% { transform: scale(1.3); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes titleRise { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
        .logo-wrap { animation: logoPop 0.9s cubic-bezier(.34,1.56,.64,1) both, logoBreathe 3.2s ease-in-out 1.1s infinite; }
        .logo-ring { animation: ringPulse 2.6s ease-out infinite; }
        .logo-title { animation: titleRise 0.6s ease 0.5s both; }
        @keyframes floatFruit1 { 0%,100% { transform: translate(0,0) rotate(-8deg); } 50% { transform: translate(-4px,-10px) rotate(4deg); } }
        @keyframes floatFruit2 { 0%,100% { transform: translate(0,0) rotate(10deg); } 50% { transform: translate(5px,-8px) rotate(-6deg); } }
        @keyframes fruitPop { 0% { opacity: 0; transform: scale(0); } 100% { opacity: 1; transform: scale(1); } }
        .fruit-avocado { animation: fruitPop 0.5s ease 0.9s both, floatFruit1 3.4s ease-in-out 1.4s infinite; }
        .fruit-strawberry { animation: fruitPop 0.5s ease 1.05s both, floatFruit2 2.9s ease-in-out 1.55s infinite; }
      `}</style>
      <div style={{ position: "absolute", top: -80, right: -80, width: 260, height: 260, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
      <div style={{ position: "absolute", bottom: -100, left: -60, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
      <div className="relative flex items-center justify-center mb-4" style={{ width: 100, height: 100 }}>
        <div className="logo-ring absolute rounded-full" style={{ width: 90, height: 90, border: `1.5px solid ${c.cardGreenLight}` }} />
        <div className="logo-ring absolute rounded-full" style={{ width: 90, height: 90, border: `1.5px solid ${c.orangeLight}`, animationDelay: "0.9s" }} />
        <div className="logo-wrap relative" style={{ boxShadow: "0 10px 28px rgba(0,0,0,0.25)", borderRadius: "50%" }}>
          <ZMLogo size={68} />
        </div>
        <div className="fruit-avocado absolute" style={{ top: -16, left: -20 }}>
          <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
            <defs>
              <linearGradient id="avoSkin" x1="8" y1="4" x2="30" y2="36" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#4E7A52" />
                <stop offset="55%" stopColor="#2F5233" />
                <stop offset="100%" stopColor="#1C3320" />
              </linearGradient>
              <linearGradient id="avoFlesh" x1="12" y1="10" x2="28" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#D9E36B" />
                <stop offset="60%" stopColor="#B7C94A" />
                <stop offset="100%" stopColor="#8FAE3C" />
              </linearGradient>
              <radialGradient id="avoPit" cx="40%" cy="35%" r="70%">
                <stop offset="0%" stopColor="#B98A5E" />
                <stop offset="100%" stopColor="#7A5233" />
              </radialGradient>
            </defs>
            <path d="M20 3c5 0 8 5 8 12 0 10-3 22-8 22S4 25 4 15C4 8 15 3 20 3z" fill="url(#avoSkin)" />
            <path d="M20 6c4 0 6.3 4.3 6.3 10.3 0 8.7-2.6 18.7-6.3 18.7S6.7 25 6.7 16.3C6.7 10.3 16 6 20 6z" fill="url(#avoFlesh)" />
            <circle cx="20" cy="23" r="6.3" fill="url(#avoPit)" />
            <ellipse cx="18" cy="20.5" rx="2.1" ry="1.5" fill="rgba(255,255,255,0.35)" />
            <path d="M17 4c0-2.4 1.6-4 3.6-4" stroke="#1C3320" strokeWidth="1.6" strokeLinecap="round" />
            <ellipse cx="13.5" cy="10" rx="2.4" ry="4.2" fill="rgba(255,255,255,0.14)" transform="rotate(-18 13.5 10)" />
          </svg>
        </div>
        <div className="fruit-strawberry absolute" style={{ bottom: -14, right: -22 }}>
          <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
            <defs>
              <linearGradient id="berrySkin" x1="8" y1="10" x2="26" y2="34" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FF6B6B" />
                <stop offset="55%" stopColor="#E8384F" />
                <stop offset="100%" stopColor="#B5182F" />
              </linearGradient>
            </defs>
            <path d="M18 34c-6.5 0-12-8-12-15.5C6 11 11 7 18 7s12 4 12 11.5C30 26 24.5 34 18 34z" fill="url(#berrySkin)" />
            <ellipse cx="13.5" cy="14" rx="3" ry="4.5" fill="rgba(255,255,255,0.22)" transform="rotate(-15 13.5 14)" />
            {[[13,13.5],[19,12.5],[24,15],[11,20],[17,19],[23,21],[14,26],[20,26.5],[16,31]].map(([px,py],i) => (
              <ellipse key={i} cx={px} cy={py} rx="1" ry="1.5" fill="#FFE8A3" transform={`rotate(${(i*23)%40-20} ${px} ${py})`} />
            ))}
            <path d="M18 8l-5-7 5 2.5 5-2.5-5 7z" fill="#3DBBA8" />
            <path d="M18 8l-2.5-6.5M18 8l2.5-6.5" stroke="#2A9D8F" strokeWidth="0.8" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      <h1 className="font-display logo-title" style={{ color: "#fff", fontWeight: 800, fontSize: "1.55rem", position: "relative" }}>Zero Manuel</h1>
      <p className="logo-title mb-8" style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.8rem", position: "relative" }}>Connectez-vous avec votre e-mail et mot de passe</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full relative" style={{ maxWidth: 340 }}>
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail"
          style={{ background: "#fff", borderRadius: 12, padding: "13px 16px", fontSize: "0.85rem", border: "none", outline: "none" }}
        />
        <input
          type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe"
          style={{ background: "#fff", borderRadius: 12, padding: "13px 16px", fontSize: "0.85rem", border: "none", outline: "none" }}
        />
        {error && <p style={{ color: "#FCA5A5", fontSize: "0.76rem", textAlign: "center" }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ background: c.cardGreen, color: "#fff", borderRadius: 12, padding: "13px 0", fontWeight: 700, fontSize: "0.86rem", boxShadow: "0 8px 20px rgba(42,157,143,0.35)" }}>
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.7rem", maxWidth: 300 }} className="mt-6 text-center">Pas de compte ? Contactez le responsable de la ferme pour être ajouté.</p>
    </div>
  );
}

const emptyFarmData = {
  nom: "", gps: { lat: 34.92, lng: -6.10 },
  parcelles: [], workers: [], wazin: [], costs: [], plan: [], depenses: [], stock: [], invoices: [],
  cnss: { echeanceJour: 10, moisLabel: "Juillet 2026", declare: false, dateDeclare: "" },
  employees: [], moduleAccess: {}, taches: [], equipes: [], heureDebutStandard: "06:00", heuresStandardJour: 8, majorationHeuresSup: 1.25, sites: [], cultures: [], seasons: [],
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentFarmId, setCurrentFarmId] = useState(null);
  const [farms, setFarms] = useState({});
  const [loadingData, setLoadingData] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [subscriptionBlocked, setSubscriptionBlocked] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(() => {
    try { return JSON.parse(localStorage.getItem("zm_offline_queue") || "[]"); } catch { return []; }
  });
  const [commandesGlobal, setCommandesGlobal] = useState([]);
  const [achatsGlobal, setAchatsGlobal] = useState(initAchatsGlobal);
  const [marketplaceGlobal, setMarketplaceGlobal] = useState(initMarketplace);
  const [incidentsGlobal, setIncidentsGlobal] = useState(initIncidents);
  const [showReportIssue, setShowReportIssue] = useState(false);
  const [issueForm, setIssueForm] = useState({ produit: "avocat", probleme: "", severite: "Moyen" });
  const [analystMessages, setAnalystMessages] = useState([]);
  const [analystQuestion, setAnalystQuestion] = useState("");
  const [analystLoading, setAnalystLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [iconMode, setIconMode] = useState(true);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const recognitionRef = useRef(null);
  const [alertesIncompletes, setAlertesIncompletes] = useState([]);
  const [permMatrix, setPermMatrix] = useState(buildPermMatrixInit());
  const [tab, setTab] = useState("Tableau de bord");
  const [selected, setSelected] = useState(farmsInit.zm.parcelles[0]);
  const [lots, setLots] = useState([]);
  const [showAddLot, setShowAddLot] = useState(false);
  const [lotForm, setLotForm] = useState({ parcelleId: "", dateRecolte: "", heureRecolte: "", quantiteKg: "", grade: "A", note: "" });
  const [lotTraceOuvert, setLotTraceOuvert] = useState(null);
  const [rechercheLot, setRechercheLot] = useState("");
  const [coolers, setCoolers] = useState([]);
  const [showAddCooler, setShowAddCooler] = useState(false);
  const [coolerForm, setCoolerForm] = useState({ nom: "", capaciteKg: "", temperatureCible: "4" });
  const [controlesQualite, setControlesQualite] = useState([]);
  const [lotPourQualite, setLotPourQualite] = useState(null);
  const [qualiteForm, setQualiteForm] = useState({ brix: "", ph: "", taille: "", couleur: "", fermete: "", defautsPct: "0", moisissurePct: "0", dommagesPct: "0", temperature: "", grade: "A" });
  const [palettes, setPalettes] = useState([]);
  const [showAddPalette, setShowAddPalette] = useState(false);
  const [paletteForm, setPaletteForm] = useState({ lotId: "", nombreCaisses: "", poidsKg: "", coolerId: "" });
  const [expeditions, setExpeditions] = useState([]);
  const [showAddExpedition, setShowAddExpedition] = useState(false);
  const [expeditionForm, setExpeditionForm] = useState({ client: "", chauffeur: "", telephoneChauffeur: "", camionImmat: "", temperatureTransport: "", dateDepart: "", destination: "", coutTransport: "" });
  const [paletteSelectionExpedition, setPaletteSelectionExpedition] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [avances, setAvances] = useState([]);
  const [showAddAvance, setShowAddAvance] = useState(false);
  const [avanceForm, setAvanceForm] = useState({ employeeId: "", montant: "", raison: "" });

  const [showAddWorker, setShowAddWorker] = useState(false);
  const [showAddWazin, setShowAddWazin] = useState(false);
  const [showAddCost, setShowAddCost] = useState(false);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [wForm, setWForm] = useState({ nom: "", parcelle: "", tache: "", type: "Heures", dukhul: "06:00", khuruj: "14:00", nahar: 1, taux: 15, dawra: "15", audioNote: "", modePaie: "temps", quantiteRecoltee: "", prixUnitaireRendement: "", chefEquipe: "", indemniteTransport: "0", indemniteRepas: "0", typeJour: "normal", pauseMinutes: "0" });
  const [isRecording, setIsRecording] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [zForm, setZForm] = useState({ parcelle: "", wazan: "", patron: "", kg: "", prixKg: "", statut: "En attente" });
  const [cForm, setCForm] = useState({ parcelle: "", naw3: "Produit phyto", mablagh: "" });
  const [pForm, setPForm] = useState({ parcelle: "", produit: "", dozParHa: "", wehda: "litre", tarikh: "", stockItemId: "" });
  const [showAddFarm, setShowAddFarm] = useState(false);
  const [showAddListing, setShowAddListing] = useState(false);
  const [mForm, setMForm] = useState({ type: "J'offre", produit: "", kammiya: "", wehda: "kilo", prix: "", description: "", contactTel: "" });
  const [mFilter, setMFilter] = useState("Tout");
  const [fForm, setFForm] = useState({ nom: "", lat: "", lng: "" });
  const [showAddStock, setShowAddStock] = useState(false);
  const [sForm, setSForm] = useState({ nom: "", categorie: "Produit phyto", wehda: "kilo", mouvement: "Entrée", kammiya: "", seuil: "", prix: "", fournisseur: "", factureFile: "", factureNom: "", poNumero: "", expiryDate: "", lotNumber: "", uniteAchat: "", ratioConversion: "1" });
  const [showAddCommande, setShowAddCommande] = useState(false);
  const [cmdForm, setCmdForm] = useState({ produit: "", qte: "", wehda: "kilo", motif: "", destFarmId: "" });
  const [processingId, setProcessingId] = useState(null);
  const [poForm, setPoForm] = useState({ fournisseur: "", fournisseurEmail: "", prix: "" });
  const [showAddInvoice, setShowAddInvoice] = useState(false);
  const [invForm, setInvForm] = useState({ client: "", produit: "avocat", qte: "", prixUnitaire: "", tva: "" });
  const [periode, setPeriode] = useState(2);
  const [showAddDepense, setShowAddDepense] = useState(false);
  const [dForm, setDForm] = useState({ type: "Main-d'œuvre", detail: "", montant: "" });
  const [showAddParcelle, setShowAddParcelle] = useState(false);
  const [showInventaire, setShowInventaire] = useState(false);
  const [jerdForm, setJerdForm] = useState({});
  const [showAddAccident, setShowAddAccident] = useState(false);
  const [accForm, setAccForm] = useState({ nomEmploye: "", gravite: "leger", description: "", actionPrise: "" });
  const [accidents, setAccidents] = useState([]);
  const [ficheEmployeOuverte, setFicheEmployeOuverte] = useState(null);
  const [showAddTache, setShowAddTache] = useState(false);
  const [tacheForm, setTacheForm] = useState({ nom: "", uniteDefaut: "kg", tarifDefaut: "" });
  const [showManageTaches, setShowManageTaches] = useState(false);
  const [showAddEquipe, setShowAddEquipe] = useState(false);
  const [equipeForm, setEquipeForm] = useState({ nom: "", chefNom: "", parcelleId: "" });
  const [showAddProdEquipe, setShowAddProdEquipe] = useState(false);
  const [prodEquipeForm, setProdEquipeForm] = useState({ equipeId: "", tache: "", quantiteTotale: "", tarifUnitaire: "", methode: "egale" });
  const [repartitionPreview, setRepartitionPreview] = useState([]);
  const [showCreateCycle, setShowCreateCycle] = useState(false);
  const [cycleForm, setCycleForm] = useState({ periodeDebut: "", periodeFin: "", datePaiement: "" });
  const [cyclesPaie, setCyclesPaie] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState(null);
  const [bulletinsActifs, setBulletinsActifs] = useState([]);
  const [detailBulletinId, setDetailBulletinId] = useState(null);
  const [bulletinPourPdf, setBulletinPourPdf] = useState(null);
  const [showParametres, setShowParametres] = useState(false);
  const [paramForm, setParamForm] = useState({ heureDebutStandard: "06:00", heuresStandardJour: "8", majorationHeuresSup: "1.25" });
  const [coutParFerme, setCoutParFerme] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [pcForm, setPcForm] = useState({ code: "", nom: "", crop: "avocat", ha: "", siteId: "", cultureId: "", seasonId: "", datePlantation: "", rendementPrevu: "" });
  const [showAddSite, setShowAddSite] = useState(false);
  const [siteForm, setSiteForm] = useState({ nom: "", code: "", type: "champ" });
  const [showAddCulture, setShowAddCulture] = useState(false);
  const [cultureForm, setCultureForm] = useState({ nom: "", variete: "", categorie: "Fruit" });
  const [showAddSeason, setShowAddSeason] = useState(false);
  const [seasonForm, setSeasonForm] = useState({ nom: "", dateDebut: "", dateFin: "" });

  const data = farms[currentFarmId] || emptyFarmData;

  async function loadFarmDetails(farmId) {
    const [{ data: parcellesData }, { data: workersData }, { data: stockData }, { data: accessData }, { data: employeesData }, { data: tachesData }, { data: equipesData }, { data: sitesData }, { data: culturesData }, { data: seasonsData }] = await Promise.all([
      supabase.from("parcelles").select("*").eq("farm_id", farmId),
      supabase.from("workers_log").select("*").eq("farm_id", farmId).order("created_at", { ascending: false }).limit(200),
      supabase.from("stock_items").select("*").eq("farm_id", farmId),
      supabase.from("module_access").select("module, enabled").eq("farm_id", farmId),
      supabase.from("employees").select("*").eq("farm_id", farmId),
      supabase.from("taches_config").select("*").eq("farm_id", farmId).eq("active", true),
      supabase.from("equipes").select("*").eq("farm_id", farmId),
      supabase.from("sites").select("*").eq("farm_id", farmId),
      supabase.from("cultures").select("*").eq("farm_id", farmId),
      supabase.from("seasons").select("*").eq("farm_id", farmId),
    ]);
    const { data: farmRow } = await supabase.from("farms").select("gps_lat, gps_lng, heure_debut_standard, heures_standard_jour, majoration_heures_sup").eq("id", farmId).single();
    const farmGps = farmRow ? { lat: Number(farmRow.gps_lat) || 34.92, lng: Number(farmRow.gps_lng) || -6.10 } : { lat: 34.92, lng: -6.10 };
    const heureDebutStandard = (farmRow && farmRow.heure_debut_standard) ? farmRow.heure_debut_standard.slice(0, 5) : "06:00";
    const heuresStandardJour = farmRow ? Number(farmRow.heures_standard_jour) || 8 : 8;
    const majorationHeuresSup = farmRow ? Number(farmRow.majoration_heures_sup) || 1.25 : 1.25;
    const moduleAccess = {};
    (accessData || []).forEach((r) => { moduleAccess[r.module] = !!r.enabled; });
    const sites = (sitesData || []).map((s) => ({ id: s.id, nom: s.nom, code: s.code, type: s.type }));
    const cultures = (culturesData || []).map((cu) => ({ id: cu.id, nom: cu.nom, variete: cu.variete, categorie: cu.categorie }));
    const seasons = (seasonsData || []).map((se) => ({ id: se.id, nom: se.nom, dateDebut: se.date_debut, dateFin: se.date_fin, statut: se.statut }));
    const siteById = {}; sites.forEach((s) => { siteById[s.id] = s.nom; });
    const cultureById = {}; cultures.forEach((cu) => { cultureById[cu.id] = cu; });
    const seasonById = {}; seasons.forEach((se) => { seasonById[se.id] = se.nom; });
    const parcelles = (parcellesData || []).map((p) => ({
      id: p.id, code: p.code, nom: p.nom, crop: p.crop, ha: Number(p.superficie_ha) || 0,
      statut: p.statut || "ok", irrigation: "—", recolte: 0, dernierTraitement: "—", secu: 0,
      siteId: p.site_id, siteNom: siteById[p.site_id] || null,
      cultureId: p.culture_id, culture: cultureById[p.culture_id] || null,
      seasonId: p.season_id, seasonNom: seasonById[p.season_id] || null,
      datePlantation: p.date_plantation, rendementPrevu: Number(p.rendement_prevu) || null,
    }));
    const codeById = {}; parcelles.forEach((p) => { codeById[p.id] = p.code; });
    const sums = {};
    const workers = (workersData || []).map((w) => {
      const hasGps = w.gps_lat != null && w.gps_lng != null;
      const distKm = hasGps ? distanceKm(farmGps, { lat: Number(w.gps_lat), lng: Number(w.gps_lng) }) : null;
      const indemnites = (Number(w.indemnite_transport) || 0) + (Number(w.indemnite_repas) || 0);
      return {
        id: w.id, nom: w.nom_ouvrier, parcelle: codeById[w.parcelle_id] || "—", parcelleId: w.parcelle_id,
        tache: w.tache, type: w.type_paie, dukhul: w.heure_entree || "-", khuruj: w.heure_sortie || "-",
        qte: Number(w.quantite) || 0, taux: Number(w.taux) || 0, dawra: w.dawra || "Mois",
        statut: w.statut_paiement || "Non payé", audioNote: w.audio_note_url || "",
        distKm, confirme: w.confirme || false,
        modePaie: w.mode_paie || "temps", chefEquipe: w.chef_equipe || null,
        indemniteTransport: Number(w.indemnite_transport) || 0, indemniteRepas: Number(w.indemnite_repas) || 0,
        indemnites, typeJour: w.type_jour || "normal",
        pauseMinutes: Number(w.pause_minutes) || 0, retardMinutes: Number(w.retard_minutes) || 0,
        heuresSup: Number(w.heures_sup) || 0, methode: w.methode || "manuel",
      };
    });
    workers.forEach((w) => { sums[w.nom] = (sums[w.nom] || 0) + w.qte; });
    workers.forEach((w) => { w.moisQte = sums[w.nom]; });
    const stock = (stockData || []).map((s) => ({
      id: s.id, nom: s.nom, categorie: s.categorie, kammiya: Number(s.kammiya) || 0,
      wehda: s.wehda, seuil: Number(s.seuil) || 10,
      expiryDate: s.expiry_date || null, lotNumber: s.lot_number || null,
      uniteAchat: s.unite_achat || null, ratioConversion: Number(s.ratio_conversion) || 1,
    }));
    const employees = (employeesData || []).map(mapEmployeeRow);
    const taches = (tachesData || []).map((t) => ({ id: t.id, nom: t.nom, uniteDefaut: t.unite_defaut, tarifDefaut: Number(t.tarif_defaut) || 0 }));
    const equipes = (equipesData || []).map((eq) => ({ id: eq.id, nom: eq.nom, chefNom: eq.chef_nom, parcelleId: eq.parcelle_id }));

    setFarms((prev) => ({ ...prev, [farmId]: { ...(prev[farmId] || emptyFarmData), parcelles, workers, stock, moduleAccess, employees, taches, equipes, heureDebutStandard, heuresStandardJour, majorationHeuresSup, sites, cultures, seasons } }));
    setSelected(parcelles[0] || null);
  }

  async function loadCommandes() {
    const { data: cmdData, error } = await supabase
      .from("commandes")
      .select("*, farm:farm_id(nom), dest_farm:dest_farm_id(nom)")
      .order("created_at", { ascending: false });
    if (error) { console.error(error); return; }
    const mapped = (cmdData || []).map((cmd) => ({
      id: cmd.id, farmId: cmd.farm_id, farmNom: cmd.farm ? cmd.farm.nom : "—",
      destFarmId: cmd.dest_farm_id, destFarmNom: cmd.dest_farm ? cmd.dest_farm.nom : null,
      demandePar: cmd.demande_par, produit: cmd.produit, qte: Number(cmd.qte), wehda: cmd.wehda,
      motif: cmd.motif, date: cmd.date_demande, statut: cmd.statut, fournisseur: cmd.fournisseur || "",
      fournisseurEmail: cmd.fournisseur_email || "", prix: cmd.prix || "", poNumero: cmd.po_numero || "",
    }));
    setCommandesGlobal(mapped);
  }

  async function loginWithSession(session) {
    setLoadingData(true);
    const userId = session.user.id;
    const { data: memberships, error } = await supabase
      .from("farm_members")
      .select("role, nom_affiche, farms(id, nom, gps_lat, gps_lng, cnss_echeance_jour, cnss_declare, organization_id)")
      .eq("user_id", userId);
    if (error || !memberships || memberships.length === 0) {
      alert("Aucune ferme n'est liée à ce compte — contactez votre administrateur pour vous ajouter dans farm_members.");
      setLoadingData(false);
      setCheckingSession(false);
      return;
    }

    // التحقق من الاشتراك قبل ما نكمل — البائع كيتحكم فيه مباشرة من organizations
    const orgId = memberships[0].farms.organization_id;
    if (orgId) {
      const { data: org } = await supabase.from("organizations").select("abonnement_actif, abonnement_expire_le, plan_nom").eq("id", orgId).single();
      if (org) {
        const expire = org.abonnement_expire_le ? new Date(org.abonnement_expire_le) : null;
        const expired = expire && expire < new Date();
        if (org.abonnement_actif === false || expired) {
          setSubscriptionBlocked({ expired, dateExpiration: org.abonnement_expire_le });
          setLoadingData(false);
          setCheckingSession(false);
          return;
        }
      }
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
    const perms = MODULES.filter((m) => permMatrix[role][m] !== "Sans accès");
    setTab(perms[0] || "Tableau de bord");
    await loadFarmDetails(firstFarm);
    await loadAccidents(firstFarm);
    await loadCycles(firstFarm);
    await loadLots(firstFarm);
    await loadCoolers(firstFarm);
    await loadControlesQualite(firstFarm);
    await loadPalettes(firstFarm);
    await loadExpeditions(firstFarm);
    await loadAvances(firstFarm);
    await loadCommandes();
    setLoadingData(false);
    setCheckingSession(false);
  }

  function queueOffline(table, payload) {
    setPendingSync((prev) => {
      const next = [...prev, { id: Date.now() + Math.random(), table, payload }];
      localStorage.setItem("zm_offline_queue", JSON.stringify(next));
      return next;
    });
  }

  async function syncPendingQueue() {
    const queue = JSON.parse(localStorage.getItem("zm_offline_queue") || "[]");
    if (queue.length === 0) return;
    const remaining = [];
    for (const item of queue) {
      const { error } = await supabase.from(item.table).insert(item.payload);
      if (error) remaining.push(item);
    }
    localStorage.setItem("zm_offline_queue", JSON.stringify(remaining));
    setPendingSync(remaining);
    if (remaining.length < queue.length && currentFarmId) loadFarmDetails(currentFarmId);
  }

  useEffect(() => {
    function goOnline() { setIsOnline(true); syncPendingQueue(); }
    function goOffline() { setIsOnline(false); }
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, [currentFarmId]);

  useEffect(() => {
    if (!currentFarmId) return;
    const channel = supabase
      .channel(`farm-${currentFarmId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "workers_log", filter: `farm_id=eq.${currentFarmId}` }, () => loadFarmDetails(currentFarmId))
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_items", filter: `farm_id=eq.${currentFarmId}` }, () => loadFarmDetails(currentFarmId))
      .on("postgres_changes", { event: "*", schema: "public", table: "commandes" }, () => loadCommandes())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentFarmId]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) loginWithSession(session);
      else setCheckingSession(false);
    });
    if (navigator.onLine) syncPendingQueue();
  }, []);

  const kpis = useMemo(() => {
    const totalHarvest = data.parcelles.reduce((s, p) => s + (p.statut === "recolte" ? p.recolte * 4 : 0), 0);
    const totalCost = data.costs.reduce((s, cp) => s + cp.dawa + cp.ma + cp.omal, 0);
    const totalDawa = data.costs.reduce((s, cp) => s + cp.dawa, 0);
    const totalMaOmal = data.costs.reduce((s, cp) => s + cp.ma + cp.omal, 0);
    const totalHeures = data.workers.filter((w) => w.type === "Heures").reduce((s, w) => s + w.qte, 0);
    const totalKhlas = data.workers.reduce((s, w) => s + w.qte * w.taux, 0);
    const enAttente = data.wazin.filter((w) => w.statut === "En attente").length;
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
        <span style={{ color: "#fff", fontSize: "0.85rem", fontWeight: 700 }}>Chargement...</span>
      </div>
    );
  }

  if (subscriptionBlocked) {
    return (
      <div style={{ minHeight: "100vh", background: c.bg }} className="flex flex-col items-center justify-center p-6 text-center">
        <div style={{ background: "rgba(193,89,79,0.12)", borderRadius: 999, width: 64, height: 64 }} className="flex items-center justify-center mb-4">
          <Lock size={28} color={c.danger} />
        </div>
        <h2 className="font-display" style={{ fontWeight: 800, fontSize: "1.1rem" }}>{subscriptionBlocked.expired ? "Abonnement expiré" : "Compte suspendu"}</h2>
        <p style={{ color: c.inkMuted2, fontSize: "0.82rem", maxWidth: 320 }} className="mt-2">
          {subscriptionBlocked.expired ? `Votre abonnement a expiré le ${subscriptionBlocked.dateExpiration}.` : "L'accès à ce compte a été suspendu."} Contactez votre fournisseur Zero Manuel pour renouveler.
        </p>
        <button onClick={async () => { await supabase.auth.signOut(); setSubscriptionBlocked(null); }} style={{ marginTop: 20, fontSize: "0.78rem", color: c.cardGreenDeep, fontWeight: 700 }}>← Retour</button>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={loginWithSession} />;
  }

  const permTabs = MODULES.filter((m) => permMatrix[currentUser.role][m] !== "Sans accès");
  const isWorker = currentUser.role === "Worker";
  const canManageFarms = currentUser.role === "Owner" || currentUser.role === "Manager";
  const myFarmIds = canManageFarms ? Object.keys(farms) : currentUser.farms;
  function canEdit(moduleKey) { return permMatrix[currentUser.role][moduleKey] === "Modification"; }
  function isLocked(moduleKey) { return !(data.moduleAccess && data.moduleAccess[moduleKey]); }

  const globalSearchResults = (() => {
    const q = globalSearchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    const results = [];
    data.employees.filter((e) => e.nom.toLowerCase().includes(q) || (e.matricule || "").toLowerCase().includes(q)).forEach((e) => results.push({ type: "Employé", icon: Users, label: e.nom, sub: e.poste || e.typeSalaire, tab: "Employés" }));
    data.parcelles.filter((p) => p.code.toLowerCase().includes(q) || p.nom.toLowerCase().includes(q)).forEach((p) => results.push({ type: "Parcelle", icon: Sprout, label: `${p.code} — ${p.nom}`, sub: p.culture ? p.culture.nom : "", tab: "Parcelles" }));
    lots.filter((l) => l.code.toLowerCase().includes(q)).forEach((l) => results.push({ type: "Lot", icon: Package, label: l.code, sub: `${l.quantiteKg} kg · ${l.statut}`, tab: "Parcelles" }));
    palettes.filter((p) => p.code.toLowerCase().includes(q)).forEach((p) => results.push({ type: "Palette", icon: Package, label: p.code, sub: `${p.poidsKg} kg`, tab: "Parcelles" }));
    expeditions.filter((e) => e.code.toLowerCase().includes(q) || (e.client || "").toLowerCase().includes(q)).forEach((e) => results.push({ type: "Expédition", icon: Truck, label: e.code, sub: e.client, tab: "Parcelles" }));
    commandesGlobal.filter((cmd) => cmd.produit.toLowerCase().includes(q)).forEach((cmd) => results.push({ type: "Commande", icon: ClipboardList, label: cmd.produit, sub: `${cmd.qte} ${cmd.wehda} · ${cmd.statut}`, tab: "Commandes" }));
    data.stock.filter((s) => s.nom.toLowerCase().includes(q)).forEach((s) => results.push({ type: "Stock", icon: Package, label: s.nom, sub: `${s.kammiya} ${s.wehda}`, tab: "Stock" }));
    return results.slice(0, 30);
  })();

  const notifications = (() => {
    const list = [];
    if (canManageFarms) {
      const nouvellesCmd = commandesGlobal.filter((cmd) => myFarmIds.includes(cmd.farmId) && cmd.statut === "Nouveau");
      nouvellesCmd.forEach((cmd) => list.push({ severite: "orange", message: `Nouvelle commande : ${cmd.produit} (${cmd.farmNom})` }));
    }
    if (canManageFarms || currentUser.role === "Accountant") {
      achatsGlobal.filter((a) => myFarmIds.includes(a.farmId) && !a.vu).forEach((a) => list.push({ severite: "orange", message: `Achat non vérifié : ${a.produit}` }));
    }
    if (currentUser.role === "Owner") {
      alertesIncompletes.forEach((al) => list.push({ severite: "danger", message: `Réception incomplète : ${al.produit} (${al.personne})` }));
    }
    if (permTabs.includes("CNSS") && !data.cnss.declare && data.cnss.echeanceJour && (data.cnss.echeanceJour - 20) <= 3) {
      list.push({ severite: "danger", message: "Déclaration CNSS approche de l'échéance" });
    }
    if (!isWorker) {
      const nonSorties = data.workers.filter((w) => w.type === "Heures" && w.khuruj === "-");
      if (nonSorties.length > 0) list.push({ severite: "orange", message: `${nonSorties.length} employé(s) sans heure de sortie enregistrée` });

      const nomsPointes = new Set(data.workers.map((w) => w.nom));
      const absentsCount = data.employees.filter((e) => (e.statut === "actif" || !e.statut) && !nomsPointes.has(e.nom)).length;
      if (absentsCount > 0) list.push({ severite: "orange", message: `${absentsCount} employé(s) actif(s) sans pointage aujourd'hui` });

      const cyclesEnAttente = cyclesPaie.filter((cy) => cy.statut === "brouillon" && cy.periodeFin && new Date(cy.periodeFin) < new Date());
      cyclesEnAttente.forEach((cy) => list.push({ severite: "danger", message: `Cycle ${cy.periodeDebut} → ${cy.periodeFin} prêt à calculer` }));

      if (selectedCycleId) {
        const problemes = bulletinsActifs.filter((b) => b.anomalies.length > 0).length;
        if (problemes > 0) list.push({ severite: "danger", message: `${problemes} bulletin(s) avec anomalie dans le cycle sélectionné` });
      }

      const stockFaible = data.stock.filter((s) => s.kammiya <= s.seuil).length;
      if (stockFaible > 0) list.push({ severite: "orange", message: `${stockFaible} produit(s) en stock faible` });
    }
    return list;
  })();

  function updateFarm(patch) { setFarms((prev) => ({ ...prev, [currentFarmId]: { ...prev[currentFarmId], ...patch } })); }
  function parcelleNom(code) { const p = data.parcelles.find((p) => p.code === code); return p ? p.nom : code; }
  function CropIcon({ crop, size = 16, color }) { return crop === "avocat" ? <Sprout size={size} color={color} /> : <Cherry size={size} color={color} />; }

  const visibleWorkers = isWorker ? data.workers.filter((w) => w.nom === currentUser.nom) : data.workers;

  const allTabs = [
    { key: "Tableau de bord", icon: LayoutGrid }, { key: "Fermes", icon: Building2 }, { key: "Commandes", icon: ClipboardList }, { key: "Marché", icon: Store }, { key: "Parcelles", icon: Sprout }, { key: "Employés", icon: Users },
    { key: "Stock", icon: Package }, { key: "Réceptions", icon: Truck }, { key: "Factures", icon: FileSpreadsheet }, { key: "CNSS", icon: CalendarClock }, { key: "Coûts", icon: Wallet }, { key: "Dépenses", icon: Receipt }, { key: "Rentabilité", icon: TrendingUp }, { key: "Assistant IA", icon: Brain }, { key: "Plan de traitement", icon: FileText },
  ];
  const tabs = allTabs.filter((t) => permTabs.includes(t.key));
  if (currentUser.role === "Owner") tabs.push({ key: "Permissions", icon: Lock });

  function switchFarm(fid) { setCurrentFarmId(fid); loadFarmDetails(fid); loadAccidents(fid); loadCycles(fid); loadLots(fid); loadCoolers(fid); loadControlesQualite(fid); loadPalettes(fid); loadExpeditions(fid); loadAvances(fid); }

  function toggleAffiliation(id) {
    updateFarm({ employees: data.employees.map((e) => e.id === id ? { ...e, affilieCNSS: !e.affilieCNSS } : e) });
  }
  function marquerDeclare() {
    updateFarm({ cnss: { ...data.cnss, declare: true, dateDeclare: "20 juillet" } });
  }
  function updateEcheance(jour) {
    updateFarm({ cnss: { ...data.cnss, echeanceJour: Number(jour) } });
  }

  function exportOmageModele() {
    const headers = ["Matricule", "Nom", "Prénom", "J/H Travaillé", "HS 0%", "HS 25%", "HS 50%", "HS 100%", "J/H  récup. - Rappel", "J. Férié", "Congé", "Congé payé", "Congés restants", "Congé Familial", "Avance", "Jours CNSS", "Net", "Catégorie", "Type salaire", "Date entrée", "Mode de Paiement", "Salaire base", "Situation Familiale", "Nombre d'enfants", "Abattement", "Poste", "Service", "Compte", "Nature contrat", "CIN", "N°CNSS"];
    const rows = data.workers.map((w, i) => {
      const emp = getEmployee(w.nom);
      const joursTravailles = w.type === "Heures" ? Math.round(w.moisQte / 8) : w.moisQte;
      const net = w.moisQte * w.taux;
      return [
        String(w.id).slice(-6).padStart(6, "0"), w.nom, emp.prenom || "", joursTravailles, "", "", "", "", "", 0, 0, 0, 0, 0, 0,
        joursTravailles, net, w.dawra === "Mois" ? "Permanent" : "Occasionnel", w.dawra === "Mois" ? "Mensuel" : "Quinzaine",
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
    const headers = ["N° CNSS", "Nom", "Inscrit ?", "Jours/heures ce mois", "Salaire déclaré (DH)"];
    const rows = data.workers.map((w) => {
      const emp = getEmployee(w.nom);
      const joursEquiv = w.type === "Heures" ? Math.round((w.moisQte / 8) * 10) / 10 : w.moisQte;
      return [emp.cnssNumero || "—", w.nom, emp.affilieCNSS ? "Oui" : "Non", `${w.moisQte} ${w.type === "Heures" ? "h (" + joursEquiv + " يوم تقريبا)" : "Jour"}`, w.moisQte * w.taux];
    });
    const totalSalaire = data.workers.reduce((s, w) => s + w.moisQte * w.taux, 0);
    const aoa = [
      [`Tableau de déclaration CNSS — ${data.nom}`],
      [`Mois : ${data.cnss.moisLabel}`],
      [],
      headers,
      ...rows,
      [],
      ["", "Total", "", "", totalSalaire],
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
    }).catch(() => alert("Impossible d'accéder au micro — vérifiez l'autorisation microphone du navigateur"));
  }
  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  async function ensureEmployee(nom) {
    if (data.employees.some((e) => e.nom === nom)) return;
    const { data: row, error } = await supabase.from("employees").insert({ farm_id: currentFarmId, nom, statut: "actif", type_salaire: "journalier" }).select().single();
    if (error) { console.error(error); return; }
    updateFarm({ employees: [...data.employees, mapEmployeeRow(row)] });
  }
  function getEmployee(nom) { return data.employees.find((e) => e.nom === nom) || mapEmployeeRow({}); }
  async function updateEmployee(id, patch) {
    updateFarm({ employees: data.employees.map((e) => e.id === id ? { ...e, ...patch } : e) });
    const dbPatch = {};
    const map = {
      prenom: "prenom", cin: "cin", dateEntree: "date_entree", situationFamiliale: "situation_familiale",
      nombreEnfants: "nombre_enfants", cnssNumero: "cnss_numero", affilieCNSS: "affilie_cnss",
      matricule: "matricule", telephone: "telephone", adresse: "adresse", photoUrl: "photo_url",
      poste: "poste", typeContrat: "type_contrat", dateSortie: "date_sortie", statut: "statut",
      equipeId: "equipe_id", responsable: "responsable", salaireJournalier: "salaire_journalier",
      salaireHoraire: "salaire_horaire", salaireMensuel: "salaire_mensuel", typeSalaire: "type_salaire",
      rib: "rib", docCinUrl: "doc_cin_url", docContratUrl: "doc_contrat_url", docCnssUrl: "doc_cnss_url",
    };
    Object.keys(patch).forEach((k) => { if (map[k]) dbPatch[map[k]] = patch[k]; });
    if (Object.keys(dbPatch).length) await supabase.from("employees").update(dbPatch).eq("id", id);
  }
  function mapEmployeeRow(e) {
    return {
      id: e.id, nom: e.nom || "", prenom: e.prenom || "", cin: e.cin || "", dateEntree: e.date_entree || "",
      situationFamiliale: e.situation_familiale || "", nombreEnfants: e.nombre_enfants || "", cnssNumero: e.cnss_numero || "",
      affilieCNSS: e.affilie_cnss || false, matricule: e.matricule || "", telephone: e.telephone || "", adresse: e.adresse || "",
      photoUrl: e.photo_url || "", poste: e.poste || "", typeContrat: e.type_contrat || "", dateSortie: e.date_sortie || "",
      statut: e.statut || "actif", equipeId: e.equipe_id || "", responsable: e.responsable || "",
      salaireJournalier: e.salaire_journalier || "", salaireHoraire: e.salaire_horaire || "", salaireMensuel: e.salaire_mensuel || "",
      typeSalaire: e.type_salaire || "journalier", rib: e.rib || "", docCinUrl: e.doc_cin_url || "",
      docContratUrl: e.doc_contrat_url || "", docCnssUrl: e.doc_cnss_url || "",
    };
  }

  async function addTache() {
    if (!tacheForm.nom.trim()) return;
    const { error } = await supabase.from("taches_config").insert({
      farm_id: currentFarmId, nom: tacheForm.nom, unite_defaut: tacheForm.uniteDefaut, tarif_defaut: Number(tacheForm.tarifDefaut) || 0,
    });
    if (error) { alert("مشكل: " + error.message); return; }
    setTacheForm({ nom: "", uniteDefaut: "kg", tarifDefaut: "" });
    setShowAddTache(false);
    await loadFarmDetails(currentFarmId);
  }

  async function addEquipe() {
    if (!equipeForm.nom.trim()) return;
    const { error } = await supabase.from("equipes").insert({
      farm_id: currentFarmId, nom: equipeForm.nom, chef_nom: equipeForm.chefNom || null, parcelle_id: equipeForm.parcelleId || null,
    });
    if (error) { alert("مشكل: " + error.message); return; }
    setEquipeForm({ nom: "", chefNom: "", parcelleId: "" });
    setShowAddEquipe(false);
    await loadFarmDetails(currentFarmId);
  }

  function calculerRepartition() {
    const equipe = data.equipes.find((eq) => eq.id === prodEquipeForm.equipeId);
    if (!equipe) { alert("اختار الفرقة أول"); return; }
    const membres = data.employees.filter((e) => e.equipeId === equipe.id);
    if (membres.length === 0) { alert("هاد الفرقة ماعندهاش أعضاء — زيدهم من Fiche Employé"); return; }
    const quantiteTotale = Number(prodEquipeForm.quantiteTotale) || 0;
    const tarifUnitaire = Number(prodEquipeForm.tarifUnitaire) || 0;
    const montantTotal = quantiteTotale * tarifUnitaire;

    let preview = [];
    if (prodEquipeForm.methode === "egale") {
      const partChacun = quantiteTotale / membres.length;
      const montantChacun = montantTotal / membres.length;
      preview = membres.map((m) => ({ nom: m.nom, employeeId: m.id, part: partChacun, montant: montantChacun }));
    } else if (prodEquipeForm.methode === "heures" || prodEquipeForm.methode === "jours") {
      const poids = membres.map((m) => {
        const entreesMembre = data.workers.filter((w) => w.nom === m.nom);
        const total = prodEquipeForm.methode === "heures"
          ? entreesMembre.filter((w) => w.type === "Heures").reduce((s, w) => s + w.qte, 0)
          : entreesMembre.filter((w) => w.type === "Jour").reduce((s, w) => s + w.qte, 0);
        return total || 1; // على الأقل وحدة وحدة باش ماتبقاش القسمة على صفر
      });
      const sommePoids = poids.reduce((s, p) => s + p, 0);
      preview = membres.map((m, i) => ({
        nom: m.nom, employeeId: m.id,
        part: (poids[i] / sommePoids) * quantiteTotale,
        montant: (poids[i] / sommePoids) * montantTotal,
      }));
    } else if (prodEquipeForm.methode === "custom") {
      preview = membres.map((m) => ({ nom: m.nom, employeeId: m.id, pourcentage: Math.round(100 / membres.length), part: 0, montant: 0 }));
    }
    setRepartitionPreview(preview);
  }

  function updateRepartitionCustom(index, pourcentage) {
    const quantiteTotale = Number(prodEquipeForm.quantiteTotale) || 0;
    const montantTotal = quantiteTotale * (Number(prodEquipeForm.tarifUnitaire) || 0);
    setRepartitionPreview((prev) => prev.map((r, i) => i === index ? {
      ...r, pourcentage: Number(pourcentage),
      part: (Number(pourcentage) / 100) * quantiteTotale,
      montant: (Number(pourcentage) / 100) * montantTotal,
    } : r));
  }

  async function validerProductionEquipe() {
    const equipe = data.equipes.find((eq) => eq.id === prodEquipeForm.equipeId);
    if (!equipe || repartitionPreview.length === 0) return;
    const parcelleObj = data.parcelles.find((p) => p.id === equipe.parcelleId);

    await supabase.from("production").insert({
      farm_id: currentFarmId, equipe_id: equipe.id, parcelle_id: equipe.parcelleId || null,
      quantite: Number(prodEquipeForm.quantiteTotale) || 0, unite: "kg",
      tarif_unitaire: Number(prodEquipeForm.tarifUnitaire) || 0, methode_repartition: prodEquipeForm.methode,
    });

    for (const r of repartitionPreview) {
      await supabase.from("workers_log").insert({
        farm_id: currentFarmId, nom_ouvrier: r.nom, employee_id: r.employeeId,
        parcelle_id: equipe.parcelleId || null, equipe_id: equipe.id,
        tache: prodEquipeForm.tache || "Production d'équipe",
        type_paie: "Heures", quantite: r.part, taux: r.montant / (r.part || 1),
        dawra: "15", statut_paiement: "Non payé", mode_paie: "production",
        quantite_recoltee: r.part, prix_unitaire_rendement: Number(prodEquipeForm.tarifUnitaire) || 0,
        chef_equipe: equipe.chefNom || null, confirme: false,
      });
    }
    setProdEquipeForm({ equipeId: "", tache: "", quantiteTotale: "", tarifUnitaire: "", methode: "egale" });
    setRepartitionPreview([]);
    setShowAddProdEquipe(false);
    await loadFarmDetails(currentFarmId);
  }

  function getGPSPosition() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 8000 }
      );
    });
  }

  async function insertPointage(nom) {
    const isRendement = wForm.modePaie === "rendement";
    const pauseMin = Number(wForm.pauseMinutes) || 0;
    const heuresBrutes = wForm.type === "Heures" ? hoursBetween(wForm.dukhul, wForm.khuruj) : 0;
    const heuresNettes = Math.max(0, heuresBrutes - pauseMin / 60);
    const qte = isRendement ? Number(wForm.quantiteRecoltee) || 0 : (wForm.type === "Heures" ? Math.round(heuresNettes * 10) / 10 : Number(wForm.nahar) || 1);
    const tauxEffectif = isRendement ? Number(wForm.prixUnitaireRendement) || 0 : Number(wForm.taux) || 0;
    const parcelleCode = wForm.parcelle || (data.parcelles[0] && data.parcelles[0].code) || "";
    const parcelleObj = data.parcelles.find((p) => p.code === parcelleCode);
    const gps = await getGPSPosition();

    // حساب التأخر (بالنسبة لوقت البداية القياسي) والساعات الإضافية
    let retardMinutes = 0, heuresSup = 0;
    if (!isRendement && wForm.type === "Heures") {
      const [hStd, mStd] = data.heureDebutStandard.split(":").map(Number);
      const [hReel, mReel] = wForm.dukhul.split(":").map(Number);
      retardMinutes = Math.max(0, (hReel * 60 + mReel) - (hStd * 60 + mStd));
      heuresSup = Math.max(0, Math.round((heuresNettes - data.heuresStandardJour) * 10) / 10);
    }

    const payload = {
      farm_id: currentFarmId,
      nom_ouvrier: nom,
      parcelle_id: parcelleObj ? parcelleObj.id : null,
      tache: wForm.tache || "—",
      type_paie: wForm.type,
      heure_entree: (!isRendement && wForm.type === "Heures") ? wForm.dukhul : null,
      heure_sortie: (!isRendement && wForm.type === "Heures") ? wForm.khuruj : null,
      quantite: qte,
      taux: tauxEffectif,
      dawra: wForm.dawra,
      statut_paiement: "Non payé",
      audio_note_url: wForm.audioNote || null,
      gps_lat: gps ? gps.lat : null,
      gps_lng: gps ? gps.lng : null,
      confirme: false,
      mode_paie: wForm.modePaie,
      quantite_recoltee: isRendement ? qte : null,
      prix_unitaire_rendement: isRendement ? tauxEffectif : null,
      chef_equipe: wForm.chefEquipe || null,
      indemnite_transport: Number(wForm.indemniteTransport) || 0,
      indemnite_repas: Number(wForm.indemniteRepas) || 0,
      type_jour: wForm.typeJour,
      pause_minutes: pauseMin,
      retard_minutes: retardMinutes,
      heures_sup: heuresSup,
      methode: gps ? "mobile" : "manuel",
    };
    const resetForm = { nom: "", parcelle: "", tache: "", type: "Heures", dukhul: "06:00", khuruj: "14:00", nahar: 1, taux: 15, dawra: "15", audioNote: "", modePaie: "temps", quantiteRecoltee: "", prixUnitaireRendement: "", chefEquipe: "", indemniteTransport: "0", indemniteRepas: "0", typeJour: "normal", pauseMinutes: "0" };

    if (!navigator.onLine) {
      queueOffline("workers_log", payload);
      alert("Pas de connexion — le pointage est enregistré localement et sera synchronisé automatiquement au retour du réseau");
      ensureEmployee(nom);
      setWForm(resetForm);
      setShowAddWorker(false);
      return;
    }

    const { error } = await supabase.from("workers_log").insert(payload);
    if (error) {
      queueOffline("workers_log", payload);
      alert("Impossible de joindre le serveur — enregistré localement, sera synchronisé dès que la connexion revient");
    }
    ensureEmployee(nom);
    setWForm(resetForm);
    setShowAddWorker(false);
    loadFarmDetails(currentFarmId);
  }
  async function addParcelle() {
    if (!pcForm.code.trim()) return;
    const { error } = await supabase.from("parcelles").insert({
      farm_id: currentFarmId, code: pcForm.code, nom: pcForm.nom || pcForm.code,
      crop: pcForm.crop, superficie_ha: Number(pcForm.ha) || 0, statut: "ok",
      site_id: pcForm.siteId || null, culture_id: pcForm.cultureId || null, season_id: pcForm.seasonId || null,
      date_plantation: pcForm.datePlantation || null, rendement_prevu: Number(pcForm.rendementPrevu) || null,
    });
    if (error) { alert("وقع مشكل: " + error.message); return; }
    setPcForm({ code: "", nom: "", crop: "avocat", ha: "", siteId: "", cultureId: "", seasonId: "", datePlantation: "", rendementPrevu: "" });
    setShowAddParcelle(false);
    loadFarmDetails(currentFarmId);
  }

  async function addSite() {
    if (!siteForm.nom.trim()) return;
    const { error } = await supabase.from("sites").insert({ farm_id: currentFarmId, nom: siteForm.nom, code: siteForm.code, type: siteForm.type });
    if (error) { alert("مشكل: " + error.message); return; }
    setSiteForm({ nom: "", code: "", type: "champ" });
    setShowAddSite(false);
    await loadFarmDetails(currentFarmId);
  }

  async function addCulture() {
    if (!cultureForm.nom.trim()) return;
    const { error } = await supabase.from("cultures").insert({ farm_id: currentFarmId, nom: cultureForm.nom, variete: cultureForm.variete, categorie: cultureForm.categorie });
    if (error) { alert("مشكل: " + error.message); return; }
    setCultureForm({ nom: "", variete: "", categorie: "Fruit" });
    setShowAddCulture(false);
    await loadFarmDetails(currentFarmId);
  }

  async function addSeason() {
    if (!seasonForm.nom.trim()) return;
    const { error } = await supabase.from("seasons").insert({ farm_id: currentFarmId, nom: seasonForm.nom, date_debut: seasonForm.dateDebut || null, date_fin: seasonForm.dateFin || null, statut: "active" });
    if (error) { alert("مشكل: " + error.message); return; }
    setSeasonForm({ nom: "", dateDebut: "", dateFin: "" });
    setShowAddSeason(false);
    await loadFarmDetails(currentFarmId);
  }

  async function loadLots(farmId) {
    const { data: rows } = await supabase.from("lots").select("*").eq("farm_id", farmId).order("created_at", { ascending: false });
    setLots((rows || []).map((l) => ({
      id: l.id, code: l.code, parcelleId: l.parcelle_id, cultureId: l.culture_id, seasonId: l.season_id,
      dateRecolte: l.date_recolte, heureRecolte: l.heure_recolte, quantiteKg: Number(l.quantite_kg) || 0, quantiteDisponible: Number(l.quantite_disponible) || 0,
      grade: l.grade_qualite, statut: l.statut, note: l.note,
      coolerId: l.cooler_id, heureDebutRefroidissement: l.heure_debut_refroidissement, temperatureStockage: l.temperature_stockage,
    })));
  }

  async function addLot() {
    if (!lotForm.parcelleId || !lotForm.quantiteKg) return;
    const parcelle = data.parcelles.find((p) => p.id === lotForm.parcelleId);
    if (!parcelle) return;
    const culturePrefix = parcelle.culture ? parcelle.culture.nom.slice(0, 2).toUpperCase() : "XX";
    const dateStr = (lotForm.dateRecolte || new Date().toISOString().slice(0, 10)).split("-").reverse().join("");
    const seq = String(lots.filter((l) => l.parcelleId === parcelle.id).length + 1).padStart(3, "0");
    const code = `${culturePrefix}-${parcelle.code}-${dateStr}-${seq}`;

    const { error } = await supabase.from("lots").insert({
      farm_id: currentFarmId, code, parcelle_id: parcelle.id, culture_id: parcelle.cultureId || null, season_id: parcelle.seasonId || null,
      date_recolte: lotForm.dateRecolte || new Date().toISOString().slice(0, 10), heure_recolte: lotForm.heureRecolte || null,
      quantite_kg: Number(lotForm.quantiteKg), quantite_disponible: Number(lotForm.quantiteKg),
      grade_qualite: lotForm.grade, statut: "recolte", note: lotForm.note || null,
    });
    if (error) { alert("مشكل: " + error.message); return; }
    setLotForm({ parcelleId: "", dateRecolte: "", heureRecolte: "", quantiteKg: "", grade: "A", note: "" });
    setShowAddLot(false);
    await loadLots(currentFarmId);
  }

  async function loadCoolers(farmId) {
    const { data: rows } = await supabase.from("coolers").select("*").eq("farm_id", farmId);
    setCoolers((rows || []).map((c) => ({ id: c.id, nom: c.nom, capaciteKg: Number(c.capacite_kg) || 0, temperatureCible: Number(c.temperature_cible) || 4 })));
  }

  async function addCooler() {
    if (!coolerForm.nom.trim()) return;
    const { error } = await supabase.from("coolers").insert({ farm_id: currentFarmId, nom: coolerForm.nom, capacite_kg: Number(coolerForm.capaciteKg) || null, temperature_cible: Number(coolerForm.temperatureCible) || 4 });
    if (error) { alert("مشكل: " + error.message); return; }
    setCoolerForm({ nom: "", capaciteKg: "", temperatureCible: "4" });
    setShowAddCooler(false);
    await loadCoolers(currentFarmId);
  }

  async function assignerCooler(lot, coolerId) {
    const { error } = await supabase.from("lots").update({
      cooler_id: coolerId, heure_debut_refroidissement: new Date().toISOString(), statut: "en_stock",
    }).eq("id", lot.id);
    if (error) { alert("مشكل: " + error.message); return; }
    await loadLots(currentFarmId);
  }

  async function loadControlesQualite(farmId) {
    const { data: rows } = await supabase.from("controles_qualite").select("*").eq("farm_id", farmId).order("created_at", { ascending: false });
    setControlesQualite((rows || []).map((q) => ({
      id: q.id, lotId: q.lot_id, brix: q.brix, ph: q.ph, taille: q.taille, couleur: q.couleur, fermete: q.fermete,
      defautsPct: Number(q.defauts_pct) || 0, moisissurePct: Number(q.moisissure_pct) || 0, dommagesPct: Number(q.dommages_pct) || 0,
      temperature: q.temperature, grade: q.grade, statut: q.statut, note: q.note,
    })));
  }

  async function saveControleQualite() {
    if (!lotPourQualite) return;
    const moisissure = Number(qualiteForm.moisissurePct) || 0;
    const defauts = Number(qualiteForm.defautsPct) || 0;
    // كشف anomaly أوطوماتيكي: moisissure > 3% ولا defauts > 5% = رفض/شرط
    let statut = "accepte";
    if (moisissure > 5 || defauts > 10) statut = "rejete";
    else if (moisissure > 3 || defauts > 5) statut = "accepte_condition";

    const { error } = await supabase.from("controles_qualite").insert({
      farm_id: currentFarmId, lot_id: lotPourQualite.id,
      brix: Number(qualiteForm.brix) || null, ph: Number(qualiteForm.ph) || null,
      taille: qualiteForm.taille || null, couleur: qualiteForm.couleur || null, fermete: qualiteForm.fermete || null,
      defauts_pct: defauts, moisissure_pct: moisissure, dommages_pct: Number(qualiteForm.dommagesPct) || 0,
      temperature: Number(qualiteForm.temperature) || null, grade: qualiteForm.grade, statut,
    });
    if (error) { alert("مشكل: " + error.message); return; }
    await supabase.from("lots").update({ grade_qualite: qualiteForm.grade }).eq("id", lotPourQualite.id);
    if (statut === "rejete") alert("⚠️ Lot rejeté — moisissure/défauts au-dessus du seuil");
    else if (statut === "accepte_condition") alert("⚠️ Accepté sous condition — vérifier le lot");
    setQualiteForm({ brix: "", ph: "", taille: "", couleur: "", fermete: "", defautsPct: "0", moisissurePct: "0", dommagesPct: "0", temperature: "", grade: "A" });
    setLotPourQualite(null);
    await Promise.all([loadLots(currentFarmId), loadControlesQualite(currentFarmId)]);
  }

  async function loadAvances(farmId) {
    const { data: rows } = await supabase.from("avances_salaire").select("*").eq("farm_id", farmId).order("created_at", { ascending: false });
    setAvances((rows || []).map((a) => ({
      id: a.id, employeeId: a.employee_id, montant: Number(a.montant) || 0, dateAvance: a.date_avance,
      statut: a.statut, cycleId: a.cycle_id, raison: a.raison, approuvePar: a.approuve_par,
    })));
  }

  async function addAvance() {
    if (!avanceForm.employeeId || !avanceForm.montant) return;
    const { error } = await supabase.from("avances_salaire").insert({
      farm_id: currentFarmId, employee_id: avanceForm.employeeId, montant: Number(avanceForm.montant),
      raison: avanceForm.raison || null, statut: "demande",
    });
    if (error) { alert("مشكل: " + error.message); return; }
    setAvanceForm({ employeeId: "", montant: "", raison: "" });
    setShowAddAvance(false);
    await loadAvances(currentFarmId);
  }

  async function changerStatutAvance(id, statut) {
    const { error } = await supabase.from("avances_salaire").update({ statut, approuve_par: statut === "approuve" ? currentUser.nom : null }).eq("id", id);
    if (error) { alert("مشكل: " + error.message); return; }
    await loadAvances(currentFarmId);
  }

  async function loadAuditLogs(farmId) {
    const { data: rows } = await supabase.from("audit_logs").select("*").eq("farm_id", farmId).order("created_at", { ascending: false }).limit(100);
    setAuditLogs((rows || []).map((a) => ({
      id: a.id, tableName: a.table_name, action: a.action, champsModifies: a.champs_modifies, createdAt: a.created_at,
    })));
  }

  async function loadPalettes(farmId) {
    const { data: rows } = await supabase.from("palettes").select("*").eq("farm_id", farmId).order("created_at", { ascending: false });
    setPalettes((rows || []).map((p) => ({
      id: p.id, code: p.code, lotId: p.lot_id, nombreCaisses: p.nombre_caisses, poidsKg: Number(p.poids_kg) || 0,
      coolerId: p.cooler_id, statut: p.statut,
    })));
  }

  async function addPalette() {
    if (!paletteForm.lotId || !paletteForm.poidsKg) return;
    const lot = lots.find((l) => l.id === paletteForm.lotId);
    if (!lot) return;
    const seq = String(palettes.length + 1).padStart(6, "0");
    const code = `PAL-${seq}`;
    const { error } = await supabase.from("palettes").insert({
      farm_id: currentFarmId, code, lot_id: lot.id, nombre_caisses: Number(paletteForm.nombreCaisses) || null,
      poids_kg: Number(paletteForm.poidsKg), cooler_id: paletteForm.coolerId || lot.coolerId || null, statut: "en_stock",
    });
    if (error) { alert("مشكل: " + error.message); return; }
    await supabase.from("mouvements_stock").insert({
      farm_id: currentFarmId, type: "transfert", lot_id: lot.id, quantite_kg: Number(paletteForm.poidsKg),
      raison: `Mise en palette ${code}`, utilisateur: currentUser.nom,
    });
    setPaletteForm({ lotId: "", nombreCaisses: "", poidsKg: "", coolerId: "" });
    setShowAddPalette(false);
    await loadPalettes(currentFarmId);
  }

  async function loadExpeditions(farmId) {
    const { data: rows } = await supabase.from("expeditions").select("*, expedition_palettes(palette_id)").eq("farm_id", farmId).order("created_at", { ascending: false });
    setExpeditions((rows || []).map((e) => ({
      id: e.id, code: e.code, client: e.client, chauffeur: e.chauffeur, telephoneChauffeur: e.telephone_chauffeur,
      camionImmat: e.camion_immatriculation, temperatureTransport: e.temperature_transport, dateDepart: e.date_depart,
      destination: e.destination, statut: e.statut, paletteIds: (e.expedition_palettes || []).map((ep) => ep.palette_id),
      coutTransport: Number(e.cout_transport) || 0,
    })));
  }

  async function creerExpedition() {
    if (!expeditionForm.client.trim() || paletteSelectionExpedition.length === 0) return;
    const seq = String(expeditions.length + 1).padStart(4, "0");
    const code = `EXP-2026-${seq}`;
    const { data: exp, error } = await supabase.from("expeditions").insert({
      farm_id: currentFarmId, code, client: expeditionForm.client, chauffeur: expeditionForm.chauffeur,
      telephone_chauffeur: expeditionForm.telephoneChauffeur, camion_immatriculation: expeditionForm.camionImmat,
      temperature_transport: Number(expeditionForm.temperatureTransport) || null,
      date_depart: expeditionForm.dateDepart || null, destination: expeditionForm.destination, statut: "planifiee",
      cout_transport: Number(expeditionForm.coutTransport) || 0,
    }).select().single();
    if (error) { alert("مشكل: " + error.message); return; }

    for (const paletteId of paletteSelectionExpedition) {
      await supabase.from("expedition_palettes").insert({ expedition_id: exp.id, palette_id: paletteId });
      await supabase.from("palettes").update({ statut: "expediee" }).eq("id", paletteId);
      const palette = palettes.find((p) => p.id === paletteId);
      if (palette) {
        await supabase.from("mouvements_stock").insert({
          farm_id: currentFarmId, type: "expedition", lot_id: palette.lotId, palette_id: paletteId,
          quantite_kg: palette.poidsKg, raison: `Expédition ${code} — ${expeditionForm.client}`, utilisateur: currentUser.nom,
        });
      }
    }
    setExpeditionForm({ client: "", chauffeur: "", telephoneChauffeur: "", camionImmat: "", temperatureTransport: "", dateDepart: "", destination: "", coutTransport: "" });
    setPaletteSelectionExpedition([]);
    setShowAddExpedition(false);
    await Promise.all([loadExpeditions(currentFarmId), loadPalettes(currentFarmId)]);
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
    const newStatut = w.statut === "Payé" ? "Non payé" : "Payé";
    const { error } = await supabase.from("workers_log").update({ statut_paiement: newStatut }).eq("id", id);
    if (error) { alert("وقع مشكل: " + error.message); return; }
    updateFarm({ workers: data.workers.map((x) => x.id === id ? { ...x, statut: newStatut } : x) });
  }
  async function toggleConfirme(id) {
    const w = data.workers.find((x) => x.id === id);
    const newConfirme = !w.confirme;
    const { error } = await supabase.from("workers_log").update({ confirme: newConfirme }).eq("id", id);
    if (error) { alert("وقع مشكل: " + error.message); return; }
    updateFarm({ workers: data.workers.map((x) => x.id === id ? { ...x, confirme: newConfirme } : x) });
  }
  function exportJournalPaie() {
    const headers = ["#", "Nom", "المهمة", "parcelle", "Mode de paiement", "Quantité du jour", "الأجرة", "Total du jour (DH)", "Total du cycle (DH)", "Cycle", "الحالة"];
    const rows = data.workers.map((w, i) => [
      i + 1, w.nom, w.tache, w.parcelle, w.type === "Heures" ? "À l'heure" : "À la journée",
      w.qte, w.taux, w.qte * w.taux, w.moisQte * w.taux, w.dawra === "15" ? "Tous les 15 jours" : "Au mois", w.statut,
    ]);
    const totalRow = ["", "Total", "", "", "", "", "", data.workers.reduce((s, w) => s + w.qte * w.taux, 0), data.workers.reduce((s, w) => s + w.moisQte * w.taux, 0), "", ""];
    const aoa = [
      [`Journal de paie — ${data.nom}`],
      ["Date d'émission: 20 Juillet 2026"],
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
    updateFarm({ wazin: [{ id: Date.now(), date: "20 juillet", parcelle: zForm.parcelle || data.parcelles[0].code, wazan: zForm.wazan, patron: zForm.patron || zForm.wazan, kg: Number(zForm.kg), prixKg: Number(zForm.prixKg) || 0, statut: zForm.statut }, ...data.wazin] });
    setZForm({ parcelle: "", wazan: "", patron: "", kg: "", prixKg: "", statut: "En attente" });
    setShowAddWazin(false);
  }
  function addCost() {
    if (!cForm.mablagh) return;
    const target = cForm.parcelle || data.parcelles[0].code;
    const key = cForm.naw3 === "Produit phyto" ? "dawa" : cForm.naw3 === "Eau" ? "ma" : "omal";
    updateFarm({ costs: data.costs.map((cp) => cp.code === target ? { ...cp, [key]: cp[key] + Number(cForm.mablagh) } : cp) });
    setCForm({ parcelle: "", naw3: "Produit phyto", mablagh: "" });
    setShowAddCost(false);
  }
  async function addPlan() {
    if (!pForm.produit.trim() || !pForm.dozParHa) return;
    const parcelleCode = pForm.parcelle || data.parcelles[0].code;
    const parcelleObj = data.parcelles.find((p) => p.code === parcelleCode);
    const ha = parcelleObj ? parcelleObj.ha : 1;
    const kammiyaTotale = Number(pForm.dozParHa) * ha;
    updateFarm({ plan: [...data.plan, { code: parcelleCode, produit: pForm.produit, dozParHa: Number(pForm.dozParHa), wehda: pForm.wehda, tarikh: pForm.tarikh || "—" }] });
    if (pForm.stockItemId) {
      const stockItem = data.stock.find((s) => s.id === pForm.stockItemId);
      if (stockItem) {
        const nouvelleKammiya = Math.max(0, stockItem.kammiya - kammiyaTotale);
        await supabase.from("stock_items").update({ kammiya: nouvelleKammiya }).eq("id", stockItem.id);
        await supabase.from("plan_traitement").insert({ farm_id: currentFarmId, stock_item_id: stockItem.id, deduit: true });
        await loadFarmDetails(currentFarmId);
      }
    }
    setPForm({ parcelle: "", produit: "", dozParHa: "", wehda: "litre", tarikh: "", stockItemId: "" });
    setShowAddPlan(false);
  }

  function addDepense() {
    if (!dForm.detail.trim() || !dForm.montant) return;
    updateFarm({ depenses: [{ id: Date.now(), dayOffset: 0, dateLabel: "20 juillet", type: dForm.type, detail: dForm.detail, montant: Number(dForm.montant) }, ...data.depenses] });
    setDForm({ type: "Main-d'œuvre", detail: "", montant: "" });
    setShowAddDepense(false);
  }

  function handleFactureFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSForm((prev) => ({ ...prev, factureFile: reader.result, factureNom: file.name }));
    reader.readAsDataURL(file);
  }

  async function marquerAbsent(nomEmploye) {
    const { error } = await supabase.from("absences").insert({
      farm_id: currentFarmId, employee_id: (data.employees.find((e) => e.nom === nomEmploye) || {}).id,
      type: "absence_non_justifiee",
    });
    if (error) { alert("مشكل: " + error.message); return; }
    alert(`تم تسجيل غياب ${nomEmploye}`);
  }

  async function loadCycles(farmId) {
    const { data: rows } = await supabase.from("cycles_paie").select("*").eq("farm_id", farmId).order("periode_debut", { ascending: false });
    setCyclesPaie((rows || []).map((cy) => ({
      id: cy.id, periodeDebut: cy.periode_debut, periodeFin: cy.periode_fin, datePaiement: cy.date_paiement,
      statut: cy.statut, totalBrut: Number(cy.total_brut) || 0, totalDeductions: Number(cy.total_deductions) || 0, totalNet: Number(cy.total_net) || 0,
    })));
  }

  async function calculerCoutParFerme() {
    const { data: rows } = await supabase.from("workers_log").select("farm_id, quantite, taux").in("farm_id", myFarmIds);
    const parFerme = {};
    (rows || []).forEach((w) => { parFerme[w.farm_id] = (parFerme[w.farm_id] || 0) + Number(w.quantite) * Number(w.taux); });
    setCoutParFerme(myFarmIds.map((fid) => ({ farmId: fid, nom: farms[fid] ? farms[fid].nom : fid, cout: parFerme[fid] || 0 })));
  }

  async function saveParametres() {
    const { error } = await supabase.from("farms").update({
      heure_debut_standard: paramForm.heureDebutStandard,
      heures_standard_jour: Number(paramForm.heuresStandardJour) || 8,
      majoration_heures_sup: Number(paramForm.majorationHeuresSup) || 1.25,
    }).eq("id", currentFarmId);
    if (error) { alert("مشكل: " + error.message); return; }
    setShowParametres(false);
    await loadFarmDetails(currentFarmId);
  }

  async function createCycle() {
    if (!cycleForm.periodeDebut || !cycleForm.periodeFin) return;
    const { error } = await supabase.from("cycles_paie").insert({
      farm_id: currentFarmId, periode_debut: cycleForm.periodeDebut, periode_fin: cycleForm.periodeFin,
      date_paiement: cycleForm.datePaiement || null, statut: "brouillon",
    });
    if (error) { alert("مشكل: " + error.message); return; }
    setCycleForm({ periodeDebut: "", periodeFin: "", datePaiement: "" });
    setShowCreateCycle(false);
    await loadCycles(currentFarmId);
  }

  // ===== Payroll Engine — محرك حساب الأجر بناء على الرُبريكات =====
  async function calculerCycle(cycleId) {
    const cycle = cyclesPaie.find((c) => c.id === cycleId);
    if (!cycle) return;

    const [{ data: logsData }, { data: absencesData }, { data: avancesData }] = await Promise.all([
      supabase.from("workers_log").select("*").eq("farm_id", currentFarmId).gte("date_travail", cycle.periodeDebut).lte("date_travail", cycle.periodeFin),
      supabase.from("absences").select("*").eq("farm_id", currentFarmId).gte("date_absence", cycle.periodeDebut).lte("date_absence", cycle.periodeFin),
      supabase.from("avances_salaire").select("*").eq("farm_id", currentFarmId).is("cycle_id", null).eq("statut", "approuve"),
    ]);

    const parEmploye = {};
    (logsData || []).forEach((w) => {
      if (!parEmploye[w.nom_ouvrier]) parEmploye[w.nom_ouvrier] = { logs: [] };
      parEmploye[w.nom_ouvrier].logs.push(w);
    });
    (absencesData || []).forEach((a) => {
      const emp = data.employees.find((e) => e.id === a.employee_id);
      const nom = emp ? emp.nom : null;
      if (nom) { if (!parEmploye[nom]) parEmploye[nom] = { logs: [] }; if (!parEmploye[nom].absences) parEmploye[nom].absences = []; parEmploye[nom].absences.push(a); }
    });
    (avancesData || []).forEach((av) => {
      const emp = data.employees.find((e) => e.id === av.employee_id);
      const nom = emp ? emp.nom : null;
      if (nom) { if (!parEmploye[nom]) parEmploye[nom] = { logs: [] }; if (!parEmploye[nom].avances) parEmploye[nom].avances = []; parEmploye[nom].avances.push(av); }
    });

    let totalBrutCycle = 0, totalDeductionsCycle = 0;
    const bulletinsAInserer = [];

    for (const nom of Object.keys(parEmploye)) {
      const infos = parEmploye[nom];
      const empRow = data.employees.find((e) => e.nom === nom);
      const logs = infos.logs || [];

      const gains = [];
      const salJour = logs.filter((w) => w.type_paie === "Jour" && w.mode_paie !== "rendement" && w.mode_paie !== "production").reduce((s, w) => s + Number(w.quantite) * Number(w.taux), 0);
      if (salJour > 0) gains.push({ rubrique: "SAL_JOUR", montant: salJour, explication: "Salaire journalier" });

      const salHeure = logs.filter((w) => w.type_paie === "Heures" && w.mode_paie !== "rendement" && w.mode_paie !== "production").reduce((s, w) => s + Number(w.quantite) * Number(w.taux), 0);
      if (salHeure > 0) gains.push({ rubrique: "SAL_HEURE", montant: salHeure, explication: "Salaire horaire" });

      const prod = logs.filter((w) => w.mode_paie === "rendement" || w.mode_paie === "production").reduce((s, w) => s + Number(w.quantite_recoltee || w.quantite) * Number(w.prix_unitaire_rendement || w.taux), 0);
      if (prod > 0) gains.push({ rubrique: "PROD", montant: prod, explication: "Production / rendement" });

      const heuresSup = logs.reduce((s, w) => s + Number(w.heures_sup || 0) * Number(w.taux) * data.majorationHeuresSup, 0);
      if (heuresSup > 0) gains.push({ rubrique: "HEURES_SUP", montant: heuresSup, explication: `Heures supplémentaires (×${data.majorationHeuresSup})` });

      const indemnites = logs.reduce((s, w) => s + Number(w.indemnite_transport || 0) + Number(w.indemnite_repas || 0), 0);
      if (indemnites > 0) gains.push({ rubrique: "INDEMNITES", montant: indemnites, explication: "Transport + repas" });

      const deductions = [];
      const avancesEmp = (infos.avances || []).reduce((s, a) => s + Number(a.montant), 0);
      if (avancesEmp > 0) {
        deductions.push({ rubrique: "AVANCE", montant: avancesEmp, explication: "Avances approuvées et non remboursées" });
        for (const av of infos.avances) {
          await supabase.from("avances_salaire").update({ cycle_id: cycleId, statut: "rembourse" }).eq("id", av.id);
        }
      }

      const absencesEmp = (infos.absences || []).filter((a) => a.type === "absence_non_justifiee").length;
      const tarifJour = (empRow && Number(empRow.salaireJournalier)) || 0;
      const deductionAbsence = absencesEmp * tarifJour;
      if (deductionAbsence > 0) deductions.push({ rubrique: "ABSENCE", montant: deductionAbsence, explication: `${absencesEmp} jour(s) d'absence non justifiée` });

      const totalBrut = gains.reduce((s, g) => s + g.montant, 0);
      const totalDeductions = deductions.reduce((s, d) => s + d.montant, 0);
      const netAPayer = totalBrut - totalDeductions;

      const anomalies = [];
      if (logs.length === 0) anomalies.push("Aucun pointage sur la période");
      if (netAPayer < 0) anomalies.push("Net négatif — à vérifier");
      const nonConfirmes = logs.filter((w) => !w.confirme).length;
      if (nonConfirmes > 0) anomalies.push(`${nonConfirmes} pointage(s) non confirmé(s)`);
      const sansTarif = logs.filter((w) => Number(w.taux) === 0 && w.mode_paie === "temps").length;
      if (sansTarif > 0) anomalies.push(`${sansTarif} pointage(s) sans tarif défini`);
      const prodSansParcelle = logs.filter((w) => (w.mode_paie === "production" || w.mode_paie === "rendement") && !w.parcelle_id).length;
      if (prodSansParcelle > 0) anomalies.push(`${prodSansParcelle} production(s) sans parcelle liée`);

      totalBrutCycle += totalBrut;
      totalDeductionsCycle += totalDeductions;

      bulletinsAInserer.push({
        cycle_id: cycleId, farm_id: currentFarmId, employee_id: empRow ? empRow.id : null, nom_ouvrier: nom,
        jours: logs.filter((w) => w.type_paie === "Jour").reduce((s, w) => s + Number(w.quantite), 0),
        heures: logs.filter((w) => w.type_paie === "Heures").reduce((s, w) => s + Number(w.quantite), 0),
        gains_detail: gains, deductions_detail: deductions,
        total_brut: totalBrut, total_deductions: totalDeductions, net_a_payer: netAPayer,
        statut_validation: anomalies.length > 0 ? "probleme" : "valide", anomalies,
      });
    }

    await supabase.from("bulletins_paie").delete().eq("cycle_id", cycleId);
    if (bulletinsAInserer.length > 0) await supabase.from("bulletins_paie").insert(bulletinsAInserer);

    await supabase.from("cycles_paie").update({
      statut: "calcule", total_brut: totalBrutCycle, total_deductions: totalDeductionsCycle, total_net: totalBrutCycle - totalDeductionsCycle,
    }).eq("id", cycleId);

    await loadCycles(currentFarmId);
    setSelectedCycleId(cycleId);
    await loadBulletins(cycleId);
  }

  async function loadBulletins(cycleId) {
    const { data: rows } = await supabase.from("bulletins_paie").select("*").eq("cycle_id", cycleId);
    setBulletinsActifs((rows || []).map((b) => ({
      id: b.id, nomEmploye: b.nom_ouvrier, totalBrut: Number(b.total_brut) || 0,
      totalDeductions: Number(b.total_deductions) || 0, netAPayer: Number(b.net_a_payer) || 0,
      anomalies: b.anomalies || [], gainsDetail: b.gains_detail || [], deductionsDetail: b.deductions_detail || [],
    })));
  }

  async function changerStatutCycle(cycleId, nouveauStatut) {
    await supabase.from("cycles_paie").update({ statut: nouveauStatut }).eq("id", cycleId);
    await loadCycles(currentFarmId);
  }

  async function loadAccidents(farmId) {
    const { data: rows } = await supabase.from("accidents_travail").select("*").eq("farm_id", farmId).order("created_at", { ascending: false });
    setAccidents((rows || []).map((a) => ({ id: a.id, nomEmploye: a.nom_employe, dateAccident: a.date_accident, description: a.description, gravite: a.gravite, actionPrise: a.action_prise })));
  }
  async function addAccident() {
    if (!accForm.nomEmploye.trim() || !accForm.description.trim()) return;
    const { error } = await supabase.from("accidents_travail").insert({
      farm_id: currentFarmId, nom_employe: accForm.nomEmploye, gravite: accForm.gravite,
      description: accForm.description, action_prise: accForm.actionPrise || null,
    });
    if (error) { alert("مشكل: " + error.message); return; }
    setAccForm({ nomEmploye: "", gravite: "leger", description: "", actionPrise: "" });
    setShowAddAccident(false);
    await loadAccidents(currentFarmId);
  }

  async function saveInventaire(stockItem) {
    const compte = jerdForm[stockItem.id];
    if (compte === undefined || compte === "") return;
    const quantiteComptee = Number(compte);
    const ecart = quantiteComptee - stockItem.kammiya;
    const { error } = await supabase.from("inventaire_physique").insert({
      farm_id: currentFarmId, stock_item_id: stockItem.id,
      quantite_theorique: stockItem.kammiya, quantite_comptee: quantiteComptee, ecart,
    });
    if (error) { alert("مشكل: " + error.message); return; }
    await supabase.from("stock_items").update({ kammiya: quantiteComptee }).eq("id", stockItem.id);
    if (Math.abs(ecart) > 0) {
      alert(`تم تسجيل الجرد. الفرق: ${ecart > 0 ? "+" : ""}${ecart} ${stockItem.wehda}`);
    }
    setJerdForm({ ...jerdForm, [stockItem.id]: "" });
    await loadFarmDetails(currentFarmId);
  }

  async function addStockMovement() {
    if (!sForm.nom.trim() || !sForm.kammiya) return;
    const n = Number(sForm.kammiya);
    const existing = data.stock.find((s) => s.nom === sForm.nom);
    let nouvelleKammiya = n;
    let seuilItem = Number(sForm.seuil) || 10;
    if (existing) {
      nouvelleKammiya = sForm.mouvement === "Entrée" ? existing.kammiya + n : Math.max(0, existing.kammiya - n);
      seuilItem = existing.seuil;
      const updatePatch = { kammiya: nouvelleKammiya };
      if (sForm.mouvement === "Entrée") {
        if (sForm.expiryDate) updatePatch.expiry_date = sForm.expiryDate;
        if (sForm.lotNumber) updatePatch.lot_number = sForm.lotNumber;
      }
      const { error } = await supabase.from("stock_items").update(updatePatch).eq("id", existing.id);
      if (error) { alert("Problème de stock : " + error.message); return; }
    } else {
      const { error } = await supabase.from("stock_items").insert({
        farm_id: currentFarmId, nom: sForm.nom, categorie: sForm.categorie, kammiya: n, wehda: sForm.wehda, seuil: seuilItem,
        expiry_date: sForm.expiryDate || null, lot_number: sForm.lotNumber || null,
        unite_achat: sForm.uniteAchat || null, ratio_conversion: Number(sForm.ratioConversion) || 1,
      });
      if (error) { alert("Problème de stock : " + error.message); return; }
    }

    // Demande automatique quand le stock atteint le seuil d'alerte — sans doublon si une demande est déjà ouverte
    if (nouvelleKammiya <= seuilItem) {
      const dejaTalab = commandesGlobal.some((cmd) => cmd.farmId === currentFarmId && cmd.produit === sForm.nom && (cmd.statut === "Nouveau" || cmd.statut === "Commandé"));
      if (!dejaTalab) {
        await supabase.from("commandes").insert({
          farm_id: currentFarmId, demande_par: "Système (automatique)", produit: sForm.nom,
          qte: seuilItem * 2, wehda: sForm.wehda || "kilo",
          motif: `Stock à ${nouvelleKammiya} (seuil ${seuilItem}) — demande automatique`, statut: "Nouveau",
        });
      }
    }

    if (sForm.mouvement === "Entrée" && sForm.prix) {
      const bonReceptionNumero = `BR-${Math.floor(Math.random() * 9000 + 1000)}`;
      const manque = [];
      if (!sForm.poNumero) manque.push("Bon de commande");
      if (!sForm.factureFile) manque.push("Photo du bon de livraison/facture");
      const complet = manque.length === 0;
      setAchatsGlobal([{ id: Date.now(), farmId: currentFarmId, farmNom: data.nom, produit: sForm.nom, kammiya: n, wehda: sForm.wehda, prix: Number(sForm.prix), fournisseur: sForm.fournisseur || "—", date: "20 juillet", vu: false, factureFile: sForm.factureFile, factureNom: sForm.factureNom, poNumero: sForm.poNumero, bonReceptionNumero, complet }, ...achatsGlobal]);
      if (!complet) {
        setAlertesIncompletes([{ id: Date.now(), farmNom: data.nom, personne: currentUser.nom, produit: sForm.nom, manque, date: "20 juillet" }, ...alertesIncompletes]);
      }
    }
    setSForm({ nom: "", categorie: "Produit phyto", wehda: "kilo", mouvement: "Entrée", kammiya: "", seuil: "", prix: "", fournisseur: "", factureFile: "", factureNom: "", poNumero: "", expiryDate: "", lotNumber: "", uniteAchat: "", ratioConversion: "1" });
    setShowAddStock(false);
    await loadFarmDetails(currentFarmId);
    await loadCommandes();
  }

  function addInvoice() {
    if (!invForm.client.trim() || !invForm.qte || !invForm.prixUnitaire) return;
    const qte = Number(invForm.qte), pu = Number(invForm.prixUnitaire), tva = Number(invForm.tva) || 0;
    const montantHT = qte * pu;
    const montantTVA = montantHT * (tva / 100);
    const numero = `FAC-${Math.floor(Math.random() * 9000 + 1000)}`;
    updateFarm({ invoices: [{ id: Date.now(), numero, date: "20 juillet", client: invForm.client, produit: invForm.produit, qte, prixUnitaire: pu, tva, montantHT, montantTVA, montantTTC: montantHT + montantTVA }, ...data.invoices] });
    setInvForm({ client: "", produit: "avocat", qte: "", prixUnitaire: "", tva: "" });
    setShowAddInvoice(false);
  }

  function exportInvoice(inv) {
    const aoa = [
      [`Zero Manuel — ${data.nom}`],
      ["فاتورة / Facture"],
      [`رقم: ${inv.numero}`],
      [`التاريخ: ${inv.date}`],
      [],
      ["Client", inv.client],
      [],
      ["المنتج", "Quantité (kg)", "Prix unitaire (DH)", "Montant HT (DH)"],
      [inv.produit, inv.qte, inv.prixUnitaire, inv.montantHT],
      [],
      ["Total HT", inv.montantHT],
      [`TVA (${inv.tva}%)`, inv.montantTVA],
      ["Total TTC", inv.montantTTC],
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
      ["Note : ceci est un résumé interne, pas une déclaration fiscale officielle — consultez votre comptable agréé"],
      [],
      ["Numéro de facture", "التاريخ", "Client", "HT", "TVA", "TTC"],
      ...data.invoices.map((i) => [i.numero, i.date, i.client, i.montantHT, i.montantTVA, i.montantTTC]),
      [],
      ["Total", "", "", totalHT, totalTVA, totalTTC],
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tax Summary");
    XLSX.writeFile(wb, `tva-summary-${data.nom.replace(/\s/g, "-")}.xlsx`);
  }

  async function addCommande() {
    if (!cmdForm.produit.trim() || !cmdForm.qte) return;
    const destId = cmdForm.destFarmId || currentFarmId;
    const { error } = await supabase.from("commandes").insert({
      farm_id: currentFarmId, dest_farm_id: destId, demande_par: currentUser.nom,
      produit: cmdForm.produit, qte: Number(cmdForm.qte), wehda: cmdForm.wehda,
      motif: cmdForm.motif || "—", statut: "Nouveau",
    });
    if (error) { alert("وقع مشكل: " + error.message); return; }
    setCmdForm({ produit: "", qte: "", wehda: "kilo", motif: "", destFarmId: "" });
    setShowAddCommande(false);
    await loadCommandes();
  }

  function exportBonCommande(cmd) {
    const aoa = [
      ["Zero Manuel — Bon de commande"],
      [`رقم Le bon: ${cmd.poNumero}`],
      [`التاريخ: ${cmd.date}`],
      [],
      ["Ferme demandeuse", cmd.farmNom],
      ["Demandeur", cmd.demandePar],
      ["Motif", cmd.motif],
      [],
      ["المنتج", "الكمية", "Unité", "Prix total (DH)"],
      [cmd.produit, cmd.qte, cmd.wehda, cmd.prix],
      [],
      ["Fournisseur", cmd.fournisseur],
      ["بريد Fournisseur", cmd.fournisseurEmail],
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 22 }, { wch: 26 }, { wch: 14 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bon de Commande");
    XLSX.writeFile(wb, `bon-commande-${cmd.poNumero}.xlsx`);
  }

  async function processCommande(id) {
    if (!poForm.fournisseur.trim() || !poForm.prix) return;
    const poNumero = `PO-${Math.floor(Math.random() * 9000 + 1000)}`;
    const { error } = await supabase.from("commandes").update({
      statut: "Commandé", fournisseur: poForm.fournisseur, fournisseur_email: poForm.fournisseurEmail,
      prix: poForm.prix, po_numero: poNumero,
    }).eq("id", id);
    if (error) { alert("وقع مشكل: " + error.message); return; }
    const cmd = commandesGlobal.find((x) => x.id === id);
    const updated = { ...cmd, statut: "Commandé", fournisseur: poForm.fournisseur, fournisseurEmail: poForm.fournisseurEmail, prix: poForm.prix, poNumero };
    setPoForm({ fournisseur: "", fournisseurEmail: "", prix: "" });
    setProcessingId(null);
    await loadCommandes();
    setTimeout(() => exportBonCommande(updated), 100);
  }

  function mailtoLink(cmd) {
    const subject = encodeURIComponent(`Bon de commande ${cmd.poNumero} — ${cmd.produit}`);
    const body = encodeURIComponent(`Bonjour,\n\nVeuillez trouver ci-joint le bon de commande n° ${cmd.poNumero} :\n- Produit : ${cmd.produit}\n- Quantité : ${cmd.qte} ${cmd.wehda}\n- Prix total : ${cmd.prix} DH\n- Ferme demandeuse : ${cmd.farmNom}\n\nMerci,\nZero Manuel`);
    return `mailto:${cmd.fournisseurEmail}?subject=${subject}&body=${body}`;
  }

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Votre navigateur ne supporte pas la reconnaissance vocale — essayez Chrome"); return; }
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
    const wazinAttente = data.wazin.filter((w) => w.statut === "En attente").map((w) => `${w.wazan}: ${w.kg}kg × ${w.prixKg}DH`);

    // مقارنة تكلفة اليد العاملة بين آخر دورتين ديال الأجر
    const cyclesCalcules = cyclesPaie.filter((cy) => cy.totalBrut > 0).sort((a, b) => new Date(b.periodeDebut) - new Date(a.periodeDebut));
    let comparaisonCycles = "ماكاينش دورتين محسوبتين للمقارنة";
    if (cyclesCalcules.length >= 2) {
      const [actuel, precedent] = cyclesCalcules;
      const variation = precedent.totalBrut > 0 ? (((actuel.totalBrut - precedent.totalBrut) / precedent.totalBrut) * 100).toFixed(1) : "—";
      comparaisonCycles = `Cycle actuel (${actuel.periodeDebut}→${actuel.periodeFin}): ${actuel.totalBrut.toFixed(0)}DH | Cycle précédent (${precedent.periodeDebut}→${precedent.periodeFin}): ${precedent.totalBrut.toFixed(0)}DH | Variation: ${variation}%`;
    }

    const heuresSupTotal = data.workers.reduce((s, w) => s + (w.heuresSup || 0), 0);
    const nbEmployesUniques = new Set(data.workers.map((w) => w.nom)).size;
    const productionTotaleLots = lots.reduce((s, l) => s + l.quantiteKg, 0);
    const anomaliesQualite = controlesQualite.filter((q) => q.statut === "rejete" || q.statut === "accepte_condition").length;
    const coutTransportTotal = expeditions.reduce((s, e) => s + (e.coutTransport || 0), 0);

    const context = `
معطيات فيرمة "${data.nom}" Aujourd'hui (20 Juillet 2026):
- Production du jour: ${kpis.totalHarvest} kg — Production totale (Lots créés): ${productionTotaleLots} kg
- Coûts du mois: ${kpis.totalCost} DH (Produit phyto: ${kpis.totalDawa}, Eau+Main-d'œuvre: ${kpis.totalMaOmal})
- عدد Employés Aujourd'hui: ${data.workers.length} (${nbEmployesUniques} personnes uniques), مجموع leur paie: ${kpis.totalKhlas} DH
- Heures supplémentaires totales enregistrées: ${heuresSupTotal}h
- مقارنة تكلفة اليد العاملة بين دورتين: ${comparaisonCycles}
- Coût transport total (Expéditions): ${coutTransportTotal} DH
- Anomalies qualité (rejeté/sous condition): ${anomaliesQualite}
- Rentabilité لكل parcelle: ${rentabilite.map((r) => `${r.code}(${r.nom}): Revenu ${r.revenu}DH, Coût ${r.cout}DH, Bénéfice ${r.profit}DH (${r.marge}%)`).join(" | ")}
- Alertes Stock: ${stockAlerts.length ? stockAlerts.join(", ") : "Aucun(e)"}
- وزينات En attente الأداء: ${wazinAttente.length ? wazinAttente.join(", ") : "Aucun(e)"}
- Déclaration CNSS pour ce mois: ${data.cnss.declare ? "Fait" : "Pas encore fait"}
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
            content: `Vous êtes un analyste financier et agricole expert travaillant avec une ferme d'avocats et de fraises au Maroc. Répondez en français, de façon concise et directe, avec des points clairs, en vous basant uniquement sur les données réelles suivantes (n'inventez aucun chiffre) :\n\n${context}\n\nQuestion de l'utilisateur : ${question}`,
          }],
        }),
      });
      const json = await resp.json();
      const textBlocks = (json.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
      const finalText = textBlocks || "Je n'ai pas pu répondre pour le moment, réessayez.";
      setAnalystMessages((prev) => [...prev, { role: "assistant", text: finalText }]);
      if (autoSpeak) speakText(finalText);
    } catch (err) {
      setAnalystMessages((prev) => [...prev, { role: "assistant", text: "Problème de connexion à l'assistant. Réessayez plus tard." }]);
    }
    setAnalystLoading(false);
  }

  function addIncident() {
    if (!issueForm.probleme.trim()) return;
    setIncidentsGlobal([{ id: Date.now(), farmNom: data.nom, gps: data.gps, produit: issueForm.produit, probleme: issueForm.probleme, severite: issueForm.severite, date: "20 juillet" }, ...incidentsGlobal]);
    setIssueForm({ produit: "avocat", probleme: "", severite: "Moyen" });
    setShowReportIssue(false);
  }

  function addListing() {
    if (!mForm.produit.trim() || !mForm.kammiya) return;
    setMarketplaceGlobal([{ id: Date.now(), farmId: currentFarmId, farmNom: data.nom, type: mForm.type, produit: mForm.produit, kammiya: Number(mForm.kammiya), wehda: mForm.wehda, prix: mForm.prix, description: mForm.description, contactNom: currentUser.nom, contactTel: mForm.contactTel || "—", date: "20 juillet" }, ...marketplaceGlobal]);
    setMForm({ type: "J'offre", produit: "", kammiya: "", wehda: "kilo", prix: "", description: "", contactTel: "" });
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
        parcelles: [], workers: [], wazin: [], costs: [], plan: [], depenses: [], stock: [], invoices: [], cnss: { echeanceJour: 10, moisLabel: "Juillet 2026", declare: false, dateDeclare: "" }, employees: [],
      },
    }));
    setFForm({ nom: "", lat: "", lng: "" });
    setShowAddFarm(false);
    switchFarm(id);
  }

  return (
    <div dir="ltr" style={{ background: c.bg, minHeight: "100vh", color: c.ink, fontFamily: "'Inter', sans-serif", paddingBottom: 80 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@700;800;900&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@600&display=swap');
        .font-display { font-family: 'Manrope', sans-serif; letter-spacing: -0.01em; }
        button { transition: all 0.15s ease; cursor: pointer; }
        button:active { transform: scale(0.98); }
        ::selection { background: #2A9D8F; color: #fff; }
        @keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(193,89,79,0.5); } 50% { box-shadow: 0 0 0 8px rgba(193,89,79,0); } }
        #bottomNav { scroll-snap-type: x proximity; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        #bottomNav::-webkit-scrollbar { display: none; }`}</style>

      <header style={{ background: `linear-gradient(135deg, ${c.headerGreenLight} 0%, ${c.headerGreen} 100%)`, boxShadow: "0 4px 20px rgba(33,102,92,0.18)" }} className="px-5 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div style={{ borderRadius: 12, width: 40, height: 40, overflow: "hidden" }} className="flex items-center justify-center"><ZMLogo size={40} /></div>
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
          <button onClick={() => setShowGlobalSearch(true)}><Search size={19} color="#fff" /></button>
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowNotifPanel(!showNotifPanel)} style={{ position: "relative" }}>
              <Bell size={19} color="#fff" />
              <span style={{ position: "absolute", top: -5, left: -6, background: c.danger, color: "#fff", fontSize: "0.6rem", fontWeight: 700, borderRadius: 999, width: 15, height: 15 }} className="flex items-center justify-center">{notifications.length}</span>
            </button>
            {showNotifPanel && (
              <div style={{ position: "absolute", top: 32, left: 0, width: 300, background: c.white, borderRadius: 14, boxShadow: "0 12px 30px rgba(0,0,0,0.18)", zIndex: 30, maxHeight: 380, overflowY: "auto" }} className="p-2">
                {notifications.length === 0 && <p style={{ color: c.inkMuted2, fontSize: "0.78rem", padding: "10px" }}>Aucune notification</p>}
                {notifications.map((n, i) => (
                  <div key={i} style={{ borderBottom: i < notifications.length - 1 ? `1px solid ${c.line}` : "none" }} className="p-2.5 flex items-start gap-2">
                    <AlertTriangle size={14} color={n.severite === "danger" ? c.danger : c.orange} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: "0.76rem", color: c.inkSoft }}>{n.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={async () => { await supabase.auth.signOut(); setCurrentUser(null); setFarms({}); setCurrentFarmId(null); }}><LogOut size={18} color="rgba(255,255,255,0.85)" /></button>
        </div>
      </header>

      {!isOnline && (
        <div style={{ background: c.orange }} className="px-5 py-2 flex items-center gap-2 sticky top-0 z-10">
          <WifiOff size={14} color="#fff" />
          <span style={{ color: "#fff", fontSize: "0.76rem", fontWeight: 700 }}>Hors ligne — les données sont enregistrées localement et seront synchronisées au retour du réseau</span>
        </div>
      )}
      {isOnline && pendingSync.length > 0 && (
        <div style={{ background: c.blue }} className="px-5 py-2 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2"><RefreshCw size={14} color="#fff" /><span style={{ color: "#fff", fontSize: "0.76rem", fontWeight: 700 }}>{pendingSync.length} opération(s) enregistrée(s) localement en cours de synchronisation...</span></div>
          <button onClick={syncPendingQueue} style={{ background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: "3px 10px" }}><span style={{ color: "#fff", fontSize: "0.7rem", fontWeight: 700 }}>Réessayer</span></button>
        </div>
      )}

      <main className="p-4">
        {tab === "Tableau de bord" && (() => {
          const employesPresents = new Set(data.workers.map((w) => w.nom)).size;
          const productionTotale = lots.reduce((s, l) => s + l.quantiteKg, 0);
          const stockFaible = data.stock.filter((s) => s.kammiya <= s.seuil).length;
          const qualityAlerts = controlesQualite.filter((q) => q.statut === "rejete" || q.statut === "accepte_condition").length;
          const payrollAlerts = cyclesPaie.filter((cy) => cy.statut === "brouillon" && cy.periodeFin && new Date(cy.periodeFin) < new Date()).length
            + bulletinsActifs.filter((b) => b.anomalies.length > 0).length;
          const cards = [
            { icon: Building2, label: "Fermes", value: myFarmIds.length, tab: "Fermes", color: c.cardGreen },
            { icon: Sprout, label: "Parcelles actives", value: data.parcelles.length, tab: "Parcelles", color: c.cardGreen },
            { icon: Users, label: "Employés présents", value: employesPresents, tab: "Employés", color: c.cardGreen },
            { icon: Package, label: "Production (Lots)", value: `${productionTotale.toFixed(0)} kg`, tab: "Parcelles", color: c.blue },
            { icon: Package, label: "Stock faible", value: stockFaible, tab: "Stock", color: stockFaible > 0 ? c.danger : c.cardGreen },
            { icon: Package, label: "Lots créés", value: lots.length, tab: "Parcelles", color: c.blue },
            { icon: Truck, label: "Expéditions", value: expeditions.length, tab: "Parcelles", color: c.blue },
            { icon: Wallet, label: "Coût main-d'œuvre (jour)", value: `${kpis.totalKhlas} DH`, tab: "Employés", color: c.orange },
            { icon: AlertTriangle, label: "Alertes qualité", value: qualityAlerts, tab: "Parcelles", color: qualityAlerts > 0 ? c.danger : c.cardGreen },
            { icon: AlertTriangle, label: "Alertes paie", value: payrollAlerts, tab: "Employés", color: payrollAlerts > 0 ? c.danger : c.cardGreen },
          ];
          return (
          <>
            <h2 className="font-display mb-3" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>Aujourd'hui — {data.nom}</h2>
            <div className="grid grid-cols-2 gap-2.5 mb-6">
              {cards.map((card) => {
                const Icon = card.icon;
                return (
                  <button key={card.label} onClick={() => setTab(card.tab)} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 14, textAlign: "right", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-3">
                    <div style={{ background: `${card.color}18`, borderRadius: 10, width: 32, height: 32 }} className="flex items-center justify-center mb-2">
                      <Icon size={16} color={card.color} />
                    </div>
                    <div className="font-mono" style={{ fontWeight: 800, fontSize: "1.15rem", color: c.ink }}>{card.value}</div>
                    <div style={{ fontSize: "0.68rem", color: c.inkMuted2 }}>{card.label}</div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <StatCard title={{ icon: <Sprout size={17} color="#fff" />, label: "Production du jour" }} value={kpis.totalHarvest.toLocaleString()} unit="kg"
                sub={[{ label: "parcelles", value: data.parcelles.length }, { label: "hectares", value: data.parcelles.reduce((s, p) => s + p.ha, 0).toFixed(1) }]} />
              <StatCard title={{ icon: <Wallet size={17} color="#fff" />, label: "Coûts du mois" }} value={kpis.totalCost.toLocaleString()} unit="DH"
                sub={[{ label: "Produit phyto", value: `${kpis.totalDawa} DH` }, { label: "Eau + main-d'œuvre", value: `${kpis.totalMaOmal} DH` }]} />
              <StatCard title={{ icon: <Users size={17} color="#fff" />, label: "Équipe du jour" }} value={data.workers.length} unit="Main-d'œuvre"
                sub={[{ label: "heures", value: `${kpis.totalHeures} س` }, { label: "Paie du jour", value: `${kpis.totalKhlas} DH` }]} />
              <StatCard title={{ icon: <AlertTriangle size={17} color="#fff" />, label: "Envoi En attente الأداء" }} value={kpis.enAttente} unit="Envoi" variant="orange" />
            </div>

            <div>
              <h2 className="font-display mb-3" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>Alertes</h2>
              <div className="flex flex-col gap-2">
                {alertes.map((a, i) => { const Icon = a.icon; return (
                  <div key={i} style={{ background: c.white, border: `1px solid ${c.line}`, borderRight: `4px solid ${c.orange}`, borderRadius: 12 }} className="p-3 flex items-center gap-3">
                    <Icon size={17} color={c.orange} /><span style={{ fontSize: "0.82rem", color: c.inkSoft }}>{a.texte}</span>
                  </div>
                );})}
              </div>
            </div>
          </>
          );
        })()}

        {tab === "Fermes" && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>Fermes à moi ({myFarmIds.length})</h2>
              <AddButton label="Ajouter une ferme" open={showAddFarm} onClick={() => setShowAddFarm(!showAddFarm)} />
            </div>
            <p style={{ color: c.inkMuted2, fontSize: "0.72rem" }} className="mb-3">Chaque ferme est totalement isolée — personne ne voit les données d'une autre ferme sauf s'il y a accès</p>
            {showAddFarm && (
              <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-4 grid grid-cols-3 gap-3">
                <Field label="Nom de la ferme"><input value={fForm.nom} onChange={(e) => setFForm({ ...fForm, nom: e.target.value })} placeholder="ex. Ferme Souss" style={inputStyle} /></Field>
                <Field label="GPS Lat (optionnel)"><input value={fForm.lat} onChange={(e) => setFForm({ ...fForm, lat: e.target.value })} placeholder="34.92" style={inputStyle} /></Field>
                <Field label="GPS Lng (optionnel)"><input value={fForm.lng} onChange={(e) => setFForm({ ...fForm, lng: e.target.value })} placeholder="-6.10" style={inputStyle} /></Field>
                <div className="col-span-3"><button onClick={addFarm} style={{ background: c.cardGreen, color: "#fff", borderRadius: 11, padding: "10px 0", boxShadow: "0 4px 14px -3px rgba(42,157,143,0.4)", fontWeight: 700, width: "100%" }}>Créer la ferme</button></div>
              </div>
            )}
            <div className="flex flex-col gap-2 mb-4">
              {myFarmIds.map((fid) => {
                const f = farms[fid]; const active = fid === currentFarmId;
                return (
                  <button key={fid} onClick={() => switchFarm(fid)} style={{ background: c.white, border: `1.5px solid ${active ? c.cardGreen : c.line}`, borderRadius: 14, textAlign: "right" }} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div style={{ background: c.bg, borderRadius: 10, width: 36, height: 36 }} className="flex items-center justify-center"><Building2 size={16} color={c.cardGreen} /></div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>{f.nom}</div>
                        <div style={{ fontSize: "0.68rem", color: c.inkMuted2 }}>{f.parcelles.length} parcelles · {f.workers.length} Main-d'œuvre</div>
                      </div>
                    </div>
                    {active && <span style={{ fontSize: "0.68rem", fontWeight: 700, color: c.cardGreenDeep }}>Ouverte actuellement</span>}
                  </button>
                );
              })}
            </div>

            {canManageFarms && myFarmIds.length > 1 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 style={{ fontWeight: 700, fontSize: "0.85rem" }}>Coût main-d'œuvre par ferme</h3>
                  <button onClick={calculerCoutParFerme} style={{ background: c.blue, color: "#fff", borderRadius: 10, padding: "6px 12px", fontSize: "0.72rem", fontWeight: 700 }}>Calculer</button>
                </div>
                {coutParFerme.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {coutParFerme.map((cf) => (
                      <div key={cf.farmId} className="flex items-center justify-between" style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 12 }}>
                        <span className="px-3 py-2" style={{ fontSize: "0.8rem", fontWeight: 600 }}>{cf.nom}</span>
                        <span className="px-3 py-2 font-mono" style={{ fontWeight: 700 }}>{cf.cout.toFixed(0)} DH</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "Commandes" && (() => {
          if (isLocked("Commandes")) return <LockedFeature nom="Commandes" />;
          const mesCommandes = canManageFarms ? commandesGlobal.filter((cmd) => myFarmIds.includes(cmd.farmId)) : commandesGlobal.filter((cmd) => cmd.farmId === currentFarmId);
          const nouvelles = mesCommandes.filter((cmd) => cmd.statut === "Nouveau");
          return (
            <div>
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-display" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>{canManageFarms ? "Commandes — toutes les fermes" : "Commandes de la ferme"}</h2>
                <AddButton label="طلب Nouveau" open={showAddCommande} onClick={() => setShowAddCommande(!showAddCommande)} />
              </div>
              <p style={{ color: c.inkMuted2, fontSize: "0.72rem" }} className="mb-4">{canManageFarms ? "Chaque demande de n'importe quelle ferme arrive ici — créez un bon de commande et envoyez-le au fournisseur" : "Faites une demande et elle arrivera au responsable pour l'achat"}</p>

              {showAddCommande && (
                <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-4 grid grid-cols-2 gap-3">
                  <Field label="المنتج"><input value={cmdForm.produit} onChange={(e) => setCmdForm({ ...cmdForm, produit: e.target.value })} placeholder="ex. Fongicide" style={inputStyle} /></Field>
                  <Field label="الكمية"><input type="number" value={cmdForm.qte} onChange={(e) => setCmdForm({ ...cmdForm, qte: e.target.value })} style={inputStyle} /></Field>
                  <Field label="Unité"><select value={cmdForm.wehda} onChange={(e) => setCmdForm({ ...cmdForm, wehda: e.target.value })} style={inputStyle}><option>kilo</option><option>litre</option><option>sac</option><option>وحدة</option></select></Field>
                  <Field label="Motif"><input value={cmdForm.motif} onChange={(e) => setCmdForm({ ...cmdForm, motif: e.target.value })} placeholder="ex. Stock épuisé" style={inputStyle} /></Field>
                  {canManageFarms && myFarmIds.length > 1 && (
                    <Field label="Ferme de destination (où la marchandise sera reçue)">
                      <select value={cmdForm.destFarmId} onChange={(e) => setCmdForm({ ...cmdForm, destFarmId: e.target.value })} style={inputStyle}>
                        <option value="">Ferme actuelle ({data.nom})</option>
                        {myFarmIds.filter((fid) => fid !== currentFarmId).map((fid) => (<option key={fid} value={fid}>{farms[fid].nom}</option>))}
                      </select>
                    </Field>
                  )}
                  <div className="col-span-2"><button onClick={addCommande} style={{ background: c.cardGreen, color: "#fff", borderRadius: 11, padding: "10px 0", fontWeight: 700, width: "100%", boxShadow: "0 4px 14px -3px rgba(42,157,143,0.4)" }}>Envoyer la demande</button></div>
                </div>
              )}

              {canManageFarms && nouvelles.length > 0 && (
                <div style={{ background: "rgba(244,162,97,0.1)", border: `1px solid ${c.orange}`, borderRadius: 14 }} className="p-3 mb-4 flex items-center gap-2">
                  <Bell size={16} color={c.orange} /><span style={{ fontSize: "0.82rem", fontWeight: 700, color: c.inkSoft }}>Vous avez {nouvelles.length} طلب Nouveau كيتسنى المعالجة</span>
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
                      <span style={{ fontSize: "0.68rem", fontWeight: 700, color: cmd.statut === "Nouveau" ? c.orange : c.cardGreenDeep, background: cmd.statut === "Nouveau" ? "rgba(244,162,97,0.14)" : "rgba(42,157,143,0.12)", borderRadius: 999, padding: "3px 9px" }}>{cmd.statut}</span>
                    </div>
                    {cmd.destFarmId && cmd.destFarmId !== cmd.farmId && (
                      <div className="flex items-center gap-1.5 mb-2" style={{ fontSize: "0.74rem", color: c.blue, fontWeight: 700 }}>
                        <ArrowRight size={12} /> destinée à la ferme : {cmd.destFarmNom}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 mb-2" style={{ fontSize: "0.78rem" }}>
                      <div className="flex justify-between"><span style={{ color: c.inkMuted2 }}>Demandé par</span><span style={{ fontWeight: 600, color: cmd.demandePar.includes("Automatique") ? c.blue : c.ink }}>{cmd.demandePar.includes("Automatique") ? "🤖 " : ""}{cmd.demandePar}</span></div>
                      <div className="flex justify-between"><span style={{ color: c.inkMuted2 }}>الكمية</span><span className="font-mono" style={{ fontWeight: 600 }}>{cmd.qte} {cmd.wehda}</span></div>
                      <div className="flex justify-between"><span style={{ color: c.inkMuted2 }}>Motif</span><span>{cmd.motif}</span></div>
                      <div className="flex justify-between"><span style={{ color: c.inkMuted2 }}>التاريخ</span><span>{cmd.date}</span></div>
                    </div>

                    {cmd.statut === "Commandé" && (
                      <div style={{ background: c.bg, borderRadius: 10 }} className="p-2.5 flex items-center justify-between">
                        <div style={{ fontSize: "0.76rem" }}><span style={{ color: c.inkMuted2 }}>Fournisseur: </span><span style={{ fontWeight: 700 }}>{cmd.fournisseur}</span><span style={{ color: c.inkMuted2 }}> · {cmd.poNumero} · {cmd.prix} DH</span></div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => exportBonCommande(cmd)} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 8, padding: "5px 9px" }} className="flex items-center gap-1"><Download size={13} color={c.cardGreenDeep} /><span style={{ fontSize: "0.7rem", fontWeight: 700, color: c.cardGreenDeep }}>Le bon</span></button>
                          {cmd.fournisseurEmail && <a href={mailtoLink(cmd)} style={{ background: c.cardGreen, borderRadius: 8, padding: "5px 9px" }} className="flex items-center gap-1"><Mail size={13} color="#fff" /><span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#fff" }}>Envoyer au fournisseur</span></a>}
                        </div>
                      </div>
                    )}

                    {cmd.statut === "Nouveau" && canManageFarms && processingId !== cmd.id && (
                      <button onClick={() => setProcessingId(cmd.id)} style={{ background: c.orange, color: "#fff", borderRadius: 10, padding: "8px 0", fontWeight: 700, fontSize: "0.8rem", width: "100%" }} className="flex items-center justify-center gap-1.5"><FileCheck size={14} />Créer un bon de commande</button>
                    )}
                    {cmd.statut === "Nouveau" && canManageFarms && processingId === cmd.id && (
                      <div style={{ background: c.bg, borderRadius: 12 }} className="p-3 grid grid-cols-3 gap-2 mt-1">
                        <Field label="Fournisseur (nom de l'entreprise)"><input value={poForm.fournisseur} onChange={(e) => setPoForm({ ...poForm, fournisseur: e.target.value })} style={inputStyle} /></Field>
                        <Field label="بريد Fournisseur"><input value={poForm.fournisseurEmail} onChange={(e) => setPoForm({ ...poForm, fournisseurEmail: e.target.value })} placeholder="supplier@example.com" style={inputStyle} /></Field>
                        <Field label="Prix total (DH)"><input type="number" value={poForm.prix} onChange={(e) => setPoForm({ ...poForm, prix: e.target.value })} style={inputStyle} /></Field>
                        <div className="col-span-3 flex gap-2">
                          <button onClick={() => processCommande(cmd.id)} style={{ background: c.cardGreen, color: "#fff", borderRadius: 9, padding: "9px 0", fontWeight: 700, fontSize: "0.8rem", flex: 1 }}>Confirmer et générer le bon</button>
                          <button onClick={() => setProcessingId(null)} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 9, padding: "9px 14px", fontWeight: 700, fontSize: "0.8rem" }}>Annuler</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {mesCommandes.length === 0 && <p style={{ color: c.inkMuted2, fontSize: "0.82rem" }}>Aucun(e) طلبات دابا</p>}
              </div>
            </div>
          );
        })()}

        {tab === "Marché" && (() => {
          if (isLocked("Marché")) return <LockedFeature nom="Marché" />;
          const filtered = marketplaceGlobal.filter((l) => mFilter === "Tout" ? true : mFilter === "Mes annonces" ? l.farmId === currentFarmId : l.type === mFilter);
          return (
            <div>
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-display" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>سوق التبادل بين Fermes</h2>
                <AddButton label="Publier une annonce" open={showAddListing} onClick={() => setShowAddListing(!showAddListing)} />
              </div>
              <p style={{ color: c.inkMuted2, fontSize: "0.72rem" }} className="mb-4">Une ferme a un surplus, une autre en a besoin — échange direct sans intermédiaire</p>

              <div className="flex gap-2 mb-4 flex-wrap">
                {["Tout", "J'offre", "Besoin", "Mes annonces"].map((f) => (
                  <button key={f} onClick={() => setMFilter(f)} style={{ background: mFilter === f ? c.cardGreen : c.white, color: mFilter === f ? "#fff" : c.ink, border: `1px solid ${mFilter === f ? c.cardGreen : c.line}`, borderRadius: 10, padding: "7px 12px", fontSize: "0.78rem", fontWeight: 700 }}>{f}</button>
                ))}
              </div>

              {showAddListing && (
                <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-4 grid grid-cols-3 gap-3">
                  <Field label="Type"><select value={mForm.type} onChange={(e) => setMForm({ ...mForm, type: e.target.value })} style={inputStyle}><option value="J'offre">J'offre للبيع/التبادل</option><option value="Besoin">Besoin نشري</option></select></Field>
                  <Field label="المنتج"><input list="stockNamesM" value={mForm.produit} onChange={(e) => setMForm({ ...mForm, produit: e.target.value })} placeholder="Fongicide..." style={inputStyle} />
                    <datalist id="stockNamesM">{data.stock.map((s) => <option key={s.id} value={s.nom} />)}</datalist>
                  </Field>
                  <Field label="Unité"><select value={mForm.wehda} onChange={(e) => setMForm({ ...mForm, wehda: e.target.value })} style={inputStyle}><option>kilo</option><option>litre</option><option>sac</option><option>وحدة</option></select></Field>
                  <Field label="الكمية"><input type="number" value={mForm.kammiya} onChange={(e) => setMForm({ ...mForm, kammiya: e.target.value })} style={inputStyle} /></Field>
                  <Field label="Prix/unité (DH) — optionnel"><input type="number" value={mForm.prix} onChange={(e) => setMForm({ ...mForm, prix: e.target.value })} style={inputStyle} /></Field>
                  <Field label="Numéro de téléphone de contact"><input value={mForm.contactTel} onChange={(e) => setMForm({ ...mForm, contactTel: e.target.value })} placeholder="0661-..." style={inputStyle} /></Field>
                  <div className="col-span-3"><Field label="Brève description"><input value={mForm.description} onChange={(e) => setMForm({ ...mForm, description: e.target.value })} style={inputStyle} /></Field></div>
                  <div className="col-span-3"><button onClick={addListing} style={{ background: c.cardGreen, color: "#fff", borderRadius: 11, padding: "10px 0", boxShadow: "0 4px 14px -3px rgba(42,157,143,0.4)", fontWeight: 700, width: "100%" }}>Publier l'annonce</button></div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {filtered.map((l) => (
                  <div key={l.id} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span style={{ background: l.type === "J'offre" ? "rgba(42,157,143,0.12)" : "rgba(244,162,97,0.14)", color: l.type === "J'offre" ? c.cardGreenDeep : c.orange, borderRadius: 999, padding: "3px 10px", fontSize: "0.68rem", fontWeight: 700 }}>{l.type}</span>
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
                          <Phone size={13} color="#fff" /><span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#fff" }}>Contacter {l.contactNom}</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && <p style={{ color: c.inkMuted2, fontSize: "0.82rem" }}>Aucune annonce dans cette catégorie pour le moment</p>}
              </div>
            </div>
          );
        })()}

        {tab === "Parcelles" && (() => {
          if (isLocked("Parcelles")) return <LockedFeature nom="Parcelles" />;
          const nearby = incidentsGlobal
            .map((inc) => ({ ...inc, dist: distanceKm(data.gps, inc.gps) }))
            .filter((inc) => inc.dist <= 60)
            .sort((a, b) => a.dist - b.dist);
          return (
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>Alerte précoce — ravageurs et maladies proches de vous</h2>
              <AddButton label="Signaler un problème" open={showReportIssue} onClick={() => setShowReportIssue(!showReportIssue)} />
            </div>
            <p style={{ color: c.inkMuted2, fontSize: "0.72rem" }} className="mb-3">مبني على القرب الجغرافي الحقيقي (GPS) entre tous les utilisateurs de Zero Manuel — rayon de 60 km</p>

            {showReportIssue && (
              <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-4 grid grid-cols-3 gap-3">
                <Field label="Culture affectée"><select value={issueForm.produit} onChange={(e) => setIssueForm({ ...issueForm, produit: e.target.value })} style={inputStyle}><option value="avocat">Avocat</option><option value="fraise">Fraise</option></select></Field>
                <Field label="Nom du ravageur/maladie"><input value={issueForm.probleme} onChange={(e) => setIssueForm({ ...issueForm, probleme: e.target.value })} placeholder="ex. Acarien rouge" style={inputStyle} /></Field>
                <Field label="Gravité"><select value={issueForm.severite} onChange={(e) => setIssueForm({ ...issueForm, severite: e.target.value })} style={inputStyle}><option>Léger</option><option>Moyen</option><option>Grave</option></select></Field>
                <div className="col-span-3"><button onClick={addIncident} style={{ background: c.danger, color: "#fff", borderRadius: 11, padding: "10px 0", fontWeight: 700, width: "100%" }}>Publier l'alerte aux voisins</button></div>
              </div>
            )}

            {nearby.length > 0 ? (
              <div className="flex flex-col gap-2 mb-6">
                {nearby.map((inc) => (
                  <div key={inc.id} style={{ background: "rgba(193,89,79,0.08)", border: `1px solid ${c.danger}`, borderRadius: 12 }} className="p-3 flex items-center gap-3">
                    <AlertTriangle size={17} color={c.danger} />
                    <span style={{ fontSize: "0.82rem", color: c.inkSoft }}>
                      <b>{inc.probleme}</b> en {inc.produit === "avocat" ? "Avocat" : "Fraise"} — signalé par <b>{inc.farmNom}</b> à <b>{inc.dist} كلم</b> de vous (gravité : {inc.severite}) · {inc.date}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: c.inkMuted2, fontSize: "0.8rem" }} className="mb-6">Aucune alerte à proximité pour le moment — la situation est calme dans votre région 👍</p>
            )}

            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>Localisation de la ferme par satellite</h2>
              <span style={{ color: c.inkMuted2, fontSize: "0.68rem" }}>Position de démonstration — donnez les vraies coordonnées pour la remplacer</span>
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
              <h2 className="font-display" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>Carte Parcelles</h2>
              <div className="flex items-center gap-2">
                <span style={{ color: c.inkMuted2, fontSize: "0.75rem" }}>{data.parcelles.reduce((s, p) => s + p.ha, 0).toFixed(1)} hectares</span>
                {canEdit("Parcelles") && <AddButton label="Ajouter une parcelle" open={showAddParcelle} onClick={() => setShowAddParcelle(!showAddParcelle)} />}
              </div>
            </div>

            {canEdit("Parcelles") && (
              <div className="flex gap-2 mb-3 flex-wrap">
                <button onClick={() => setShowAddSite(!showAddSite)} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 999, padding: "6px 12px", fontSize: "0.72rem", fontWeight: 700 }}>+ Site</button>
                <button onClick={() => setShowAddCulture(!showAddCulture)} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 999, padding: "6px 12px", fontSize: "0.72rem", fontWeight: 700 }}>+ Culture</button>
                <button onClick={() => setShowAddSeason(!showAddSeason)} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 999, padding: "6px 12px", fontSize: "0.72rem", fontWeight: 700 }}>+ Saison</button>
              </div>
            )}
            {showAddSite && (
              <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16 }} className="p-3 mb-3 grid grid-cols-3 gap-2">
                <Field label="Nom du site"><input value={siteForm.nom} onChange={(e) => setSiteForm({ ...siteForm, nom: e.target.value })} placeholder="ex. Site Nord" style={inputStyle} /></Field>
                <Field label="Type"><select value={siteForm.type} onChange={(e) => setSiteForm({ ...siteForm, type: e.target.value })} style={inputStyle}><option value="champ">Champ</option><option value="entrepot">Entrepôt</option><option value="cooler">Cooler</option><option value="packing">Packing</option></select></Field>
                <div className="flex items-end"><button onClick={addSite} style={{ background: c.cardGreen, color: "#fff", borderRadius: 10, padding: "9px 0", fontWeight: 700, width: "100%" }}>Créer</button></div>
              </div>
            )}
            {showAddCulture && (
              <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16 }} className="p-3 mb-3 grid grid-cols-3 gap-2">
                <Field label="Culture"><input value={cultureForm.nom} onChange={(e) => setCultureForm({ ...cultureForm, nom: e.target.value })} placeholder="ex. Myrtille" style={inputStyle} /></Field>
                <Field label="Variété"><input value={cultureForm.variete} onChange={(e) => setCultureForm({ ...cultureForm, variete: e.target.value })} style={inputStyle} /></Field>
                <div className="flex items-end"><button onClick={addCulture} style={{ background: c.cardGreen, color: "#fff", borderRadius: 10, padding: "9px 0", fontWeight: 700, width: "100%" }}>Créer</button></div>
              </div>
            )}
            {showAddSeason && (
              <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16 }} className="p-3 mb-3 grid grid-cols-3 gap-2">
                <Field label="Nom"><input value={seasonForm.nom} onChange={(e) => setSeasonForm({ ...seasonForm, nom: e.target.value })} placeholder="ex. Saison 2027" style={inputStyle} /></Field>
                <Field label="Début"><input type="date" value={seasonForm.dateDebut} onChange={(e) => setSeasonForm({ ...seasonForm, dateDebut: e.target.value })} style={inputStyle} /></Field>
                <Field label="Fin"><input type="date" value={seasonForm.dateFin} onChange={(e) => setSeasonForm({ ...seasonForm, dateFin: e.target.value })} style={inputStyle} /></Field>
                <div className="col-span-3 flex justify-end"><button onClick={addSeason} style={{ background: c.cardGreen, color: "#fff", borderRadius: 10, padding: "8px 20px", fontWeight: 700 }}>Créer la saison</button></div>
              </div>
            )}

            {showAddParcelle && (
              <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-3 grid grid-cols-3 gap-3">
                <Field label="الرمز (ex. A1)"><input value={pcForm.code} onChange={(e) => setPcForm({ ...pcForm, code: e.target.value })} style={inputStyle} /></Field>
                <Field label="Nom"><input value={pcForm.nom} onChange={(e) => setPcForm({ ...pcForm, nom: e.target.value })} style={inputStyle} /></Field>
                <Field label="المحصول"><select value={pcForm.crop} onChange={(e) => setPcForm({ ...pcForm, crop: e.target.value })} style={inputStyle}><option value="avocat">Avocat</option><option value="fraise">Fraise</option></select></Field>
                <Field label="Superficie (ha)"><input type="number" step="0.1" value={pcForm.ha} onChange={(e) => setPcForm({ ...pcForm, ha: e.target.value })} style={inputStyle} /></Field>
                <Field label="Site"><select value={pcForm.siteId} onChange={(e) => setPcForm({ ...pcForm, siteId: e.target.value })} style={inputStyle}><option value="">—</option>{data.sites.map((s) => (<option key={s.id} value={s.id}>{s.nom}</option>))}</select></Field>
                <Field label="Culture"><select value={pcForm.cultureId} onChange={(e) => setPcForm({ ...pcForm, cultureId: e.target.value })} style={inputStyle}><option value="">—</option>{data.cultures.map((cu) => (<option key={cu.id} value={cu.id}>{cu.nom}{cu.variete ? ` (${cu.variete})` : ""}</option>))}</select></Field>
                <Field label="Saison"><select value={pcForm.seasonId} onChange={(e) => setPcForm({ ...pcForm, seasonId: e.target.value })} style={inputStyle}><option value="">—</option>{data.seasons.map((se) => (<option key={se.id} value={se.id}>{se.nom}</option>))}</select></Field>
                <Field label="Date de plantation"><input type="date" value={pcForm.datePlantation} onChange={(e) => setPcForm({ ...pcForm, datePlantation: e.target.value })} style={inputStyle} /></Field>
                <Field label="Rendement prévu (kg/ha)"><input type="number" value={pcForm.rendementPrevu} onChange={(e) => setPcForm({ ...pcForm, rendementPrevu: e.target.value })} style={inputStyle} /></Field>
                <div className="col-span-3 flex items-end"><button onClick={addParcelle} style={{ background: c.cardGreen, color: "#fff", borderRadius: 11, padding: "10px 0", fontWeight: 700, width: "100%", boxShadow: "0 4px 14px -3px rgba(42,157,143,0.4)" }}>Ajouter parcelle</button></div>
              </div>
            )}

            {data.parcelles.length === 0 ? (
              <p style={{ color: c.inkMuted2, fontSize: "0.82rem" }} className="mb-4">Aucune parcelle enregistrée pour cette ferme — ajoutez la première avec le bouton "Ajouter une parcelle" ci-dessus</p>
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
                <div className="flex justify-between"><span style={{ color: c.inkMuted2 }}>La superficie</span><span style={{ fontWeight: 700 }}>{selected.ha} hectares</span></div>
                <div className="flex justify-between"><span style={{ color: c.inkMuted2 }}>Prochaine irrigation</span><span style={{ fontWeight: 700 }}>{selected.irrigation}</span></div>
                <div className="flex justify-between"><span style={{ color: c.inkMuted2 }}>Dernier traitement</span><span style={{ fontWeight: 700 }}>{selected.dernierTraitement}</span></div>
                <div className="flex justify-between"><span style={{ color: c.inkMuted2 }}>Délai de sécurité récolte</span><span style={{ fontWeight: 700, color: selected.secu > 0 ? c.danger : c.cardGreen }}>{selected.secu > 0 ? `${selected.secu} أيام` : "جاهز"}</span></div>
                <div className="flex justify-between"><span style={{ color: c.inkMuted2 }}>Culture</span><span style={{ fontWeight: 700 }}>{selected.culture ? `${selected.culture.nom}${selected.culture.variete ? " (" + selected.culture.variete + ")" : ""}` : "—"}</span></div>
                <div className="flex justify-between"><span style={{ color: c.inkMuted2 }}>Site</span><span style={{ fontWeight: 700 }}>{selected.siteNom || "—"}</span></div>
                <div className="flex justify-between"><span style={{ color: c.inkMuted2 }}>Saison</span><span style={{ fontWeight: 700 }}>{selected.seasonNom || "—"}</span></div>
                <div className="flex justify-between"><span style={{ color: c.inkMuted2 }}>Date plantation</span><span style={{ fontWeight: 700 }}>{selected.datePlantation || "—"}</span></div>
                <div className="flex justify-between"><span style={{ color: c.inkMuted2 }}>Rendement prévu</span><span style={{ fontWeight: 700 }}>{selected.rendementPrevu ? `${selected.rendementPrevu} kg/ha` : "—"}</span></div>
              </div>
            </div>
            )}

            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h3 style={{ fontWeight: 700, fontSize: "0.85rem" }}>Lots &amp; Traçabilité</h3>
                {canEdit("Parcelles") && <AddButton label="Créer un lot" open={showAddLot} onClick={() => setShowAddLot(!showAddLot)} />}
              </div>
              <p style={{ color: c.inkMuted2, fontSize: "0.72rem" }} className="mb-2">كل كمية كتخرج من قطعة خاصها Lot — code وحدو كيتبع الطريق كاملة من القطعة للشحنة</p>

              {showAddLot && (
                <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-3 grid grid-cols-3 gap-3">
                  <Field label="Parcelle"><select value={lotForm.parcelleId} onChange={(e) => setLotForm({ ...lotForm, parcelleId: e.target.value })} style={inputStyle}><option value="">اختار</option>{data.parcelles.map((p) => (<option key={p.id} value={p.id}>{p.code} — {p.nom}</option>))}</select></Field>
                  <Field label="Date de récolte"><input type="date" value={lotForm.dateRecolte} onChange={(e) => setLotForm({ ...lotForm, dateRecolte: e.target.value })} style={inputStyle} /></Field>
                  <Field label="Heure de récolte"><input type="time" value={lotForm.heureRecolte} onChange={(e) => setLotForm({ ...lotForm, heureRecolte: e.target.value })} style={inputStyle} /></Field>
                  <Field label="Quantité (kg)"><input type="number" value={lotForm.quantiteKg} onChange={(e) => setLotForm({ ...lotForm, quantiteKg: e.target.value })} style={inputStyle} /></Field>
                  <Field label="Grade qualité"><select value={lotForm.grade} onChange={(e) => setLotForm({ ...lotForm, grade: e.target.value })} style={inputStyle}><option value="A">A</option><option value="B">B</option><option value="C">C</option></select></Field>
                  <div className="col-span-2"><Field label="Note (optionnel)"><input value={lotForm.note} onChange={(e) => setLotForm({ ...lotForm, note: e.target.value })} style={inputStyle} /></Field></div>
                  <div className="col-span-3"><button onClick={addLot} style={{ background: c.cardGreen, color: "#fff", borderRadius: 11, padding: "10px 0", fontWeight: 700, width: "100%" }}>Créer le lot</button></div>
                </div>
              )}

              <input value={rechercheLot} onChange={(e) => setRechercheLot(e.target.value)} placeholder="Rechercher un lot (code)..." style={{ ...inputStyle, marginBottom: 10 }} />

              <div className="flex flex-col gap-2 mb-4">
                {lots.filter((l) => l.code.toLowerCase().includes(rechercheLot.toLowerCase())).map((l) => {
                  let delaiMin = null, delaiAlerte = false;
                  if (l.heureRecolte && l.heureDebutRefroidissement) {
                    const [hR, mR] = l.heureRecolte.split(":").map(Number);
                    const recolteDate = new Date(l.dateRecolte); recolteDate.setHours(hR, mR, 0, 0);
                    const refroidDate = new Date(l.heureDebutRefroidissement);
                    delaiMin = Math.round((refroidDate - recolteDate) / 60000);
                    delaiAlerte = delaiMin > 120;
                  }
                  const controlesLot = controlesQualite.filter((q) => q.lotId === l.id);
                  const dernierControle = controlesLot[0];
                  return (
                    <div key={l.id} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 12 }} className="p-3">
                      <button onClick={() => setLotTraceOuvert(l)} className="flex items-center justify-between w-full text-right mb-1.5">
                        <div>
                          <div className="font-mono" style={{ fontWeight: 700, fontSize: "0.8rem" }}>{l.code}</div>
                          <div style={{ fontSize: "0.7rem", color: c.inkMuted2 }}>{l.dateRecolte}{l.heureRecolte ? ` ${l.heureRecolte}` : ""} · Grade {l.grade}</div>
                        </div>
                        <div className="text-left">
                          <div className="font-mono" style={{ fontWeight: 800, fontSize: "0.85rem" }}>{l.quantiteKg} kg</div>
                          <span style={{ background: c.bg, borderRadius: 999, padding: "2px 8px", fontSize: "0.64rem", fontWeight: 700 }}>{l.statut}</span>
                        </div>
                      </button>
                      {dernierControle && (
                        <span style={{
                          background: dernierControle.statut === "rejete" ? "rgba(193,89,79,0.12)" : dernierControle.statut === "accepte_condition" ? "rgba(244,162,97,0.15)" : "rgba(42,157,143,0.12)",
                          color: dernierControle.statut === "rejete" ? c.danger : dernierControle.statut === "accepte_condition" ? c.orange : c.cardGreenDeep,
                          borderRadius: 999, padding: "2px 8px", fontSize: "0.64rem", fontWeight: 700,
                        }} className="ml-1.5">Qualité: {dernierControle.statut}</span>
                      )}
                      {delaiMin !== null && (
                        <span style={{ color: delaiAlerte ? c.danger : c.inkMuted2, fontSize: "0.66rem", fontWeight: delaiAlerte ? 700 : 500 }} className="ml-1.5">
                          {delaiAlerte ? "⚠️ " : ""}Délai refroidissement : {Math.floor(delaiMin / 60)}h{delaiMin % 60}mn
                        </span>
                      )}
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => setLotPourQualite(l)} style={{ background: c.blue, color: "#fff", borderRadius: 8, padding: "5px 10px", fontSize: "0.68rem", fontWeight: 700 }}>Contrôle qualité</button>
                        {!l.coolerId && coolers.length > 0 && (
                          <select onChange={(e) => e.target.value && assignerCooler(l, e.target.value)} defaultValue="" style={{ ...inputStyle, padding: "5px 8px", fontSize: "0.68rem", width: "auto" }}>
                            <option value="">Assigner à un cooler...</option>
                            {coolers.map((co) => (<option key={co.id} value={co.id}>{co.nom}</option>))}
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })}
                {lots.length === 0 && <p style={{ color: c.inkMuted2, fontSize: "0.78rem" }}>Aucun lot créé</p>}
              </div>

              <div className="flex items-center justify-between mb-2">
                <h3 style={{ fontWeight: 700, fontSize: "0.85rem" }}>Coolers</h3>
                {canEdit("Parcelles") && <AddButton label="Nouveau cooler" open={showAddCooler} onClick={() => setShowAddCooler(!showAddCooler)} />}
              </div>
              {showAddCooler && (
                <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16 }} className="p-3 mb-3 grid grid-cols-3 gap-2">
                  <Field label="Nom"><input value={coolerForm.nom} onChange={(e) => setCoolerForm({ ...coolerForm, nom: e.target.value })} placeholder="ex. Cooler A2" style={inputStyle} /></Field>
                  <Field label="Capacité (kg)"><input type="number" value={coolerForm.capaciteKg} onChange={(e) => setCoolerForm({ ...coolerForm, capaciteKg: e.target.value })} style={inputStyle} /></Field>
                  <Field label="Température cible (°C)"><input type="number" value={coolerForm.temperatureCible} onChange={(e) => setCoolerForm({ ...coolerForm, temperatureCible: e.target.value })} style={inputStyle} /></Field>
                  <div className="col-span-3"><button onClick={addCooler} style={{ background: c.cardGreen, color: "#fff", borderRadius: 10, padding: "8px 0", fontWeight: 700, width: "100%" }}>Créer le cooler</button></div>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {coolers.map((co) => (
                  <div key={co.id} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 999 }} className="px-3 py-1.5">
                    <span style={{ fontSize: "0.76rem", fontWeight: 700 }}>{co.nom}</span>
                    <span className="font-mono" style={{ fontSize: "0.66rem", color: c.inkMuted2 }}> · {co.temperatureCible}°C</span>
                  </div>
                ))}
                {coolers.length === 0 && <p style={{ color: c.inkMuted2, fontSize: "0.78rem" }}>Aucun cooler créé</p>}
              </div>

              <div className="flex items-center justify-between mb-2 mt-6">
                <h3 style={{ fontWeight: 700, fontSize: "0.85rem" }}>Palettes</h3>
                {canEdit("Parcelles") && <AddButton label="Nouvelle palette" open={showAddPalette} onClick={() => setShowAddPalette(!showAddPalette)} />}
              </div>
              {showAddPalette && (
                <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16 }} className="p-3 mb-3 grid grid-cols-3 gap-2">
                  <Field label="Lot"><select value={paletteForm.lotId} onChange={(e) => setPaletteForm({ ...paletteForm, lotId: e.target.value })} style={inputStyle}><option value="">اختار</option>{lots.map((l) => (<option key={l.id} value={l.id}>{l.code}</option>))}</select></Field>
                  <Field label="Nombre de caisses"><input type="number" value={paletteForm.nombreCaisses} onChange={(e) => setPaletteForm({ ...paletteForm, nombreCaisses: e.target.value })} style={inputStyle} /></Field>
                  <Field label="Poids (kg)"><input type="number" value={paletteForm.poidsKg} onChange={(e) => setPaletteForm({ ...paletteForm, poidsKg: e.target.value })} style={inputStyle} /></Field>
                  <div className="col-span-3"><button onClick={addPalette} style={{ background: c.cardGreen, color: "#fff", borderRadius: 10, padding: "8px 0", fontWeight: 700, width: "100%" }}>Créer la palette</button></div>
                </div>
              )}
              <div className="flex flex-col gap-2 mb-4">
                {palettes.map((p) => {
                  const lot = lots.find((l) => l.id === p.lotId);
                  return (
                    <div key={p.id} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 12 }} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="font-mono" style={{ fontWeight: 700, fontSize: "0.8rem" }}>{p.code}</div>
                        <div style={{ fontSize: "0.7rem", color: c.inkMuted2 }}>{lot ? lot.code : "—"} · {p.nombreCaisses || 0} caisses</div>
                      </div>
                      <div className="text-left">
                        <div className="font-mono" style={{ fontWeight: 800, fontSize: "0.85rem" }}>{p.poidsKg} kg</div>
                        <span style={{ background: c.bg, borderRadius: 999, padding: "2px 8px", fontSize: "0.64rem", fontWeight: 700 }}>{p.statut}</span>
                      </div>
                    </div>
                  );
                })}
                {palettes.length === 0 && <p style={{ color: c.inkMuted2, fontSize: "0.78rem" }}>Aucune palette créée</p>}
              </div>

              <div className="flex items-center justify-between mb-2">
                <h3 style={{ fontWeight: 700, fontSize: "0.85rem" }}>Expéditions</h3>
                {canManageFarms && <AddButton label="Nouvelle expédition" open={showAddExpedition} onClick={() => setShowAddExpedition(!showAddExpedition)} />}
              </div>
              {showAddExpedition && (
                <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16 }} className="p-3 mb-3 grid grid-cols-3 gap-2">
                  <Field label="Client"><input value={expeditionForm.client} onChange={(e) => setExpeditionForm({ ...expeditionForm, client: e.target.value })} style={inputStyle} /></Field>
                  <Field label="Chauffeur"><input value={expeditionForm.chauffeur} onChange={(e) => setExpeditionForm({ ...expeditionForm, chauffeur: e.target.value })} style={inputStyle} /></Field>
                  <Field label="Téléphone chauffeur"><input value={expeditionForm.telephoneChauffeur} onChange={(e) => setExpeditionForm({ ...expeditionForm, telephoneChauffeur: e.target.value })} style={inputStyle} /></Field>
                  <Field label="Immatriculation camion"><input value={expeditionForm.camionImmat} onChange={(e) => setExpeditionForm({ ...expeditionForm, camionImmat: e.target.value })} style={inputStyle} /></Field>
                  <Field label="Température transport (°C)"><input type="number" value={expeditionForm.temperatureTransport} onChange={(e) => setExpeditionForm({ ...expeditionForm, temperatureTransport: e.target.value })} style={inputStyle} /></Field>
                  <Field label="Date départ"><input type="datetime-local" value={expeditionForm.dateDepart} onChange={(e) => setExpeditionForm({ ...expeditionForm, dateDepart: e.target.value })} style={inputStyle} /></Field>
                  <Field label="Coût transport (DH)"><input type="number" value={expeditionForm.coutTransport} onChange={(e) => setExpeditionForm({ ...expeditionForm, coutTransport: e.target.value })} style={inputStyle} /></Field>
                  <div className="col-span-3"><Field label="Destination"><input value={expeditionForm.destination} onChange={(e) => setExpeditionForm({ ...expeditionForm, destination: e.target.value })} style={inputStyle} /></Field></div>
                  <div className="col-span-3">
                    <span style={{ fontSize: "0.72rem", fontWeight: 700 }} className="mb-1 block">Palettes à expédier</span>
                    <div className="flex flex-wrap gap-2">
                      {palettes.filter((p) => p.statut === "en_stock").map((p) => (
                        <label key={p.id} style={{ background: paletteSelectionExpedition.includes(p.id) ? c.cardGreen : c.bg, color: paletteSelectionExpedition.includes(p.id) ? "#fff" : c.ink, borderRadius: 999, padding: "5px 11px", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer" }}>
                          <input type="checkbox" className="hidden" checked={paletteSelectionExpedition.includes(p.id)} onChange={(e) => setPaletteSelectionExpedition(e.target.checked ? [...paletteSelectionExpedition, p.id] : paletteSelectionExpedition.filter((id) => id !== p.id))} />
                          {p.code} ({p.poidsKg}kg)
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-3"><button onClick={creerExpedition} style={{ background: c.blue, color: "#fff", borderRadius: 10, padding: "9px 0", fontWeight: 700, width: "100%" }}>Créer l'expédition</button></div>
                </div>
              )}
              <div className="flex flex-col gap-2">
                {expeditions.map((e) => (
                  <div key={e.id} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 12 }} className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono" style={{ fontWeight: 700, fontSize: "0.8rem" }}>{e.code}</span>
                      <span style={{ background: c.bg, borderRadius: 999, padding: "2px 8px", fontSize: "0.64rem", fontWeight: 700 }}>{e.statut}</span>
                    </div>
                    <div style={{ fontSize: "0.74rem", color: c.inkSoft }}>{e.client} · {e.destination || "—"}</div>
                    <div style={{ fontSize: "0.68rem", color: c.inkMuted2 }} className="mt-1">{e.chauffeur ? `Chauffeur: ${e.chauffeur}` : ""}{e.camionImmat ? ` · ${e.camionImmat}` : ""} · {e.paletteIds.length} palette(s)</div>
                  </div>
                ))}
                {expeditions.length === 0 && <p style={{ color: c.inkMuted2, fontSize: "0.78rem" }}>Aucune expédition créée</p>}
              </div>
            </div>
          </div>
          );
        })()}

        {tab === "Employés" && (
          isLocked("Employés") ? <LockedFeature nom="Employés et pointage" /> :
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>{isWorker ? "Mon pointage" : "Pointage Employés Aujourd'hui"}</h2>
              <div className="flex items-center gap-2">
                {!isWorker && (
                  <button onClick={exportJournalPaie} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 10, padding: "8px 12px" }} className="flex items-center gap-1.5">
                    <Download size={15} color={c.cardGreenDeep} /><span style={{ fontSize: "0.8rem", fontWeight: 700, color: c.cardGreenDeep }}>Journal de paie</span>
                  </button>
                )}
                <AddButton label="Pointer" open={showAddWorker} onClick={() => setShowAddWorker(!showAddWorker)} />
              </div>
            </div>

            {!isWorker && (() => {
              const w15 = data.workers.filter((w) => w.dawra === "15");
              const wMois = data.workers.filter((w) => w.dawra === "Mois");
              const total15 = w15.reduce((s, w) => s + w.moisQte * w.taux, 0);
              const totalMois = wMois.reduce((s, w) => s + w.moisQte * w.taux, 0);
              return (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-3">
                    <div className="flex items-center justify-between mb-1"><span style={{ fontWeight: 700, fontSize: "0.82rem" }}>دورة 15 jours</span><span style={{ fontSize: "0.68rem", color: c.orange, fontWeight: 700 }}>Paie : 31 juillet</span></div>
                    <div style={{ fontWeight: 800, fontSize: "1.1rem", color: c.cardGreenDeep }}>{total15} DH</div>
                    <div style={{ fontSize: "0.7rem", color: c.inkMuted2 }}>{w15.length} Main-d'œuvre: {w15.map((w) => w.nom).join("، ") || "—"}</div>
                  </div>
                  <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-3">
                    <div className="flex items-center justify-between mb-1"><span style={{ fontWeight: 700, fontSize: "0.82rem" }}>Cycle mensuel</span><span style={{ fontSize: "0.68rem", color: c.orange, fontWeight: 700 }}>Paie : 31 juillet</span></div>
                    <div style={{ fontWeight: 800, fontSize: "1.1rem", color: c.cardGreenDeep }}>{totalMois} DH</div>
                    <div style={{ fontSize: "0.7rem", color: c.inkMuted2 }}>{wMois.length} Main-d'œuvre: {wMois.map((w) => w.nom).join("، ") || "—"}</div>
                  </div>
                </div>
              );
            })()}

            {!isWorker && (() => {
              const nomsPointes = new Set(data.workers.map((w) => w.nom));
              const employesActifs = data.employees.filter((e) => e.statut === "actif" || !e.statut);
              const absents = employesActifs.filter((e) => !nomsPointes.has(e.nom));
              if (absents.length === 0) return null;
              return (
                <div className="mb-4">
                  <div style={{ background: "rgba(217,161,92,0.1)", border: `1px solid ${c.orange}`, borderRadius: 14 }} className="p-3">
                    <div className="flex items-center gap-2 mb-2"><AlertTriangle size={15} color={c.orange} /><span style={{ fontWeight: 700, fontSize: "0.8rem" }}>{absents.length} عامل بلا بونطاج اليوم</span></div>
                    <div className="flex flex-wrap gap-2">
                      {absents.map((e) => (
                        <button key={e.id} onClick={() => marquerAbsent(e.nom)} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 999, padding: "4px 10px" }}>
                          <span style={{ fontSize: "0.74rem", fontWeight: 600 }}>{e.nom}</span> <span style={{ fontSize: "0.66rem", color: c.inkMuted2 }}>— Marquer absent</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {!isWorker && (() => {
              const parTache = {};
              data.workers.forEach((w) => { parTache[w.tache] = (parTache[w.tache] || 0) + w.qte; });
              const tacheEntries = Object.entries(parTache);
              if (tacheEntries.length === 0) return null;
              return (
                <div className="mb-4">
                  <h3 style={{ fontWeight: 700, fontSize: "0.85rem" }} className="mb-2">مجموع Aujourd'hui par tâche</h3>
                  <div className="flex gap-2 flex-wrap">
                    {tacheEntries.map(([tache, total]) => (
                      <div key={tache} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 12 }} className="px-3 py-2">
                        <span style={{ fontWeight: 700, fontSize: "0.82rem" }}>{tache}</span>
                        <span className="font-mono" style={{ fontSize: "0.82rem", fontWeight: 800, color: c.cardGreenDeep }}> · {total}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {!isWorker && (() => {
              const balances = {};
              data.workers.forEach((w) => {
                if (!balances[w.nom]) balances[w.nom] = { total: 0, confirmed: 0 };
                balances[w.nom].total += w.qte * w.taux;
                if (w.confirme) balances[w.nom].confirmed += w.qte * w.taux;
              });
              const names = Object.keys(balances);
              if (names.length === 0) return null;
              return (
                <div className="mb-4">
                  <h3 style={{ fontWeight: 700, fontSize: "0.85rem" }} className="mb-2">رصيد كل Ouvrier (هاد Cycle)</h3>
                  <div className="flex flex-col gap-2">
                    {names.map((nom) => (
                      <div key={nom} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 12 }} className="px-3 py-2 flex items-center justify-between">
                        <span style={{ fontWeight: 700, fontSize: "0.82rem" }}>{nom}</span>
                        <div className="text-left">
                          <span className="font-mono" style={{ fontWeight: 800, fontSize: "0.85rem" }}>{balances[nom].total} DH</span>
                          <div style={{ fontSize: "0.66rem", color: c.inkMuted2 }}>Confirmé: {balances[nom].confirmed} DH</div>
                        </div>
                      </div>
                    ))}
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
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: c.inkMuted2 }} className="mb-2 block">parcelle</span>
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
                        <button onClick={() => setWForm({ ...wForm, type: "Heures" })} style={{ background: wForm.type === "Heures" ? c.cardGreen : c.bg, border: `2px solid ${wForm.type === "Heures" ? c.cardGreen : c.line}`, borderRadius: 14, padding: "14px 4px" }} className="flex flex-col items-center gap-1.5">
                          <Clock size={22} color={wForm.type === "Heures" ? "#fff" : c.inkSoft} /><span style={{ fontSize: "0.78rem", fontWeight: 800, color: wForm.type === "Heures" ? "#fff" : c.ink }}>À l'heure</span>
                        </button>
                        <button onClick={() => setWForm({ ...wForm, type: "Jour" })} style={{ background: wForm.type === "Jour" ? c.cardGreen : c.bg, border: `2px solid ${wForm.type === "Jour" ? c.cardGreen : c.line}`, borderRadius: 14, padding: "14px 4px" }} className="flex flex-col items-center gap-1.5">
                          <CalendarClock size={22} color={wForm.type === "Jour" ? "#fff" : c.inkSoft} /><span style={{ fontSize: "0.78rem", fontWeight: 800, color: wForm.type === "Jour" ? "#fff" : c.ink }}>À la journée</span>
                        </button>
                      </div>
                    </div>
                    {wForm.type === "Heures" ? (
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Heure d'entrée"><input type="time" value={wForm.dukhul} onChange={(e) => setWForm({ ...wForm, dukhul: e.target.value })} style={{ ...inputStyle, fontSize: "1.1rem", textAlign: "center", padding: "14px 8px" }} /></Field>
                        <Field label="Heure de sortie"><input type="time" value={wForm.khuruj} onChange={(e) => setWForm({ ...wForm, khuruj: e.target.value })} style={{ ...inputStyle, fontSize: "1.1rem", textAlign: "center", padding: "14px 8px" }} /></Field>
                      </div>
                    ) : (
                      <div>
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: c.inkMuted2 }} className="mb-2 block">Nombre de jours</span>
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
                  {!isWorker && (<Field label="Nom de l'employé"><input value={wForm.nom} onChange={(e) => setWForm({ ...wForm, nom: e.target.value })} placeholder="Nom de l'employé" style={inputStyle} /></Field>)}
                  <Field label="parcelle"><select value={wForm.parcelle} onChange={(e) => setWForm({ ...wForm, parcelle: e.target.value })} style={inputStyle}><option value="">Choisir</option>{data.parcelles.map((p) => <option key={p.code} value={p.code}>{p.code} — {p.nom}</option>)}</select></Field>
                  <Field label="المهمة"><input value={wForm.tache} onChange={(e) => setWForm({ ...wForm, tache: e.target.value })} placeholder="Récolte, irrigation, emballage..." style={inputStyle} /></Field>
                  {!isWorker && (<Field label="نظام الخلاص"><select value={wForm.modePaie} onChange={(e) => setWForm({ ...wForm, modePaie: e.target.value })} style={inputStyle}><option value="temps">بالوقت (ساعة/نهار)</option><option value="rendement">بالمردود (كلغ/صندوق)</option></select></Field>)}
                  {wForm.modePaie === "rendement" ? (
                    <>
                      <Field label="الكمية (كلغ/صندوق)"><input type="number" value={wForm.quantiteRecoltee} onChange={(e) => setWForm({ ...wForm, quantiteRecoltee: e.target.value })} style={inputStyle} /></Field>
                      <Field label="السعر للوحدة (DH)"><input type="number" step="0.1" value={wForm.prixUnitaireRendement} onChange={(e) => setWForm({ ...wForm, prixUnitaireRendement: e.target.value })} style={inputStyle} /></Field>
                    </>
                  ) : (
                    <>
                      <Field label="Mode de paiement"><select value={wForm.type} onChange={(e) => setWForm({ ...wForm, type: e.target.value })} style={inputStyle}><option value="Heures">À l'heure</option><option value="Jour">À la journée</option></select></Field>
                      {wForm.type === "Heures" ? (
                        <>
                          <Field label="Heure d'entrée"><input type="time" value={wForm.dukhul} onChange={(e) => setWForm({ ...wForm, dukhul: e.target.value })} style={inputStyle} /></Field>
                          <Field label="Heure de sortie"><input type="time" value={wForm.khuruj} onChange={(e) => setWForm({ ...wForm, khuruj: e.target.value })} style={inputStyle} /></Field>
                          <Field label="Pause (minutes)"><input type="number" value={wForm.pauseMinutes} onChange={(e) => setWForm({ ...wForm, pauseMinutes: e.target.value })} style={inputStyle} /></Field>
                        </>
                      ) : (<Field label="Nombre de jours"><input type="number" min="0.5" step="0.5" value={wForm.nahar} onChange={(e) => setWForm({ ...wForm, nahar: e.target.value })} style={inputStyle} /></Field>)}
                      {!isWorker && (<Field label={wForm.type === "Heures" ? "Taux/heure (DH)" : "Taux/jour (DH)"}><input type="number" value={wForm.taux} onChange={(e) => setWForm({ ...wForm, taux: e.target.value })} style={inputStyle} /></Field>)}
                    </>
                  )}
                  {!isWorker && (<Field label="Cycle de paie"><select value={wForm.dawra} onChange={(e) => setWForm({ ...wForm, dawra: e.target.value })} style={inputStyle}><option value="15">Tous les 15 jours</option><option value="Mois">Au mois</option></select></Field>)}
                  {!isWorker && (<Field label="شيف الإكيب (اختياري)"><input value={wForm.chefEquipe} onChange={(e) => setWForm({ ...wForm, chefEquipe: e.target.value })} placeholder="اسم مقدم المجموعة" style={inputStyle} /></Field>)}
                  {!isWorker && (<Field label="تعويض النقل (DH)"><input type="number" value={wForm.indemniteTransport} onChange={(e) => setWForm({ ...wForm, indemniteTransport: e.target.value })} style={inputStyle} /></Field>)}
                  {!isWorker && (<Field label="تعويض الماكلة (DH)"><input type="number" value={wForm.indemniteRepas} onChange={(e) => setWForm({ ...wForm, indemniteRepas: e.target.value })} style={inputStyle} /></Field>)}
                  {!isWorker && (<Field label="نوع اليوم"><select value={wForm.typeJour} onChange={(e) => setWForm({ ...wForm, typeJour: e.target.value })} style={inputStyle}><option value="normal">عادي</option><option value="arret_meteo">توقف بسبب الطقس</option></select></Field>)}
                </div>
                )}
                {wForm.modePaie === "temps" && wForm.type === "Heures" && (<div className="flex items-center gap-2" style={{ color: c.inkMuted2, fontSize: "0.78rem" }}><Clock size={14} /><span>Heures nettes (بعد الباش) : {Math.max(0, Math.round((hoursBetween(wForm.dukhul, wForm.khuruj) - (Number(wForm.pauseMinutes) || 0) / 60) * 10) / 10)} h — الدوام القياسي: {data.heureDebutStandard} ({data.heuresStandardJour}h)</span></div>)}

                <div style={{ background: c.bg, borderRadius: 12 }} className="p-3 flex items-center gap-3">
                  {!isRecording ? (
                    <button onClick={startRecording} style={{ background: c.danger, borderRadius: 999, width: 40, height: 40 }} className="flex items-center justify-center flex-shrink-0"><Mic size={17} color="#fff" /></button>
                  ) : (
                    <button onClick={stopRecording} style={{ background: c.danger, borderRadius: 999, width: 40, height: 40, animation: "pulse 1.2s infinite" }} className="flex items-center justify-center flex-shrink-0"><Square size={15} color="#fff" fill="#fff" /></button>
                  )}
                  <div className="flex flex-col gap-1 flex-1">
                    <span style={{ fontSize: "0.76rem", fontWeight: 700, color: c.inkSoft }}>{isRecording ? "🔴 Enregistrement... cliquez pour arrêter" : wForm.audioNote ? "✓ Note vocale enregistrée" : "Note vocale (optionnel)"}</span>
                    {wForm.audioNote && !isRecording && (
                      <div className="flex items-center gap-2">
                        <audio controls src={wForm.audioNote} style={{ height: 32, maxWidth: 220 }} />
                        <button onClick={() => setWForm({ ...wForm, audioNote: "" })}><Trash2 size={14} color={c.danger} /></button>
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={isWorker ? addMyPointage : addWorker} style={{ background: c.cardGreen, color: "#fff", borderRadius: 11, padding: "11px 0", boxShadow: "0 4px 14px -3px rgba(42,157,143,0.4)", fontWeight: 700, fontSize: "0.85rem" }}>Enregistrer le pointage</button>
              </div>
            )}
            <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)", overflow: "hidden" }}>
              <div className="grid" style={{ gridTemplateColumns: isWorker ? "1.2fr 1.3fr 1.2fr 0.3fr" : "0.8fr 0.45fr 0.9fr 0.8fr 0.55fr 0.6fr 0.6fr 0.7fr 0.3fr", background: c.bg, fontSize: "0.64rem", color: c.inkMuted2, fontWeight: 700 }}>
                {(isWorker ? ["parcelle", "المهمة", "Heure / Quantité", ""] : ["Employé", "parcelle", "المهمة", "Heure / Quantité", "Cycle", "Localisation", "Paie", "الحالة", ""]).map((h) => (<div key={h} className="px-2 py-2">{h}</div>))}
              </div>
              {visibleWorkers.map((w) => (
                <React.Fragment key={w.id}>
                <div className="grid items-center" style={{ gridTemplateColumns: isWorker ? "1.2fr 1.3fr 1.2fr 0.3fr" : "0.8fr 0.45fr 0.9fr 0.8fr 0.55fr 0.6fr 0.6fr 0.7fr 0.3fr", borderTop: `1px solid ${c.line}`, fontSize: "0.76rem" }}>
                  {!isWorker && <button onClick={() => setFicheEmployeOuverte(getEmployee(w.nom))} className="px-2 py-2 text-right" style={{ fontWeight: 600, textDecoration: "underline", textDecorationColor: c.line }}>{w.nom}</button>}
                  <div className="px-2 py-2 font-mono" style={{ color: c.inkMuted2 }}>{w.parcelle}</div>
                  <div className="px-2 py-2 flex items-center gap-1.5">
                    <span>{w.tache}</span>
                    {w.audioNote && (
                      <button onClick={() => setPlayingAudioId(playingAudioId === w.id ? null : w.id)} style={{ background: "rgba(193,89,79,0.12)", borderRadius: 999, width: 20, height: 20 }} className="flex items-center justify-center flex-shrink-0">
                        <Mic size={11} color={c.danger} />
                      </button>
                    )}
                  </div>
                  <div className="px-2 py-2" style={{ color: c.inkMuted2, fontSize: "0.7rem" }}>
                    {w.type === "Heures" ? `${w.dukhul}–${w.khuruj} (${w.qte}h)` : `${w.qte} Jour`}
                    {w.retardMinutes > 0 && <span style={{ color: c.orange, fontWeight: 700 }}> · ⏱ {w.retardMinutes}mn تأخر</span>}
                    {w.heuresSup > 0 && <span style={{ color: c.blue, fontWeight: 700 }}> · +{w.heuresSup}h إضافية</span>}
                  </div>
                  {!isWorker && <div className="px-2 py-2"><span style={{ background: c.bg, borderRadius: 999, padding: "2px 7px", fontSize: "0.62rem", fontWeight: 700, color: c.inkSoft }}>{w.dawra === "15" ? "15 jours" : "le mois"}</span></div>}
                  {!isWorker && (
                    <div className="px-2 py-2">
                      {w.distKm == null ? (
                        <span style={{ fontSize: "0.62rem", color: c.inkMuted2 }}>—</span>
                      ) : w.distKm <= 2 ? (
                        <span title="Proche de la ferme" style={{ color: c.cardGreenDeep, fontSize: "0.62rem", fontWeight: 700 }}>✓ {w.distKm}كلم</span>
                      ) : (
                        <span title="Loin de la ferme — à vérifier" style={{ color: c.danger, fontSize: "0.62rem", fontWeight: 700 }}>⚠️ {w.distKm}كلم</span>
                      )}
                    </div>
                  )}
                  {!isWorker && <div className="px-2 py-2 font-mono" style={{ color: c.cardGreenDeep, fontWeight: 700 }}>{w.qte * w.taux} DH</div>}
                  {!isWorker && (
                    <div className="px-2 py-2 flex flex-col gap-1">
                      <button onClick={() => toggleStatut(w.id)} style={{ background: w.statut === "Payé" ? "rgba(42,157,143,0.12)" : "rgba(244,162,97,0.15)", borderRadius: 999, padding: "2px 6px" }} className="flex items-center gap-1">
                        <CheckCircle2 size={10} color={w.statut === "Payé" ? c.cardGreenDeep : c.orange} />
                        <span style={{ fontSize: "0.6rem", fontWeight: 700, color: w.statut === "Payé" ? c.cardGreenDeep : c.orange }}>{w.statut}</span>
                      </button>
                      <button onClick={() => toggleConfirme(w.id)} style={{ background: w.confirme ? "rgba(92,134,168,0.12)" : "rgba(148,163,184,0.15)", borderRadius: 999, padding: "2px 6px" }} className="flex items-center gap-1">
                        <ShieldCheck size={10} color={w.confirme ? c.blue : c.inkMuted2} />
                        <span style={{ fontSize: "0.6rem", fontWeight: 700, color: w.confirme ? c.blue : c.inkMuted2 }}>{w.confirme ? "Confirmé" : "En cours de révision"}</span>
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
            {!isWorker && <div className="flex justify-end mt-2"><span style={{ fontWeight: 800, fontSize: "0.85rem" }}>Total paie du jour: {kpis.totalKhlas} DH</span></div>}

            {!isWorker && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 style={{ fontWeight: 700, fontSize: "0.85rem" }}>سجل حوادث الشغل</h3>
                  <AddButton label="بلّغ عن حادث" open={showAddAccident} onClick={() => setShowAddAccident(!showAddAccident)} />
                </div>
                {showAddAccident && (
                  <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-3 grid grid-cols-2 gap-3">
                    <Field label="اسم العامل"><input value={accForm.nomEmploye} onChange={(e) => setAccForm({ ...accForm, nomEmploye: e.target.value })} style={inputStyle} /></Field>
                    <Field label="الشدة"><select value={accForm.gravite} onChange={(e) => setAccForm({ ...accForm, gravite: e.target.value })} style={inputStyle}><option value="leger">خفيف</option><option value="moyen">متوسط</option><option value="grave">خطير</option></select></Field>
                    <div className="col-span-2"><Field label="وصف الحادث"><input value={accForm.description} onChange={(e) => setAccForm({ ...accForm, description: e.target.value })} style={inputStyle} /></Field></div>
                    <div className="col-span-2"><Field label="الإجراء المتخذ"><input value={accForm.actionPrise} onChange={(e) => setAccForm({ ...accForm, actionPrise: e.target.value })} style={inputStyle} /></Field></div>
                    <div className="col-span-2"><button onClick={addAccident} style={{ background: c.danger, color: "#fff", borderRadius: 11, padding: "10px 0", fontWeight: 700, width: "100%" }}>تسجيل الحادث</button></div>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  {accidents.map((a) => (
                    <div key={a.id} style={{ background: c.white, border: `1px solid ${c.line}`, borderRight: `4px solid ${a.gravite === "grave" ? c.danger : c.orange}`, borderRadius: 12 }} className="p-3">
                      <div className="flex items-center justify-between"><span style={{ fontWeight: 700, fontSize: "0.82rem" }}>{a.nomEmploye}</span><span style={{ fontSize: "0.68rem", color: c.inkMuted2 }}>{a.dateAccident}</span></div>
                      <p style={{ fontSize: "0.78rem", color: c.inkSoft }} className="mt-1">{a.description}</p>
                      {a.actionPrise && <p style={{ fontSize: "0.72rem", color: c.inkMuted2 }} className="mt-1">Action : {a.actionPrise}</p>}
                    </div>
                  ))}
                  {accidents.length === 0 && <p style={{ color: c.inkMuted2, fontSize: "0.78rem" }}>Aucun accident enregistré</p>}
                </div>
              </div>
            )}

            {!isWorker && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 style={{ fontWeight: 700, fontSize: "0.85rem" }}>Gestion des tâches</h3>
                  <AddButton label="Nouvelle tâche" open={showAddTache} onClick={() => setShowAddTache(!showAddTache)} />
                </div>
                {showAddTache && (
                  <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-3 grid grid-cols-3 gap-3">
                    <Field label="اسم المهمة"><input value={tacheForm.nom} onChange={(e) => setTacheForm({ ...tacheForm, nom: e.target.value })} placeholder="ex. Taille, Tri, Chargement" style={inputStyle} /></Field>
                    <Field label="الوحدة الافتراضية"><select value={tacheForm.uniteDefaut} onChange={(e) => setTacheForm({ ...tacheForm, uniteDefaut: e.target.value })} style={inputStyle}><option value="kg">kg</option><option value="caisse">صندوق</option><option value="unité">وحدة</option><option value="jour">نهار</option></select></Field>
                    <Field label="التعريفة الافتراضية (DH)"><input type="number" value={tacheForm.tarifDefaut} onChange={(e) => setTacheForm({ ...tacheForm, tarifDefaut: e.target.value })} style={inputStyle} /></Field>
                    <div className="col-span-3"><button onClick={addTache} style={{ background: c.cardGreen, color: "#fff", borderRadius: 11, padding: "9px 0", fontWeight: 700, width: "100%" }}>Ajouter la tâche</button></div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {data.taches.map((t) => (
                    <div key={t.id} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 999 }} className="px-3 py-1.5 flex items-center gap-2">
                      <span style={{ fontSize: "0.78rem", fontWeight: 700 }}>{t.nom}</span>
                      <span className="font-mono" style={{ fontSize: "0.7rem", color: c.inkMuted2 }}>{t.tarifDefaut} DH/{t.uniteDefaut}</span>
                    </div>
                  ))}
                  {data.taches.length === 0 && <p style={{ color: c.inkMuted2, fontSize: "0.78rem" }}>Aucune tâche configurée — les tâches par défaut (Récolte, Irrigation...) restent utilisables en texte libre</p>}
                </div>
              </div>
            )}

            {!isWorker && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 style={{ fontWeight: 700, fontSize: "0.85rem" }}>Équipes</h3>
                  <AddButton label="Nouvelle équipe" open={showAddEquipe} onClick={() => setShowAddEquipe(!showAddEquipe)} />
                </div>
                {showAddEquipe && (
                  <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-3 grid grid-cols-3 gap-3">
                    <Field label="اسم الفرقة"><input value={equipeForm.nom} onChange={(e) => setEquipeForm({ ...equipeForm, nom: e.target.value })} placeholder="ex. Équipe Récolte 1" style={inputStyle} /></Field>
                    <Field label="شيف الإكيب"><input value={equipeForm.chefNom} onChange={(e) => setEquipeForm({ ...equipeForm, chefNom: e.target.value })} style={inputStyle} /></Field>
                    <Field label="القطعة"><select value={equipeForm.parcelleId} onChange={(e) => setEquipeForm({ ...equipeForm, parcelleId: e.target.value })} style={inputStyle}><option value="">—</option>{data.parcelles.map((p) => (<option key={p.id} value={p.id}>{p.code} — {p.nom}</option>))}</select></Field>
                    <div className="col-span-3"><button onClick={addEquipe} style={{ background: c.cardGreen, color: "#fff", borderRadius: 11, padding: "9px 0", fontWeight: 700, width: "100%" }}>Créer l'équipe</button></div>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  {data.equipes.map((eq) => {
                    const membres = data.employees.filter((e) => e.equipeId === eq.id);
                    return (
                      <div key={eq.id} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 12 }} className="p-3">
                        <div className="flex items-center justify-between">
                          <span style={{ fontWeight: 700, fontSize: "0.84rem" }}>{eq.nom}</span>
                          <span style={{ fontSize: "0.7rem", color: c.inkMuted2 }}>{membres.length} membre(s)</span>
                        </div>
                        <div style={{ fontSize: "0.72rem", color: c.inkMuted2 }} className="mt-1">
                          {eq.chefNom ? `Chef: ${eq.chefNom}` : "Sans chef"} · {membres.map((m) => m.nom).join(", ") || "aucun membre (assignez via la Fiche Employé)"}
                        </div>
                      </div>
                    );
                  })}
                  {data.equipes.length === 0 && <p style={{ color: c.inkMuted2, fontSize: "0.78rem" }}>Aucune équipe créée</p>}
                </div>
              </div>
            )}

            {!isWorker && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 style={{ fontWeight: 700, fontSize: "0.85rem" }}>Production d'équipe (répartition automatique)</h3>
                  <AddButton label="Enregistrer production" open={showAddProdEquipe} onClick={() => setShowAddProdEquipe(!showAddProdEquipe)} />
                </div>
                <p style={{ color: c.inkMuted2, fontSize: "0.72rem" }} className="mb-2">سجل الكمية الجماعية اللي جمعتها الفرقة، والنظام يوزع الخلاص أوطوماتيكيا حسب الطريقة اللي تختار</p>
                {showAddProdEquipe && (
                  <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-3 grid grid-cols-3 gap-3">
                    <Field label="الفرقة"><select value={prodEquipeForm.equipeId} onChange={(e) => setProdEquipeForm({ ...prodEquipeForm, equipeId: e.target.value })} style={inputStyle}><option value="">اختار</option>{data.equipes.map((eq) => (<option key={eq.id} value={eq.id}>{eq.nom}</option>))}</select></Field>
                    <Field label="المهمة"><input value={prodEquipeForm.tache} onChange={(e) => setProdEquipeForm({ ...prodEquipeForm, tache: e.target.value })} placeholder="ex. Récolte avocat" style={inputStyle} /></Field>
                    <Field label="الكمية الإجمالية (kg)"><input type="number" value={prodEquipeForm.quantiteTotale} onChange={(e) => setProdEquipeForm({ ...prodEquipeForm, quantiteTotale: e.target.value })} style={inputStyle} /></Field>
                    <Field label="السعر للوحدة (DH)"><input type="number" step="0.1" value={prodEquipeForm.tarifUnitaire} onChange={(e) => setProdEquipeForm({ ...prodEquipeForm, tarifUnitaire: e.target.value })} style={inputStyle} /></Field>
                    <Field label="طريقة التوزيع">
                      <select value={prodEquipeForm.methode} onChange={(e) => setProdEquipeForm({ ...prodEquipeForm, methode: e.target.value })} style={inputStyle}>
                        <option value="egale">بالتساوي بين الحاضرين</option>
                        <option value="heures">حسب الساعات المسجلة (هاد الشهر)</option>
                        <option value="jours">حسب الأيام المسجلة (هاد الشهر)</option>
                        <option value="custom">مخصص (نسب يدوية)</option>
                      </select>
                    </Field>
                    <div className="flex items-end"><button onClick={calculerRepartition} style={{ background: c.blue, color: "#fff", borderRadius: 11, padding: "9px 0", fontWeight: 700, width: "100%" }}>حساب التوزيع</button></div>

                    {repartitionPreview.length > 0 && (
                      <div className="col-span-3">
                        <div style={{ background: c.bg, borderRadius: 12 }} className="p-3">
                          <span style={{ fontWeight: 700, fontSize: "0.8rem" }} className="mb-2 block">معاينة التوزيع</span>
                          {repartitionPreview.map((r, i) => (
                            <div key={i} className="flex items-center justify-between mb-1.5">
                              <span style={{ fontSize: "0.78rem" }}>{r.nom}</span>
                              {prodEquipeForm.methode === "custom" ? (
                                <input type="number" value={r.pourcentage} onChange={(e) => updateRepartitionCustom(i, e.target.value)} style={{ ...inputStyle, width: 80, padding: "5px 8px" }} />
                              ) : (
                                <span className="font-mono" style={{ fontSize: "0.78rem", fontWeight: 700 }}>{r.part.toFixed(1)} kg · {r.montant.toFixed(0)} DH</span>
                              )}
                            </div>
                          ))}
                          <button onClick={validerProductionEquipe} style={{ background: c.cardGreen, color: "#fff", borderRadius: 10, padding: "9px 0", fontWeight: 700, width: "100%", marginTop: 10 }}>تأكيد وتسجيل البونطاج لكل عضو</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!isWorker && currentUser.role === "Owner" && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 style={{ fontWeight: 700, fontSize: "0.85rem" }}>Paramètres de paie</h3>
                  <AddButton label="Modifier" open={showParametres} onClick={() => { setParamForm({ heureDebutStandard: data.heureDebutStandard, heuresStandardJour: String(data.heuresStandardJour), majorationHeuresSup: String(data.majorationHeuresSup) }); setShowParametres(!showParametres); }} />
                </div>
                {showParametres && (
                  <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-3 grid grid-cols-3 gap-3">
                    <Field label="Heure de début standard"><input type="time" value={paramForm.heureDebutStandard} onChange={(e) => setParamForm({ ...paramForm, heureDebutStandard: e.target.value })} style={inputStyle} /></Field>
                    <Field label="Heures standard/jour"><input type="number" value={paramForm.heuresStandardJour} onChange={(e) => setParamForm({ ...paramForm, heuresStandardJour: e.target.value })} style={inputStyle} /></Field>
                    <Field label="Majoration heures sup (×)"><input type="number" step="0.05" value={paramForm.majorationHeuresSup} onChange={(e) => setParamForm({ ...paramForm, majorationHeuresSup: e.target.value })} style={inputStyle} /></Field>
                    <div className="col-span-3"><button onClick={saveParametres} style={{ background: c.cardGreen, color: "#fff", borderRadius: 11, padding: "9px 0", fontWeight: 700, width: "100%" }}>Enregistrer les paramètres</button></div>
                  </div>
                )}
              </div>
            )}

            {!isWorker && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 style={{ fontWeight: 700, fontSize: "0.85rem" }}>Avances</h3>
                  <AddButton label="Nouvelle demande" open={showAddAvance} onClick={() => setShowAddAvance(!showAddAvance)} />
                </div>
                {showAddAvance && (
                  <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-3 grid grid-cols-3 gap-3">
                    <Field label="Employé"><select value={avanceForm.employeeId} onChange={(e) => setAvanceForm({ ...avanceForm, employeeId: e.target.value })} style={inputStyle}><option value="">اختار</option>{data.employees.map((emp) => (<option key={emp.id} value={emp.id}>{emp.nom}</option>))}</select></Field>
                    <Field label="Montant (DH)"><input type="number" value={avanceForm.montant} onChange={(e) => setAvanceForm({ ...avanceForm, montant: e.target.value })} style={inputStyle} /></Field>
                    <Field label="Raison"><input value={avanceForm.raison} onChange={(e) => setAvanceForm({ ...avanceForm, raison: e.target.value })} style={inputStyle} /></Field>
                    <div className="col-span-3"><button onClick={addAvance} style={{ background: c.orange, color: "#fff", borderRadius: 11, padding: "9px 0", fontWeight: 700, width: "100%" }}>Soumettre la demande</button></div>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  {avances.map((av) => {
                    const emp = data.employees.find((e) => e.id === av.employeeId);
                    const statutColorMap = { demande: c.orange, approuve: c.blue, rembourse: c.cardGreenDeep, rejete: c.danger };
                    return (
                      <div key={av.id} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 12 }} className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span style={{ fontWeight: 700, fontSize: "0.82rem" }}>{emp ? emp.nom : "—"}</span>
                          <span style={{ background: `${statutColorMap[av.statut]}18`, color: statutColorMap[av.statut], borderRadius: 999, padding: "2px 9px", fontSize: "0.66rem", fontWeight: 700 }}>{av.statut}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono" style={{ fontWeight: 800, fontSize: "0.85rem" }}>{av.montant} DH</span>
                          {av.raison && <span style={{ fontSize: "0.7rem", color: c.inkMuted2 }}>{av.raison}</span>}
                        </div>
                        {av.statut === "demande" && canManageFarms && (
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => changerStatutAvance(av.id, "approuve")} style={{ background: c.cardGreen, color: "#fff", borderRadius: 8, padding: "5px 12px", fontSize: "0.7rem", fontWeight: 700 }}>Approuver</button>
                            <button onClick={() => changerStatutAvance(av.id, "rejete")} style={{ background: c.white, border: `1px solid ${c.danger}`, color: c.danger, borderRadius: 8, padding: "5px 12px", fontSize: "0.7rem", fontWeight: 700 }}>Rejeter</button>
                          </div>
                        )}
                        {av.approuvePar && <div style={{ fontSize: "0.66rem", color: c.inkMuted2 }} className="mt-1">Approuvé par {av.approuvePar}</div>}
                      </div>
                    );
                  })}
                  {avances.length === 0 && <p style={{ color: c.inkMuted2, fontSize: "0.78rem" }}>Aucune avance</p>}
                </div>
                {(() => {
                  const total = avances.reduce((s, a) => s + a.montant, 0);
                  const paye = avances.filter((a) => a.statut === "rembourse").reduce((s, a) => s + a.montant, 0);
                  const restant = avances.filter((a) => a.statut === "approuve").reduce((s, a) => s + a.montant, 0);
                  return (
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <div style={{ background: c.bg, borderRadius: 10 }} className="p-2 text-center"><div style={{ fontSize: "0.64rem", color: c.inkMuted2 }}>Total</div><div className="font-mono" style={{ fontWeight: 800 }}>{total} DH</div></div>
                      <div style={{ background: c.bg, borderRadius: 10 }} className="p-2 text-center"><div style={{ fontSize: "0.64rem", color: c.inkMuted2 }}>Remboursé</div><div className="font-mono" style={{ fontWeight: 800 }}>{paye} DH</div></div>
                      <div style={{ background: c.bg, borderRadius: 10 }} className="p-2 text-center"><div style={{ fontSize: "0.64rem", color: c.inkMuted2 }}>À déduire</div><div className="font-mono" style={{ fontWeight: 800 }}>{restant} DH</div></div>
                    </div>
                  );
                })()}
              </div>
            )}

            {!isWorker && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 style={{ fontWeight: 700, fontSize: "0.85rem" }}>Cycles de paie</h3>
                  <AddButton label="Nouveau cycle" open={showCreateCycle} onClick={() => setShowCreateCycle(!showCreateCycle)} />
                </div>
                {showCreateCycle && (
                  <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-3 grid grid-cols-3 gap-3">
                    <Field label="Période début"><input type="date" value={cycleForm.periodeDebut} onChange={(e) => setCycleForm({ ...cycleForm, periodeDebut: e.target.value })} style={inputStyle} /></Field>
                    <Field label="Période fin"><input type="date" value={cycleForm.periodeFin} onChange={(e) => setCycleForm({ ...cycleForm, periodeFin: e.target.value })} style={inputStyle} /></Field>
                    <Field label="Date de paiement"><input type="date" value={cycleForm.datePaiement} onChange={(e) => setCycleForm({ ...cycleForm, datePaiement: e.target.value })} style={inputStyle} /></Field>
                    <div className="col-span-3"><button onClick={createCycle} style={{ background: c.cardGreen, color: "#fff", borderRadius: 11, padding: "9px 0", fontWeight: 700, width: "100%" }}>Créer le cycle</button></div>
                  </div>
                )}

                <div className="flex flex-col gap-2 mb-4">
                  {cyclesPaie.map((cy) => {
                    const statutColorMap = { brouillon: c.inkMuted2, calcule: c.blue, valide: c.cardGreenDeep, verrouille: c.orange, paye: c.cardGreenDeep, cloture: c.inkMuted2 };
                    return (
                      <div key={cy.id} style={{ background: c.white, border: `1px solid ${selectedCycleId === cy.id ? c.cardGreen : c.line}`, borderRadius: 12 }} className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <button onClick={() => { setSelectedCycleId(cy.id); loadBulletins(cy.id); }} style={{ fontWeight: 700, fontSize: "0.82rem", textDecoration: "underline" }}>{cy.periodeDebut} → {cy.periodeFin}</button>
                          <span style={{ background: `${statutColorMap[cy.statut]}18`, color: statutColorMap[cy.statut], borderRadius: 999, padding: "3px 9px", fontSize: "0.66rem", fontWeight: 700 }}>{cy.statut}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span style={{ fontSize: "0.72rem", color: c.inkMuted2 }}>Net total : {cy.totalNet.toFixed(0)} DH · Paiement : {cy.datePaiement || "—"}</span>
                          <div className="flex gap-1.5">
                            {(cy.statut === "brouillon" || cy.statut === "calcule") && <button onClick={() => calculerCycle(cy.id)} style={{ background: c.blue, color: "#fff", borderRadius: 8, padding: "4px 10px", fontSize: "0.68rem", fontWeight: 700 }}>Calculer</button>}
                            {cy.statut === "calcule" && <button onClick={() => changerStatutCycle(cy.id, "valide")} style={{ background: c.cardGreen, color: "#fff", borderRadius: 8, padding: "4px 10px", fontSize: "0.68rem", fontWeight: 700 }}>Valider</button>}
                            {cy.statut === "valide" && <button onClick={() => changerStatutCycle(cy.id, "verrouille")} style={{ background: c.orange, color: "#fff", borderRadius: 8, padding: "4px 10px", fontSize: "0.68rem", fontWeight: 700 }}>Verrouiller</button>}
                            {cy.statut === "verrouille" && <button onClick={() => changerStatutCycle(cy.id, "paye")} style={{ background: c.cardGreenDeep, color: "#fff", borderRadius: 8, padding: "4px 10px", fontSize: "0.68rem", fontWeight: 700 }}>Marquer payé</button>}
                            {cy.statut === "paye" && <button onClick={() => changerStatutCycle(cy.id, "cloture")} style={{ background: c.inkMuted2, color: "#fff", borderRadius: 8, padding: "4px 10px", fontSize: "0.68rem", fontWeight: 700 }}>Clôturer</button>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {cyclesPaie.length === 0 && <p style={{ color: c.inkMuted2, fontSize: "0.78rem" }}>Aucun cycle de paie créé</p>}
                </div>

                {selectedCycleId && bulletinsActifs.length > 0 && (() => {
                  const totalBrut = bulletinsActifs.reduce((s, b) => s + b.totalBrut, 0);
                  const totalDeductions = bulletinsActifs.reduce((s, b) => s + b.totalDeductions, 0);
                  const totalNet = bulletinsActifs.reduce((s, b) => s + b.netAPayer, 0);
                  const totalAvances = bulletinsActifs.reduce((s, b) => s + b.deductionsDetail.filter((d) => d.rubrique === "AVANCE").reduce((s2, d) => s2 + d.montant, 0), 0);
                  const totalJours = bulletinsActifs.length;
                  return (
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[
                        ["Employés", totalJours, ""],
                        ["Total brut", totalBrut.toFixed(0), "DH"],
                        ["Total net", totalNet.toFixed(0), "DH"],
                        ["Retenues", totalDeductions.toFixed(0), "DH"],
                        ["Avances", totalAvances.toFixed(0), "DH"],
                        ["Coût employeur", totalBrut.toFixed(0), "DH"],
                      ].map(([label, val, unit]) => (
                        <div key={label} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 12 }} className="p-3">
                          <div style={{ fontSize: "0.66rem", color: c.inkMuted2 }}>{label}</div>
                          <div className="font-mono" style={{ fontWeight: 800, fontSize: "1rem" }}>{val} {unit}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {selectedCycleId && bulletinsActifs.length > 0 && (
                  <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, overflow: "hidden" }}>
                    <div className="grid" style={{ gridTemplateColumns: "1.1fr 0.8fr 0.8fr 0.8fr 0.6fr 0.8fr", background: c.bg, fontSize: "0.64rem", color: c.inkMuted2, fontWeight: 700 }}>
                      {["Employé", "Brut", "Déductions", "Net à payer", "Anomalies", ""].map((h) => (<div key={h} className="px-2 py-2">{h}</div>))}
                    </div>
                    {bulletinsActifs.map((b) => (
                      <React.Fragment key={b.id}>
                      <div className="grid items-center" style={{ gridTemplateColumns: "1.1fr 0.8fr 0.8fr 0.8fr 0.6fr 0.8fr", borderTop: `1px solid ${c.line}`, fontSize: "0.78rem" }}>
                        <button onClick={() => setDetailBulletinId(detailBulletinId === b.id ? null : b.id)} className="px-2 py-2 text-right" style={{ fontWeight: 700, textDecoration: "underline" }}>{b.nomEmploye}</button>
                        <div className="px-2 py-2 font-mono">{b.totalBrut.toFixed(0)} DH</div>
                        <div className="px-2 py-2 font-mono" style={{ color: c.danger }}>-{b.totalDeductions.toFixed(0)} DH</div>
                        <div className="px-2 py-2 font-mono" style={{ fontWeight: 800, color: c.cardGreenDeep }}>{b.netAPayer.toFixed(0)} DH</div>
                        <div className="px-2 py-2">{b.anomalies.length > 0 ? <span style={{ color: c.danger, fontSize: "0.68rem" }}>⚠️ {b.anomalies.length}</span> : <span style={{ color: c.cardGreenDeep, fontSize: "0.68rem" }}>✓</span>}</div>
                        <div className="px-2 py-2"><button onClick={() => setBulletinPourPdf(b)} style={{ background: c.blue, color: "#fff", borderRadius: 8, padding: "4px 8px", fontSize: "0.66rem", fontWeight: 700 }}>Bulletin</button></div>
                      </div>
                      {detailBulletinId === b.id && (
                        <div style={{ borderTop: `1px solid ${c.line}`, background: c.bg }} className="p-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: c.cardGreenDeep }} className="mb-1 block">Gains</span>
                              {b.gainsDetail.map((g, i) => (<div key={i} className="flex justify-between" style={{ fontSize: "0.74rem" }}><span>{g.explication}</span><span className="font-mono">{g.montant.toFixed(0)} DH</span></div>))}
                            </div>
                            <div>
                              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: c.danger }} className="mb-1 block">Déductions</span>
                              {b.deductionsDetail.map((d, i) => (<div key={i} className="flex justify-between" style={{ fontSize: "0.74rem" }}><span>{d.explication}</span><span className="font-mono">-{d.montant.toFixed(0)} DH</span></div>))}
                              {b.deductionsDetail.length === 0 && <span style={{ fontSize: "0.72rem", color: c.inkMuted2 }}>Aucune</span>}
                            </div>
                          </div>
                          {b.anomalies.length > 0 && (
                            <div className="mt-2">
                              {b.anomalies.map((a, i) => (<div key={i} style={{ fontSize: "0.72rem", color: c.danger }}>⚠️ {a}</div>))}
                            </div>
                          )}
                        </div>
                      )}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            )}

            {currentUser.role === "Owner" && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 style={{ fontWeight: 700, fontSize: "0.85rem" }}>Audit Trail</h3>
                  <button onClick={() => loadAuditLogs(currentFarmId)} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 999, padding: "5px 12px", fontSize: "0.7rem", fontWeight: 700 }}>Actualiser</button>
                </div>
                <p style={{ color: c.inkMuted2, fontSize: "0.7rem" }} className="mb-2">كل تغيير (بونطاج، أجور، مخزون، طلبات، لوتات، عمال) مسجل أوطوماتيكيا — من قاعدة البيانات نفسها، حتى إيلا تبدل من برا التطبيق</p>
                <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto">
                  {auditLogs.map((a) => (
                    <div key={a.id} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 10 }} className="p-2.5">
                      <div className="flex items-center justify-between">
                        <span style={{ fontSize: "0.72rem", fontWeight: 700 }}>{a.tableName} · <span style={{ color: a.action === "DELETE" ? c.danger : a.action === "INSERT" ? c.cardGreenDeep : c.blue }}>{a.action}</span></span>
                        <span style={{ fontSize: "0.64rem", color: c.inkMuted2 }}>{new Date(a.createdAt).toLocaleString("fr-FR")}</span>
                      </div>
                      {a.champsModifies && a.champsModifies.length > 0 && (
                        <div style={{ fontSize: "0.68rem", color: c.inkSoft }} className="mt-1">Champs modifiés : {a.champsModifies.filter((f) => f !== "created_at").join(", ")}</div>
                      )}
                    </div>
                  ))}
                  {auditLogs.length === 0 && <p style={{ color: c.inkMuted2, fontSize: "0.78rem" }}>Aucun log pour le moment — cliquez "Actualiser"</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "Stock" && (
          isLocked("Stock") ? <LockedFeature nom="Stock" /> :
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>Stock des intrants</h2>
              {canEdit("Stock") && <AddButton label="Mouvement de stock" open={showAddStock} onClick={() => setShowAddStock(!showAddStock)} />}
            </div>

            {data.stock.filter((s) => s.expiryDate && new Date(s.expiryDate) <= new Date(Date.now() + 30 * 86400000)).length > 0 && (
              <div className="flex flex-col gap-2 mb-4">
                {data.stock.filter((s) => s.expiryDate && new Date(s.expiryDate) <= new Date(Date.now() + 30 * 86400000)).map((s) => {
                  const expired = new Date(s.expiryDate) < new Date();
                  return (
                    <div key={"exp-" + s.id} style={{ background: c.white, border: `1px solid ${c.line}`, borderRight: `4px solid ${expired ? c.danger : c.orange}`, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-3 flex items-center gap-3">
                      <AlertTriangle size={17} color={expired ? c.danger : c.orange} />
                      <span style={{ fontSize: "0.82rem", color: c.inkSoft }}>{s.nom}{s.lotNumber ? ` (lot ${s.lotNumber})` : ""} — {expired ? "منتهي الصلاحية" : "Expire bientôt"} : {s.expiryDate}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {data.stock.filter((s) => s.kammiya <= s.seuil).length > 0 && (
              <div className="flex flex-col gap-2 mb-4">
                {data.stock.filter((s) => s.kammiya <= s.seuil).map((s) => (
                  <div key={s.id} style={{ background: c.white, border: `1px solid ${c.line}`, borderRight: `4px solid ${c.danger}`, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-3 flex items-center gap-3">
                    <AlertTriangle size={17} color={c.danger} />
                    <span style={{ fontSize: "0.82rem", color: c.inkSoft }}>{s.nom} — باقي غير {s.kammiya} {s.wehda} (Seuil d'alerte {s.seuil}) — il faut acheter</span>
                  </div>
                ))}
              </div>
            )}

            {showAddStock && (
              <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-4 grid grid-cols-3 gap-3">
                <Field label="Nom du produit"><input list="stockNames" value={sForm.nom} onChange={(e) => setSForm({ ...sForm, nom: e.target.value })} placeholder="Fongicide..." style={inputStyle} />
                  <datalist id="stockNames">{data.stock.map((s) => <option key={s.id} value={s.nom} />)}</datalist>
                </Field>
                <Field label="Catégorie"><select value={sForm.categorie} onChange={(e) => setSForm({ ...sForm, categorie: e.target.value })} style={inputStyle}><option>Produit phyto</option><option>Engrais</option><option>Emballage</option><option>أخرى</option></select></Field>
                <Field label="Type de mouvement"><select value={sForm.mouvement} onChange={(e) => setSForm({ ...sForm, mouvement: e.target.value })} style={inputStyle}><option value="Entrée">Entrée (شراء)</option><option value="Sortie">Sortie (utilisation)</option></select></Field>
                <Field label="الكمية"><input type="number" value={sForm.kammiya} onChange={(e) => setSForm({ ...sForm, kammiya: e.target.value })} style={inputStyle} /></Field>
                <Field label="Unité"><select value={sForm.wehda} onChange={(e) => setSForm({ ...sForm, wehda: e.target.value })} style={inputStyle}><option>kilo</option><option>litre</option><option>sac</option></select></Field>
                <Field label="Seuil d'alerte (nouveau produit)"><input type="number" value={sForm.seuil} onChange={(e) => setSForm({ ...sForm, seuil: e.target.value })} style={inputStyle} /></Field>
                {sForm.mouvement === "Entrée" && (
                  <>
                    <Field label="Date de péremption"><input type="date" value={sForm.expiryDate} onChange={(e) => setSForm({ ...sForm, expiryDate: e.target.value })} style={inputStyle} /></Field>
                    <Field label="Numéro de lot"><input value={sForm.lotNumber} onChange={(e) => setSForm({ ...sForm, lotNumber: e.target.value })} placeholder="ex. L2026-047" style={inputStyle} /></Field>
                    <Field label="Unité d'achat (اختياري)"><input value={sForm.uniteAchat} onChange={(e) => setSForm({ ...sForm, uniteAchat: e.target.value })} placeholder="ex. جركان 20L" style={inputStyle} /></Field>
                    <Field label="Ratio conversion (1 وحدة شراء = كم وحدة استعمال)"><input type="number" value={sForm.ratioConversion} onChange={(e) => setSForm({ ...sForm, ratioConversion: e.target.value })} style={inputStyle} /></Field>
                  </>
                )}
                {sForm.mouvement === "Entrée" && (
                  <>
                    <Field label="Prix d'achat total (DH)"><input type="number" value={sForm.prix} onChange={(e) => setSForm({ ...sForm, prix: e.target.value })} placeholder="اختياري — envoie une facture au comptable" style={inputStyle} /></Field>
                    <Field label="Fournisseur"><input value={sForm.fournisseur} onChange={(e) => setSForm({ ...sForm, fournisseur: e.target.value })} style={inputStyle} /></Field>
                    <Field label="Bon de commande lié">
                      <select value={sForm.poNumero} onChange={(e) => setSForm({ ...sForm, poNumero: e.target.value })} style={inputStyle}>
                        <option value="">— sans bon (incomplet) —</option>
                        {commandesGlobal.filter((cmd) => (cmd.farmId === currentFarmId || cmd.destFarmId === currentFarmId) && cmd.statut === "Commandé").map((cmd) => (<option key={cmd.id} value={cmd.poNumero}>{cmd.poNumero} — {cmd.produit}{cmd.farmId !== currentFarmId ? ` (من ${cmd.farmNom})` : ""}</option>))}
                      </select>
                    </Field>
                    <Field label="Photo/scan du bon de livraison ou de la facture">
                      <input type="file" accept="image/*,application/pdf" capture="environment" onChange={handleFactureFile} style={{ ...inputStyle, padding: "6px 8px" }} />
                      {sForm.factureNom && <span style={{ fontSize: "0.68rem", color: c.cardGreenDeep, fontWeight: 700 }}>✓ {sForm.factureNom}</span>}
                    </Field>
                    <div className="col-span-3" style={{ background: "rgba(244,162,97,0.1)", borderRadius: 10, padding: "8px 10px" }}>
                      <span style={{ fontSize: "0.7rem", color: c.inkSoft }}>⚠️ Il faut les trois : Bon de réception (généré automatiquement) + Bon de commande + Photo du bon de livraison/facture. S'il en manque un, une alerte est envoyée au propriétaire.</span>
                    </div>
                  </>
                )}
                <div className="col-span-3"><button onClick={addStockMovement} style={{ background: c.cardGreen, color: "#fff", borderRadius: 11, padding: "10px 0", fontWeight: 700, width: "100%", boxShadow: "0 4px 14px -3px rgba(42,157,143,0.4)" }}>Enregistrer le mouvement</button></div>
              </div>
            )}

            <div className="flex items-center justify-between mb-2">
              <h3 style={{ fontWeight: 700, fontSize: "0.85rem" }}>Liste du stock</h3>
              {canEdit("Stock") && <AddButton label="Inventaire physique" open={showInventaire} onClick={() => setShowInventaire(!showInventaire)} />}
            </div>

            {showInventaire && (
              <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-4">
                <p style={{ fontSize: "0.72rem", color: c.inkMuted2 }} className="mb-3">قارن الكمية المسجلة بالكمية الحقيقية اللي عديتيها فالمخزن</p>
                <div className="flex flex-col gap-2">
                  {data.stock.map((s) => (
                    <div key={"inv-" + s.id} className="grid items-center gap-2" style={{ gridTemplateColumns: "1.3fr 0.8fr 0.8fr 0.8fr" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>{s.nom}</span>
                      <span className="font-mono" style={{ fontSize: "0.76rem", color: c.inkMuted2 }}>{s.kammiya} {s.wehda}</span>
                      <input type="number" placeholder="الكمية الحقيقية" value={jerdForm[s.id] || ""} onChange={(e) => setJerdForm({ ...jerdForm, [s.id]: e.target.value })} style={{ ...inputStyle, padding: "6px 8px", fontSize: "0.76rem" }} />
                      <button onClick={() => saveInventaire(s)} style={{ background: c.cardGreen, color: "#fff", borderRadius: 8, padding: "6px 0", fontSize: "0.72rem", fontWeight: 700 }}>Enregistrer</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
              <div className="grid" style={{ gridTemplateColumns: "1.4fr 0.9fr 1fr 0.9fr 0.9fr 0.9fr", background: c.bg, fontSize: "0.66rem", color: c.inkMuted2, fontWeight: 700 }}>
                {["المنتج", "Catégorie", "Quantité disponible", "Lot / Péremption", "Seuil d'alerte", "الحالة"].map((h) => (<div key={h} className="px-3 py-2">{h}</div>))}
              </div>
              {data.stock.map((s) => {
                const low = s.kammiya <= s.seuil;
                return (
                  <div key={s.id} className="grid items-center" style={{ gridTemplateColumns: "1.4fr 0.9fr 1fr 0.9fr 0.9fr 0.9fr", borderTop: `1px solid ${c.line}`, fontSize: "0.8rem" }}>
                    <div className="px-3 py-2" style={{ fontWeight: 700 }}>{s.nom}</div>
                    <div className="px-3 py-2" style={{ color: c.inkMuted2 }}>{s.categorie}</div>
                    <div className="px-3 py-2 font-mono" style={{ fontWeight: 700, color: low ? c.danger : c.ink }}>{s.kammiya} {s.wehda}</div>
                    <div className="px-3 py-2" style={{ fontSize: "0.7rem", color: c.inkMuted2 }}>{s.lotNumber || "—"}{s.expiryDate ? ` · ${s.expiryDate}` : ""}</div>
                    <div className="px-3 py-2 font-mono" style={{ color: c.inkMuted2 }}>{s.seuil} {s.wehda}</div>
                    <div className="px-3 py-2">
                      <span style={{ background: low ? "rgba(193,89,79,0.12)" : "rgba(42,157,143,0.12)", color: low ? c.danger : c.cardGreenDeep, borderRadius: 999, padding: "3px 9px", fontSize: "0.68rem", fontWeight: 700 }}>{low ? "Faible" : "Suffisant"}</span>
                    </div>
                  </div>
                );
              })}
              {data.stock.length === 0 && <div className="px-3 py-4" style={{ color: c.inkMuted2, fontSize: "0.82rem" }}>Aucun produit enregistré en stock</div>}
            </div>
          </div>
        )}

        {tab === "Réceptions" && (() => {
          if (isLocked("Réceptions")) return <LockedFeature nom="Réceptions" />;
          const uniquePatrons = [...new Set(data.wazin.map((w) => w.patron || w.wazan))];
          const parPatron = uniquePatrons.map((patron) => {
            const lignes = data.wazin.filter((w) => (w.patron || w.wazan) === patron);
            const totalKg = lignes.reduce((s, w) => s + w.kg, 0);
            const totalDH = lignes.reduce((s, w) => s + w.kg * w.prixKg, 0);
            const enAttente = lignes.filter((w) => w.statut === "En attente").reduce((s, w) => s + w.kg * w.prixKg, 0);
            return { patron, wazins: [...new Set(lignes.map((w) => w.wazan))], totalKg, totalDH, enAttente };
          });
          return (
          <div>
            <h2 className="font-display mb-1" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>Par patron (regroupé)</h2>
            <p style={{ color: c.inkMuted2, fontSize: "0.72rem" }} className="mb-3">عدة وزينات ممكن يرجعو لنفس الشخص/الشركة — هنا Total الحقيقي المستحق ليه</p>
            <div className="flex flex-col gap-2 mb-6">
              {parPatron.map((pp) => (
                <div key={pp.patron} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ fontWeight: 800, fontSize: "0.88rem" }}>{pp.patron}</span>
                    <span className="font-mono" style={{ fontWeight: 800, color: c.cardGreenDeep }}>{pp.totalDH.toLocaleString()} DH</span>
                  </div>
                  <div style={{ fontSize: "0.72rem", color: c.inkMuted2 }} className="flex items-center justify-between">
                    <span>Réceptions: {pp.wazins.join(" · ")} — {pp.totalKg} kg</span>
                    {pp.enAttente > 0 && <span style={{ color: c.orange, fontWeight: 700 }}>En attente: {pp.enAttente.toLocaleString()} DH</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mb-3"><h2 className="font-display" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>سجل Réceptions — détail</h2><AddButton label="زيد Envoi" open={showAddWazin} onClick={() => setShowAddWazin(!showAddWazin)} /></div>
            {showAddWazin && (
              <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-4 grid grid-cols-2 gap-3">
                <Field label="parcelle"><select value={zForm.parcelle} onChange={(e) => setZForm({ ...zForm, parcelle: e.target.value })} style={inputStyle}><option value="">Choisir</option>{data.parcelles.map((p) => <option key={p.code} value={p.code}>{p.code}</option>)}</select></Field>
                <Field label="Pesée"><input value={zForm.wazan} onChange={(e) => setZForm({ ...zForm, wazan: e.target.value })} placeholder="Pesée Sidi Bennour..." style={inputStyle} /></Field>
                <Field label="الباطرون (اختياري si différent du nom de la pesée)">
                  <input list="patronsList" value={zForm.patron} onChange={(e) => setZForm({ ...zForm, patron: e.target.value })} placeholder="ex. Haj Mustapha" style={inputStyle} />
                  <datalist id="patronsList">{uniquePatrons.map((p) => <option key={p} value={p} />)}</datalist>
                </Field>
                <Field label="Quantité (kg)"><input type="number" value={zForm.kg} onChange={(e) => setZForm({ ...zForm, kg: e.target.value })} style={inputStyle} /></Field>
                <Field label="Prix/kg (DH)"><input type="number" step="0.1" value={zForm.prixKg} onChange={(e) => setZForm({ ...zForm, prixKg: e.target.value })} style={inputStyle} /></Field>
                <Field label="الحالة"><select value={zForm.statut} onChange={(e) => setZForm({ ...zForm, statut: e.target.value })} style={inputStyle}><option>En attente</option><option>Payé</option></select></Field>
                <div className="flex items-end"><button onClick={addWazin} style={{ background: c.cardGreen, color: "#fff", borderRadius: 11, padding: "10px 0", boxShadow: "0 4px 14px -3px rgba(42,157,143,0.4)", fontWeight: 700, fontSize: "0.85rem", width: "100%" }}>Enregistrer l'envoi</button></div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              {data.wazin.map((w) => (
                <div key={w.id} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-3 flex items-center justify-between">
                  <div className="flex flex-col"><span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{w.wazan}</span><span className="font-mono" style={{ fontSize: "0.7rem", color: c.inkMuted2 }}>{w.patron || w.wazan} · {w.parcelle} · {w.date}</span></div>
                  <div className="flex flex-col items-end"><span className="font-mono" style={{ fontSize: "0.82rem", fontWeight: 700 }}>{w.kg} kg · {w.prixKg} DH</span><span style={{ fontSize: "0.7rem", fontWeight: 700, color: w.statut === "Payé" ? c.cardGreenDeep : c.orange }}>{w.statut}</span></div>
                </div>
              ))}
            </div>
          </div>
          );
        })()}

        {tab === "Factures" && (() => {
          if (isLocked("Factures")) return <LockedFeature nom="Factures" />;
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
                  <h2 className="font-display mb-2" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>⚠️ عمليات ناقصة — Alerte للمالك</h2>
                  <div className="flex flex-col gap-2">
                    {alertesIncompletes.map((al) => (
                      <div key={al.id} style={{ background: "rgba(193,89,79,0.08)", border: `1px solid ${c.danger}`, borderRadius: 12 }} className="p-3">
                        <span style={{ fontSize: "0.82rem", color: c.inkSoft }}><b>{al.personne}</b> a reçu une marchandise (<b>{al.produit}</b>) فـ<b>{al.farmNom}</b> mais n'a pas terminé — il manque : <span style={{ color: c.danger, fontWeight: 700 }}>{al.manque.join(" و ")}</span> · {al.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {showAchats && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="font-display" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>Achats d'intrants — toutes les fermes</h2>
                    {nouveauxAchats.length > 0 && <span style={{ background: "rgba(193,89,79,0.12)", color: c.danger, borderRadius: 999, padding: "3px 10px", fontSize: "0.7rem", fontWeight: 700 }}>{nouveauxAchats.length} Nouveau</span>}
                  </div>
                  <p style={{ color: c.inkMuted2, fontSize: "0.72rem" }} className="mb-3">Arrive directement ici dès qu'une ferme achète un produit phyto/intrant — quelle que soit la ville</p>
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
                              {a.complet === false && <span style={{ background: "rgba(193,89,79,0.12)", color: c.danger, borderRadius: 999, padding: "2px 8px", fontSize: "0.62rem", fontWeight: 700 }}>ناقص</span>}
                              {a.complet === true && <span style={{ background: "rgba(42,157,143,0.12)", color: c.cardGreenDeep, borderRadius: 999, padding: "2px 8px", fontSize: "0.62rem", fontWeight: 700 }}>Complet</span>}
                            </div>
                            <span className="font-mono" style={{ fontSize: "0.7rem", color: c.inkMuted2 }}>{a.kammiya} {a.wehda} · {a.fournisseur} · {a.date} · {a.bonReceptionNumero}{a.poNumero ? ` · ${a.poNumero}` : ""}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono" style={{ fontWeight: 700 }}>{a.prix.toLocaleString()} DH</span>
                          {!a.vu && <button onClick={() => setAchatsGlobal(achatsGlobal.map((x) => x.id === a.id ? { ...x, vu: true } : x))} style={{ background: c.cardGreen, borderRadius: 8, padding: "5px 10px" }}><span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#fff" }}>Vérifié</span></button>}
                        </div>
                      </div>
                    ))}
                    {mesAchats.length === 0 && <p style={{ color: c.inkMuted2, fontSize: "0.82rem" }}>Aucun(e) مشتريات دابا</p>}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>Factures</h2>
                {canEdit("Factures") && <AddButton label="فاتورة Nouvelle" open={showAddInvoice} onClick={() => setShowAddInvoice(!showAddInvoice)} />}
              </div>

              {showAddInvoice && (
                <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-4 grid grid-cols-3 gap-3">
                  <Field label="Client (pesée/client)"><input value={invForm.client} onChange={(e) => setInvForm({ ...invForm, client: e.target.value })} style={inputStyle} /></Field>
                  <Field label="المنتج"><select value={invForm.produit} onChange={(e) => setInvForm({ ...invForm, produit: e.target.value })} style={inputStyle}><option value="avocat">Avocat</option><option value="fraise">Fraise</option></select></Field>
                  <Field label="Quantité (kg)"><input type="number" value={invForm.qte} onChange={(e) => setInvForm({ ...invForm, qte: e.target.value })} style={inputStyle} /></Field>
                  <Field label="Prix unitaire (DH)"><input type="number" step="0.1" value={invForm.prixUnitaire} onChange={(e) => setInvForm({ ...invForm, prixUnitaire: e.target.value })} style={inputStyle} /></Field>
                  <Field label="TVA % (à confirmer avec le comptable)"><input type="number" value={invForm.tva} onChange={(e) => setInvForm({ ...invForm, tva: e.target.value })} placeholder="0 si exonéré" style={inputStyle} /></Field>
                  <div className="flex items-end"><button onClick={addInvoice} style={{ background: c.cardGreen, color: "#fff", borderRadius: 11, padding: "9px 0", fontWeight: 700, width: "100%", boxShadow: "0 4px 14px -3px rgba(42,157,143,0.4)" }}>Émettre la facture</button></div>
                </div>
              )}

              <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Résumé TVA (simplifié)</span>
                  <button onClick={exportTaxSummary} style={{ background: c.bg, borderRadius: 9, padding: "6px 11px" }} className="flex items-center gap-1.5"><Download size={13} color={c.cardGreenDeep} /><span style={{ fontSize: "0.72rem", fontWeight: 700, color: c.cardGreenDeep }}>Exporter</span></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><div style={{ fontSize: "0.68rem", color: c.inkMuted2 }}>Total HT</div><div className="font-mono" style={{ fontWeight: 800 }}>{totalHT.toLocaleString()} DH</div></div>
                  <div><div style={{ fontSize: "0.68rem", color: c.inkMuted2 }}>Total TVA</div><div className="font-mono" style={{ fontWeight: 800 }}>{totalTVA.toLocaleString()} DH</div></div>
                  <div><div style={{ fontSize: "0.68rem", color: c.inkMuted2 }}>Total TTC</div><div className="font-mono" style={{ fontWeight: 800, color: c.cardGreenDeep }}>{totalTTC.toLocaleString()} DH</div></div>
                </div>
                <p style={{ fontSize: "0.68rem", color: c.inkMuted2 }} className="mt-2">⚠️ Résumé interne uniquement — ce n'est pas une déclaration fiscale officielle, vérifiez toujours avec votre comptable agréé avant toute déclaration auprès de l'administration fiscale.</p>
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
                {data.invoices.length === 0 && <p style={{ color: c.inkMuted2, fontSize: "0.82rem" }}>Aucune facture enregistrée</p>}
              </div>
            </div>
          );
        })()}

        {tab === "CNSS" && (() => {
          if (isLocked("CNSS")) return <LockedFeature nom="CNSS" />;
          const joursRestants = data.cnss.echeanceJour ? data.cnss.echeanceJour - 20 : null;
          const urgent = joursRestants !== null && joursRestants <= 3;
          const nonAffilies = data.employees.filter((e) => e.affilieCNSS === false);
          return (
            <div>
              <h2 className="font-display mb-4" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>Déclarations sociales (CNSS)</h2>

              <div style={{ background: data.cnss.declare ? "rgba(42,157,143,0.08)" : urgent ? "rgba(193,89,79,0.08)" : "rgba(244,162,97,0.08)", border: `1px solid ${data.cnss.declare ? c.cardGreen : urgent ? c.danger : c.orange}`, borderRadius: 16 }} className="p-4 mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>Déclaration {data.cnss.moisLabel}</span>
                  {data.cnss.declare ? (
                    <span style={{ background: "rgba(42,157,143,0.15)", color: c.cardGreenDeep, borderRadius: 999, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700 }}>✓ Fait — {data.cnss.dateDeclare}</span>
                  ) : (
                    <span style={{ background: urgent ? "rgba(193,89,79,0.15)" : "rgba(244,162,97,0.15)", color: urgent ? c.danger : c.orange, borderRadius: 999, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700 }}>
                      {joursRestants === null ? "Échéance non définie" : joursRestants < 0 ? `En retard ${Math.abs(joursRestants)} يوم` : joursRestants === 0 ? "Échéance aujourd'hui" : `باقي ${joursRestants} يوم`}
                    </span>
                  )}
                </div>
                <div className="flex items-end gap-3">
                  <Field label="Jour d'échéance mensuel (à confirmer avec le comptable/CNSS)">
                    <input type="number" min="1" max="31" value={data.cnss.echeanceJour} onChange={(e) => updateEcheance(e.target.value)} style={{ ...inputStyle, width: 90 }} disabled={!canEdit("CNSS")} />
                  </Field>
                  {!data.cnss.declare && canEdit("CNSS") && (
                    <button onClick={marquerDeclare} style={{ background: c.cardGreen, color: "#fff", borderRadius: 10, padding: "9px 16px", fontWeight: 700, fontSize: "0.8rem", boxShadow: "0 4px 14px -3px rgba(42,157,143,0.4)" }}>Marquer la déclaration comme faite</button>
                  )}
                </div>
                <p style={{ fontSize: "0.68rem", color: c.inkMuted2 }} className="mt-2">⚠️ Simple rappel interne — vérifiez toujours la date officielle exacte avec votre comptable ou le site de la CNSS.</p>
              </div>

              {nonAffilies.length > 0 && (
                <div style={{ background: "rgba(193,89,79,0.08)", border: `1px solid ${c.danger}`, borderRadius: 14 }} className="p-3 mb-4 flex items-center gap-2">
                  <AlertTriangle size={16} color={c.danger} />
                  <span style={{ fontSize: "0.8rem", color: c.inkSoft }}>{nonAffilies.length} employé(s) non affilié(s) à la CNSS — risque juridique potentiel</span>
                </div>
              )}

              <div className="flex items-center justify-between mb-2">
                <h3 style={{ fontWeight: 700, fontSize: "0.88rem" }}>Tableau de déclaration complet — généré automatiquement à partir de chaque pointage</h3>
                <div className="flex items-center gap-2">
                  <button onClick={exportOmageModele} style={{ background: c.blue, color: "#fff", borderRadius: 10, padding: "7px 13px", boxShadow: "0 4px 14px -3px rgba(92,134,168,0.4)" }} className="flex items-center gap-1.5"><Download size={14} /><span style={{ fontSize: "0.78rem", fontWeight: 700 }}>Exporter OMAGE</span></button>
                  <button onClick={exportBDS} style={{ background: c.cardGreen, color: "#fff", borderRadius: 10, padding: "7px 13px", boxShadow: "0 4px 14px -3px rgba(42,157,143,0.4)" }} className="flex items-center gap-1.5"><Download size={14} /><span style={{ fontSize: "0.78rem", fontWeight: 700 }}>Tableau standard</span></button>
                </div>
              </div>
              <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="mb-5">
                <div className="grid" style={{ gridTemplateColumns: "1fr 1.1fr 0.7fr 1.3fr 1fr", background: c.bg, fontSize: "0.66rem", color: c.inkMuted2, fontWeight: 700 }}>
                  {["N° CNSS", "Nom", "Inscrit", "Jours/heures ce mois", "Salaire (DH)"].map((h) => (<div key={h} className="px-3 py-2">{h}</div>))}
                </div>
                {data.workers.map((w) => { const emp = getEmployee(w.nom); return (
                  <div key={w.id} className="grid items-center" style={{ gridTemplateColumns: "1fr 1.1fr 0.7fr 1.3fr 1fr", borderTop: `1px solid ${c.line}`, fontSize: "0.78rem" }}>
                    <div className="px-3 py-2 font-mono" style={{ color: c.inkMuted2 }}>{emp.cnssNumero || "—"}</div>
                    <div className="px-3 py-2" style={{ fontWeight: 700 }}>{w.nom}</div>
                    <div className="px-3 py-2">{emp.affilieCNSS ? "✓" : <span style={{ color: c.danger }}>✕</span>}</div>
                    <div className="px-3 py-2 font-mono" style={{ color: c.inkMuted2 }}>{w.moisQte} {w.type === "Heures" ? "h" : "Jour"}</div>
                    <div className="px-3 py-2 font-mono" style={{ fontWeight: 700, color: c.cardGreenDeep }}>{w.moisQte * w.taux} DH</div>
                  </div>
                );})}
              </div>

              <h3 style={{ fontWeight: 700, fontSize: "0.88rem" }} className="mb-1">Fiches employés — informations fixes (utilisées automatiquement dans chaque export)</h3>
              <p style={{ color: c.inkMuted2, fontSize: "0.7rem" }} className="mb-2">Renseignez ces informations une seule fois par employé ; elles seront réutilisées les mois suivants</p>
              <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, overflow: "auto", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.74rem" }}>
                  <thead>
                    <tr style={{ background: c.bg }}>
                      {["Employé", "Prénom", "CIN", "Date d'entrée", "Situation familiale", "Nombre d'enfants", "N° CNSS", "الحالة"].map((h) => (<th key={h} className="px-2 py-2 text-right" style={{ color: c.inkMuted2, fontSize: "0.66rem" }}>{h}</th>))}
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
                            <option value="">—</option><option value="Célibataire">Célibataire</option><option value="Marié(e)">Marié(e)</option>
                          </select>
                        </td>
                        <td className="px-2 py-1.5"><input type="number" min="0" value={e.nombreEnfants} onChange={(ev) => updateEmployee(e.id, { nombreEnfants: ev.target.value })} disabled={!canEdit("CNSS")} style={{ ...inputStyle, padding: "4px 6px", width: 60 }} /></td>
                        <td className="px-2 py-1.5"><input value={e.cnssNumero} onChange={(ev) => updateEmployee(e.id, { cnssNumero: ev.target.value })} disabled={!canEdit("CNSS")} style={{ ...inputStyle, padding: "4px 6px", width: 100 }} /></td>
                        <td className="px-2 py-1.5">
                          <button onClick={() => canEdit("CNSS") && toggleAffiliation(e.id)} style={{ background: e.affilieCNSS ? "rgba(42,157,143,0.12)" : "rgba(193,89,79,0.12)", borderRadius: 999, padding: "3px 9px" }} className="flex items-center gap-1">
                            <CheckCircle2 size={12} color={e.affilieCNSS ? c.cardGreenDeep : c.danger} />
                            <span style={{ fontSize: "0.66rem", fontWeight: 700, color: e.affilieCNSS ? c.cardGreenDeep : c.danger }}>{e.affilieCNSS ? "Inscrit" : "Non inscrit"}</span>
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

        {tab === "Coûts" && (() => {
          if (isLocked("Coûts")) return <LockedFeature nom="Coûts" />;
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
            <div className="flex items-center justify-between mb-3"><h2 className="font-display" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>تكلفة Parcelles — Juillet 2026</h2>{canEdit("Coûts") && <AddButton label="Ajouter un coût" open={showAddCost} onClick={() => setShowAddCost(!showAddCost)} />}</div>

            {anomalies.length > 0 && (
              <div className="mb-4 flex flex-col gap-2">
                {anomalies.map((a) => (
                  <div key={a.code} style={{ background: "rgba(193,89,79,0.08)", border: `1px solid ${c.danger}`, borderRadius: 12 }} className="p-3 flex items-center gap-2">
                    <AlertTriangle size={16} color={c.danger} />
                    <span style={{ fontSize: "0.8rem", color: c.inkSoft }}>⚠️ parcelle <b>{a.code} — {parcelleNom(a.code)}</b> تكلفتها à l'hectare ({Math.round(a.parHa)} DH) supérieur à la moyenne ({Math.round(avgParHa)} DH) de {Math.round((a.parHa / avgParHa - 1) * 100)}% — تأكد منها، ممكن غلط ou vol</span>
                  </div>
                ))}
              </div>
            )}

            {showAddCost && (
              <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-4 grid grid-cols-3 gap-3">
                <Field label="parcelle"><select value={cForm.parcelle} onChange={(e) => setCForm({ ...cForm, parcelle: e.target.value })} style={inputStyle}><option value="">Choisir</option>{data.parcelles.map((p) => <option key={p.code} value={p.code}>{p.code}</option>)}</select></Field>
                <Field label="Type"><select value={cForm.naw3} onChange={(e) => setCForm({ ...cForm, naw3: e.target.value })} style={inputStyle}><option>Produit phyto</option><option>Eau</option><option>Main-d'œuvre</option></select></Field>
                <Field label="Montant (DH)"><input type="number" value={cForm.mablagh} onChange={(e) => setCForm({ ...cForm, mablagh: e.target.value })} style={inputStyle} /></Field>
                <div className="col-span-3"><button onClick={addCost} style={{ background: c.cardGreen, color: "#fff", borderRadius: 11, padding: "10px 0", boxShadow: "0 4px 14px -3px rgba(42,157,143,0.4)", fontWeight: 700, fontSize: "0.85rem", width: "100%" }}>Ajouter au coût</button></div>
              </div>
            )}
            <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)", overflow: "hidden" }}>
              <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr 1fr 1fr 1fr", background: c.bg, fontSize: "0.68rem", color: c.inkMuted2, fontWeight: 700 }}>
                {["parcelle", "Produit phyto", "Eau", "Main-d'œuvre", "Total"].map((h) => (<div key={h} className="px-3 py-2">{h}</div>))}
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

        {tab === "Dépenses" && (
          isLocked("Dépenses") ? <LockedFeature nom="Dépenses" /> :
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>Dépenses journalières détaillées</h2>
              {canEdit("Dépenses") && <AddButton label="Ajouter une dépense" open={showAddDepense} onClick={() => setShowAddDepense(!showAddDepense)} />}
            </div>

            <div className="flex gap-2 mb-4">
              {[{ l: "Aujourd'hui", v: 0 }, { l: "3 derniers jours", v: 2 }, { l: "Dernière semaine", v: 6 }, { l: "Tout", v: 999 }].map((p) => (
                <button key={p.v} onClick={() => setPeriode(p.v)} style={{ background: periode === p.v ? c.cardGreen : c.white, color: periode === p.v ? "#fff" : c.ink, border: `1px solid ${periode === p.v ? c.cardGreen : c.line}`, borderRadius: 10, padding: "7px 12px", fontSize: "0.78rem", fontWeight: 700 }}>{p.l}</button>
              ))}
            </div>

            {showAddDepense && (
              <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-4 grid grid-cols-3 gap-3">
                <Field label="Type"><select value={dForm.type} onChange={(e) => setDForm({ ...dForm, type: e.target.value })} style={inputStyle}><option>Main-d'œuvre</option><option>Produit phyto</option><option>Eau</option></select></Field>
                <Field label="Détails"><input value={dForm.detail} onChange={(e) => setDForm({ ...dForm, detail: e.target.value })} placeholder="ex. Ahmed — Irrigation (A1)" style={inputStyle} /></Field>
                <Field label="Montant (DH)"><input type="number" value={dForm.montant} onChange={(e) => setDForm({ ...dForm, montant: e.target.value })} style={inputStyle} /></Field>
                <div className="col-span-3"><button onClick={addDepense} style={{ background: c.cardGreen, color: "#fff", borderRadius: 11, padding: "10px 0", boxShadow: "0 4px 14px -3px rgba(42,157,143,0.4)", fontWeight: 700, width: "100%" }}>Enregistrer la dépense</button></div>
              </div>
            )}

            {(() => {
              const filtered = data.depenses.filter((d) => d.dayOffset <= periode);
              const parType = { "Main-d'œuvre": 0, "Produit phyto": 0, "Eau": 0 };
              filtered.forEach((d) => { parType[d.type] = (parType[d.type] || 0) + d.montant; });
              const total = filtered.reduce((s, d) => s + d.montant, 0);
              return (
                <>
                  <div className="grid grid-cols-4 gap-3 mb-5">
                    <div style={{ background: c.cardGreen, borderRadius: 16, padding: "14px 16px", color: "#fff" }}><div style={{ fontSize: "0.68rem", opacity: 0.85 }}>Total général</div><div style={{ fontWeight: 800, fontSize: "1.3rem" }}>{total} DH</div></div>
                    <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)", padding: "14px 16px" }}><div style={{ fontSize: "0.68rem", color: c.inkMuted2 }}>Main-d'œuvre</div><div style={{ fontWeight: 800, fontSize: "1.15rem" }}>{parType["Main-d'œuvre"]} DH</div></div>
                    <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)", padding: "14px 16px" }}><div style={{ fontSize: "0.68rem", color: c.inkMuted2 }}>Produit phyto</div><div style={{ fontWeight: 800, fontSize: "1.15rem" }}>{parType["Produit phyto"]} DH</div></div>
                    <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)", padding: "14px 16px" }}><div style={{ fontSize: "0.68rem", color: c.inkMuted2 }}>Eau</div><div style={{ fontWeight: 800, fontSize: "1.15rem" }}>{parType["Eau"]} DH</div></div>
                  </div>

                  {["20 juillet", "19 juillet", "18 juillet"].filter((dl) => filtered.some((d) => d.dateLabel === dl)).map((dl) => (
                    <div key={dl} className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 style={{ fontWeight: 700, fontSize: "0.85rem", color: c.inkSoft }}>{dl}</h3>
                        <span className="font-mono" style={{ fontSize: "0.78rem", fontWeight: 700, color: c.cardGreenDeep }}>{filtered.filter((d) => d.dateLabel === dl).reduce((s, d) => s + d.montant, 0)} DH</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {filtered.filter((d) => d.dateLabel === dl).map((d) => (
                          <div key={d.id} style={{ background: c.white, border: `1px solid ${c.line}`, borderRight: `4px solid ${d.type === "Main-d'œuvre" ? c.blue : d.type === "Produit phyto" ? c.orange : c.cardGreen}`, borderRadius: 12 }} className="p-3 flex items-center justify-between">
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
                  {filtered.length === 0 && <p style={{ color: c.inkMuted2, fontSize: "0.82rem" }}>Aucune dépense enregistrée pour cette période</p>}
                </>
              );
            })()}
          </div>
        )}

        {tab === "Rentabilité" && (
          isLocked("Rentabilité") ? <LockedFeature nom="Rentabilité" /> :
          <div>
            <h2 className="font-display mb-1" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>Rentabilité لكل parcelle</h2>
            <p style={{ color: c.inkMuted2, fontSize: "0.72rem" }} className="mb-4">Revenu (من Réceptions) ناقص Coûts (Produit phyto + Eau + main-d'œuvre) = Bénéfice net — هاد le mois</p>

            {(() => {
              const coutLabor = data.workers.reduce((s, w) => s + w.qte * w.taux, 0);
              const coutIntrants = data.costs.reduce((s, cp) => s + cp.dawa + cp.ma + cp.omal, 0);
              const coutEmballage = data.depenses.filter((d) => d.type === "Emballage" || d.detail?.toLowerCase().includes("emballage")).reduce((s, d) => s + d.montant, 0);
              const coutTransport = expeditions.reduce((s, e) => s + (e.coutTransport || 0), 0);
              const coutAutre = data.depenses.filter((d) => d.type !== "Emballage").reduce((s, d) => s + d.montant, 0);
              const coutTotal = coutLabor + coutIntrants + coutEmballage + coutTransport + coutAutre;
              const productionTotale = lots.reduce((s, l) => s + l.quantiteKg, 0);
              const coutParKg = productionTotale > 0 ? coutTotal / productionTotale : 0;
              const revenuTotal = data.wazin.reduce((s, w) => s + w.kg * w.prixKg, 0);
              const profitTotal = revenuTotal - coutTotal;
              const margeTotal = revenuTotal > 0 ? (profitTotal / revenuTotal) * 100 : 0;
              return (
                <div className="mb-5">
                  <h3 style={{ fontWeight: 700, fontSize: "0.85rem" }} className="mb-2">Coût Total Ferme (Cost Engine)</h3>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[
                      ["Main-d'œuvre", coutLabor], ["Intrants", coutIntrants], ["Emballage", coutEmballage],
                      ["Transport", coutTransport], ["Autres dépenses", coutAutre], ["Coût total", coutTotal],
                    ].map(([label, val]) => (
                      <div key={label} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 12 }} className="p-3">
                        <div style={{ fontSize: "0.66rem", color: c.inkMuted2 }}>{label}</div>
                        <div className="font-mono" style={{ fontWeight: 800, fontSize: "0.95rem" }}>{val.toFixed(0)} DH</div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div style={{ background: c.cardGreenDeep, borderRadius: 12 }} className="p-3">
                      <div style={{ fontSize: "0.64rem", color: "rgba(255,255,255,0.8)" }}>Coût/kg</div>
                      <div className="font-mono" style={{ fontWeight: 800, fontSize: "1rem", color: "#fff" }}>{coutParKg.toFixed(2)} DH</div>
                    </div>
                    <div style={{ background: c.blue, borderRadius: 12 }} className="p-3">
                      <div style={{ fontSize: "0.64rem", color: "rgba(255,255,255,0.8)" }}>Revenu total</div>
                      <div className="font-mono" style={{ fontWeight: 800, fontSize: "1rem", color: "#fff" }}>{revenuTotal.toFixed(0)} DH</div>
                    </div>
                    <div style={{ background: profitTotal >= 0 ? c.cardGreen : c.danger, borderRadius: 12 }} className="p-3">
                      <div style={{ fontSize: "0.64rem", color: "rgba(255,255,255,0.85)" }}>Profit ({margeTotal.toFixed(1)}%)</div>
                      <div className="font-mono" style={{ fontWeight: 800, fontSize: "1rem", color: "#fff" }}>{profitTotal.toFixed(0)} DH</div>
                    </div>
                  </div>
                  <p style={{ fontSize: "0.66rem", color: c.inkMuted2 }} className="mt-2">Production totale utilisée pour Coût/kg : {productionTotale.toFixed(0)} kg (basée sur les Lots créés)</p>
                </div>
              );
            })()}

            <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-5">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={rentabilite} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={c.line} vertical={false} />
                  <XAxis dataKey="code" tick={{ fontSize: 11, fill: c.inkMuted2 }} axisLine={{ stroke: c.line }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: c.inkMuted2 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [`${v} DH`, "Bénéfice"]} labelFormatter={(l) => `parcelle ${l}`} contentStyle={{ borderRadius: 10, border: `1px solid ${c.line}`, fontSize: "0.78rem" }} />
                  <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
                    {rentabilite.map((r, i) => (<Cell key={i} fill={r.profit >= 0 ? c.cardGreen : c.danger} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
              <div className="grid" style={{ gridTemplateColumns: "1.5fr 1fr 1fr 1fr 0.8fr", background: c.bg, fontSize: "0.68rem", color: c.inkMuted2, fontWeight: 700 }}>
                {["parcelle", "Revenu", "Coûts", "Bénéfice net", "Marge"].map((h) => (<div key={h} className="px-3 py-2">{h}</div>))}
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

            {(() => {
              const parParcelle = {};
              data.workers.forEach((w) => {
                const key = w.parcelle || "—";
                if (!parParcelle[key]) parParcelle[key] = { cout: 0, production: 0 };
                parParcelle[key].cout += w.qte * w.taux;
                if (w.modePaie === "rendement" || w.modePaie === "production") parParcelle[key].production += w.qte;
              });
              const entries = Object.entries(parParcelle);
              if (entries.length === 0) return null;
              return (
                <div className="mb-5">
                  <h3 style={{ fontWeight: 700, fontSize: "0.85rem" }} className="mb-2">Coût main-d'œuvre par parcelle</h3>
                  <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, overflow: "hidden" }}>
                    <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr", background: c.bg, fontSize: "0.66rem", color: c.inkMuted2, fontWeight: 700 }}>
                      {["Parcelle", "Production (kg)", "Coût main-d'œuvre", "Coût/kg"].map((h) => (<div key={h} className="px-3 py-2">{h}</div>))}
                    </div>
                    {entries.map(([code, v]) => (
                      <div key={code} className="grid items-center" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr", borderTop: `1px solid ${c.line}`, fontSize: "0.78rem" }}>
                        <div className="px-3 py-2 font-mono">{code}</div>
                        <div className="px-3 py-2 font-mono">{v.production.toFixed(0)}</div>
                        <div className="px-3 py-2 font-mono">{v.cout.toFixed(0)} DH</div>
                        <div className="px-3 py-2 font-mono" style={{ fontWeight: 700 }}>{v.production > 0 ? (v.cout / v.production).toFixed(2) : "—"} DH</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {(() => {
              const parTache = {};
              data.workers.forEach((w) => { parTache[w.tache] = (parTache[w.tache] || 0) + w.qte * w.taux; });
              const entries = Object.entries(parTache).sort((a, b) => b[1] - a[1]);
              if (entries.length === 0) return null;
              return (
                <div className="mb-5">
                  <h3 style={{ fontWeight: 700, fontSize: "0.85rem" }} className="mb-2">Coût main-d'œuvre par tâche</h3>
                  <div className="flex flex-col gap-2">
                    {entries.map(([tache, cout]) => (
                      <div key={tache} className="flex items-center justify-between" style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 12 }}>
                        <span className="px-3 py-2" style={{ fontSize: "0.8rem", fontWeight: 600 }}>{tache}</span>
                        <span className="px-3 py-2 font-mono" style={{ fontWeight: 700 }}>{cout.toFixed(0)} DH</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {tab === "Assistant IA" && (
          isLocked("Assistant IA") ? <LockedFeature nom="Assistant IA" /> :
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div style={{ background: "rgba(42,157,143,0.12)", borderRadius: 10, padding: 7 }}><Brain size={17} color={c.cardGreenDeep} /></div>
                <h2 className="font-display" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>Assistant IA</h2>
              </div>
              <button onClick={() => setAutoSpeak(!autoSpeak)} style={{ background: autoSpeak ? "rgba(42,157,143,0.12)" : c.white, border: `1px solid ${autoSpeak ? c.cardGreen : c.line}`, borderRadius: 999, padding: "5px 11px" }} className="flex items-center gap-1.5">
                <Play size={12} color={autoSpeak ? c.cardGreenDeep : c.inkMuted2} />
                <span style={{ fontSize: "0.68rem", fontWeight: 700, color: autoSpeak ? c.cardGreenDeep : c.inkMuted2 }}>Lire la réponse à voix haute {autoSpeak ? "✓" : ""}</span>
              </button>
            </div>
            <p style={{ color: c.inkMuted2, fontSize: "0.72rem" }} className="mb-4">كيقرا بيانات الفيرمة الحقيقية (Rentabilité, Coûts, Stock, Réceptions) ويجاوبك بالدارجة — سؤال حر، بالكتابة ou à l'oral</p>

            <div className="flex gap-2 flex-wrap mb-4">
              {["حلل ليا Rentabilité هاد le mois", "علاش تكلفة اليد العاملة طلعات هاد الشهر؟", "شنو أحسن Parcelle؟", "Où est le plus grand risque en ce moment ?"].map((q) => (
                <button key={q} onClick={() => askAnalyst(q)} style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 999, padding: "7px 13px", fontSize: "0.74rem", fontWeight: 600, color: c.inkSoft }}>{q}</button>
              ))}
            </div>

            <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)", minHeight: 260 }} className="p-4 mb-4 flex flex-col gap-3">
              {analystMessages.length === 0 && !analystLoading && (
                <div className="flex flex-col items-center justify-center py-10" style={{ color: c.inkMuted2 }}>
                  <Brain size={28} color={c.inkMuted2} />
                  <p style={{ fontSize: "0.8rem" }} className="mt-2">Posez à l'assistant n'importe quelle question sur les données de votre ferme</p>
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
                placeholder={listening ? "J'écoute... parlez maintenant" : "اكتب سؤالك هنا ou كليكي الميكرو..."}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button onClick={() => askAnalyst(analystQuestion)} disabled={analystLoading} style={{ background: c.cardGreen, borderRadius: 11, padding: "11px 16px", boxShadow: "0 4px 14px -3px rgba(42,157,143,0.4)" }}>
                <Send size={16} color="#fff" />
              </button>
            </div>
          </div>
        )}

        {tab === "Plan de traitement" && (
          isLocked("Plan de traitement") ? <LockedFeature nom="Plan de traitement" /> :
          <div>
            <div className="flex items-center justify-between mb-1"><h2 className="font-display" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>Plan de traitement</h2><AddButton label="Ajouter un traitement" open={showAddPlan} onClick={() => setShowAddPlan(!showAddPlan)} /></div>
            <p style={{ color: c.inkMuted2, fontSize: "0.72rem" }} className="mb-3">Vous saisissez la dose/hectare, la quantité totale est calculée automatiquement</p>
            {showAddPlan && (
              <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-4 mb-4 grid grid-cols-2 gap-3">
                <Field label="parcelle"><select value={pForm.parcelle} onChange={(e) => setPForm({ ...pForm, parcelle: e.target.value })} style={inputStyle}><option value="">Choisir</option>{data.parcelles.map((p) => <option key={p.code} value={p.code}>{p.code} — {p.nom}</option>)}</select></Field>
                <Field label="المنتج"><input value={pForm.produit} onChange={(e) => setPForm({ ...pForm, produit: e.target.value })} style={inputStyle} /></Field>
                <Field label="Dose/hectare"><input type="number" step="0.1" value={pForm.dozParHa} onChange={(e) => setPForm({ ...pForm, dozParHa: e.target.value })} style={inputStyle} /></Field>
                <Field label="Unité"><select value={pForm.wehda} onChange={(e) => setPForm({ ...pForm, wehda: e.target.value })} style={inputStyle}><option>litre</option><option>kilo</option></select></Field>
                <Field label="التاريخ"><input value={pForm.tarikh} onChange={(e) => setPForm({ ...pForm, tarikh: e.target.value })} placeholder="ex. 25 يوليوز" style={inputStyle} /></Field>
                <Field label="اخصم من المخزون (اختياري)">
                  <select value={pForm.stockItemId} onChange={(e) => setPForm({ ...pForm, stockItemId: e.target.value })} style={inputStyle}>
                    <option value="">— بلا خصم —</option>
                    {data.stock.map((s) => (<option key={s.id} value={s.id}>{s.nom} ({s.kammiya} {s.wehda})</option>))}
                  </select>
                </Field>
                <div className="flex items-end"><button onClick={addPlan} style={{ background: c.cardGreen, color: "#fff", borderRadius: 11, padding: "10px 0", boxShadow: "0 4px 14px -3px rgba(42,157,143,0.4)", fontWeight: 700, fontSize: "0.85rem", width: "100%" }}>Ajouter au plan</button></div>
              </div>
            )}
            <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)", overflow: "hidden" }}>
              <div className="grid" style={{ gridTemplateColumns: "1.6fr 0.9fr 1fr 1fr 1.1fr", background: c.bg, fontSize: "0.66rem", color: c.inkMuted2, fontWeight: 700 }}>
                {["parcelle", "La superficie", "المنتج", "Dose/hectare", "Quantité + date"].map((h) => (<div key={h} className="px-3 py-2">{h}</div>))}
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

        {tab === "Permissions" && currentUser.role === "Owner" && (
          <div>
            <h2 className="font-display mb-1" style={{ fontWeight: 800, fontSize: "1.05rem", color: c.ink }}>Permissions des rôles</h2>
            <p style={{ color: c.inkMuted2, fontSize: "0.72rem" }} className="mb-4">Définissez pour chaque rôle : sans accès / lecture seule / lecture et modification — le changement s'applique immédiatement</p>
            <div style={{ background: c.white, border: `1px solid ${c.line}`, borderRadius: 16, overflow: "auto", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }} className="p-3">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.76rem" }}>
                <thead>
                  <tr>
                    <th className="px-2 py-2 text-right" style={{ color: c.inkMuted2, fontSize: "0.68rem" }}>Unité</th>
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
                            <option value="Sans accès">Sans accès</option>
                            <option value="Lecture seule">Lecture seule</option>
                            <option value="Modification">Modification</option>
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

      {ficheEmployeOuverte && (
        <FicheEmployeModal
          employe={ficheEmployeOuverte}
          equipes={data.equipes}
          onClose={() => setFicheEmployeOuverte(null)}
          onSave={async (form) => { await updateEmployee(ficheEmployeOuverte.id, form); setFicheEmployeOuverte(null); }}
        />
      )}
      {bulletinPourPdf && (
        <BulletinPDF
          bulletin={bulletinPourPdf}
          farmNom={data.nom}
          cycle={cyclesPaie.find((cy) => cy.id === selectedCycleId)}
          onClose={() => setBulletinPourPdf(null)}
        />
      )}
      {lotTraceOuvert && (
        <LotTraceModal
          lot={lotTraceOuvert}
          parcelle={data.parcelles.find((p) => p.id === lotTraceOuvert.parcelleId)}
          culture={data.cultures.find((cu) => cu.id === lotTraceOuvert.cultureId)}
          seasonNom={(data.seasons.find((se) => se.id === lotTraceOuvert.seasonId) || {}).nom}
          farmNom={data.nom}
          coolerNom={(coolers.find((co) => co.id === lotTraceOuvert.coolerId) || {}).nom}
          dernierControle={controlesQualite.find((q) => q.lotId === lotTraceOuvert.id)}
          palette={palettes.find((p) => p.lotId === lotTraceOuvert.id)}
          expedition={expeditions.find((e) => e.paletteIds.some((pid) => (palettes.find((p) => p.lotId === lotTraceOuvert.id) || {}).id === pid))}
          onClose={() => setLotTraceOuvert(null)}
        />
      )}
      {lotPourQualite && (
        <QualiteModal
          lot={lotPourQualite}
          form={qualiteForm}
          setForm={setQualiteForm}
          onSave={saveControleQualite}
          onClose={() => setLotPourQualite(null)}
        />
      )}
      {showGlobalSearch && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 60 }} className="flex items-start justify-center pt-20 p-4" onClick={() => { setShowGlobalSearch(false); setGlobalSearchQuery(""); }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: c.white, borderRadius: 18, width: "100%", maxWidth: 460, maxHeight: "70vh", overflowY: "auto" }} className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Search size={16} color={c.inkMuted2} />
              <input autoFocus value={globalSearchQuery} onChange={(e) => setGlobalSearchQuery(e.target.value)} placeholder="Rechercher un lot, employé, parcelle, commande..." style={{ ...inputStyle, flex: 1, border: "none", padding: "6px 0" }} />
              <button onClick={() => { setShowGlobalSearch(false); setGlobalSearchQuery(""); }}><X size={18} color={c.inkMuted2} /></button>
            </div>
            <div className="flex flex-col gap-1.5">
              {globalSearchResults.map((r, i) => {
                const Icon = r.icon;
                return (
                  <button key={i} onClick={() => { setTab(r.tab); setShowGlobalSearch(false); setGlobalSearchQuery(""); }} style={{ background: c.bg, borderRadius: 10, textAlign: "right" }} className="p-2.5 flex items-center gap-2.5">
                    <Icon size={15} color={c.cardGreenDeep} />
                    <div>
                      <div style={{ fontSize: "0.68rem", color: c.inkMuted2, fontWeight: 700 }}>{r.type}</div>
                      <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>{r.label}</div>
                      {r.sub && <div style={{ fontSize: "0.7rem", color: c.inkMuted2 }}>{r.sub}</div>}
                    </div>
                  </button>
                );
              })}
              {globalSearchQuery.trim().length >= 2 && globalSearchResults.length === 0 && (
                <p style={{ color: c.inkMuted2, fontSize: "0.8rem" }} className="p-2">Aucun résultat</p>
              )}
              {globalSearchQuery.trim().length < 2 && (
                <p style={{ color: c.inkMuted2, fontSize: "0.76rem" }} className="p-2">Tapez au moins 2 caractères — recherche dans Employés, Parcelles, Lots, Palettes, Expéditions, Commandes, Stock</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
