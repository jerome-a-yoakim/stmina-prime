"use client";
import { authService } from "../auth/services/auth-service";
import { hasPermission, filterGroupsForUser, filterMembersForUser, filterSubmissionsForUser } from "../auth/permissions/permission-checker";
import { UserManagementPage } from "../auth/components/UserManagementPage";
import { AccessDeniedPage } from "../auth/components/AccessDeniedPage";
import { TopbarAuth } from "../auth/components/TopbarAuth";
import { MOCK_DEFAULT_USERS } from "../auth/mock/default-users";

import { useState, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell
} from "recharts";

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════
const APP_NAME = "stMINA PRIME SERVICES";
const APP_SUBTITLE = "خدمة إبتدائي بنين بكنيسة الشهيد العظيم مارمينا ببورسعيد";

const FIELDS = [
  { key: "حضور الخدمة",        icon: "⛪", color: "#E73F1E" },
  { key: "حضور القداس",        icon: "🕊",  color: "#FB6C00" },
  { key: "خدمة القداس",        icon: "✝️", color: "#FF8F00" },
  { key: "الأعتراف",           icon: "📿", color: "#FBC02D" },
  { key: "الأفتقاد التيليفوني", icon: "📞", color: "#D84315" },
  { key: "الأفتقاد المنزلي",   icon: "🏠", color: "#E65100" }
];

const DEFAULT_ACTIVITIES = [
  { id: 1, name: "الحان", icon: "🎵", color: "#E73F1E" },
  { id: 2, name: "قبطي", icon: "📜", color: "#FB6C00" },
  { id: 3, name: "تعليمي", icon: "📚", color: "#FF8F00" },
  { id: 4, name: "بحثي", icon: "🔬", color: "#FBC02D" },
  { id: 5, name: "إلكترونيات", icon: "💻", color: "#D84315" },
  { id: 6, name: "كرة قدم", icon: "⚽", color: "#E65100" },
  { id: 7, name: "شطرنج", icon: "♟️", color: "#BF360C" },
];

const DEFAULT_GROUPS = {
  "الصف السادس - أسرة الأنبا بولا":   ["كاراس مينا فايق نجيب","يسطس فادى","رومانى روبيرت رومانى","يوسف تامر مجدى","سامى كريم سامى","شنودة سمير فاروق","توماس وليم","شنوتى سامى مكرم"],
  "الصف السادس - أسرة الأنبا أنطون":  ["كيرلس هانى ناجى","فارس ماجد لمعى","مايكل رومانى عبدالمسيح","مينا ايمن موسى","فيلوباتير حليم نظيم عوض","يوسف بطرس حلمى","كاراس وجيه نصر","بيشوى ملاك","يوسف أسامه سعد","ابانوب مرقس حلمى"],
  "الصف الخامس - أسرة العذراء مريم":  ["مينا جيد ذكي","امير رامي سامي","روجيه روماني سمعان","توماس ايمن منصور","فيلوباتير ماجد رمزي","مانويل هاني نصيري","كاراس منير فريد","بيشوي ادوار وهب الله","شنودة ايهاب سمير"],
  "الصف الخامس - أسرة  أبي سيفين":   ["سامي أشرف جيد جاد","كاراس ناجي حبيب حنا غطاس","بيشوي نادر هابيل شاكر","مينا ناشد سامي ناشد","كاراس رامي سامي موسي","بيشوي ميشيل عبد النور يوسف","كاراس موسي أسعد موسي","هرمينا سامح البير"],
  "الصف الرابع - أسرة مارمينا":       ["يوساب سامح جاب الله","ميصائيل عصام فارس","ابانوب ماجد عجيب","يوسف خليل وديع","روميل روماني سمعان","كرم ايمن كرم","كاراس مينا صبحي","توماس جوزيف عادل","يوسف بيتر فتحي","بافلي إبرام عاطف","جون عادل ناجي"],
  "الصف الرابع - أسرة الأنبا موسي":   ["توماس جاب الله برسوم","بيشوي تامر نادي زكي","كاراس ميلاد صبح عطا","كاراس رامز سعد","تادرس فادي فوزي","كيرلس نبيل سليمان","توني أشرف جيد","توماس ابراهيم عبد المسيح","يوسف عماد زكي"],
  "الصف الثالث - أسرة ارشيدياكون ح":  ["سيف ابراهيم شوقي","يوسف ايمن منصور","فادي اشرف نصري","فارس اشرف نصري","يوسف اميل بنياس","كاراس سعد خلف","ابرام فيلبس ابراهيم","ايساف عادل عبده","فادي اشرف مسعد","نوفير سامي باسيليوس","جيروم مينا رزق"]
};

const DEFAULT_USERS = MOCK_DEFAULT_USERS;

const SK = {
  groups:"church_groups", members:"church_members", subs:"church_subs",
  users:"church_users", archive:"church_archive", backups:"church_backups",
  session:"church_session", activities:"church_activities", darkMode:"church_dark"
};

// ══════════════════════════════════════════════════════════════════════════════
// STORAGE HELPERS
// ══════════════════════════════════════════════════════════════════════════════
const ls = {
  get: (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set: (k, v)   => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

function initStore() {
  if (!ls.get(SK.groups, null)) {
    const groups = Object.keys(DEFAULT_GROUPS).map((name, i) => ({
      id: i+1, name, active: true, order: i,
      mainServant: "", assistantServants: [], servantContact: ""
    }));
    ls.set(SK.groups, groups);
    const members = [];
    let mid = 1;
    Object.entries(DEFAULT_GROUPS).forEach(([gname, names]) => {
      const gid = groups.find(g=>g.name===gname)?.id;
      names.forEach(n => members.push({
        id: mid++, name: n, groupId: gid, active: true,
        joinedAt: new Date().toISOString(),
        phone: "", familyPhone: "", address: "", school: "",
        brotherOfLord: false, activities: [], notes: ""
      }));
    });
    ls.set(SK.members, members);
  }
  if (!ls.get(SK.users, null))      ls.set(SK.users, DEFAULT_USERS);
  if (!ls.get(SK.subs,  null))      ls.set(SK.subs,  []);
  if (!ls.get(SK.archive,null))     ls.set(SK.archive,[]);
  if (!ls.get(SK.backups,null))     ls.set(SK.backups,[]);
  if (!ls.get(SK.activities,null))  ls.set(SK.activities, DEFAULT_ACTIVITIES);
}

// ══════════════════════════════════════════════════════════════════════════════
// FRIDAY VALIDATION
// ══════════════════════════════════════════════════════════════════════════════
function isFriday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T12:00:00");
  return d.getDay() === 5;
}
function getNextFriday() {
  const d = new Date();
  const day = d.getDay();
  const diff = day <= 5 ? 5 - day : 7 - day + 5;
  d.setDate(d.getDate() + (diff === 0 ? 0 : diff));
  return d.toISOString().slice(0, 10);
}

// ══════════════════════════════════════════════════════════════════════════════
// EXCEL EXPORT
// ══════════════════════════════════════════════════════════════════════════════
function exportWeeklyExcel(sub, groups, members) {
  const wb = XLSX.utils.book_new();
  groups.filter(g=>g.active).forEach(g => {
    const gMembers = members.filter(m=>m.groupId===g.id && m.active);
    const header = ["الأسم",...FIELDS.map(f=>f.key)];
    const rows = [header, ...gMembers.map(m => {
      const rec = (sub.records||[]).find(r=>r.memberId===m.id)||{};
      return [m.name, ...FIELDS.map(f=>rec[f.key]?"نعم":"لا")];
    })];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch:32 },...Array(6).fill({ wch:18 })];
    XLSX.utils.book_append_sheet(wb, ws, g.name.substring(0,31));
  });
  XLSX.writeFile(wb, `weekly_${sub.dateISO}.xlsx`);
}

function exportOverviewExcel(subs, groups, members) {
  const wb = XLSX.utils.book_new();
  const hdr = ["التاريخ",...FIELDS.map(f=>f.key)];
  groups.filter(g=>g.active).forEach(g => {
    const rows = [hdr];
    subs.forEach(sub => {
      const gm = members.filter(m=>m.groupId===g.id && m.active);
      rows.push([sub.date, ...FIELDS.map(f => gm.filter(m=>(sub.records||[]).find(r=>r.memberId===m.id&&r[f.key])).length)]);
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, g.name.substring(0,31));
  });
  const globalRows = [hdr];
  subs.forEach(sub => {
    const active = members.filter(m=>m.active);
    globalRows.push([sub.date,...FIELDS.map(f=>active.filter(m=>(sub.records||[]).find(r=>r.memberId===m.id&&r[f.key])).length)]);
  });
  const wsG = XLSX.utils.aoa_to_sheet(globalRows);
  XLSX.utils.book_append_sheet(wb, wsG, "overview");
  XLSX.writeFile(wb, `overview_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ══════════════════════════════════════════════════════════════════════════════
// PDF EXPORT (Print-based)
// ══════════════════════════════════════════════════════════════════════════════
function exportPDF(title, htmlContent) {
  const win = window.open("", "_blank");
  win.document.write(`<!DOCTYPE html><html dir="rtl"><head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
      body{font-family:'Cairo',sans-serif;direction:rtl;margin:0;padding:20px;color:#1e1b4b;background:#fff}
      h1{color:#1e1b4b;font-size:20px;border-bottom:3px solid #6366f1;padding-bottom:8px;margin-bottom:16px}
      h2{color:#4f46e5;font-size:15px;margin:16px 0 8px}
      table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px}
      th{background:#1e1b4b;color:#fff;padding:8px;text-align:right}
      td{padding:6px 8px;border-bottom:1px solid #e5e7eb}
      tr:nth-child(even) td{background:#f8fafc}
      .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700}
      .yes{background:#d1fae5;color:#065f46} .no{background:#fee2e2;color:#991b1b}
      .header{text-align:center;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #e5e7eb}
      .header h1{border:none;font-size:24px} .header p{color:#6b7280;font-size:13px}
      @media print{body{margin:0}}
    </style>
  </head><body>
    <div class="header">
      <h1>${APP_NAME}</h1>
      <p>${APP_SUBTITLE}</p>
      <p>تاريخ الطباعة: ${new Date().toLocaleDateString("ar-EG",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</p>
    </div>
    ${htmlContent}
  </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 500);
}

// ══════════════════════════════════════════════════════════════════════════════
// BACKUP
// ══════════════════════════════════════════════════════════════════════════════
function createBackup() {
  const snapshot = {
    ts: new Date().toISOString(),
    groups: ls.get(SK.groups,[]), members: ls.get(SK.members,[]),
    subs: ls.get(SK.subs,[]), users: ls.get(SK.users,[]),
    archive: ls.get(SK.archive,[]), activities: ls.get(SK.activities,[])
  };
  const backups = ls.get(SK.backups,[]);
  backups.unshift(snapshot);
  ls.set(SK.backups, backups.slice(0,10));
  return snapshot;
}

function restoreBackup(snapshot) {
  ls.set(SK.groups,     snapshot.groups);
  ls.set(SK.members,    snapshot.members);
  ls.set(SK.subs,       snapshot.subs);
  ls.set(SK.users,      snapshot.users);
  ls.set(SK.archive,    snapshot.archive||[]);
  if (snapshot.activities) ls.set(SK.activities, snapshot.activities);
}

// ══════════════════════════════════════════════════════════════════════════════
// CSS
// ══════════════════════════════════════════════════════════════════════════════
const buildCSS = (dark) => `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html,body{max-width:100vw;overflow-x:hidden;background:#ffffff;color:#111827;font-family:'Cairo',sans-serif}
body,input,select,button,textarea{font-family:'Cairo',sans-serif}
:root{
  --primary:#E73F1E;--primary-d:#C62828;--primary-bg:rgba(231,63,30,.08);
  --secondary:#FB6C00;--secondary-d:#E65100;--secondary-bg:rgba(251,108,0,.08);
  --interactive:#FF8F00;--highlight:#FBC02D;
  --indigo:#E73F1E;--indigo-d:#C62828;--indigo-bg:#FFF5F2;
  --sky:#FB6C00;--emerald:#FB6C00;--amber:#FF8F00;--rose:#D84315;--purple:#FBC02D;
  --sidebar:#FFFFFF;--sidebar2:#FFF8F6;
  --border:#F2E8E4;--bg:#FFFFFF;
  --text:#111827;--muted:#6B7280;
  --card:#FFFFFF;--card2:#FFF9F7;
}
.app{min-height:100vh;background:#ffffff;direction:rtl;color:var(--text);position:relative}

/* SIDEBAR & MOBILE OVERLAY */
.sb-overlay{position:fixed;inset:0;background:rgba(15,13,20,.5);z-index:195;display:none;backdrop-filter:blur(3px);transition:opacity .3s ease}
.sb{width:260px;background:#ffffff;border-left:1px solid #F2E8E4;min-height:100vh;position:fixed;right:0;top:0;display:flex;flex-direction:column;z-index:200;box-shadow:-4px 0 24px rgba(231,63,30,.04);transition:transform .3s cubic-bezier(.4,0,.2,1)}
.sb-logo{padding:20px 18px 14px;border-bottom:1px solid #F2E8E4;background:linear-gradient(135deg,#FFF5F2 0%,#FFFFFF 100%)}
.sb-logo-img{width:54px;height:54px;border-radius:12px;object-fit:contain;margin-bottom:8px;background:#fff;padding:4px;box-shadow:0 2px 8px rgba(0,0,0,.05)}
.sb-logo h1{color:#1E1B4B;font-size:14px;font-weight:800;line-height:1.3}
.sb-logo p{color:#E73F1E;font-size:11px;margin-top:2px;line-height:1.4;font-weight:700}
.sb-user{padding:12px 18px;border-bottom:1px solid #F2E8E4;display:flex;align-items:center;gap:10px;background:#ffffff;transition:.15s}
.sb-user:hover{background:#FFF9F7}
.sb-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#E73F1E,#FB6C00);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff;flex-shrink:0;box-shadow:0 2px 8px rgba(231,63,30,.25)}
.sb-uname{color:#111827;font-size:13px;font-weight:800}
.sb-urole{color:#FB6C00;font-size:11px;font-weight:700}
.sb-nav{flex:1;padding:8px 0;overflow-y:auto;background:#ffffff}
.sb-section{padding:12px 18px 4px;font-size:10px;font-weight:800;color:#FB6C00;letter-spacing:.1em;text-transform:uppercase}
.nav-item{display:flex;align-items:center;gap:10px;padding:11px 18px;color:#4B5563;cursor:pointer;transition:.15s;font-size:13px;font-weight:700;border-right:4px solid transparent;margin:1px 0;min-height:44px}
.nav-item:hover{background:#FFF5F2;color:#E73F1E}
.nav-item.active{background:linear-gradient(90deg,rgba(231,63,30,.12) 0%,rgba(231,63,30,.02) 100%);color:#E73F1E;border-right-color:#E73F1E;font-weight:800}
.nav-icon{width:20px;text-align:center;font-size:16px;flex-shrink:0}
.sb-footer{padding:14px 18px;border-top:1px solid #F2E8E4;background:#ffffff}
.sb-stat{font-size:11px;color:#6B7280;margin-bottom:4px;font-weight:600}

/* MAIN & TOPBAR */
.main{margin-right:260px;min-height:100vh;background:#ffffff;transition:margin-right .3s ease}
.topbar{background:#ffffff;padding:14px 28px;border-bottom:1px solid #F2E8E4;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:100;box-shadow:0 2px 10px rgba(231,63,30,.03)}
.topbar h2{font-size:17px;font-weight:800;color:#1E1B4B}
.topbar-right{display:flex;align-items:center;gap:10px}
.mobile-nav-toggle{display:none;align-items:center;justify-content:center;width:40px;height:40px;border-radius:10px;background:#FFF5F2;color:#E73F1E;border:1px solid #F2E8E4;font-size:20px;cursor:pointer;line-height:1;transition:.15s}
.mobile-nav-toggle:hover{background:#FFE0B2}
.date-chip{font-size:12px;color:#E73F1E;background:#FFF5F2;border:1px solid #F2E8E4;padding:6px 14px;border-radius:20px;font-weight:800}
.content{padding:24px 28px;background:#ffffff}

/* CARDS */
.card{background:#ffffff;border-radius:14px;border:1px solid #F2E8E4;overflow:hidden;transition:box-shadow .2s;width:100%;box-shadow:0 4px 16px rgba(231,63,30,.04)}
.card:hover{box-shadow:0 6px 24px rgba(231,63,30,.08)}
.card-header{padding:16px 20px;border-bottom:1px solid #F2E8E4;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;background:#ffffff}
.card-header h3{font-size:15px;font-weight:800;color:#1E1B4B}
.card-body{padding:20px;background:#ffffff}

/* BUTTONS */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 18px;border-radius:10px;border:none;cursor:pointer;font-size:13px;font-weight:800;transition:.15s;white-space:nowrap;font-family:'Cairo',sans-serif;min-height:42px}
.btn:disabled{opacity:.45;cursor:not-allowed}
.btn-primary{background:#E73F1E;color:#ffffff;box-shadow:0 2px 8px rgba(231,63,30,.25)}.btn-primary:hover:not(:disabled){background:#C62828}
.btn-success{background:#FB6C00;color:#ffffff;box-shadow:0 2px 8px rgba(251,108,0,.25)}.btn-success:hover:not(:disabled){background:#E65100}
.btn-outline{background:transparent;color:#E73F1E;border:1.5px solid #E73F1E}.btn-outline:hover:not(:disabled){background:#FFF5F2}
.btn-danger{background:#D84315;color:#ffffff}.btn-danger:hover:not(:disabled){background:#BF360C}
.btn-ghost{background:transparent;color:#4B5563;border:1px solid #F2E8E4}.btn-ghost:hover:not(:disabled){background:#FFF5F2;color:#E73F1E}
.btn-amber{background:#FF8F00;color:#ffffff}.btn-amber:hover:not(:disabled){background:#E65100}
.btn-purple{background:#FBC02D;color:#111827}.btn-purple:hover:not(:disabled){background:#F57F17}
.btn-sm{padding:6px 14px;font-size:12px;border-radius:8px;min-height:36px}
.btn-xs{padding:4px 10px;font-size:11px;border-radius:6px;min-height:30px}

/* INPUTS & FORMS */
.inp{width:100%;padding:10px 14px;border:1.5px solid #F2E8E4;border-radius:10px;font-family:'Cairo',sans-serif;font-size:13px;color:#111827;background:#ffffff;transition:.15s;outline:none;min-height:42px}
.inp:focus{border-color:#FF8F00;box-shadow:0 0 0 3px rgba(255,143,0,.15)}
.inp-sm{padding:6px 10px;font-size:12px;border-radius:8px;min-height:34px}
.form-group{margin-bottom:16px}
.form-label{display:block;font-size:12px;font-weight:800;color:#374151;margin-bottom:6px}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.form-row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}

/* TOGGLE */
.toggle-wrap{display:flex;align-items:center;gap:8px;min-height:36px}
.toggle{position:relative;width:44px;height:24px;flex-shrink:0}
.toggle input{opacity:0;width:0;height:0}
.toggle-sl{position:absolute;inset:0;background:#E5E7EB;border-radius:12px;cursor:pointer;transition:.2s}
.toggle-sl::before{content:'';position:absolute;width:18px;height:18px;background:#fff;border-radius:50%;right:3px;top:3px;transition:.2s;box-shadow:0 1px 4px rgba(0,0,0,.2)}
.toggle input:checked+.toggle-sl{background:#E73F1E}
.toggle input:checked+.toggle-sl::before{right:23px}
.tl-yes{color:#E73F1E;font-size:12px;font-weight:800}
.tl-no{color:#9CA3AF;font-size:12px;font-weight:700}

/* TABLE */
.tbl{width:100%;border-collapse:collapse;font-size:13px;background:#ffffff}
.tbl th{background:#FFF9F7;padding:12px 14px;font-weight:800;color:#1E1B4B;border-bottom:2px solid #F2E8E4;text-align:right;white-space:nowrap}
.tbl td{padding:12px 14px;border-bottom:1px solid #F2E8E4;color:#111827;vertical-align:middle}
.tbl tr:last-child td{border-bottom:none}
.tbl tr:hover td{background:#FFF5F2}
.tbl-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;width:100%}

/* BADGES & ALERTS */
.badge{display:inline-flex;align-items:center;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:800;white-space:nowrap}
.badge-indigo{background:#FFF3E0;color:#E73F1E;border:1px solid #FFE0B2}
.badge-blue{background:#FFF8E1;color:#FB6C00;border:1px solid #FFECB3}
.badge-green{background:#FEF3C7;color:#D84315;border:1px solid #FDE68A}
.badge-amber{background:#FFF3E0;color:#E65100;border:1px solid #FFE0B2}
.badge-red{background:#FEE2E2;color:#991B1B;border:1px solid #FCA5A5}
.badge-gray{background:#F3F4F6;color:#374151;border:1px solid #E5E7EB}
.badge-purple{background:#FEF9C3;color:#854D0E;border:1px solid #FEF08A}

.alert{padding:12px 16px;border-radius:10px;font-size:13px;font-weight:700;display:flex;align-items:center;gap:8px;margin-bottom:16px}
.alert-success{background:#FFF3E0;color:#E65100;border:1px solid #FFE0B2}
.alert-error{background:#FEE2E2;color:#991B1B;border:1px solid #FCA5A5}
.alert-warn{background:#FEF3C7;color:#92400E;border:1px solid #FCD34D}
.alert-info{background:#FFF8E1;color:#FB6C00;border:1px solid #FFE0B2}

/* KPI STATISTICS CARDS (CLEAN SOLID WHITE) */
.kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:16px;margin-bottom:24px;background:#ffffff}
.kpi-card{background:#ffffff;border-radius:14px;padding:20px;border:1px solid #F2E8E4;box-shadow:0 4px 16px rgba(231,63,30,.05);transition:.2s}
.kpi-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(231,63,30,.1)}
.kpi-lbl{font-size:12px;color:#6B7280;font-weight:800;margin-bottom:8px;display:flex;align-items:center;gap:6px}
.kpi-val{font-size:32px;font-weight:800;line-height:1;margin-bottom:6px}
.kpi-sub{font-size:12px;color:#6B7280;margin-top:6px;font-weight:700}

/* GROUP CHIPS & TABS */
.group-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px}
.gchip{padding:8px 18px;border-radius:20px;border:1.5px solid #F2E8E4;background:#ffffff;cursor:pointer;font-size:12px;font-weight:800;color:#374151;transition:.15s;display:flex;align-items:center;gap:6px;min-height:38px}
.gchip:hover{border-color:#FF8F00;color:#E73F1E}
.gchip.sel{background:#E73F1E;color:#ffffff;border-color:#E73F1E;box-shadow:0 2px 8px rgba(231,63,30,.25)}

.tabs{display:flex;gap:4px;background:#FFF9F7;padding:4px;border-radius:10px;border:1px solid #F2E8E4;width:fit-content;margin-bottom:20px;flex-wrap:wrap}
.tab{padding:8px 18px;border-radius:8px;border:none;background:transparent;cursor:pointer;font-size:12px;font-weight:800;color:#6B7280;transition:.15s;font-family:'Cairo',sans-serif;min-height:38px}
.tab.active{background:#ffffff;color:#E73F1E;box-shadow:0 2px 6px rgba(0,0,0,.08)}

/* MODAL */
.modal-bg{position:fixed;inset:0;background:rgba(15,13,20,.55);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(3px)}
.modal{background:#ffffff;border-radius:16px;width:100%;max-width:580px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,.2);border:1px solid #F2E8E4}
.modal-lg{max-width:800px}
.modal-header{padding:18px 22px;border-bottom:1px solid #F2E8E4;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:#ffffff;z-index:10}
.modal-header h3{font-size:16px;font-weight:800;color:#1E1B4B}
.modal-body{padding:22px;background:#ffffff}
.modal-footer{padding:16px 22px;border-top:1px solid #F2E8E4;display:flex;justify-content:flex-end;gap:10px;position:sticky;bottom:0;background:#ffffff}

/* PROGRESS & STAT BARS */
.prog-wrap{height:8px;background:#FFF5F2;border-radius:4px;overflow:hidden;margin-top:6px;border:1px solid #F2E8E4}
.prog{height:100%;border-radius:4px;transition:width .4s ease}

/* MISC */
.empty{text-align:center;padding:50px 20px;color:#6B7280}
.empty .ei{font-size:44px;margin-bottom:12px}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.col{display:flex;flex-direction:column;gap:12px}
.spacer{flex:1}
.divider{height:1px;background:#F2E8E4;margin:16px 0}
.scroll-x{overflow-x:auto;-webkit-overflow-scrolling:touch}
.chip-dot{width:10px;height:10px;border-radius:50%;display:inline-block;flex-shrink:0}
.archived-row td{opacity:.5}
.history-row{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #F2E8E4;gap:10px;flex-wrap:wrap;transition:.15s;background:#ffffff}
.history-row:last-child{border-bottom:none}
.history-row:hover{background:#FFF9F7}

/* LOGIN */
.login-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#ffffff;direction:rtl;position:relative;overflow:hidden;padding:24px}
.login-wrap::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 20%, rgba(231,63,30,.04) 0%, transparent 70%)}
.login-card{background:#ffffff;border-radius:16px;padding:44px 38px;width:100%;max-width:420px;box-shadow:0 4px 24px rgba(231,63,30,.06);border:1px solid #F2E8E4;position:relative;z-index:1}
.login-logo{text-align:center;margin-bottom:28px}
.login-logo-img{width:76px;height:76px;object-fit:contain;margin-bottom:14px;border-radius:16px;box-shadow:0 2px 10px rgba(0,0,0,.04);background:#ffffff;padding:4px}
.login-logo h1{font-size:18px;font-weight:800;color:#1E1B4B;margin-bottom:6px;letter-spacing:-.01em}
.login-logo p{font-size:12px;color:#E73F1E;font-weight:700;line-height:1.5}

/* CHARTS */
.chart-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:20px;background:#ffffff}
.chart-full{grid-column:1/-1}
.chart-ttl{font-size:14px;font-weight:800;color:#1E1B4B;margin-bottom:14px}

/* MEMBER PROFILE */
.profile-header{display:flex;align-items:center;gap:18px;padding:22px;background:linear-gradient(135deg,#E73F1E,#FB6C00);border-radius:14px;color:#fff;margin-bottom:22px;box-shadow:0 4px 16px rgba(231,63,30,.2)}
.profile-avatar{width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:800;flex-shrink:0;border:2px solid rgba(255,255,255,.4)}
.profile-name{font-size:18px;font-weight:800;margin-bottom:4px}
.profile-meta{font-size:12px;opacity:.9;font-weight:700}
.act-chip{display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:14px;font-size:11px;font-weight:800;border:1.5px solid;margin:3px}

.stat-bar-row{display:flex;align-items:center;gap:12px;margin-bottom:10px;font-size:13px}
.stat-bar-label{min-width:150px;font-weight:700;color:#111827}
.stat-bar-wrap{flex:1;height:8px;background:#FFF5F2;border-radius:4px;overflow:hidden;border:1px solid #F2E8E4}
.stat-bar{height:100%;border-radius:4px;transition:width .4s ease}
.stat-bar-val{min-width:40px;text-align:left;font-weight:800;font-size:12px;color:#E73F1E}

.fh{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:120px}
.fh-lbl{font-size:11px;font-weight:800}
.fh-btns{display:flex;gap:4px}
.dark-toggle{padding:6px 10px;border-radius:8px;border:1px solid #F2E8E4;background:#FFF5F2;color:#E73F1E;cursor:pointer;font-size:13px;transition:.15s}
.dark-toggle:hover{background:#FFE0B2}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px}

/* RESPONSIVE MEDIA QUERIES */
@media(max-width:1023px){
  .sb{transform:translateX(100%)}
  .sb.open{transform:translateX(0)}
  .sb-overlay.open{display:block}
  .main{margin-right:0!important}
  .mobile-nav-toggle{display:flex}
  .chart-grid{grid-template-columns:1fr}
  .grid-3{grid-template-columns:1fr 1fr}
}
@media(max-width:768px){
  .topbar{padding:12px 16px}
  .topbar h2{font-size:15px}
  .content{padding:16px 14px}
  .grid-2,.grid-3,.form-row,.form-row3{grid-template-columns:1fr}
  .kpi-grid{grid-template-columns:repeat(auto-fit,minmax(140px,1fr))}
  .tabs{width:100%;overflow-x:auto;flex-wrap:nowrap;-webkit-overflow-scrolling:touch;padding:4px}
  .tab{white-space:nowrap;padding:8px 14px;min-height:38px}
  .group-chips{width:100%;overflow-x:auto;flex-wrap:nowrap;-webkit-overflow-scrolling:touch;padding-bottom:4px}
  .gchip{white-space:nowrap;min-height:38px}
  .btn{min-height:42px;padding:8px 14px}
  .btn-sm{min-height:36px}
  .inp{min-height:42px;font-size:14px}
  .modal-bg{padding:10px}
  .modal,.modal-lg{max-height:94vh;width:100%}
  .modal-header,.modal-body,.modal-footer{padding:14px 18px}
  .modal-footer{flex-wrap:wrap}
  .profile-header{flex-direction:column;text-align:center}
  .stat-bar-row{flex-direction:column;align-items:stretch;gap:4px}
  .stat-bar-label{min-width:auto}
  .history-row{flex-direction:column;align-items:flex-start}
}
@media(max-width:414px){
  .kpi-grid{grid-template-columns:1fr 1fr}
  .kpi-val{font-size:24px}
  .date-chip{display:none}
  .login-card{padding:30px 22px}
}
`;

// ══════════════════════════════════════════════════════════════════════════════
// SMALL UI COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════
function Toggle({ checked, onChange, disabled }) {
  return (
    <div className="toggle-wrap">
      <label className="toggle">
        <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} disabled={disabled} />
        <span className="toggle-sl" />
      </label>
      <span className={checked ? "tl-yes" : "tl-no"}>{checked ? "نعم" : "لا"}</span>
    </div>
  );
}

function Modal({ title, onClose, children, footer, large }) {
  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${large ? "modal-lg" : ""}`}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

function Alert({ type, children, onClose }) {
  return (
    <div className={`alert alert-${type}`}>
      {children}
      {onClose && <button onClick={onClose} style={{ marginRight:"auto", background:"none", border:"none", cursor:"pointer", fontSize:14, color:"inherit" }}>✕</button>}
    </div>
  );
}

function Confirm({ msg, onYes, onNo }) {
  return (
    <Modal title="تأكيد العملية" onClose={onNo} footer={
      <><button className="btn btn-ghost" onClick={onNo}>إلغاء</button><button className="btn btn-danger" onClick={onYes}>تأكيد</button></>
    }>
      <p style={{ fontSize:14, color:"var(--text)" }}>{msg}</p>
    </Modal>
  );
}

function ProgBar({ pct, color }) {
  return (
    <div className="prog-wrap">
      <div className="prog" style={{ width:`${pct}%`, background: color || "var(--indigo)" }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LOGIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
function LoginPage({ onLogin, logoUrl }) {
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  const handle = () => {
    if (!u.trim()) { setErr("يرجى إدخال اسم المستخدم"); return; }
    setLoading(true); setErr("");
    setTimeout(() => {
      const res = authService.login(u, p);
      setLoading(false);
      if (res.success && res.user) {
        onLogin(res.user);
      } else {
        setErr(res.error || "اسم المستخدم أو كلمة المرور غير صحيحة");
      }
    }, 150);
  };
  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">
          {logoUrl
            ? <img src={logoUrl} alt="logo" className="login-logo-img" />
            : <div style={{ fontSize:52, marginBottom:8 }}>⛪</div>}
          <h1>{APP_NAME}</h1>
          <p>{APP_SUBTITLE}</p>
        </div>
        {err && <Alert type="error">{err}</Alert>}
        <div className="form-group">
          <label className="form-label">اسم المستخدم</label>
          <input className="inp" placeholder="أدخل اسم المستخدم" value={u} onChange={e => setU(e.target.value)} onKeyDown={e => e.key==="Enter" && handle()} />
        </div>
        <div className="form-group">
          <label className="form-label">كلمة المرور</label>
          <input className="inp" type="password" placeholder="أدخل كلمة المرور" value={p} onChange={e => setP(e.target.value)} onKeyDown={e => e.key==="Enter" && handle()} />
        </div>
        <button className="btn btn-primary" disabled={loading} style={{ width:"100%", justifyContent:"center", padding:"12px", fontSize:14, fontWeight:800 }} onClick={handle}>
          {loading ? "⏳ جارٍ التحقق..." : "تسجيل الدخول 🔑"}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DATA ENTRY PAGE — with Friday validation & separated Save/Export
// ══════════════════════════════════════════════════════════════════════════════
function DataEntryPage({ currentUser, groups, members, submissions, onSave }) {
  const allowedGroups = currentUser.role === "admin"
    ? groups.filter(g => g.active)
    : groups.filter(g => g.active && currentUser.assignedGroups.includes(g.name));

  const [selGroup, setSelGroup] = useState(allowedGroups[0]?.id || null);
  const [date, setDate] = useState(getNextFriday);
  const [records, setRecords] = useState({});
  const [allMode, setAllMode] = useState(false);
  const [flash, setFlash] = useState(null);
  const [editingSubId, setEditingSubId] = useState(null);
  const [confirmSave, setConfirmSave] = useState(false);
  const [savedSub, setSavedSub] = useState(null);

  const showFlash = (type, msg) => { setFlash({ type, msg }); setTimeout(() => setFlash(null), 4000); };
  const isDuplicate = date && !editingSubId && submissions.some(s => s.dateISO === date);
  const friday = isFriday(date);
  const getGroupMembers = gid => members.filter(m => m.groupId === gid && m.active);

  const initRecords = useCallback((sub = null) => {
    const init = {};
    allowedGroups.forEach(g => {
      getGroupMembers(g.id).forEach(m => {
        const rec = sub ? (sub.records||[]).find(r => r.memberId === m.id) : null;
        init[m.id] = { memberId: m.id };
        FIELDS.forEach(f => { init[m.id][f.key] = rec ? !!rec[f.key] : false; });
      });
    });
    setRecords(init);
  }, [allowedGroups, members]);

  useEffect(() => { initRecords(); }, []);

  const loadExisting = (sub) => {
    setDate(sub.dateISO); setEditingSubId(sub.id); initRecords(sub);
    showFlash("info", `✏️ تحرير بيانات أسبوع ${sub.date}`);
  };

  const toggle = (mid, field, val) => {
    setRecords(p => {
      const updated = { ...p, [mid]: { ...p[mid], [field]: val } };
      // Logic: if خدمة القداس is enabled, auto-enable حضور القداس
      if (field === "خدمة القداس" && val) {
        updated[mid]["حضور القداس"] = true;
      }
      return updated;
    });
  };

  const toggleAll = (gid, field, val) => {
    const mids = getGroupMembers(gid).map(m => m.id);
    setRecords(p => {
      const n = { ...p };
      mids.forEach(id => {
        n[id] = { ...n[id], [field]: val };
        if (field === "خدمة القداس" && val) n[id]["حضور القداس"] = true;
      });
      return n;
    });
  };

  const completion = (gid) => {
    const ms = getGroupMembers(gid);
    if (!ms.length) return 0;
    const yes = ms.reduce((a, m) => a + FIELDS.filter(f => records[m.id]?.[f.key]).length, 0);
    return Math.round((yes / (ms.length * FIELDS.length)) * 100);
  };

  const buildSub = () => ({
    id: editingSubId || Date.now(),
    date: new Date(date + "T12:00:00").toLocaleDateString("ar-EG"),
    dateISO: date,
    records: Object.values(records),
    submittedBy: currentUser.id,
    groupIds: allowedGroups.map(g => g.id)
  });

  const handleSaveOnly = () => {
    if (!date) return showFlash("error", "الرجاء تحديد التاريخ أولاً");
    if (!friday) return showFlash("error", "⚠️ يجب اختيار يوم الجمعة فقط");
    const sub = buildSub();
    onSave(sub, !!editingSubId);
    setSavedSub(sub);
    showFlash("success", editingSubId ? "✅ تم تحديث البيانات بنجاح" : "✅ تم حفظ البيانات بنجاح");
    setEditingSubId(null); setConfirmSave(false);
  };

  const handleExportWeekly = () => {
    if (!savedSub && !editingSubId) {
      const sub = buildSub();
      exportWeeklyExcel(sub, groups, members);
    } else {
      exportWeeklyExcel(savedSub || buildSub(), groups, members);
    }
  };

  const activeGroups = allMode ? allowedGroups : allowedGroups.filter(g => g.id === selGroup);

  return (
    <div>
      {flash && <Alert type={flash.type}>{flash.msg}</Alert>}
      {isDuplicate && <Alert type="warn">⚠️ يوجد بيانات مسجلة بالفعل لهذا التاريخ.</Alert>}
      {date && !friday && <Alert type="error">⛔ التاريخ المحدد ليس يوم جمعة. يُسمح بتسجيل أيام الجمعة فقط.</Alert>}

      <div className="card" style={{ marginBottom:16 }}>
        <div className="card-body" style={{ display:"flex", gap:16, flexWrap:"wrap", alignItems:"flex-end" }}>
          <div className="form-group" style={{ margin:0 }}>
            <label className="form-label">تاريخ الأسبوع (جمعة فقط)</label>
            <input type="date" className="inp" style={{ width:200 }} value={date}
              onChange={e => {
                if (!isFriday(e.target.value)) {
                  setDate(e.target.value);
                  showFlash("error", "⛔ يجب اختيار يوم الجمعة فقط");
                } else {
                  setDate(e.target.value);
                }
              }} />
            {date && <div style={{ fontSize:11, marginTop:3, color: friday ? "#10b981" : "#ef4444", fontWeight:700 }}>
              {friday ? "✅ يوم جمعة" : "⛔ ليس يوم جمعة"}
            </div>}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Toggle checked={allMode} onChange={setAllMode} />
            <span style={{ fontSize:13, fontWeight:700 }}>إدخال جميع الأسر</span>
          </div>
          {editingSubId && <span className="badge badge-amber">⚠️ وضع التحرير</span>}
        </div>
      </div>

      {currentUser.role === "admin" && submissions.length > 0 && (
        <div className="card" style={{ marginBottom:16 }}>
          <div className="card-header"><h3>✏️ تحرير أسبوع سابق</h3></div>
          <div className="card-body" style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {[...submissions].reverse().slice(0,8).map(s => (
              <button key={s.id} className={`btn btn-ghost btn-sm ${editingSubId===s.id?"btn-amber":""}`} onClick={() => loadExisting(s)}>
                ✏️ {s.date}
              </button>
            ))}
            {editingSubId && <button className="btn btn-ghost btn-sm" onClick={() => { setEditingSubId(null); setDate(getNextFriday()); initRecords(); }}>× إلغاء</button>}
          </div>
        </div>
      )}

      {!allMode && (
        <div className="group-chips">
          {allowedGroups.map(g => (
            <button key={g.id} className={`gchip ${selGroup===g.id?"sel":""}`} onClick={() => setSelGroup(g.id)}>
              {g.name}
              <span style={{ opacity:.75, fontSize:11 }}>{completion(g.id)}%</span>
            </button>
          ))}
        </div>
      )}

      {activeGroups.map(g => {
        const gm = getGroupMembers(g.id);
        return (
          <div key={g.id} className="card" style={{ marginBottom:16 }}>
            <div className="card-header">
              <h3>{g.name} <span className="badge badge-indigo" style={{ marginRight:8 }}>{gm.length} عضو</span></h3>
              <div className="row">
                <div className="prog-wrap" style={{ width:100 }}>
                  <div className="prog" style={{ width:`${completion(g.id)}%`, background:"var(--indigo)" }} />
                </div>
                <span style={{ fontSize:12, color:"var(--muted)" }}>{completion(g.id)}%</span>
              </div>
            </div>
            <div className="card-body scroll-x">
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ minWidth:180 }}>الاسم</th>
                    {FIELDS.map(f => (
                      <th key={f.key}>
                        <div className="fh">
                          <span className="fh-lbl">{f.icon} {f.key}</span>
                          <div className="fh-btns">
                            <button className="btn btn-xs" style={{ background:"#d1fae5", color:"#065f46", border:"none" }} onClick={() => toggleAll(g.id, f.key, true)}>كل</button>
                            <button className="btn btn-xs" style={{ background:"#fee2e2", color:"#991b1b", border:"none" }} onClick={() => toggleAll(g.id, f.key, false)}>لا</button>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gm.map(m => (
                    <tr key={m.id}>
                      <td style={{ fontWeight:600 }}>{m.name}</td>
                      {FIELDS.map(f => (
                        <td key={f.key}>
                          <Toggle checked={records[m.id]?.[f.key]||false} onChange={v => toggle(m.id, f.key, v)} />
                        </td>
                      ))}
                    </tr>
                  ))}
                  {!gm.length && <tr><td colSpan={7} style={{ textAlign:"center", color:"var(--muted)", padding:20 }}>لا يوجد أعضاء</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      <div className="row" style={{ marginTop:16, padding:"14px 0", gap:10 }}>
        <button className="btn btn-primary" disabled={!friday} onClick={() => isDuplicate ? setConfirmSave(true) : handleSaveOnly()}>
          💾 {editingSubId ? "تحديث البيانات" : "حفظ البيانات"}
        </button>
        <button className="btn btn-success" onClick={handleExportWeekly}>
          📥 تصدير Excel أسبوعي
        </button>
        <button className="btn btn-ghost" onClick={() => { initRecords(); showFlash("info", "تم مسح البيانات"); }}>↺ مسح الكل</button>
      </div>

      {confirmSave && (
        <Confirm
          msg={`يوجد بيانات بالفعل بتاريخ ${new Date(date+"T12:00:00").toLocaleDateString("ar-EG")}. هل تريد الحفظ على أي حال؟`}
          onYes={handleSaveOnly}
          onNo={() => setConfirmSave(false)}
        />
      )}
    </div>
  );
}



function exportFamilyReportPDF(family, members, submissions) {
  if (typeof window === "undefined") return;
  const printWindow = window.open("", "_blank");
  if (!printWindow) return alert("يرجى السماح بفتح النوافذ المنبثقة للطباعة");

  const familyMembers = members.filter(m => m.groupId === family.id);
  const activeMembers = familyMembers.filter(m => m.active);
  const inactiveMembers = familyMembers.filter(m => !m.active);

  const getMemberMetrics = (mId) => {
    const mSubs = submissions.filter(s => (s.records || []).some(r => r.memberId === mId));
    const total = mSubs.length;
    const attended = mSubs.filter(s => {
      const rec = (s.records || []).find(r => r.memberId === mId);
      return rec && rec["حضور الخدمة"];
    }).length;
    const pct = total ? Math.round((attended / total) * 100) : 0;
    const lastSub = mSubs.filter(s => {
      const rec = (s.records || []).find(r => r.memberId === mId);
      return rec && rec["حضور الخدمة"];
    }).sort((a, b) => b.dateISO.localeCompare(a.dateISO))[0];

    return { total, attended, absent: total - attended, pct, lastDate: lastSub ? lastSub.date : "—" };
  };

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>تقرير أسرة - ${family.name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
        body { font-family: 'Cairo', sans-serif; margin: 30px; color: #111827; background: #fff; line-height: 1.5; }
        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2.5px solid #FB6C00; padding-bottom: 14px; margin-bottom: 24px; }
        .header h1 { margin: 0; font-size: 20px; color: #1E1B4B; }
        .header p { margin: 2px 0 0; font-size: 12px; color: #FB6C00; font-weight: 700; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 24px; background: #FFF9F7; padding: 16px; border-radius: 12px; border: 1px solid #F2E8E4; }
        .meta-item { font-size: 13px; }
        .meta-item label { color: #6B7280; font-weight: 700; display: block; font-size: 11px; }
        .meta-item span { font-weight: 800; color: #111827; font-size: 14px; }
        .section-title { font-size: 15px; font-weight: 800; color: #1E1B4B; border-bottom: 2px solid #F2E8E4; padding-bottom: 6px; margin: 24px 0 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
        th { background: #FFF3E0; color: #E73F1E; text-align: right; padding: 10px; border: 1px solid #F2E8E4; font-weight: 800; }
        td { padding: 9px 10px; border: 1px solid #F2E8E4; text-align: right; }
        tr:nth-child(even) { background: #FFF9F7; }
        .badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; background: #FFF3E0; color: #E73F1E; }
        .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #9CA3AF; border-top: 1px solid #F2E8E4; padding-top: 12px; }
        @media print { body { margin: 15mm; } button { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>⛪ خدمة مارمينا - تقرير متابعة أسرة ${family.name}</h1>
          <p>تاريخ استخراج التقرير: ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}</p>
        </div>
        <div style="text-align: left;">
          <span class="badge">${activeMembers.length} عضو مقيد</span>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item"><label>الخادم الرئيسي المسؤول</label><span>${family.mainServant || 'غير محدد'}</span></div>
        <div class="meta-item"><label>الخدام المعاونون</label><span>${(family.assistantServants || []).join('، ') || '—'}</span></div>
        <div class="meta-item"><label>وسيلة التواصل</label><span>${family.servantContact || '—'}</span></div>
      </div>

      <div class="section-title">👥 جدول أعضاء الأسرة وسجل الحضور (${activeMembers.length})</div>
      <table>
        <thead>
          <tr>
            <th>اسم العضو</th>
            <th>نسبة الحضور</th>
            <th>مرات الحضور</th>
            <th>مرات الغياب</th>
            <th>أحدث حضور</th>
            <th>هاتف العضو</th>
          </tr>
        </thead>
        <tbody>
          ${activeMembers.map(m => {
            const met = getMemberMetrics(m.id);
            return `
              <tr>
                <td><b>${m.name}</b></td>
                <td><b>${met.pct}%</b></td>
                <td>${met.attended} أسبوع</td>
                <td>${met.absent} أسبوع</td>
                <td>${met.lastDate}</td>
                <td>${m.phone || '—'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      ${inactiveMembers.length ? `
        <div class="section-title">📦 الأعضاء المؤرشفون (${inactiveMembers.length})</div>
        <table>
          <thead>
            <tr>
              <th>اسم العضو</th>
              <th>تاريخ الأرشفة</th>
            </tr>
          </thead>
          <tbody>
            ${inactiveMembers.map(m => `
              <tr>
                <td>${m.name}</td>
                <td>${m.archivedAt ? new Date(m.archivedAt).toLocaleDateString('ar-EG') : '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      <div class="footer">
        تم استخراج هذا التقرير من نظام خدمة مارمينا الرسمي
      </div>

      <script>
        window.onload = function() { window.print(); };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

function exportStatisticsPDF(scopeLabel, timePeriodLabel, totalMembers, totalWeeks, overallAttended, overallPct, familyStats) {
  if (typeof window === "undefined") return;
  const printWindow = window.open("", "_blank");
  if (!printWindow) return alert("يرجى السماح بفتح النوافذ المنبثقة للطباعة");

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>تقرير الإحصائيات التحليلي</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
        body { font-family: 'Cairo', sans-serif; margin: 30px; color: #111827; background: #fff; line-height: 1.5; }
        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2.5px solid #E73F1E; padding-bottom: 14px; margin-bottom: 24px; }
        .header h1 { margin: 0; font-size: 20px; color: #1E1B4B; }
        .header p { margin: 2px 0 0; font-size: 12px; color: #E73F1E; font-weight: 700; }
        .filter-banner { background: #FFF3E0; border: 1px solid #FFE0B2; padding: 12px 16px; border-radius: 10px; margin-bottom: 20px; font-size: 13px; color: #E65100; font-weight: 800; display: flex; gap: 16px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
        .kpi-box { background: #FFF9F7; border: 1px solid #F2E8E4; border-top: 3.5px solid #E73F1E; border-radius: 10px; padding: 14px; text-align: center; }
        .kpi-box label { font-size: 11px; color: #6B7280; font-weight: 700; display: block; margin-bottom: 4px; }
        .kpi-box span { font-size: 24px; font-weight: 800; color: #E73F1E; }
        .section-title { font-size: 15px; font-weight: 800; color: #1E1B4B; border-bottom: 2px solid #F2E8E4; padding-bottom: 6px; margin: 24px 0 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
        th { background: #FFF3E0; color: #E73F1E; text-align: right; padding: 10px; border: 1px solid #F2E8E4; font-weight: 800; }
        td { padding: 9px 10px; border: 1px solid #F2E8E4; text-align: right; }
        tr:nth-child(even) { background: #FFF9F7; }
        .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #9CA3AF; border-top: 1px solid #F2E8E4; padding-top: 12px; }
        @media print { body { margin: 15mm; } button { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>⛪ خدمة مارمينا - تقرير الإحصائيات الشامل والتحليلي</h1>
          <p>تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}</p>
        </div>
      </div>

      <div class="filter-banner">
        <span>🎯 نطاق العرض: ${scopeLabel}</span>
        <span>📅 الفترة الزمنية: ${timePeriodLabel}</span>
      </div>

      <div class="kpi-grid">
        <div class="kpi-box"><label>إجمالي الأعضاء المقيدين</label><span>${totalMembers}</span></div>
        <div class="kpi-box"><label>إجمالي الأسابيع المشمولة</label><span>${totalWeeks}</span></div>
        <div class="kpi-box"><label>متوسط نسبة الحضور العام</label><span>${overallPct}%</span></div>
        <div class="kpi-box"><label>نسبة الغياب العام</label><span>${100 - overallPct}%</span></div>
      </div>

      <div class="section-title">📊 تحليل ومقارنة أداء الأسر</div>
      <table>
        <thead>
          <tr>
            <th>اسم الأسرة</th>
            <th>عدد الأعضاء المقيدين</th>
            <th>متوسط نسبة الحضور العام</th>
          </tr>
        </thead>
        <tbody>
          ${familyStats.map(f => `
            <tr>
              <td><b>${f.name}</b></td>
              <td>${f.count} عضو</td>
              <td><b>${f.pct}%</b></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        تم استخراج هذا التقرير من نظام خدمة مارمينا الرسمي
      </div>

      <script>
        window.onload = function() { window.print(); };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

function exportMemberProfilePDF(member, group, attendanceHistory, fieldStats, notes) {
  if (typeof window === "undefined") return;
  const printWindow = window.open("", "_blank");
  if (!printWindow) return alert("يرجى السماح بفتح النوافذ المنبثقة للطباعة");

  const totalWeeks = attendanceHistory.length;
  const attended = attendanceHistory.filter(r => r["حضور الخدمة"]).length;
  const attendPct = totalWeeks ? Math.round((attended / totalWeeks) * 100) : 0;

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>تقرير العضو - ${member.name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
        body { font-family: 'Cairo', sans-serif; margin: 30px; color: #111827; background: #fff; line-height: 1.5; }
        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2.5px solid #E73F1E; padding-bottom: 14px; margin-bottom: 24px; }
        .header h1 { margin: 0; font-size: 20px; color: #1E1B4B; }
        .header p { margin: 2px 0 0; font-size: 12px; color: #E73F1E; font-weight: 700; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px; background: #FFF9F7; padding: 16px; border-radius: 12px; border: 1px solid #F2E8E4; }
        .meta-item { font-size: 13px; }
        .meta-item label { color: #6B7280; font-weight: 700; display: block; font-size: 11px; }
        .meta-item span { font-weight: 800; color: #111827; font-size: 14px; }
        .section-title { font-size: 15px; font-weight: 800; color: #1E1B4B; border-bottom: 2px solid #F2E8E4; padding-bottom: 6px; margin: 24px 0 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
        th { background: #FFF3E0; color: #E73F1E; text-align: right; padding: 10px; border: 1px solid #F2E8E4; font-weight: 800; }
        td { padding: 9px 10px; border: 1px solid #F2E8E4; text-align: right; }
        tr:nth-child(even) { background: #FFF9F7; }
        .badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; background: #FFF3E0; color: #E73F1E; }
        .note-card { background: #fff; border: 1px solid #F2E8E4; border-right: 4px solid #FB6C00; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; }
        .note-title { font-size: 14px; font-weight: 800; color: #1E1B4B; margin-bottom: 4px; }
        .note-meta { font-size: 11px; color: #6B7280; margin-bottom: 8px; }
        .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #9CA3AF; border-top: 1px solid #F2E8E4; padding-top: 12px; }
        @media print { body { margin: 15mm; } button { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>⛪ خدمة مارمينا - تقرير العضو الشامل</h1>
          <p>تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}</p>
        </div>
        <div style="text-align: left;">
          <span class="badge">نسبة الحضور: ${attendPct}%</span>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item"><label>اسم العضو الكامل</label><span>${member.name}</span></div>
        <div class="meta-item"><label>الأسرة المخصصة</label><span>${group?.name || 'غير محدد'}</span></div>
        <div class="meta-item"><label>رقم هاتف العضو</label><span>${member.phone || '—'}</span></div>
        <div class="meta-item"><label>رقم هاتف الأسرة</label><span>${member.familyPhone || '—'}</span></div>
        <div class="meta-item"><label>العنوان</label><span>${member.address || '—'}</span></div>
        <div class="meta-item"><label>المدرسة / الجامعة</label><span>${member.school || '—'}</span></div>
      </div>

      <div class="section-title">📊 إحصائيات الحضور والأنشطة (${totalWeeks} أسبوع)</div>
      <table>
        <thead>
          <tr>
            <th>مجال المتابعة</th>
            <th>مرات التحقق</th>
            <th>النسبة المئوية</th>
          </tr>
        </thead>
        <tbody>
          ${fieldStats.map(f => `
            <tr>
              <td>${f.icon} ${f.key}</td>
              <td>${f.count} من أصل ${totalWeeks}</td>
              <td><b>${f.pct}%</b></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="section-title">📝 ملاحظات المتابعة والافتفاد (${notes.length})</div>
      ${notes.length ? notes.map(n => `
        <div class="note-card">
          <div class="note-title">${n.title} <span class="badge" style="float: left;">${n.category || 'General'}</span></div>
          <div class="note-meta">تاريخ الإنشاء: ${new Date(n.createdAt).toLocaleDateString('ar-EG')} | القائم بالتسجيل: ${n.createdBy || 'خادم'}</div>
          <div>${n.content}</div>
        </div>
      `).join('') : '<p style="color:#6B7280; font-size:12px;">لا توجد ملاحظات مسجلة لهذا العضو.</p>'}

      <div class="section-title">📅 سجل الحضور التفصيلي</div>
      <table>
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>حضور الخدمة</th>
            <th>ملاحظات الحضور</th>
          </tr>
        </thead>
        <tbody>
          ${attendanceHistory.slice(0, 15).map(r => `
            <tr>
              <td>${r.date}</td>
              <td>${r["حضور الخدمة"] ? "✅ حاضر" : "❌ غائب"}</td>
              <td>${r.notes || "—"}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        تم استخراج هذا التقرير من نظام خدمة مارمينا الرسمي
      </div>

      <script>
        window.onload = function() { window.print(); };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

// ══════════════════════════════════════════════════════════════════════════════
// MEMBER PROFILE PAGE
// ══════════════════════════════════════════════════════════════════════════════
function MemberProfilePage({ currentUser, member, groups, members, submissions, activities, onBack, onUpdate }) {
  const group = groups.find(g => g.id === member.groupId);
  const allMembers = ls.get(SK.members, []);
  const m = allMembers.find(x => x.id === member.id) || member;
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("info"); // "info" | "notes"
  const [form, setForm] = useState({
    phone: m.phone||"", familyPhone: m.familyPhone||"", address: m.address||"",
    school: m.school||"", brotherOfLord: m.brotherOfLord||false,
    activities: m.activities||[], notes: m.notes||""
  });

  // Notes state
  const NOTES_KEY = "church_member_notes";
  const [notesList, setNotesList] = useState(() => {
    const allNotes = ls.get(NOTES_KEY, []);
    return allNotes.filter(n => n.memberId === m.id);
  });
  const [searchNote, setSearchNote] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [noteModal, setNoteModal] = useState(null); // { mode: "add"|"edit", note?: any }
  const [nForm, setNForm] = useState({ title: "", content: "", category: "General" });

  const canEditProfile = hasPermission(currentUser, "edit_member_profiles");
  const canViewNotes = hasPermission(currentUser, "view_notes");
  const canAddNotes = hasPermission(currentUser, "add_notes");
  const canEditNotes = hasPermission(currentUser, "edit_notes");
  const canDeleteNotes = hasPermission(currentUser, "delete_notes");
  const canExportPDF = hasPermission(currentUser, "export_member_report");

  const attendanceHistory = submissions.map(sub => {
    const rec = (sub.records||[]).find(r => r.memberId === m.id) || {};
    return { date: sub.date, dateISO: sub.dateISO, ...rec };
  }).sort((a,b) => b.dateISO.localeCompare(a.dateISO));

  const totalWeeks = attendanceHistory.length;
  const attended = attendanceHistory.filter(r => r["حضور الخدمة"]).length;
  const attendPct = totalWeeks ? Math.round((attended/totalWeeks)*100) : 0;

  const fieldStats = FIELDS.map(f => ({
    ...f,
    count: attendanceHistory.filter(r => r[f.key]).length,
    pct: totalWeeks ? Math.round((attendanceHistory.filter(r => r[f.key]).length / totalWeeks)*100) : 0
  }));

  const saveProfile = () => {
    const all = ls.get(SK.members,[]).map(x => x.id === m.id ? { ...x, ...form } : x);
    ls.set(SK.members, all); onUpdate(); setEditing(false);
  };

  const refreshNotes = () => {
    const allNotes = ls.get(NOTES_KEY, []);
    setNotesList(allNotes.filter(n => n.memberId === m.id));
  };

  const handleSaveNote = () => {
    if (!nForm.title.trim() || !nForm.content.trim()) return alert("عنوان ومحتوى الملاحظة مطلوبان");
    const allNotes = ls.get(NOTES_KEY, []);
    if (noteModal.mode === "add") {
      const newN = {
        id: Date.now(),
        memberId: m.id,
        title: nForm.title.trim(),
        content: nForm.content.trim(),
        category: nForm.category,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: currentUser ? currentUser.name : "خادم"
      };
      allNotes.unshift(newN);
    } else {
      const idx = allNotes.findIndex(x => x.id === noteModal.note.id);
      if (idx >= 0) {
        allNotes[idx] = {
          ...allNotes[idx],
          title: nForm.title.trim(),
          content: nForm.content.trim(),
          category: nForm.category,
          updatedAt: new Date().toISOString()
        };
      }
    }
    ls.set(NOTES_KEY, allNotes);
    refreshNotes();
    setNoteModal(null);
  };

  const handleDeleteNote = (nId) => {
    if (!confirm("هل أنت تأكد من حذف هذه الملاحظة؟")) return;
    const allNotes = ls.get(NOTES_KEY, []).filter(x => x.id !== nId);
    ls.set(NOTES_KEY, allNotes);
    refreshNotes();
  };

  const filteredNotes = notesList.filter(n => {
    const q = searchNote.trim().toLowerCase();
    const matchQ = !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
    const matchC = filterCategory === "all" || n.category === filterCategory;
    return matchQ && matchC;
  });

  const initials = m.name.split(" ").slice(0,2).map(w=>w[0]).join("");

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← العودة لجدول الأعضاء</button>
        {canExportPDF && (
          <button className="btn btn-outline btn-sm" onClick={() => exportMemberProfilePDF(m, group, attendanceHistory, fieldStats, notesList)}>
            🖨 تصدير تقرير العضو الشامل (PDF)
          </button>
        )}
      </div>

      <div className="profile-header">
        <div className="profile-avatar">{initials}</div>
        <div>
          <div className="profile-name">{m.name}</div>
          <div className="profile-meta">{group?.name || "—"}</div>
          <div style={{ marginTop:8, display:"flex", gap:8, flexWrap:"wrap" }}>
            <span className="badge" style={{ background:"rgba(255,255,255,.2)", color:"#fff" }}>📅 {totalWeeks} أسبوع</span>
            <span className="badge" style={{ background:"rgba(255,255,255,.2)", color:"#fff" }}>✅ {attendPct}% حضور</span>
            {m.brotherOfLord && <span className="badge" style={{ background:"#fef3c7", color:"#92400e" }}>✝️ أخ الرب</span>}
          </div>
        </div>
        {canEditProfile && (
          <div style={{ marginRight:"auto" }}>
            <button className="btn btn-sm" style={{ background:"rgba(255,255,255,.15)", color:"#fff", border:"1px solid rgba(255,255,255,.3)" }} onClick={() => setEditing(true)}>✏️ تعديل البيانات</button>
          </div>
        )}
      </div>

      <div className="tabs" style={{ marginBottom:18 }}>
        <button className={`tab ${activeTab==="info"?"active":""}`} onClick={() => setActiveTab("info")}>📋 الملف الشخصي والإحصائيات</button>
        {canViewNotes && (
          <button className={`tab ${activeTab==="notes"?"active":""}`} onClick={() => setActiveTab("notes")}>📝 ملاحظات المتابعة والافتفاد ({notesList.length})</button>
        )}
      </div>

      {activeTab === "info" && (
        <div className="grid-2" style={{ marginBottom:16 }}>
          <div className="card">
            <div className="card-header"><h3>📋 البيانات الشخصية</h3></div>
            <div className="card-body">
              {[
                { label:"📞 هاتف العضو", val: m.phone||"—" },
                { label:"👨‍👩‍👧 هاتف الأسرة", val: m.familyPhone||"—" },
                { label:"🏠 العنوان", val: m.address||"—" },
                { label:"🏫 المدرسة / الجامعة", val: m.school||"—" },
                { label:"✝️ أخ الرب", val: m.brotherOfLord ? "نعم" : "لا" },
              ].map(({ label, val }) => (
                <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid var(--border)", fontSize:13 }}>
                  <span style={{ color:"var(--muted)", fontWeight:600 }}>{label}</span>
                  <span style={{ fontWeight:700 }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>📊 إحصائيات الحضور</h3></div>
            <div className="card-body">
              {fieldStats.map(f => (
                <div key={f.key} className="stat-bar-row">
                  <span className="stat-bar-label">{f.icon} {f.key}</span>
                  <div className="stat-bar-wrap">
                    <div className="stat-bar" style={{ width:`${f.pct}%`, background:f.color }} />
                  </div>
                  <span className="stat-bar-val">{f.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "notes" && canViewNotes && (
        <div className="card">
          <div className="card-header" style={{ justifyContent:"space-between" }}>
            <h3>📝 ملاحظات المتابعة والافتفاد</h3>
            {canAddNotes && (
              <button className="btn btn-primary btn-sm" onClick={() => { setNForm({ title:"", content:"", category:"General" }); setNoteModal({ mode:"add" }); }}>
                + إضافة ملاحظة جديدة
              </button>
            )}
          </div>
          <div className="card-body">
            <div className="row" style={{ marginBottom:16, gap:10 }}>
              <input className="inp inp-sm" style={{ flex:1 }} placeholder="🔍 بحث في الملاحظات..." value={searchNote} onChange={e => setSearchNote(e.target.value)} />
              <select className="inp inp-sm" style={{ width:180 }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                <option value="all">جميع التصنيفات</option>
                <option value="General">عامة (General)</option>
                <option value="Spiritual">روحية (Spiritual)</option>
                <option value="Follow-up">متابعة (Follow-up)</option>
                <option value="Family">عائلية (Family)</option>
                <option value="Health">صحية (Health)</option>
                <option value="Education">تعليمية (Education)</option>
                <option value="Other">أخرى (Other)</option>
              </select>
            </div>

            {!filteredNotes.length ? (
              <div className="empty"><div className="ei">📝</div>لا توجد ملاحظات مطابقة</div>
            ) : (
              <div className="col" style={{ gap:12 }}>
                {filteredNotes.map(n => (
                  <div key={n.id} style={{ border:"1px solid #F2E8E4", borderRight:"4px solid #FB6C00", borderRadius:10, padding:14, background:"#ffffff" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                      <h4 style={{ fontSize:15, fontWeight:800, color:"#1E1B4B" }}>{n.title}</h4>
                      <div className="row" style={{ gap:6 }}>
                        <span className="badge badge-amber">{n.category}</span>
                        {canEditNotes && <button className="btn btn-xs btn-ghost" onClick={() => { setNForm({ title:n.title, content:n.content, category:n.category }); setNoteModal({ mode:"edit", note:n }); }}>✏️</button>}
                        {canDeleteNotes && <button className="btn btn-xs btn-danger" onClick={() => handleDeleteNote(n.id)}>🗑</button>}
                      </div>
                    </div>
                    <p style={{ fontSize:13, color:"#374151", whiteSpace:"pre-wrap", marginBottom:8 }}>{n.content}</p>
                    <div style={{ fontSize:11, color:"#9CA3AF" }}>
                      📅 أنشئت: {new Date(n.createdAt).toLocaleDateString("ar-EG")} | 👤 القائم بالتسجيل: {n.createdBy}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {noteModal && (
        <div className="modal-bg" onClick={() => setNoteModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{noteModal.mode === "add" ? "➕ إضافة ملاحظة متابعة جديدة" : "✏️ تعديل الملاحظة"}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setNoteModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">عنوان الملاحظة</label>
                <input className="inp" placeholder="عنوان مختصر للملاحظة" value={nForm.title} onChange={e => setNForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">تصنيف الملاحظة</label>
                <select className="inp" value={nForm.category} onChange={e => setNForm(p => ({ ...p, category: e.target.value }))}>
                  <option value="General">عامة (General)</option>
                  <option value="Spiritual">روحية (Spiritual)</option>
                  <option value="Follow-up">متابعة (Follow-up)</option>
                  <option value="Family">عائلية (Family)</option>
                  <option value="Health">صحية (Health)</option>
                  <option value="Education">تعليمية (Education)</option>
                  <option value="Other">أخرى (Other)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">تفاصيل الملاحظة</label>
                <textarea className="inp" style={{ minHeight:100 }} placeholder="اكتب تفاصيل الافتقاد والملاحظة..." value={nForm.content} onChange={e => setNForm(p => ({ ...p, content: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setNoteModal(null)}>إلغاء</button>
              <button className="btn btn-primary" onClick={handleSaveNote}>حفظ الملاحظة</button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="modal-bg" onClick={() => setEditing(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ تعديل بيانات العضو</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">📞 هاتف العضو</label>
                <input className="inp" value={form.phone} onChange={e=>setForm(p=>({ ...p, phone:e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">👨‍👩‍👧 هاتف الأسرة</label>
                <input className="inp" value={form.familyPhone} onChange={e=>setForm(p=>({ ...p, familyPhone:e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">🏠 العنوان</label>
                <input className="inp" value={form.address} onChange={e=>setForm(p=>({ ...p, address:e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">🏫 المدرسة / الجامعة</label>
                <input className="inp" value={form.school} onChange={e=>setForm(p=>({ ...p, school:e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="toggle-wrap">
                  <div className="toggle">
                    <input type="checkbox" checked={form.brotherOfLord} onChange={e=>setForm(p=>({ ...p, brotherOfLord:e.target.checked }))} />
                    <span className="toggle-sl" />
                  </div>
                  <span className="form-label" style={{ margin:0 }}>✝️ أخ الرب</span>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setEditing(false)}>إلغاء</button>
              <button className="btn btn-primary" onClick={saveProfile}>حفظ البيانات</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ACTIVITIES PAGE
// ══════════════════════════════════════════════════════════════════════════════
function ActivitiesPage({ activities, members, onUpdate }) {
  const [actModal, setActModal] = useState(null);
  const [form, setForm] = useState({ name:"", icon:"🎯", color:"#6366f1" });
  const [flash, setFlash] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const showFlash = (type, msg) => { setFlash({ type, msg }); setTimeout(() => setFlash(null), 3000); };

  const saveActivity = () => {
    if (!form.name.trim()) return showFlash("error", "الاسم مطلوب");
    const all = ls.get(SK.activities, []);
    if (actModal.mode === "add") {
      all.push({ id: Date.now(), ...form, name: form.name.trim() });
      showFlash("success", "✅ تم إضافة النشاط");
    } else {
      const idx = all.findIndex(a => a.id === actModal.act.id);
      if (idx >= 0) all[idx] = { ...all[idx], ...form };
      showFlash("success", "✅ تم تحديث النشاط");
    }
    ls.set(SK.activities, all); onUpdate(); setActModal(null);
  };

  const deleteActivity = (act) => {
    const all = ls.get(SK.activities,[]).filter(a => a.id !== act.id);
    // Remove from members too
    const allM = ls.get(SK.members,[]).map(m => ({ ...m, activities: (m.activities||[]).filter(id=>id!==act.id) }));
    ls.set(SK.activities, all); ls.set(SK.members, allM);
    onUpdate(); showFlash("success", "🗑 تم حذف النشاط"); setConfirm(null);
  };

  return (
    <div>
      {flash && <Alert type={flash.type}>{flash.msg}</Alert>}
      <div className="row" style={{ marginBottom:16 }}>
        <button className="btn btn-primary" onClick={() => { setForm({ name:"", icon:"🎯", color:"#6366f1" }); setActModal({ mode:"add" }); }}>+ إضافة نشاط</button>
      </div>

      <div className="grid-3" style={{ marginBottom:20 }}>
        {activities.map(act => {
          const count = members.filter(m => m.active && (m.activities||[]).includes(act.id)).length;
          return (
            <div key={act.id} className="kpi-card" style={{ borderTop:`4px solid ${act.color}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontSize:28, marginBottom:4 }}>{act.icon}</div>
                  <div style={{ fontWeight:800, fontSize:14, color:"var(--text)" }}>{act.name}</div>
                  <div className="kpi-sub">{count} عضو مشارك</div>
                  <ProgBar pct={members.filter(m=>m.active).length ? Math.round(count/members.filter(m=>m.active).length*100) : 0} color={act.color} />
                </div>
                <div style={{ display:"flex", gap:4 }}>
                  <button className="btn btn-xs btn-ghost" onClick={() => { setForm({ name:act.name, icon:act.icon, color:act.color }); setActModal({ mode:"edit", act }); }}>✏️</button>
                  <button className="btn btn-xs" style={{ background:"#fee2e2", color:"#991b1b", border:"none" }} onClick={() => setConfirm({ msg:`حذف نشاط "${act.name}"؟`, onYes:()=>deleteActivity(act) })}>🗑</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Members per activity */}
      <div className="card">
        <div className="card-header"><h3>👥 الأعضاء حسب النشاط</h3></div>
        <div className="card-body">
          {activities.map(act => {
            const actMembers = members.filter(m => m.active && (m.activities||[]).includes(act.id));
            return (
              <div key={act.id} style={{ marginBottom:16 }}>
                <div style={{ fontWeight:700, fontSize:13, color:act.color, marginBottom:8 }}>
                  {act.icon} {act.name} <span className="badge badge-indigo" style={{ marginRight:8 }}>{actMembers.length}</span>
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {actMembers.map(m => <span key={m.id} className="badge badge-gray">{m.name}</span>)}
                  {!actMembers.length && <span style={{ fontSize:12, color:"var(--muted)" }}>لا يوجد أعضاء</span>}
                </div>
                <div className="divider" />
              </div>
            );
          })}
        </div>
      </div>

      {actModal && (
        <Modal title={actModal.mode==="add" ? "إضافة نشاط جديد" : "تعديل النشاط"} onClose={() => setActModal(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setActModal(null)}>إلغاء</button><button className="btn btn-primary" onClick={saveActivity}>حفظ</button></>}>
          <div className="form-group">
            <label className="form-label">اسم النشاط</label>
            <input className="inp" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder="مثال: كرة قدم" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">الأيقونة (emoji)</label>
              <input className="inp" value={form.icon} onChange={e => setForm(p=>({...p,icon:e.target.value}))} placeholder="🎯" />
            </div>
            <div className="form-group">
              <label className="form-label">اللون</label>
              <input type="color" className="inp" style={{ height:42, padding:4 }} value={form.color} onChange={e => setForm(p=>({...p,color:e.target.value}))} />
            </div>
          </div>
          <div style={{ padding:12, background:"var(--card2)", borderRadius:8, textAlign:"center" }}>
            <span className="act-chip" style={{ background:form.color+"22", color:form.color, borderColor:form.color }}>
              {form.icon} {form.name||"معاينة"}
            </span>
          </div>
        </Modal>
      )}
      {confirm && <Confirm msg={confirm.msg} onYes={confirm.onYes} onNo={() => setConfirm(null)} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MANAGEMENT PAGE
// ══════════════════════════════════════════════════════════════════════════════
function ManagementPage({ currentUser, groups, members, activities, submissions, onUpdate, onViewProfile }) {
  const canEditMembers = hasPermission(currentUser, "edit_family_members");
  const [tab, setTab] = useState("members");
  const [flash, setFlash] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const showFlash = (type, msg) => { setFlash({ type, msg }); setTimeout(() => setFlash(null), 3000); };

  // ── MEMBERS ──
  const [memberModal, setMemberModal] = useState(null);
  const [mName, setMName] = useState(""); const [mGroup, setMGroup] = useState(groups[0]?.id||"");
  const [searchM, setSearchM] = useState(""); const [filterG, setFilterG] = useState("all");

  const openAddMember = () => { setMName(""); setMGroup(groups.filter(g=>g.active)[0]?.id||""); setMemberModal({ mode:"add" }); };
  const openEditMember = (m) => { setMName(m.name); setMGroup(m.groupId); setMemberModal({ mode:"edit", member:m }); };

  const saveMember = () => {
    if (!mName.trim()) return showFlash("error", "الاسم مطلوب");
    createBackup();
    const all = [...members];
    if (memberModal.mode === "add") {
      all.push({ id: Date.now(), name: mName.trim(), groupId: Number(mGroup), active: true, joinedAt: new Date().toISOString(), phone:"", familyPhone:"", address:"", school:"", brotherOfLord:false, activities:[], notes:"" });
      showFlash("success", "✅ تم إضافة العضو");
    } else {
      const idx = all.findIndex(m => m.id === memberModal.member.id);
      if (idx>=0) all[idx] = { ...all[idx], name: mName.trim(), groupId: Number(mGroup) };
      showFlash("success", "✅ تم تحديث بيانات العضو");
    }
    ls.set(SK.members, all); onUpdate(); setMemberModal(null);
  };

  const archiveMember = (m) => {
    createBackup();
    const all = members.map(x => x.id===m.id ? { ...x, active:false, archivedAt:new Date().toISOString() } : x);
    ls.set(SK.members, all);
    const arch = ls.get(SK.archive,[]);
    arch.push({ ...m, active:false, archivedAt:new Date().toISOString(), type:"member" });
    ls.set(SK.archive, arch);
    onUpdate(); showFlash("success", "📦 تم أرشفة العضو"); setConfirm(null);
  };

  const restoreMember = (m) => {
    ls.set(SK.members, members.map(x => x.id===m.id ? { ...x, active:true, archivedAt:null } : x));
    onUpdate(); showFlash("success", "✅ تم استعادة العضو");
  };

  const deleteMemberPerm = (m) => {
    createBackup();
    ls.set(SK.members, members.filter(x => x.id!==m.id));
    ls.set(SK.archive, ls.get(SK.archive,[]).filter(x => !(x.id===m.id && x.type==="member")));
    onUpdate(); showFlash("success", "🗑 تم حذف العضو نهائياً"); setConfirm(null);
  };

    const [sortOption, setSortOption] = useState(() => ls.get("church_member_sort", "name_asc"));
  const handleSortChange = (val) => {
    setSortOption(val);
    ls.set("church_member_sort", val);
  };

  const getMemberAttendancePct = (mId) => {
    const memberSubs = submissions.filter(s => (s.records || []).some(r => r.memberId === mId));
    if (!memberSubs.length) return 0;
    const presentCount = memberSubs.filter(s => {
      const rec = (s.records || []).find(r => r.memberId === mId);
      return rec && rec["حضور الخدمة"];
    }).length;
    return Math.round((presentCount / memberSubs.length) * 100);
  };

  const getMemberLastAttendanceDate = (mId) => {
    const memberAttendedSubs = submissions.filter(s => {
      const rec = (s.records || []).find(r => r.memberId === mId);
      return rec && rec["حضور الخدمة"];
    }).sort((a, b) => b.dateISO.localeCompare(a.dateISO));
    return memberAttendedSubs[0] ? memberAttendedSubs[0].dateISO : "1970-01-01";
  };

  const filteredMembers = members.filter(m => {
    const nameOk = !searchM || m.name.includes(searchM);
    const gOk = filterG==="all" || (filterG==="archived" ? !m.active : (m.groupId===Number(filterG) && m.active));
    return nameOk && gOk;
  }).sort((a, b) => {
    if (sortOption === "name_asc") return a.name.localeCompare(b.name, "ar");
    if (sortOption === "name_desc") return b.name.localeCompare(a.name, "ar");
    if (sortOption === "attend_desc") return getMemberAttendancePct(b.id) - getMemberAttendancePct(a.id);
    if (sortOption === "attend_asc") return getMemberAttendancePct(a.id) - getMemberAttendancePct(b.id);
    if (sortOption === "recent_attend") return getMemberLastAttendanceDate(b.id).localeCompare(getMemberLastAttendanceDate(a.id));
    if (sortOption === "oldest_attend") return getMemberLastAttendanceDate(a.id).localeCompare(getMemberLastAttendanceDate(b.id));
    if (sortOption === "date_desc") return (b.joinedAt || "").localeCompare(a.joinedAt || "");
    if (sortOption === "date_asc") return (a.joinedAt || "").localeCompare(b.joinedAt || "");
    return 0;
  });

  // ── GROUPS ──
  const [groupModal, setGroupModal] = useState(null);
  const [gForm, setGForm] = useState({ name:"", mainServant:"", assistantServants:[], servantContact:"" });

  const saveGroup = () => {
    if (!gForm.name.trim()) return showFlash("error", "اسم الأسرة مطلوب");
    createBackup();
    const all = [...groups];
    if (groupModal.mode === "add") {
      all.push({ id:Date.now(), name:gForm.name.trim(), active:true, order:all.length, mainServant:gForm.mainServant, assistantServants:gForm.assistantServants, servantContact:gForm.servantContact });
      showFlash("success", "✅ تم إضافة الأسرة");
    } else {
      const idx = all.findIndex(g => g.id===groupModal.group.id);
      if (idx>=0) all[idx] = { ...all[idx], name:gForm.name.trim(), mainServant:gForm.mainServant, assistantServants:gForm.assistantServants, servantContact:gForm.servantContact };
      showFlash("success", "✅ تم تحديث الأسرة");
    }
    ls.set(SK.groups, all); onUpdate(); setGroupModal(null);
  };

  const archiveGroup = (g) => {
    createBackup();
    ls.set(SK.groups, groups.map(x => x.id===g.id ? { ...x, active:false } : x));
    onUpdate(); showFlash("success", "📦 تم أرشفة الأسرة"); setConfirm(null);
  };

  const restoreGroup = (g) => {
    ls.set(SK.groups, groups.map(x => x.id===g.id ? { ...x, active:true } : x));
    onUpdate(); showFlash("success", "✅ تم استعادة الأسرة");
  };

  // ── USERS ──
  const [users, setUsersState] = useState(() => ls.get(SK.users, DEFAULT_USERS));
  const [userModal, setUserModal] = useState(null);
  const [uForm, setUForm] = useState({ username:"", password:"", name:"", role:"servant", assignedGroups:[] });
  const refreshUsers = () => setUsersState(ls.get(SK.users, DEFAULT_USERS));

  const saveUser = () => {
    if (!uForm.username.trim() || !uForm.name.trim()) return showFlash("error", "البيانات مطلوبة");
    const all = [...ls.get(SK.users,[])];
    if (userModal.mode==="add") {
      if (!uForm.password.trim()) return showFlash("error", "كلمة المرور مطلوبة");
      if (all.find(u => u.username===uForm.username.trim())) return showFlash("error", "اسم المستخدم موجود");
      all.push({ id:Date.now(), ...uForm, username:uForm.username.trim() });
      showFlash("success", "✅ تم إضافة المستخدم");
    } else {
      const idx = all.findIndex(u => u.id===userModal.user.id);
      if (idx>=0) all[idx] = { ...all[idx], ...uForm, ...(uForm.password ? {} : { password:all[idx].password }) };
      showFlash("success", "✅ تم تحديث المستخدم");
    }
    ls.set(SK.users, all); refreshUsers(); setUserModal(null);
  };

  const deleteUser = (u) => {
    ls.set(SK.users, ls.get(SK.users,[]).filter(x => x.id!==u.id));
    refreshUsers(); showFlash("success", "🗑 تم حذف المستخدم"); setConfirm(null);
  };

  return (
    <div>
      {flash && <Alert type={flash.type}>{flash.msg}</Alert>}
      <div className="tabs">
        {[["members","👥 الأعضاء"],["groups","🏠 الأسر"],["users","🔑 المستخدمون"],["archived","📦 الأرشيف"]].map(([k,l]) => (
          <button key={k} className={`tab ${tab===k?"active":""}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* MEMBERS */}
      {tab==="members" && (
        <div>
          <div className="card">
            <div className="card-header">
              <h3>إدارة الأعضاء</h3>
              <button className="btn btn-primary btn-sm" onClick={openAddMember}>+ إضافة عضو</button>
            </div>
            <div className="card-body">
              <div className="row" style={{ marginBottom:12 }}>
                <input className="inp inp-sm" placeholder="بحث بالاسم..." style={{ maxWidth:200 }} value={searchM} onChange={e => setSearchM(e.target.value)} />
                <select className="inp inp-sm" style={{ maxWidth:220 }} value={filterG} onChange={e => setFilterG(e.target.value)}>
                  <option value="all">جميع الأسر (النشطة)</option>
                  {groups.filter(g=>g.active).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  <option value="archived">المؤرشفون</option>
                </select>
                <span className="badge badge-indigo">{filteredMembers.length} عضو</span>
              </div>
              <div className="scroll-x">
                <table className="tbl">
                  <thead><tr><th>#</th><th>الاسم</th><th>الأسرة</th><th>الحالة</th><th>أخ الرب</th><th>تاريخ الانضمام</th><th>إجراءات</th></tr></thead>
                  <tbody>
                    {filteredMembers.map((m, i) => {
                      const g = groups.find(x => x.id===m.groupId);
                      return (
                        <tr key={m.id} className={!m.active?"archived-row":""}>
                          <td style={{ color:"var(--muted)", fontSize:12 }}>{i+1}</td>
                          <td><button className="btn btn-ghost btn-xs" onClick={() => onViewProfile(m)} style={{ fontWeight:700 }}>{m.name}</button></td>
                          <td><span className="badge badge-indigo" style={{ fontSize:10 }}>{g?.name||"—"}</span></td>
                          <td>{m.active ? <span className="badge badge-green">نشط</span> : <span className="badge badge-gray">مؤرشف</span>}</td>
                          <td>{m.brotherOfLord ? <span className="badge badge-amber">✝️ نعم</span> : <span className="badge badge-gray">لا</span>}</td>
                          <td style={{ fontSize:12, color:"var(--muted)" }}>{m.joinedAt ? new Date(m.joinedAt).toLocaleDateString("ar-EG") : "—"}</td>
                          <td>
                            <div className="row">
                              <button className="btn btn-ghost btn-xs" onClick={() => onViewProfile(m)}>👁 ملف</button>
                              {m.active && <>
                                <button className="btn btn-ghost btn-xs" onClick={() => openEditMember(m)}>✏️</button>
                                <button className="btn btn-xs" style={{ background:"#fef3c7", color:"#92400e", border:"none" }} onClick={() => setConfirm({ msg:`أرشفة "${m.name}"؟`, onYes:()=>archiveMember(m) })}>📦</button>
                              </>}
                              {!m.active && <>
                                <button className="btn btn-xs" style={{ background:"#d1fae5", color:"#065f46", border:"none" }} onClick={() => restoreMember(m)}>↩</button>
                                <button className="btn btn-xs" style={{ background:"#fee2e2", color:"#991b1b", border:"none" }} onClick={() => setConfirm({ msg:`حذف "${m.name}" نهائياً؟`, onYes:()=>deleteMemberPerm(m) })}>🗑</button>
                              </>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!filteredMembers.length && <tr><td colSpan={7}><div className="empty"><div className="ei">🔍</div>لا توجد نتائج</div></td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {memberModal && (
            <Modal title={memberModal.mode==="add" ? "إضافة عضو جديد" : "تعديل بيانات العضو"} onClose={() => setMemberModal(null)}
              footer={<><button className="btn btn-ghost" onClick={() => setMemberModal(null)}>إلغاء</button><button className="btn btn-primary" onClick={saveMember}>حفظ</button></>}>
              <div className="form-group">
                <label className="form-label">الاسم الكامل</label>
                <input className="inp" placeholder="أدخل الاسم الكامل" value={mName} onChange={e => setMName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">الأسرة</label>
                <select className="inp" value={mGroup} onChange={e => setMGroup(e.target.value)}>
                  {groups.filter(g=>g.active).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            </Modal>
          )}
        </div>
      )}

      {/* GROUPS */}
      {tab==="groups" && (
        <div>
          <div className="card">
            <div className="card-header">
              <h3>إدارة الأسر</h3>
              <button className="btn btn-primary btn-sm" onClick={() => { setGForm({ name:"", mainServant:"", assistantServants:[], servantContact:"" }); setGroupModal({ mode:"add" }); }}>+ إضافة أسرة</button>
            </div>
            <div className="card-body">
              <table className="tbl">
                <thead><tr><th>#</th><th>اسم الأسرة</th><th>الخادم الرئيسي</th><th>الأعضاء</th><th>الحالة</th><th>إجراءات</th></tr></thead>
                <tbody>
                  {groups.map((g, i) => {
                    const cnt = members.filter(m => m.groupId===g.id && m.active).length;
                    return (
                      <tr key={g.id} className={!g.active?"archived-row":""}>
                        <td style={{ color:"var(--muted)", fontSize:12 }}>{i+1}</td>
                        <td style={{ fontWeight:700 }}>{g.name}</td>
                        <td style={{ fontSize:12 }}>{g.mainServant||"—"}</td>
                        <td><span className="badge badge-blue">{cnt}</span></td>
                        <td>{g.active ? <span className="badge badge-green">نشطة</span> : <span className="badge badge-gray">مؤرشفة</span>}</td>
                        <td>
                          <div className="row">
                            {g.active && <>
                              <button className="btn btn-ghost btn-xs" onClick={() => { setGForm({ name:g.name, mainServant:g.mainServant||"", assistantServants:g.assistantServants||[], servantContact:g.servantContact||"" }); setGroupModal({ mode:"edit", group:g }); }}>✏️</button>
                              <button className="btn btn-xs" style={{ background:"#fef3c7", color:"#92400e", border:"none" }} onClick={() => setConfirm({ msg:`أرشفة أسرة "${g.name}"؟`, onYes:()=>archiveGroup(g) })}>📦</button>
                            </>}
                            {!g.active && <button className="btn btn-xs" style={{ background:"#d1fae5", color:"#065f46", border:"none" }} onClick={() => restoreGroup(g)}>↩</button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {groupModal && (
            <Modal title={groupModal.mode==="add" ? "إضافة أسرة" : "تعديل الأسرة"} onClose={() => setGroupModal(null)}
              footer={<><button className="btn btn-ghost" onClick={() => setGroupModal(null)}>إلغاء</button><button className="btn btn-primary" onClick={saveGroup}>حفظ</button></>}>
              <div className="form-group">
                <label className="form-label">اسم الأسرة</label>
                <input className="inp" value={gForm.name} onChange={e => setGForm(p=>({...p,name:e.target.value}))} placeholder="مثال: الصف الخامس - أسرة مارمينا" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">الخادم الرئيسي</label>
                  <input className="inp" value={gForm.mainServant} onChange={e => setGForm(p=>({...p,mainServant:e.target.value}))} placeholder="اسم الخادم الرئيسي" />
                </div>
                <div className="form-group">
                  <label className="form-label">رقم تواصل الخادم</label>
                  <input className="inp" value={gForm.servantContact} onChange={e => setGForm(p=>({...p,servantContact:e.target.value}))} placeholder="رقم الهاتف" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">الخدام المساعدون</label>
                <input className="inp" value={(gForm.assistantServants||[]).join(", ")} onChange={e => setGForm(p=>({...p,assistantServants:e.target.value.split(",").map(s=>s.trim()).filter(Boolean)}))} placeholder="مفصولون بفاصلة" />
              </div>
            </Modal>
          )}
        </div>
      )}

      {/* USERS */}
      {tab==="users" && (
        <div>
          <div className="card">
            <div className="card-header">
              <h3>إدارة المستخدمين والصلاحيات</h3>
              <button className="btn btn-primary btn-sm" onClick={() => { setUForm({ username:"", password:"", name:"", role:"servant", assignedGroups:[] }); setUserModal({ mode:"add" }); }}>+ مستخدم</button>
            </div>
            <div className="card-body">
              <table className="tbl">
                <thead><tr><th>الاسم</th><th>اسم المستخدم</th><th>الدور</th><th>الأسر</th><th>إجراءات</th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight:700 }}>{u.name}</td>
                      <td style={{ fontFamily:"monospace", fontSize:12 }}>{u.username}</td>
                      <td>{u.role==="admin" ? <span className="badge badge-purple">🔴 أدمن</span> : <span className="badge badge-blue">🟢 خادم</span>}</td>
                      <td style={{ maxWidth:200 }}>
                        {u.role==="admin" ? <span className="badge badge-green">الكل</span> : (u.assignedGroups||[]).slice(0,2).map((g,i) => <span key={i} className="badge badge-indigo" style={{ margin:"1px 2px", fontSize:10 }}>{g.split("أسرة").pop()||g}</span>)}
                      </td>
                      <td>
                        <div className="row">
                          <button className="btn btn-ghost btn-xs" onClick={() => { setUForm({ username:u.username, password:"", name:u.name, role:u.role, assignedGroups:u.assignedGroups||[] }); setUserModal({ mode:"edit", user:u }); }}>✏️</button>
                          {u.role!=="admin" && <button className="btn btn-xs" style={{ background:"#fee2e2", color:"#991b1b", border:"none" }} onClick={() => setConfirm({ msg:`حذف "${u.name}"؟`, onYes:()=>deleteUser(u) })}>🗑</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {userModal && (
            <Modal title={userModal.mode==="add" ? "إضافة مستخدم" : "تعديل مستخدم"} onClose={() => setUserModal(null)}
              footer={<><button className="btn btn-ghost" onClick={() => setUserModal(null)}>إلغاء</button><button className="btn btn-primary" onClick={saveUser}>حفظ</button></>}>
              <div className="form-row">
                <div className="form-group"><label className="form-label">الاسم</label><input className="inp" value={uForm.name} onChange={e => setUForm(p=>({...p,name:e.target.value}))} /></div>
                <div className="form-group"><label className="form-label">اسم المستخدم</label><input className="inp" value={uForm.username} onChange={e => setUForm(p=>({...p,username:e.target.value}))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">كلمة المرور {userModal.mode==="edit" && <span style={{ color:"var(--muted)", fontSize:10 }}>(فارغ = لا تغيير)</span>}</label>
                  <input className="inp" type="password" value={uForm.password} onChange={e => setUForm(p=>({...p,password:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">الدور</label>
                  <select className="inp" value={uForm.role} onChange={e => setUForm(p=>({...p,role:e.target.value}))}>
                    <option value="admin">أدمن</option>
                    <option value="servant">خادم</option>
                  </select>
                </div>
              </div>
              {uForm.role==="servant" && (
                <div className="form-group">
                  <label className="form-label">الأسر المخصصة</label>
                  <div style={{ border:"1.5px solid var(--border)", borderRadius:8, padding:10, maxHeight:180, overflowY:"auto" }}>
                    {groups.filter(g=>g.active).map(g => (
                      <label key={g.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 0", cursor:"pointer", fontSize:13 }}>
                        <input type="checkbox" checked={uForm.assignedGroups.includes(g.name)} onChange={e => setUForm(p => ({ ...p, assignedGroups: e.target.checked ? [...p.assignedGroups,g.name] : p.assignedGroups.filter(x=>x!==g.name) }))} />
                        {g.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </Modal>
          )}
        </div>
      )}

      {/* ARCHIVE */}
      {tab==="archived" && (
        <div className="card">
          <div className="card-header"><h3>📦 الأرشيف</h3><span className="badge badge-amber">{members.filter(m=>!m.active).length}</span></div>
          <div className="card-body">
            {!members.filter(m=>!m.active).length
              ? <div className="empty"><div className="ei">📭</div>الأرشيف فارغ</div>
              : <table className="tbl">
                  <thead><tr><th>الاسم</th><th>الأسرة</th><th>تاريخ الأرشفة</th><th>إجراءات</th></tr></thead>
                  <tbody>
                    {members.filter(m=>!m.active).map(m => {
                      const g = groups.find(x => x.id===m.groupId);
                      return (
                        <tr key={m.id}>
                          <td style={{ fontWeight:600, opacity:.7 }}>{m.name}</td>
                          <td><span className="badge badge-gray">{g?.name||"—"}</span></td>
                          <td style={{ fontSize:12, color:"var(--muted)" }}>{m.archivedAt ? new Date(m.archivedAt).toLocaleDateString("ar-EG") : "—"}</td>
                          <td>
                            <div className="row">
                              <button className="btn btn-xs" style={{ background:"#d1fae5", color:"#065f46", border:"none" }} onClick={() => restoreMember(m)}>↩ استعادة</button>
                              <button className="btn btn-xs" style={{ background:"#fee2e2", color:"#991b1b", border:"none" }} onClick={() => setConfirm({ msg:`حذف "${m.name}" نهائياً؟`, onYes:()=>deleteMemberPerm(m) })}>🗑 حذف</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>}
          </div>
        </div>
      )}

      {confirm && <Confirm msg={confirm.msg} onYes={confirm.onYes} onNo={() => setConfirm(null)} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HISTORY PAGE — separate save/export
// ══════════════════════════════════════════════════════════════════════════════
function HistoryPage({ submissions, groups, members, onDelete, onExportOverview }) {
  const [confirm, setConfirm] = useState(null);

  const exportHistoryPDF = () => {
    const rows = [...submissions].reverse().map(sub => {
      const recs = sub.records||[];
      const att = recs.filter(r=>r["حضور الخدمة"]).length;
      return `<tr><td>${sub.date}</td><td>${att}</td>${FIELDS.map(f=>`<td>${recs.filter(r=>r[f.key]).length}</td>`).join("")}</tr>`;
    }).join("");
    const html = `<h2>سجل الأسابيع</h2><table><thead><tr><th>التاريخ</th><th>حضور الخدمة</th>${FIELDS.map(f=>`<th>${f.key}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>`;
    exportPDF("سجل الأسابيع", html);
  };

  return (
    <div>
      <div className="row" style={{ marginBottom:16, gap:10 }}>
        <button className="btn btn-success" onClick={onExportOverview} disabled={!submissions.length}>📊 تصدير Excel شامل</button>
        <button className="btn btn-outline" onClick={exportHistoryPDF} disabled={!submissions.length}>🖨️ تصدير PDF</button>
      </div>
      <div className="card">
        <div className="card-header"><h3>سجل الأسابيع</h3><span className="badge badge-blue">{submissions.length} أسبوع</span></div>
        {!submissions.length
          ? <div className="empty"><div className="ei">📭</div>لا توجد بيانات</div>
          : [...submissions].reverse().map(sub => {
              const recs = sub.records||[];
              const att = recs.filter(r=>r["حضور الخدمة"]).length;
              return (
                <div key={sub.id} className="history-row">
                  <div>
                    <div style={{ fontWeight:800, fontSize:14, color:"var(--text)" }}>{sub.date}</div>
                    <div className="row" style={{ marginTop:4, gap:8 }}>
                      {FIELDS.map(f => <span key={f.key} style={{ fontSize:11, color:f.color, fontWeight:700 }}>{f.icon} {recs.filter(r=>r[f.key]).length}</span>)}
                    </div>
                  </div>
                  <div className="row">
                    <button className="btn btn-outline btn-sm" onClick={() => exportWeeklyExcel(sub, groups, members)}>📥 Excel</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => {
                      const rows = groups.filter(g=>g.active).map(g => {
                        const gm = members.filter(m=>m.groupId===g.id&&m.active);
                        const gRecs = recs.filter(r=>gm.find(m=>m.id===r.memberId));
                        return `<h2>${g.name}</h2><table><thead><tr><th>الاسم</th>${FIELDS.map(f=>`<th>${f.key}</th>`).join("")}</tr></thead><tbody>${gm.map(m=>{const rec=gRecs.find(r=>r.memberId===m.id)||{};return`<tr><td>${m.name}</td>${FIELDS.map(f=>`<td class="${rec[f.key]?"yes":"no"}">${rec[f.key]?"نعم":"لا"}</td>`).join("")}</tr>`;}).join("")}</tbody></table>`;
                      }).join("");
                      exportPDF(`تقرير أسبوع ${sub.date}`, rows);
                    }}>🖨️ PDF</button>
                    <button className="btn btn-xs" style={{ background:"#fee2e2", color:"#991b1b", border:"none" }} onClick={() => setConfirm({ msg:`حذف بيانات أسبوع ${sub.date}؟`, onYes:()=>{ onDelete(sub.id); setConfirm(null); } })}>🗑</button>
                  </div>
                </div>
              );
            })}
      </div>
      {confirm && <Confirm msg={confirm.msg} onYes={confirm.onYes} onNo={() => setConfirm(null)} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EXCEL WORKFLOW PANEL — inlined (replaces external ExcelWorkflowPanel import)
// Handles 3-file Excel import/export as the primary Excel entry point.
// The old single-file "استيراد Excel قديم" button is removed; this panel
// supersedes it while all JSON backup logic is preserved below.
// ══════════════════════════════════════════════════════════════════════════════

// ── Inline session-meta helpers (replaces SessionDataLayer / ExcelImport) ────
const _excelSession = { meta: null };

function _validateExcelFile(file) {
  if (!file) throw new Error("لم يتم اختيار ملف");
  const ext = file.name.split(".").pop().toLowerCase();
  if (!["xlsx","xls"].includes(ext)) throw new Error("يجب أن يكون الملف بصيغة .xlsx أو .xls");
  if (file.size > 10 * 1024 * 1024) throw new Error("حجم الملف كبير جداً (الحد 10 ميجابايت)");
}

async function _readWorkbook(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = ev => {
      try { resolve(XLSX.read(ev.target.result, { type:"array" })); }
      catch(e) { reject(new Error("خطأ في قراءة ملف Excel: " + e.message)); }
    };
    r.onerror = () => reject(new Error("فشل قراءة الملف"));
    r.readAsArrayBuffer(file);
  });
}

async function _loadExcelSession(profilesFile, attendanceFile, bagsFile) {
  // Read all three workbooks
  const [wbProfiles, wbAttendance, wbBags] = await Promise.all([
    _readWorkbook(profilesFile),
    _readWorkbook(attendanceFile),
    _readWorkbook(bagsFile),
  ]);

  // ── 1. Profiles sheet → update/merge members ─────────────────────────────
  const profileSheet = wbProfiles.Sheets[wbProfiles.SheetNames[0]];
  const profileRows  = XLSX.utils.sheet_to_json(profileSheet);
  const currentMembers = ls.get(SK.members, []);
  const currentGroups  = ls.get(SK.groups,  []);

  profileRows.forEach(row => {
    const id   = Number(row["id"] || row["ID"] || 0);
    const name = String(row["الاسم"] || row["الأسم"] || row["name"] || "").trim();
    if (!name) return;
    const idx = currentMembers.findIndex(m => m.id === id || m.name === name);
    if (idx >= 0) {
      // Update existing member fields that are present in the Excel row
      const m = currentMembers[idx];
      if (row["phone"]        !== undefined) m.phone        = String(row["phone"]);
      if (row["familyPhone"]  !== undefined) m.familyPhone  = String(row["familyPhone"]);
      if (row["address"]      !== undefined) m.address      = String(row["address"]);
      if (row["school"]       !== undefined) m.school       = String(row["school"]);
      if (row["notes"]        !== undefined) m.notes        = String(row["notes"]);
      if (row["active"]       !== undefined) m.active       = row["active"] === true || row["active"] === "true" || row["active"] === 1;
      currentMembers[idx] = m;
    }
    // New members not in the system are intentionally skipped to avoid phantom records
  });
  ls.set(SK.members, currentMembers);

  // ── 2. Attendance sheet → merge weekly submissions ────────────────────────
  const currentSubs = ls.get(SK.subs, []);
  let addedSubs = 0;
  wbAttendance.SheetNames.forEach(sheetName => {
    const dateMatch = sheetName.match(/\d{4}-\d{2}-\d{2}/);
    if (!dateMatch) return;
    const dateISO = dateMatch[0];
    if (currentSubs.find(s => s.dateISO === dateISO)) return; // skip duplicate
    const rows = XLSX.utils.sheet_to_json(wbAttendance.Sheets[sheetName]);
    const records = rows.map(row => {
      const memberName = String(row["الأسم"] || row["الاسم"] || row["name"] || "").trim();
      const memberId   = Number(row["memberId"] || row["id"] || 0);
      const member = currentMembers.find(m =>
        (memberId && m.id === memberId) ||
        (memberName && (m.name === memberName || m.name.includes(memberName) || memberName.includes(m.name)))
      );
      if (!member) return null;
      const rec = { memberId: member.id };
      FIELDS.forEach(f => { rec[f.key] = row[f.key] === "نعم" || row[f.key] === true || row[f.key] === 1; });
      return rec;
    }).filter(Boolean);
    if (records.length) {
      currentSubs.push({
        id: Date.now() + addedSubs,
        dateISO,
        date: new Date(dateISO + "T12:00:00").toLocaleDateString("ar-EG"),
        records,
        submittedBy: 1,
        groupIds: [],
      });
      addedSubs++;
    }
  });
  ls.set(SK.subs, currentSubs);

  // ── 3. Bags/Activities sheet → update member activities ──────────────────
  const bagsSheet = wbBags.Sheets[wbBags.SheetNames[0]];
  const bagsRows  = XLSX.utils.sheet_to_json(bagsSheet);
  const updatedMembers = ls.get(SK.members, []);
  bagsRows.forEach(row => {
    const id   = Number(row["id"] || row["ID"] || 0);
    const name = String(row["الاسم"] || row["الأسم"] || row["name"] || "").trim();
    const idx  = updatedMembers.findIndex(m => (id && m.id === id) || (name && m.name === name));
    if (idx < 0) return;
    const activitiesRaw = row["activities"] || row["الأنشطة"] || "";
    if (activitiesRaw) {
      try {
        updatedMembers[idx].activities = typeof activitiesRaw === "string"
          ? JSON.parse(activitiesRaw)
          : activitiesRaw;
      } catch { /* keep existing */ }
    }
    if (row["brotherOfLord"] !== undefined)
      updatedMembers[idx].brotherOfLord = row["brotherOfLord"] === true || row["brotherOfLord"] === 1 || row["brotherOfLord"] === "true";
  });
  ls.set(SK.members, updatedMembers);

  // ── Save session meta ────────────────────────────────────────────────────
  const meta = {
    loaded: true,
    loadedAt: new Date().toISOString(),
    profilesName:  profilesFile.name,
    attendanceName: attendanceFile.name,
    bagsName:       bagsFile.name,
    addedSubs,
  };
  _excelSession.meta = meta;
  ls.set("church_excel_session_meta", meta);

  return { addedSubs, membersUpdated: profileRows.length };
}

function _exportExcelSession(groups, members, subs, activities) {
  const today = new Date().toISOString().slice(0,10);

  // ── File 1: Profiles ──────────────────────────────────────────────────────
  const profilesWb = XLSX.utils.book_new();
  const profileRows = members.map(m => ({
    id:           m.id,
    "الاسم":      m.name,
    groupId:      m.groupId,
    active:       m.active,
    phone:        m.phone || "",
    familyPhone:  m.familyPhone || "",
    address:      m.address || "",
    school:       m.school || "",
    brotherOfLord:m.brotherOfLord || false,
    notes:        m.notes || "",
    joinedAt:     m.joinedAt || "",
  }));
  XLSX.utils.book_append_sheet(profilesWb, XLSX.utils.json_to_sheet(profileRows), "profiles");
  XLSX.writeFile(profilesWb, `profiles_${today}.xlsx`);

  // ── File 2: Attendance ────────────────────────────────────────────────────
  const attendanceWb = XLSX.utils.book_new();
  subs.forEach(sub => {
    const rows = (sub.records||[]).map(rec => {
      const member = members.find(m => m.id === rec.memberId);
      const row = { memberId: rec.memberId, "الأسم": member?.name || "" };
      FIELDS.forEach(f => { row[f.key] = rec[f.key] ? "نعم" : "لا"; });
      return row;
    });
    const sheetName = (sub.dateISO || sub.date || `sub_${sub.id}`).substring(0,31);
    XLSX.utils.book_append_sheet(attendanceWb, XLSX.utils.json_to_sheet(rows), sheetName);
  });
  if (!subs.length) XLSX.utils.book_append_sheet(attendanceWb, XLSX.utils.json_to_sheet([]), "empty");
  XLSX.writeFile(attendanceWb, `attendance_${today}.xlsx`);

  // ── File 3: Bags / Activities ─────────────────────────────────────────────
  const bagsWb = XLSX.utils.book_new();
  const bagsRows = members.map(m => ({
    id:           m.id,
    "الاسم":      m.name,
    groupId:      m.groupId,
    activities:   JSON.stringify(m.activities||[]),
    brotherOfLord:m.brotherOfLord||false,
  }));
  XLSX.utils.book_append_sheet(bagsWb, XLSX.utils.json_to_sheet(bagsRows), "bags");
  XLSX.writeFile(bagsWb, `bags_${today}.xlsx`);
}

function _getSessionMeta() {
  if (_excelSession.meta) return _excelSession.meta;
  return ls.get("church_excel_session_meta", { loaded:false });
}
function _clearSessionMeta() {
  _excelSession.meta = null;
  ls.set("church_excel_session_meta", { loaded:false });
}

// ── ExcelWorkflowPanel (inlined) ─────────────────────────────────────────────
const _ewpStyles = {
  panel:       { border:"2px solid #6366f1", borderRadius:12, marginBottom:20, background:"var(--card)", overflow:"hidden" },
  header:      { padding:"12px 18px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center", background:"var(--card2)" },
  body:        { padding:18 },
  fileRow:     { display:"flex", alignItems:"center", gap:10, marginBottom:12, padding:"10px 14px", border:"1.5px dashed var(--border)", borderRadius:8, background:"var(--bg)", flexWrap:"wrap" },
  fileRowOk:   { borderColor:"#10b981", background:"#f0fdf4" },
  fileLabel:   { fontSize:13, fontWeight:700, minWidth:160, color:"var(--text)" },
  fileName:    { fontSize:12, color:"#6b7280", flex:1 },
  sessionBadge:{ padding:"4px 12px", borderRadius:20, background:"#d1fae5", color:"#065f46", fontSize:12, fontWeight:700 },
};

function ExcelWorkflowPanel({ onDataLoaded }) {
  const [files,  setFiles]  = useState({ profiles:null, attendance:null, bags:null });
  const [status, setStatus] = useState(null);
  const profilesRef   = useRef();
  const attendanceRef = useRef();
  const bagsRef       = useRef();

  const sessionMeta = _getSessionMeta();

  const setFile = (key, file) => {
    try {
      if (file) _validateExcelFile(file);
      setFiles(p => ({ ...p, [key]: file||null }));
      setStatus(null);
    } catch(e) {
      setStatus({ type:"error", msg:e.message });
    }
  };

  const allReady = files.profiles && files.attendance && files.bags;

  const handleLoad = async () => {
    if (!allReady) return;
    setStatus({ type:"loading", msg:"⏳ جارٍ تحميل الملفات والتحقق من البنية..." });
    try {
      const result = await _loadExcelSession(files.profiles, files.attendance, files.bags);
      setStatus({ type:"success", msg:`✅ تم تحميل البيانات — ${result.addedSubs} أسبوع جديد، ${result.membersUpdated} عضو محدَّث` });
      if (onDataLoaded) onDataLoaded(result);
    } catch(e) {
      setStatus({ type:"error", msg:`❌ خطأ: ${e.message}` });
    }
  };

  const handleExport = () => {
    try {
      const groups   = ls.get(SK.groups,     []);
      const members  = ls.get(SK.members,    []);
      const subs     = ls.get(SK.subs,       []);
      const activities = ls.get(SK.activities, []);
      _exportExcelSession(groups, members, subs, activities);
      setStatus({ type:"success", msg:"✅ تم تصدير الملفات الثلاثة بنجاح" });
    } catch(e) {
      setStatus({ type:"error", msg:`❌ فشل التصدير: ${e.message}` });
    }
  };

  const handleClear = () => {
    setFiles({ profiles:null, attendance:null, bags:null });
    _clearSessionMeta();
    setStatus(null);
    if (profilesRef.current)   profilesRef.current.value   = "";
    if (attendanceRef.current) attendanceRef.current.value = "";
    if (bagsRef.current)       bagsRef.current.value       = "";
  };

  const FileRow = ({ label, desc, fileKey, inputRef }) => {
    const f = files[fileKey];
    return (
      <div style={{ ..._ewpStyles.fileRow, ...(f ? _ewpStyles.fileRowOk : {}) }}>
        <span style={_ewpStyles.fileLabel}>{label}</span>
        <span style={_ewpStyles.fileName}>{f ? `📄 ${f.name}` : desc}</span>
        <label className="btn btn-ghost btn-sm" style={{ cursor:"pointer", marginRight:"auto" }}>
          {f ? "🔄 تغيير" : "📂 اختر"}
          <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display:"none" }}
            onChange={e => setFile(fileKey, e.target.files[0]||null)} />
        </label>
        {f && (
          <button className="btn btn-xs" style={{ background:"#fee2e2", color:"#991b1b", border:"none" }}
            onClick={() => { setFile(fileKey, null); if (inputRef.current) inputRef.current.value=""; }}>✕</button>
        )}
      </div>
    );
  };

  const alertBg   = { success:"#d1fae5", error:"#fee2e2", loading:"#dbeafe" };
  const alertClr  = { success:"#065f46", error:"#991b1b", loading:"#1e40af" };

  return (
    <div style={_ewpStyles.panel}>
      <div style={_ewpStyles.header}>
        <span style={{ fontWeight:800, fontSize:14, color:"var(--text)" }}>📊 استيراد / تصدير بيانات Excel (3 ملفات)</span>
        {sessionMeta.loaded && (
          <span style={_ewpStyles.sessionBadge}>✅ جلسة نشطة — {new Date(sessionMeta.loadedAt).toLocaleDateString("ar-EG")}</span>
        )}
      </div>
      <div style={_ewpStyles.body}>
        <div style={{ fontSize:12, color:"var(--muted)", marginBottom:14, lineHeight:1.7 }}>
          ارفع الملفات الثلاثة المُصدَّرة من هذا النظام. كل ملف له بنية ثابتة — لا تعديل على أسماء الأعمدة. الملفات المُصدَّرة قابلة للاستيراد مجدداً بدون فقدان بيانات.
        </div>
        <FileRow label="1️⃣  ملف الملفات الشخصية"   desc="profiles_YYYY-MM-DD.xlsx"   fileKey="profiles"   inputRef={profilesRef}   />
        <FileRow label="2️⃣  ملف بيانات الحضور"      desc="attendance_YYYY-MM-DD.xlsx" fileKey="attendance" inputRef={attendanceRef} />
        <FileRow label="3️⃣  ملف الأنشطة والحقائب"   desc="bags_YYYY-MM-DD.xlsx"       fileKey="bags"       inputRef={bagsRef}       />

        {status && (
          <div style={{ padding:"9px 14px", borderRadius:8, marginBottom:14, fontSize:13, fontWeight:600,
            background:alertBg[status.type]||"#f3f4f6", color:alertClr[status.type]||"#374151" }}>
            {status.msg}
          </div>
        )}

        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <button className="btn btn-primary" disabled={!allReady || status?.type==="loading"} onClick={handleLoad}>
            {status?.type==="loading" ? "⏳ جارٍ التحميل..." : "⬆️ تحميل ودمج البيانات"}
          </button>
          <button className="btn btn-success" onClick={handleExport}>⬇️ تصدير الملفات الثلاثة المحدَّثة</button>
          {(sessionMeta.loaded || files.profiles) && (
            <button className="btn btn-ghost btn-sm" onClick={handleClear}>🗑 مسح الجلسة</button>
          )}
        </div>

        {sessionMeta.loaded && (
          <div style={{ marginTop:14, padding:"10px 14px", background:"var(--card2)", borderRadius:8, fontSize:12, color:"var(--muted)", lineHeight:1.8 }}>
            <b style={{ color:"var(--text)" }}>الجلسة الحالية:</b><br />
            الملفات الشخصية: {sessionMeta.profilesName}<br />
            بيانات الحضور: {sessionMeta.attendanceName}<br />
            الأنشطة: {sessionMeta.bagsName}
          </div>
        )}

        <div style={{ marginTop:14, padding:"10px 14px", background:"#fef3c7", borderRadius:8, fontSize:12, color:"#92400e" }}>
          💡 <b>تلميح:</b> لإنشاء الملفات لأول مرة، اضغط على "تصدير الملفات الثلاثة المحدَّثة" — سيتم تصدير بيانات النظام الحالية كنقطة بداية.
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BACKUPS PAGE
// ══════════════════════════════════════════════════════════════════════════════
function BackupsPage({ onUpdate }) {
  const [backups, setBackups] = useState(() => ls.get(SK.backups, []));
  const [flash,   setFlash]   = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [importPreview, setImportPreview] = useState(null);

  const refresh  = () => setBackups(ls.get(SK.backups, []));
  const showFlash = (type, msg) => { setFlash({ type, msg }); setTimeout(() => setFlash(null), 3000); };

  const doBackup = () => { createBackup(); refresh(); showFlash("success", "✅ تم إنشاء نسخة احتياطية"); };

  const doRestore = (snap) => {
    restoreBackup(snap); showFlash("success", "✅ تم الاستعادة. جاري إعادة التحميل...");
    setConfirm(null); setTimeout(() => window.location.reload(), 1800);
  };

  const exportBackup = (snap) => {
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type:"application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `backup_${snap.ts.slice(0,10)}.json`; a.click();
  };

  const importJSON = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => {
      try {
        const snap = JSON.parse(ev.target.result);
        if (!snap.groups || !snap.members || !snap.subs) return showFlash("error", "ملف غير صالح");
        setImportPreview(snap);
      } catch { showFlash("error", "خطأ في قراءة الملف"); }
    };
    r.readAsText(file); e.target.value = "";
  };

  // Called by ExcelWorkflowPanel after a successful 3-file load
  const handleExcelDataLoaded = (result) => {
    if (onUpdate) onUpdate();
    showFlash("success", `✅ تم دمج بيانات Excel — ${result.addedSubs} أسبوع جديد`);
  };

  return (
    <div>
      {flash && <Alert type={flash.type}>{flash.msg}</Alert>}

      {/* ── Excel 3-file workflow (primary entry point) ── */}
      <ExcelWorkflowPanel onDataLoaded={handleExcelDataLoaded} />

      {/* ── JSON backup controls ── */}
      <div className="row" style={{ marginBottom:16, gap:10 }}>
        <button className="btn btn-primary" onClick={doBackup}>💾 نسخة احتياطية الآن</button>
        <label className="btn btn-ghost" style={{ cursor:"pointer" }}>
          📂 استيراد JSON
          <input type="file" accept=".json" style={{ display:"none" }} onChange={importJSON} />
        </label>
      </div>

      {importPreview && (
        <div className="card" style={{ marginBottom:16, border:"2px solid var(--amber)" }}>
          <div className="card-header">
            <h3>📋 معاينة استيراد JSON</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setImportPreview(null)}>✕</button>
          </div>
          <div className="card-body">
            <p style={{ marginBottom:10, fontSize:13 }}>نسخة احتياطية بتاريخ: <b>{new Date(importPreview.ts||Date.now()).toLocaleString("ar-EG")}</b></p>
            <div className="row" style={{ gap:8, marginBottom:14 }}>
              <span className="badge badge-blue">{(importPreview.groups||[]).length} أسرة</span>
              <span className="badge badge-green">{(importPreview.members||[]).length} عضو</span>
              <span className="badge badge-indigo">{(importPreview.subs||[]).length} أسبوع</span>
            </div>
            <Alert type="warn">⚠️ سيتم استبدال جميع البيانات الحالية</Alert>
            <div className="row">
              <button className="btn btn-danger" onClick={() => setConfirm({ msg:"استعادة من هذا الملف؟ ستُستبدل جميع البيانات.", onYes:()=>doRestore(importPreview) })}>↩ استعادة</button>
              <button className="btn btn-ghost" onClick={() => setImportPreview(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header"><h3>النسخ الاحتياطية</h3><span className="badge badge-indigo">{backups.length}/10</span></div>
        {!backups.length
          ? <div className="empty"><div className="ei">💾</div>لا توجد نسخ</div>
          : backups.map((b, i) => (
            <div key={i} className="history-row">
              <div>
                <div style={{ fontWeight:700, fontSize:13 }}>{new Date(b.ts).toLocaleString("ar-EG")}</div>
                <div className="row" style={{ marginTop:4, gap:6 }}>
                  <span className="badge badge-blue">{(b.groups||[]).length} أسرة</span>
                  <span className="badge badge-green">{(b.members||[]).length} عضو</span>
                  <span className="badge badge-indigo">{(b.subs||[]).length} أسبوع</span>
                </div>
              </div>
              <div className="row">
                <button className="btn btn-ghost btn-sm" onClick={() => exportBackup(b)}>⬇ تحميل</button>
                <button className="btn btn-amber btn-sm" onClick={() => setConfirm({ msg:`استعادة النسخة: ${new Date(b.ts).toLocaleString("ar-EG")}؟`, onYes:()=>doRestore(b) })}>↩ استعادة</button>
              </div>
            </div>
          ))}
      </div>
      {confirm && <Confirm msg={confirm.msg} onYes={confirm.onYes} onNo={() => setConfirm(null)} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function DashboardPage({ submissions, groups, members }) {
  const [groupFilter, setGroupFilter] = useState("all");

  const exportDashPDF = () => {
    const latest = submissions[submissions.length-1];
    if (!latest) return;
    const recs = latest.records||[];
    const rows = FIELDS.map(f => `<tr><td>${f.icon} ${f.key}</td><td>${recs.filter(r=>r[f.key]).length}</td><td>${members.filter(m=>m.active).length ? Math.round(recs.filter(r=>r[f.key]).length/members.filter(m=>m.active).length*100) : 0}%</td></tr>`).join("");
    const html = `<h2>لوحة الإحصائيات - آخر أسبوع: ${latest.date}</h2><table><thead><tr><th>المؤشر</th><th>العدد</th><th>النسبة</th></tr></thead><tbody>${rows}</tbody></table>`;
    exportPDF("لوحة الإحصائيات", html);
  };

  if (!submissions.length) return <div className="empty"><div className="ei">📊</div>أدخل بيانات أسبوعية لتظهر الإحصائيات</div>;

  const activeMembers = members.filter(m => m.active);
  const filtered = (gid) => gid==="all" ? activeMembers : activeMembers.filter(m => m.groupId===Number(gid));

  const weeklyData = submissions.map(sub => {
    const ms = filtered(groupFilter);
    const recs = (sub.records||[]).filter(r => ms.find(m => m.id===r.memberId));
    const obj = { date: sub.date, total: ms.length };
    FIELDS.forEach(f => {
      obj[f.key] = recs.filter(r => r[f.key]).length;
      obj[`${f.key}%`] = ms.length ? Math.round((obj[f.key]/ms.length)*100) : 0;
    });
    return obj;
  });

  const latest = weeklyData[weeklyData.length-1]||{};
  const prev   = weeklyData[weeklyData.length-2];
  const trend  = k => { if (!prev||!latest) return null; const d=(latest[`${k}%`]||0)-(prev[`${k}%`]||0); return d>0?{sign:"▲",val:d,up:true}:d<0?{sign:"▼",val:Math.abs(d),up:false}:null; };

  const groupComp = groups.filter(g=>g.active).map(g => {
    const sub = submissions[submissions.length-1];
    const gm = activeMembers.filter(m => m.groupId===g.id);
    const recs = (sub.records||[]).filter(r => gm.find(m=>m.id===r.memberId));
    return { name: g.name.split("أسرة").pop()?.trim()||g.name, ...Object.fromEntries(FIELDS.map(f=>[f.key, recs.filter(r=>r[f.key]).length])), total:gm.length };
  });

  const radarData = FIELDS.map(f => ({ field: f.key, value: latest[`${f.key}%`]||0 }));

  const pieData = FIELDS.map(f => ({ name: f.key, value: latest[f.key]||0, color: f.color }));

  return (
    <div>
      <div className="row" style={{ marginBottom:16, gap:10 }}>
        <select className="inp inp-sm" style={{ maxWidth:240 }} value={groupFilter} onChange={e => setGroupFilter(e.target.value)}>
          <option value="all">جميع الأسر</option>
          {groups.filter(g=>g.active).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={exportDashPDF}>🖨️ تصدير PDF</button>
      </div>

      <div className="kpi-grid">
        {FIELDS.map(f => {
          const t = trend(f.key);
          return (
            <div key={f.key} className="kpi-card" style={{ borderTop:`3px solid ${f.color}` }}>
              <div className="kpi-lbl"><span className="chip-dot" style={{ background:f.color }} />{f.key}</div>
              <div className="kpi-val" style={{ color:f.color }}>{latest[f.key]||0}</div>
              <div className="kpi-sub">
                {latest[`${f.key}%`]||0}%
                {t && <span style={{ marginRight:6, color:t.up?"#10b981":"#ef4444", fontWeight:700 }}>{t.sign}{t.val}%</span>}
              </div>
              <ProgBar pct={latest[`${f.key}%`]||0} color={f.color} />
            </div>
          );
        })}
      </div>

      <div className="chart-grid">
        <div className="card chart-full">
          <div className="card-body">
            <div className="chart-ttl">📈 تطور المؤشرات الأسبوعية</div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={weeklyData} margin={{ top:5, right:5, bottom:5, left:-10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F2E8E4" />
                <XAxis dataKey="date" tick={{ fontSize:10, fontFamily:"Cairo", fill:"#6B7280" }} />
                <YAxis tick={{ fontSize:10, fill:"#6B7280" }} />
                <Tooltip contentStyle={{ background:"#ffffff", borderColor:"#F2E8E4", borderRadius:10, fontFamily:"Cairo", fontSize:12, direction:"rtl", boxShadow:"0 4px 16px rgba(0,0,0,.08)" }} />
                <Legend wrapperStyle={{ fontFamily:"Cairo", fontSize:12, paddingTop:8 }} />
                {FIELDS.map(f => <Line key={f.key} type="monotone" dataKey={f.key} stroke={f.color} strokeWidth={2.5} dot={{ r:4, fill:f.color }} name={f.key} />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="chart-ttl">📊 مقارنة الأسر (آخر أسبوع)</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={groupComp} margin={{ top:5, right:5, bottom:32, left:-15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F2E8E4" />
                <XAxis dataKey="name" tick={{ fontSize:9, fontFamily:"Cairo", fill:"#6B7280" }} angle={-20} textAnchor="end" />
                <YAxis tick={{ fontSize:10, fill:"#6B7280" }} />
                <Tooltip contentStyle={{ background:"#ffffff", borderColor:"#F2E8E4", borderRadius:10, fontFamily:"Cairo", fontSize:12, direction:"rtl", boxShadow:"0 4px 16px rgba(0,0,0,.08)" }} />
                <Bar dataKey="حضور الخدمة" fill="#E73F1E" radius={[4,4,0,0]} />
                <Bar dataKey="حضور القداس" fill="#FB6C00" radius={[4,4,0,0]} />
                <Bar dataKey="خدمة القداس" fill="#FF8F00" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="chart-ttl">🕸 صورة شاملة (آخر أسبوع)</div>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#F2E8E4" />
                <PolarAngleAxis dataKey="field" tick={{ fontSize:10, fontFamily:"Cairo", fill:"#374151" }} />
                <PolarRadiusAxis angle={90} domain={[0,100]} tick={{ fontSize:9 }} />
                <Radar dataKey="value" stroke="#E73F1E" fill="#FB6C00" fillOpacity={0.35} />
                <Tooltip contentStyle={{ background:"#ffffff", borderColor:"#F2E8E4", borderRadius:10, fontFamily:"Cairo", fontSize:12, boxShadow:"0 4px 16px rgba(0,0,0,.08)" }} formatter={v=>[`${v}%`]} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="chart-ttl">🥧 توزيع الأنشطة (آخر أسبوع)</div>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, value }) => `${value}`}>
                  {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ fontFamily:"Cairo", fontSize:12, direction:"rtl" }} />
                <Legend wrapperStyle={{ fontFamily:"Cairo", fontSize:11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// APP SHELL
// ══════════════════════════════════════════════════════════════════════════════
const NAV = [
  { section: "الخدمة" },
  { id: "dashboard",  label: "لوحة الإحصائيات",   icon: "📊", permission: "view_family_stats" },
  { id: "entry",      label: "إدخال البيانات",    icon: "✏️",  permission: "attendance_access" },
  { id: "history",    label: "سجل الأسابيع والتصدير", icon: "📋", permission: "reports_access" },
  { section: "الإدارة" },
  { id: "members",    label: "إدارة الأعضاء",     icon: "👥", permission: "view_family_members" },
  { id: "activities", label: "الأنشطة",            icon: "🎯", permission: "view_family_members" },
  { id: "users",      label: "إدارة الحسابات",    icon: "🔐", permission: "user_management" },
  { id: "backups",    label: "النسخ الاحتياطية",  icon: "💾", permission: "settings_access" },
];

const PAGE_TITLES = {
  entry:"إدخال البيانات الأسبوعية", dashboard:"لوحة الإحصائيات",
  history:"سجل الأسابيع والتصدير", members:"إدارة الأعضاء",
  activities:"إدارة الأنشطة", users:"إدارة الحسابات والصلاحيات",
  backups:"النسخ الاحتياطية", profile:"ملف العضو"
};

// Logo: embed the uploaded image as a data URL placeholder
const LOGO_URL = "/mnt/user-data/uploads/Asset_1لوجو_اولاد.png";

export default function App() {
  const [user, setUser] = useState(() => authService.getCurrentSession());
  const [page, setPage] = useState("dashboard");
  const [groups,  setGroups]  = useState([]);
  const [members, setMembers] = useState([]);
  const [subs,    setSubs]    = useState([]);
  const [activities, setActivities] = useState([]);
  const [dark,    setDark]    = useState(() => ls.get(SK.darkMode, false));
  const [profileMember, setProfileMember] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const reload = useCallback(() => {
    setGroups(ls.get(SK.groups, []));
    setMembers(ls.get(SK.members, []));
    setSubs(ls.get(SK.subs, []));
    setActivities(ls.get(SK.activities, DEFAULT_ACTIVITIES));
  }, []);

  useEffect(() => { initStore(); reload(); }, []);
  useEffect(() => { ls.set(SK.darkMode, dark); }, [dark]);

  const handleLogin  = (u) => { setUser(u); setPage("dashboard"); reload(); };
  const handleLogout = () => { authService.logout(); setUser(null); };

  const handleSave = (sub, isEdit) => {
    const all = ls.get(SK.subs, []);
    const updated = isEdit ? all.map(s => s.id===sub.id ? sub : s) : [...all, sub];
    ls.set(SK.subs, updated); setSubs(updated);
  };

  const handleDelete = (id) => {
    const updated = subs.filter(s => s.id!==id);
    ls.set(SK.subs, updated); setSubs(updated);
  };

  const handleViewProfile = (member) => { setProfileMember(member); setPage("profile"); setMobileNavOpen(false); };
  const handleBackFromProfile = () => { setProfileMember(null); setPage("members"); };

  const CSS = buildCSS(dark);

  if (!user) return (<><style>{CSS}</style><LoginPage onLogin={handleLogin} logoUrl={LOGO_URL} /></>);

  // Filter Data per Family Account scoping
  const scopedGroups = filterGroupsForUser(user, groups);
  const scopedMembers = filterMembersForUser(user, members, groups);
  const scopedSubs = filterSubmissionsForUser(user, subs, members, groups);

  // Filter Navigation based on permissions
  const visibleNav = NAV.filter(n => !n.id || hasPermission(user, n.permission));

  const checkAccess = (perm) => hasPermission(user, perm);

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        {/* MOBILE OVERLAY */}
        <div className={`sb-overlay ${mobileNavOpen ? "open" : ""}`} onClick={() => setMobileNavOpen(false)} />

        {/* SIDEBAR */}
        <nav className={`sb ${mobileNavOpen ? "open" : ""}`}>
          <div className="sb-logo">
            <img src={LOGO_URL} alt="logo" className="sb-logo-img" onError={e => e.target.style.display="none"} />
            <h1>{APP_NAME}</h1>
            <p>{APP_SUBTITLE}</p>
          </div>
          <div className="sb-user">
            <div className="sb-avatar">{user.name ? user.name[0] : "👤"}</div>
            <div>
              <div className="sb-uname">{user.name}</div>
              <div className="sb-urole">{user.role==="admin" ? "🔴 مدير النظام" : "🟢 حساب الأسرة"}</div>
            </div>
          </div>
          <div className="sb-nav">
            {visibleNav.map((n, i) =>
              n.section
                ? <div key={i} className="sb-section">{n.section}</div>
                : <div key={n.id} className={`nav-item ${page===n.id?"active":""}`} onClick={() => { setPage(n.id); setProfileMember(null); setMobileNavOpen(false); }}>
                    <span className="nav-icon">{n.icon}</span>{n.label}
                  </div>
            )}
          </div>
          <div className="sb-footer">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <div className="sb-stat">أسابيع: <b style={{ color:"#E73F1E" }}>{scopedSubs.length}</b></div>
              <button className="dark-toggle" onClick={() => setDark(d => !d)}>{dark ? "☀️" : "🌙"}</button>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ color:"#D84315", borderColor:"#F2E8E4", fontSize:11, width:"100%", justifyContent:"center", fontWeight:800 }} onClick={handleLogout}>تسجيل الخروج</button>
          </div>
        </nav>

        {/* MAIN */}
        <main className="main">
          <div className="topbar">
            <div style={{ display: "flex", alignItems: "center" }}>
              <button className="mobile-nav-toggle" onClick={() => setMobileNavOpen(o => !o)} title="القائمة">☰</button>
              <h2>{PAGE_TITLES[page]}{profileMember && page==="profile" ? `: ${profileMember.name}` : ""}</h2>
            </div>
            <div className="topbar-right">
              <div className="date-chip">{new Date().toLocaleDateString("ar-EG",{ weekday:"long", year:"numeric", month:"long", day:"numeric" })}</div>
              <TopbarAuth currentUser={user} onLoginClick={() => setUser(null)} onLogoutClick={handleLogout} />
            </div>
          </div>
          <div className="content">
            {page==="entry"      && (checkAccess("attendance_access") ? <DataEntryPage currentUser={user} groups={scopedGroups} members={scopedMembers} submissions={scopedSubs} onSave={handleSave} /> : <AccessDeniedPage onGoHome={() => setPage("dashboard")} />)}
            {page==="dashboard"  && (checkAccess("view_family_stats") ? <DashboardPage submissions={scopedSubs} groups={scopedGroups} members={scopedMembers} /> : <AccessDeniedPage onGoHome={() => setPage("entry")} />)}
            {page==="history"    && (checkAccess("reports_access") ? <HistoryPage submissions={scopedSubs} groups={scopedGroups} members={scopedMembers} onDelete={handleDelete} onExportOverview={() => exportOverviewExcel(scopedSubs,scopedGroups,scopedMembers)} /> : <AccessDeniedPage onGoHome={() => setPage("dashboard")} />)}
            {page==="members"    && (checkAccess("view_family_members") ? <ManagementPage groups={scopedGroups} members={scopedMembers} activities={activities} submissions={scopedSubs} onUpdate={reload} onViewProfile={handleViewProfile} /> : <AccessDeniedPage onGoHome={() => setPage("dashboard")} />)}
            {page==="activities" && (checkAccess("view_family_members") ? <ActivitiesPage activities={activities} members={scopedMembers} onUpdate={reload} /> : <AccessDeniedPage onGoHome={() => setPage("dashboard")} />)}
            {page==="users"      && (checkAccess("user_management") ? <UserManagementPage groups={groups} onUpdate={reload} /> : <AccessDeniedPage onGoHome={() => setPage("dashboard")} />)}
            {page==="backups"    && (checkAccess("settings_access") ? <BackupsPage onUpdate={reload} /> : <AccessDeniedPage onGoHome={() => setPage("dashboard")} />)}
            {page==="profile"    && profileMember && (checkAccess("view_member_profiles") ? (
              <MemberProfilePage
                currentUser={user}
                member={profileMember}
                groups={scopedGroups}
                members={scopedMembers}
                submissions={scopedSubs}
                activities={activities}
                onBack={handleBackFromProfile}
                onUpdate={reload}
              />
            ) : <AccessDeniedPage onGoHome={() => setPage("members")} />)}
          </div>
        </main>
      </div>
    </>
  );
}
