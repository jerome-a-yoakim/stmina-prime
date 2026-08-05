import { FieldDefinition, VisitationReadonlyField } from "../types/dashboard-types";

export const APP_NAME = "stMINA PRIME SERVICES";
export const APP_SUBTITLE = "خدمة إبتدائي بنين بكنيسة الشهيد العظيم مارمينا ببورسعيد";

export const FIELDS: FieldDefinition[] = [
  { key: "حضور الخدمة", icon: "⛪", color: "#E73F1E" },
  { key: "حضور القداس", icon: "🕊", color: "#FB6C00" },
  { key: "خدمة القداس", icon: "✝️", color: "#FF8F00" },
  { key: "الأعتراف", icon: "📿", color: "#FBC02D" },
  { key: "الأفتقاد التيليفوني", icon: "📞", color: "#D84315" },
  { key: "الأفتقاد المنزلي", icon: "🏠", color: "#E65100" },
];

export const ATTENDANCE_FIELDS = FIELDS.slice(0, 4);

export const VISITATION_READONLY_FIELDS: VisitationReadonlyField[] = [
  { ...FIELDS[4], label: "الافتقاد التليفوني", typeCode: "phone" },
  { ...FIELDS[5], label: "الافتقاد المنزلي", typeCode: "home" },
];

export const buildCSS = (dark: boolean): string => `
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

/* DESIGN SYSTEM OVERRIDES — presentation only */
:root{
  color-scheme:${dark ? "dark" : "light"};
  --ds-primary:${dark ? "#C9506C" : "#8B1538"};
  --ds-primary-hover:${dark ? "#D8647D" : "#71102D"};
  --ds-primary-tint:${dark ? "rgba(201,80,108,.14)" : "rgba(139,21,56,.08)"};
  --ds-secondary:${dark ? "#8B4A5A" : "#5C2A3A"};
  --ds-accent:${dark ? "#D9BB6E" : "#C9A646"};
  --ds-background:${dark ? "#17151A" : "#FAFAF7"};
  --ds-surface:${dark ? "#1E1B21" : "#F3EFE8"};
  --ds-card:${dark ? "#242026" : "#FFFFFF"};
  --ds-border:${dark ? "#3A343B" : "#EAE4D9"};
  --ds-divider:${dark ? "#2F2A30" : "#F0EBE3"};
  --ds-success:${dark ? "#6FA97E" : "#4C8A5A"};
  --ds-warning:${dark ? "#D9A64F" : "#C98A2E"};
  --ds-danger:${dark ? "#C97070" : "#A34B4B"};
  --ds-info:${dark ? "#7096B5" : "#4A6E8B"};
  --ds-text:${dark ? "#F2EFEA" : "#2A2420"};
  --ds-text-secondary:${dark ? "#C9C2BA" : "#6B5F55"};
  --ds-text-muted:${dark ? "#8A8380" : "#9A8F84"};
  --ds-shadow-subtle:${dark ? "0 1px 2px rgba(0,0,0,.12)" : "0 1px 2px rgba(42,36,32,.04)"};
  --ds-shadow-medium:${dark ? "0 8px 24px rgba(0,0,0,.16)" : "0 8px 24px rgba(42,36,32,.06)"};
  --ds-shadow-floating:${dark ? "0 16px 40px rgba(0,0,0,.24)" : "0 16px 40px rgba(42,36,32,.08)"};
  --primary:var(--ds-primary);--primary-d:var(--ds-primary-hover);--primary-bg:var(--ds-primary-tint);
  --secondary:var(--ds-secondary);--interactive:var(--ds-accent);--highlight:var(--ds-accent);
  --indigo:var(--ds-primary);--indigo-d:var(--ds-primary-hover);--indigo-bg:var(--ds-primary-tint);
  --sky:var(--ds-info);--emerald:var(--ds-success);--amber:var(--ds-warning);--rose:var(--ds-danger);--purple:var(--ds-accent);
  --sidebar:var(--ds-card);--sidebar2:var(--ds-surface);--border:var(--ds-border);--bg:var(--ds-background);
  --text:var(--ds-text);--muted:var(--ds-text-secondary);--card:var(--ds-card);--card2:var(--ds-surface);
}

html,body,.app{background:var(--ds-background);color:var(--ds-text);font-family:'Alexandria',sans-serif}
body,input,select,button,textarea{font-family:'Alexandria',sans-serif}
.app{font-size:15px;line-height:1.7;text-align:start}

.sb{
  width:256px;background:var(--ds-card);border-left:1px solid var(--ds-border);
  box-shadow:none;transition:transform 240ms ease-out
}
.sb-logo{padding:24px;border-bottom:1px solid var(--ds-divider);background:var(--ds-card)}
.sb-logo-img{width:48px;height:48px;border-radius:14px;box-shadow:var(--ds-shadow-subtle)}
.sb-logo h1{color:var(--ds-text);font-size:16px;font-weight:500;line-height:1.45}
.sb-logo p{color:var(--ds-text-secondary);font-size:12px;font-weight:400;line-height:1.6}
.sb-user{padding:16px 24px;border-bottom:1px solid var(--ds-divider);background:var(--ds-card)}
.sb-user:hover{background:var(--ds-surface)}
.sb-avatar{width:40px;height:40px;background:var(--ds-primary);font-weight:500;box-shadow:none}
.sb-uname{color:var(--ds-text);font-size:13px;font-weight:500}
.sb-urole{color:var(--ds-text-muted);font-size:12px;font-weight:400}
.sb-nav{padding:16px 8px;background:var(--ds-card)}
.sb-section{padding:24px 16px 8px;color:var(--ds-text-muted);font-size:12px;font-weight:500;letter-spacing:.3px}
.nav-item{
  position:relative;min-height:44px;margin:2px 0;padding:12px 16px;border:0;border-radius:14px;
  color:var(--ds-text-secondary);font-size:13px;font-weight:500;transition:background 150ms ease-out,color 150ms ease-out
}
.nav-item::before{position:absolute;inset-block:10px;inset-inline-start:-8px;width:3px;border-radius:999px;background:transparent;content:''}
.nav-item:hover{background:var(--ds-surface);color:var(--ds-text)}
.nav-item.active{background:var(--ds-primary-tint);color:var(--ds-primary);font-weight:500}
.nav-item.active::before{background:var(--ds-accent)}
.nav-icon{width:24px;font-size:18px}
.sb-footer{padding:16px 24px;border-top:1px solid var(--ds-divider);background:var(--ds-card)}
.sb-stat{color:var(--ds-text-muted);font-size:12px;font-weight:400}

.main{margin-right:256px;background:var(--ds-background)}
.topbar{
  min-height:68px;padding:12px 40px;border-bottom:1px solid var(--ds-divider);
  background:color-mix(in srgb,var(--ds-background) 92%,transparent);box-shadow:none;backdrop-filter:blur(12px)
}
.topbar h2{color:var(--ds-text);font-size:20px;font-weight:500;line-height:1.4}
.topbar-right{gap:16px}
.date-chip{padding:8px 16px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card);color:var(--ds-text-secondary);font-size:12px;font-weight:400}
.mobile-nav-toggle,.dark-toggle{
  min-width:44px;min-height:44px;border:1px solid var(--ds-border);border-radius:14px;
  background:var(--ds-card);color:var(--ds-primary)
}
.mobile-nav-toggle:hover,.dark-toggle:hover{background:var(--ds-surface)}
.content{max-width:1500px;margin:0 auto;padding:40px 48px 64px;background:var(--ds-background)}

.card{
  border:1px solid var(--ds-border);border-radius:20px;background:var(--ds-card);
  box-shadow:var(--ds-shadow-subtle);transition:border-color 180ms ease-out,box-shadow 180ms ease-out
}
.card:hover{box-shadow:var(--ds-shadow-subtle)}
.card-header{padding:20px 24px;border-bottom:1px solid var(--ds-divider);background:var(--ds-card)}
.card-header h3,.chart-ttl{color:var(--ds-text);font-size:16px;font-weight:500;line-height:1.45}
.card-body{padding:24px;background:var(--ds-card)}

.btn{
  min-height:44px;padding:10px 18px;gap:8px;border-radius:14px;font-family:'Alexandria',sans-serif;
  font-size:14px;font-weight:500;line-height:1;box-shadow:none!important;
  transition:background 180ms ease-out,border-color 180ms ease-out,color 180ms ease-out,transform 180ms ease-out
}
.btn:hover:not(:disabled){transform:scale(1.02)}
.btn:active:not(:disabled){transform:scale(.98)}
.btn:focus-visible,.inp:focus-visible,.tab:focus-visible,.gchip:focus-visible,.nav-item:focus-visible{
  outline:2px solid var(--ds-accent);outline-offset:2px
}
.btn:disabled{opacity:.45}
.btn-primary{background:var(--ds-primary);color:${dark ? "#17151A" : "#FFF8F5"}}
.btn-primary:hover:not(:disabled){background:var(--ds-primary-hover)}
.btn-success{background:var(--ds-success);color:${dark ? "#17151A" : "#F8FFF8"}}
.btn-danger{background:var(--ds-danger);color:${dark ? "#17151A" : "#FFF8F8"}}
.btn-amber{background:var(--ds-warning);color:${dark ? "#17151A" : "#2A2420"}}
.btn-purple{background:var(--ds-accent);color:#2A2420}
.btn-outline{border:1px solid var(--ds-primary);background:transparent;color:var(--ds-primary)}
.btn-outline:hover:not(:disabled){background:var(--ds-primary-tint)}
.btn-ghost{border:1px solid var(--ds-border);background:transparent;color:var(--ds-text-secondary)}
.btn-ghost:hover:not(:disabled){background:var(--ds-surface);color:var(--ds-text)}
.btn-sm{min-height:40px;padding:8px 14px;border-radius:10px;font-size:13px}
.btn-xs{min-height:36px;padding:6px 10px;border-radius:8px;font-size:12px}
.btn[style*="#d1fae5"]{background:color-mix(in srgb,var(--ds-success) 14%,var(--ds-card))!important;color:var(--ds-success)!important}
.btn[style*="#fee2e2"]{background:color-mix(in srgb,var(--ds-danger) 14%,var(--ds-card))!important;color:var(--ds-danger)!important}

.inp{
  min-height:44px;padding:10px 14px;border:1px solid var(--ds-border);border-radius:8px;
  background:var(--ds-card);color:var(--ds-text);font-family:'Alexandria',sans-serif;font-size:14px
}
.inp::placeholder{color:var(--ds-text-muted)}
.inp:focus{border-color:var(--ds-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--ds-accent) 24%,transparent)}
.inp-sm{min-height:40px;padding:8px 12px}
.form-group{margin-bottom:24px}
.form-label{margin-bottom:8px;color:var(--ds-text-secondary);font-size:13px;font-weight:500;line-height:1.6}
.form-row,.form-row3{gap:16px}

.toggle-wrap{min-height:44px;gap:8px}
.toggle{width:44px;height:24px}
.toggle-sl{background:var(--ds-border);border-radius:999px}
.toggle-sl::before{box-shadow:var(--ds-shadow-subtle)}
.toggle input:checked+.toggle-sl{background:var(--ds-primary)}
.tl-yes{color:var(--ds-success);font-weight:500}.tl-no{color:var(--ds-text-muted);font-weight:400}

.tbl{background:var(--ds-card);color:var(--ds-text);font-size:14px}
.tbl th{
  position:sticky;top:0;z-index:1;padding:14px 16px;border-bottom:1px solid var(--ds-border);
  background:var(--ds-surface);color:var(--ds-text-secondary);font-size:12px;font-weight:500;text-align:start
}
.tbl td{padding:14px 16px;border-bottom:1px solid var(--ds-divider);color:var(--ds-text);line-height:1.6}
.tbl tr:hover td{background:var(--ds-surface)}

.badge{padding:4px 10px;border-radius:999px;font-size:12px;font-weight:500}
.badge-indigo{border-color:color-mix(in srgb,var(--ds-primary) 24%,transparent);background:var(--ds-primary-tint);color:var(--ds-primary)}
.badge-blue{border-color:color-mix(in srgb,var(--ds-info) 24%,transparent);background:color-mix(in srgb,var(--ds-info) 12%,var(--ds-card));color:var(--ds-info)}
.badge-green{border-color:color-mix(in srgb,var(--ds-success) 24%,transparent);background:color-mix(in srgb,var(--ds-success) 12%,var(--ds-card));color:var(--ds-success)}
.badge-amber,.badge-purple{border-color:color-mix(in srgb,var(--ds-warning) 24%,transparent);background:color-mix(in srgb,var(--ds-warning) 12%,var(--ds-card));color:var(--ds-warning)}
.badge-red{border-color:color-mix(in srgb,var(--ds-danger) 24%,transparent);background:color-mix(in srgb,var(--ds-danger) 12%,var(--ds-card));color:var(--ds-danger)}
.badge-gray{border-color:var(--ds-border);background:var(--ds-surface);color:var(--ds-text-secondary)}
.alert{padding:14px 16px;border-radius:14px;font-size:13px;font-weight:400;line-height:1.6}
.alert-success{border-color:color-mix(in srgb,var(--ds-success) 28%,transparent);background:color-mix(in srgb,var(--ds-success) 12%,var(--ds-card));color:var(--ds-success)}
.alert-error{border-color:color-mix(in srgb,var(--ds-danger) 28%,transparent);background:color-mix(in srgb,var(--ds-danger) 12%,var(--ds-card));color:var(--ds-danger)}
.alert-warn{border-color:color-mix(in srgb,var(--ds-warning) 28%,transparent);background:color-mix(in srgb,var(--ds-warning) 12%,var(--ds-card));color:var(--ds-warning)}
.alert-info{border-color:color-mix(in srgb,var(--ds-info) 28%,transparent);background:color-mix(in srgb,var(--ds-info) 12%,var(--ds-card));color:var(--ds-info)}

.kpi-grid{grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:24px;margin-bottom:32px;background:transparent}
.kpi-card{
  padding:24px!important;border:1px solid var(--ds-border)!important;border-radius:20px;background:var(--ds-card);
  box-shadow:var(--ds-shadow-subtle);transition:transform 180ms ease-out,box-shadow 180ms ease-out
}
.kpi-card:hover{transform:translateY(-2px) scale(1.01);box-shadow:var(--ds-shadow-medium)}
.kpi-lbl{color:var(--ds-text-secondary);font-size:13px;font-weight:500}
.kpi-val{color:var(--ds-text)!important;font-size:32px;font-weight:600;line-height:1.3}
.kpi-sub{color:var(--ds-text-muted);font-size:12px;font-weight:400}
.kpi-card .chip-dot{background:var(--ds-accent)!important}

.group-chips{gap:8px;margin-bottom:24px}
.gchip{
  min-height:44px;padding:10px 16px;border:1px solid var(--ds-border);border-radius:999px;
  background:var(--ds-card);color:var(--ds-text-secondary);font-size:13px;font-weight:500
}
.gchip:hover{border-color:var(--ds-primary);color:var(--ds-primary)}
.gchip.sel{border-color:color-mix(in srgb,var(--ds-primary) 28%,transparent);background:var(--ds-primary-tint);color:var(--ds-primary);box-shadow:none}
.tabs{gap:4px;padding:4px;border:1px solid var(--ds-border);border-radius:14px;background:var(--ds-surface)}
.tab{min-height:40px;padding:8px 16px;border-radius:10px;color:var(--ds-text-secondary);font-size:13px;font-weight:500}
.tab.active{background:var(--ds-card);color:var(--ds-primary);box-shadow:var(--ds-shadow-subtle)}

.modal-bg{padding:24px;background:rgba(23,21,26,.58);backdrop-filter:blur(6px)}
.modal{border:1px solid var(--ds-border);border-radius:22px;background:var(--ds-card);box-shadow:var(--ds-shadow-floating)}
.modal-header,.modal-footer{padding:20px 24px;border-color:var(--ds-divider);background:var(--ds-card)}
.modal-header h3{color:var(--ds-text);font-size:16px;font-weight:500}
.modal-body{padding:24px;background:var(--ds-card)}
.modal-footer{justify-content:flex-start}

.prog-wrap,.stat-bar-wrap{border:0;background:var(--ds-surface);border-radius:999px}
.prog,.stat-bar{border-radius:999px}
.empty{padding:64px 24px;color:var(--ds-text-secondary);font-size:14px;line-height:1.7}
.empty .ei{font-size:32px;filter:grayscale(.25);opacity:.8}
.row{gap:8px}.col{gap:16px}.divider{margin:24px 0;background:var(--ds-divider)}
.history-row{padding:16px 20px;border-color:var(--ds-divider);background:var(--ds-card)}
.history-row:hover{background:var(--ds-surface)}

.chart-grid{gap:24px;margin-bottom:32px;background:transparent}
.chart-ttl{margin-bottom:24px}
.recharts-cartesian-grid line,.recharts-polar-grid-angle line,.recharts-polar-grid-concentric path{stroke:var(--ds-divider)}
.recharts-text{fill:var(--ds-text-secondary)}
.recharts-default-tooltip{border:1px solid var(--ds-border)!important;border-radius:14px!important;background:var(--ds-card)!important;box-shadow:var(--ds-shadow-floating)!important;color:var(--ds-text)!important}

.profile-header{
  padding:24px;border:1px solid color-mix(in srgb,var(--ds-primary) 20%,var(--ds-border));
  border-radius:22px;background:var(--ds-primary-tint);color:var(--ds-text);box-shadow:none
}
.profile-avatar{border-color:color-mix(in srgb,var(--ds-primary) 30%,transparent);background:var(--ds-primary);color:${dark ? "#17151A" : "#FFF8F5"}}
.profile-name{font-size:20px;font-weight:500}.profile-meta{color:var(--ds-text-secondary);font-weight:400}
.stat-bar-label{color:var(--ds-text);font-weight:500}.stat-bar-val{color:var(--ds-primary);font-weight:500}
.act-chip{border-width:1px;border-radius:999px;font-weight:500}

.login-wrap{padding:24px;background:var(--ds-background)}
.login-wrap::before{background:radial-gradient(circle at 18% 16%,var(--ds-primary-tint),transparent 28rem)}
.login-card{max-width:440px;padding:40px;border:1px solid var(--ds-border);border-radius:22px;background:var(--ds-card);box-shadow:var(--ds-shadow-medium)}
.login-logo{margin-bottom:32px}.login-logo-img{border-radius:18px;background:var(--ds-card);box-shadow:var(--ds-shadow-subtle)}
.login-logo h1{color:var(--ds-text);font-size:24px;font-weight:600}.login-logo p{color:var(--ds-text-secondary);font-weight:400}

@media(max-width:1279px){
  .content{padding:32px}
  .kpi-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
}
@media(max-width:1023px){
  .sb{transform:translateX(100%)}
  .sb.open{transform:translateX(0)}
  .main{margin-right:0!important}
  .chart-grid{grid-template-columns:1fr}
  .kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media(max-width:767px){
  .topbar{min-height:64px;padding:10px 24px}
  .topbar h2{font-size:20px}
  .content{padding:24px 24px 48px}
  .card-header,.card-body{padding:16px}
  .kpi-grid{grid-template-columns:1fr;gap:16px}
  .kpi-card{padding:20px!important}
  .btn,.btn-sm,.btn-xs,.gchip,.tab{min-height:44px}
  .modal-bg{padding:8px}
  .modal-header,.modal-body,.modal-footer{padding:16px}
  .login-card{padding:24px}
}
@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{
    scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important
  }
}
`;
