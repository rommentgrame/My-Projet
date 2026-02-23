import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const STORAGE_KEY = "projectflow_v3";
const generateId = () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

const COLORS = ["#6366f1","#8b5cf6","#a855f7","#ec4899","#f43f5e","#ef4444","#f97316","#eab308","#22c55e","#10b981","#06b6d4","#3b82f6","#0ea5e9","#14b8a6","#84cc16"];
const ICONS = ["🚀","💡","🎯","📚","💼","🎨","🔧","🌱","⚡","🏆","🎵","🔬","🌍","💪","✨","🧠","❤️","🔥","🌟","🎭","🦋","🌊","🎪","🏗️","🎲"];

const PRIORITIES = {
  critical: { label: "Critique", color: "#a855f7", bg: "rgba(168,85,247,0.15)", dot: "🔴" },
  high:     { label: "Élevé",    color: "#f43f5e", bg: "rgba(244,63,94,0.15)",  dot: "🟠" },
  medium:   { label: "Moyen",    color: "#f97316", bg: "rgba(249,115,22,0.15)", dot: "🟡" },
  low:      { label: "Faible",   color: "#22c55e", bg: "rgba(34,197,94,0.15)",  dot: "🟢" },
};

const SLOT_META = {
  primary:   { emoji: "🎯", label: "Primaire",   desc: "Votre priorité absolue",    accent: "#6366f1", glow: "rgba(99,102,241,0.3)"  },
  secondary: { emoji: "⚡", label: "Secondaire", desc: "Important mais flexible",   accent: "#f97316", glow: "rgba(249,115,22,0.3)"  },
  pleasure:  { emoji: "😊", label: "Plaisir",    desc: "Pour la joie et créativité",accent: "#ec4899", glow: "rgba(236,72,153,0.3)"  },
};

const QUOTES = [
  "Un projet commencé est à moitié fini.",
  "La constance bat le talent quand il ne travaille pas.",
  "Chaque jour est une nouvelle opportunité de progresser.",
  "Le secret, c'est de commencer.",
  "Petits pas, grandes victoires.",
  "La discipline est le pont entre les objectifs et les accomplissements.",
  "Focus sur le progrès, pas sur la perfection.",
  "Un projet à la fois, une tâche à la fois.",
  "L'action est la clé de tout succès.",
  "Aujourd'hui est le meilleur jour pour avancer.",
  "Chaque tâche cochée est une victoire.",
  "La régularité crée des miracles.",
  "Faites de votre mieux avec ce que vous avez.",
  "Le succès est une série de petites décisions quotidiennes.",
];

const TEMPLATES = [
  { name: "Développement Web",  icon: "🔧", color: "#6366f1", tags: ["tech","dev"],       tasks: ["Setup & configuration","Design de l'interface","Développement backend","Tests & débogage","Déploiement & lancement"] },
  { name: "Projet Créatif",     icon: "🎨", color: "#ec4899", tags: ["créatif","art"],     tasks: ["Brainstorming & idées","Maquettes & esquisses","Développement & création","Révision & affinement","Version finale"] },
  { name: "Apprentissage",      icon: "📚", color: "#22c55e", tags: ["learning","perso"],  tasks: ["Définir les objectifs","Trouver les ressources","Étudier & pratiquer","Prendre des notes","Réviser & consolider"] },
  { name: "Remise en forme",    icon: "💪", color: "#f97316", tags: ["santé","sport"],     tasks: ["Définir le programme","Semaine 1 - Démarrage","Semaine 2 - Progression","Semaine 3 - Intensification","Évaluer les progrès"] },
  { name: "Business Plan",      icon: "💼", color: "#0ea5e9", tags: ["business","pro"],    tasks: ["Analyse de marché","Modèle économique","Stratégie marketing","Plan financier","Présentation & pitch"] },
  { name: "Musique / Podcast",  icon: "🎵", color: "#a855f7", tags: ["créatif","media"],   tasks: ["Concept & structure","Enregistrement","Montage & mixage","Artwork & branding","Publication & promo"] },
];

const defaultProject = () => ({
  id: generateId(),
  name: "",
  description: "",
  color: COLORS[Math.floor(Math.random() * COLORS.length)],
  icon: ICONS[Math.floor(Math.random() * ICONS.length)],
  tasks: [],
  tags: [],
  dueDate: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  notes: "",
  priority: "medium",
  estimatedHours: 0,
  loggedHours: 0,
  archived: false,
  completed: false,
  pomodoroCount: 0,
  pinned: false,
  links: [],
  color2: null,
});

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const progress = (p) => p.tasks.length ? Math.round(p.tasks.filter(t => t.done).length / p.tasks.length * 100) : 0;
const daysUntil = (d) => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "";
const fmtTime = (s) => `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;
const isOverdue = (p) => p.dueDate && new Date(p.dueDate) < new Date() && !p.completed && !p.archived;

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

function Toast({ notif }) {
  if (!notif) return null;
  const colors = { success: "#22c55e", error: "#f43f5e", warning: "#f97316", info: "#6366f1" };
  return (
    <div style={{
      position:"fixed",top:20,right:20,zIndex:9999,
      background:"#1e293b",color:"#f1f5f9",
      padding:"12px 20px",borderRadius:12,
      boxShadow:"0 20px 40px rgba(0,0,0,0.4)",
      fontWeight:500,fontSize:14,display:"flex",alignItems:"center",gap:10,
      borderLeft:`4px solid ${colors[notif.type]||colors.success}`,
      animation:"toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1)",maxWidth:320
    }}>
      <span style={{fontSize:18}}>{notif.type==="success"?"✅":notif.type==="error"?"❌":notif.type==="warning"?"⚠️":"ℹ️"}</span>
      {notif.msg}
    </div>
  );
}

function ProgressRing({ value, size = 44, stroke = 4, color = "#6366f1" }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.5s ease" }} />
    </svg>
  );
}

function PomodoroWidget({ projectId, project, pomo, onStart, onStop, onReset, fmtT }) {
  const state = pomo || { active: false, seconds: 25 * 60 };
  const pct = ((25 * 60 - state.seconds) / (25 * 60)) * 100;
  return (
    <div style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"rgba(0,0,0,0.2)",borderRadius:10 }}>
      <div style={{ position:"relative",width:36,height:36,flexShrink:0 }}>
        <ProgressRing value={pct} size={36} stroke={3} color="#f97316" />
        <span style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#f97316",fontWeight:700 }}>🍅</span>
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:16,fontWeight:700,color:"#f97316",fontVariantNumeric:"tabular-nums" }}>{fmtT(state.seconds)}</div>
        <div style={{ fontSize:10,color:"rgba(255,255,255,0.4)" }}>{project.pomodoroCount||0} complétés</div>
      </div>
      <div style={{ display:"flex",gap:4 }}>
        <button onClick={() => state.active ? onStop(projectId) : onStart(projectId)}
          style={{ width:26,height:26,borderRadius:8,border:"none",background:state.active?"rgba(244,63,94,0.2)":"rgba(249,115,22,0.2)",color:state.active?"#f43f5e":"#f97316",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12 }}>
          {state.active ? "⏸" : "▶"}
        </button>
        <button onClick={() => onReset(projectId)}
          style={{ width:26,height:26,borderRadius:8,border:"none",background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.4)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11 }}>
          ↺
        </button>
      </div>
    </div>
  );
}

function TagBadge({ tag, onRemove, small }) {
  const hue = (tag.charCodeAt(0) * 37) % 360;
  return (
    <span style={{ display:"inline-flex",alignItems:"center",gap:3,padding:small?"2px 6px":"3px 8px",borderRadius:20,background:`hsla(${hue},60%,50%,0.15)`,color:`hsl(${hue},70%,65%)`,fontSize:small?10:11,fontWeight:500 }}>
      #{tag}
      {onRemove && <button onClick={onRemove} style={{ background:"none",border:"none",cursor:"pointer",color:"inherit",padding:0,lineHeight:1,fontSize:10 }}>×</button>}
    </span>
  );
}

function DueBadge({ dueDate }) {
  const d = daysUntil(dueDate);
  if (d === null) return null;
  const color = d < 0 ? "#f43f5e" : d <= 3 ? "#f97316" : d <= 7 ? "#eab308" : "#94a3b8";
  const label = d < 0 ? `${Math.abs(d)}j retard` : d === 0 ? "Aujourd'hui" : d === 1 ? "Demain" : `${d}j`;
  return (
    <span style={{ display:"inline-flex",alignItems:"center",gap:3,padding:"2px 7px",borderRadius:20,background:`${color}20`,color,fontSize:10,fontWeight:600 }}>
      📅 {label}
    </span>
  );
}

// ─── BACKLOG CARD ─────────────────────────────────────────────────────────────
function BacklogCard({ project, compact, dragStart, onEdit, onView, onArchive, onDelete, onDuplicate, onComplete, onAssign, activeSlots }) {
  const [menu, setMenu] = useState(false);
  const [assignMenu, setAssignMenu] = useState(false);
  const pct = progress(project);
  const overdue = isOverdue(project);
  const inSlot = Object.values(activeSlots).includes(project.id);
  const pri = PRIORITIES[project.priority];

  return (
    <div
      draggable
      onDragStart={(e) => dragStart(e, project.id, "backlog")}
      style={{
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12, padding: compact ? "10px 12px" : "14px",
        cursor: "grab", transition: "all 0.15s", position: "relative",
        borderLeft: `3px solid ${project.color}`,
      }}
      onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
      onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
    >
      {overdue && <div style={{ position:"absolute",top:-1,right:8,background:"#f43f5e",color:"white",fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:"0 0 6px 6px" }}>EN RETARD</div>}
      {inSlot && <div style={{ position:"absolute",top:4,right:4,fontSize:9,color:"rgba(255,255,255,0.3)",background:"rgba(255,255,255,0.06)",padding:"1px 5px",borderRadius:10 }}>actif</div>}

      <div style={{ display:"flex",alignItems:"flex-start",gap:8 }}>
        <div style={{ width:32,height:32,borderRadius:8,background:`${project.color}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0 }}>
          {project.icon}
        </div>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ display:"flex",alignItems:"center",gap:4 }}>
            {project.pinned && <span style={{ fontSize:10 }}>📌</span>}
            <span style={{ fontWeight:600,fontSize:13,color:"#f1f5f9",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }} title={project.name}>
              {project.name || "Sans titre"}
            </span>
          </div>
          {!compact && project.description && (
            <p style={{ margin:"2px 0 0",fontSize:11,color:"rgba(255,255,255,0.4)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{project.description}</p>
          )}
          {!compact && (
            <div style={{ display:"flex",alignItems:"center",gap:4,marginTop:6,flexWrap:"wrap" }}>
              <span style={{ fontSize:10,padding:"1px 6px",borderRadius:10,background:pri.bg,color:pri.color }}>{pri.dot} {pri.label}</span>
              {project.dueDate && <DueBadge dueDate={project.dueDate} />}
              {project.tags.slice(0,2).map(t => <TagBadge key={t} tag={t} small />)}
            </div>
          )}
        </div>
        <div style={{ display:"flex",gap:3,flexShrink:0 }}>
          {/* Assign to slot button */}
          <div style={{ position:"relative" }}>
            <button onClick={(e)=>{e.stopPropagation();setAssignMenu(!assignMenu);setMenu(false)}}
              style={{ width:24,height:24,borderRadius:6,border:"none",background:`${project.color}20`,color:project.color,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center" }}
              title="Assigner à un slot">→</button>
            {assignMenu && (
              <div style={{ position:"absolute",right:0,top:28,background:"#1e293b",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:6,zIndex:100,minWidth:140,boxShadow:"0 10px 30px rgba(0,0,0,0.5)" }}>
                {Object.entries(SLOT_META).map(([k,m]) => (
                  <button key={k} onClick={()=>{onAssign(project.id,k);setAssignMenu(false)}}
                    style={{ display:"flex",alignItems:"center",gap:8,width:"100%",padding:"7px 10px",border:"none",background:"none",color:"#f1f5f9",cursor:"pointer",borderRadius:7,fontSize:12,textAlign:"left" }}
                    onMouseOver={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"}
                    onMouseOut={e=>e.currentTarget.style.background="none"}>
                    {m.emoji} {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ position:"relative" }}>
            <button onClick={(e)=>{e.stopPropagation();setMenu(!menu);setAssignMenu(false)}}
              style={{ width:24,height:24,borderRadius:6,border:"none",background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center" }}>⋮</button>
            {menu && (
              <div style={{ position:"absolute",right:0,top:28,background:"#1e293b",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:6,zIndex:100,minWidth:150,boxShadow:"0 10px 30px rgba(0,0,0,0.5)" }}>
                {[
                  { icon:"👁",  label:"Voir détails",    fn:()=>{onView();setMenu(false)} },
                  { icon:"✏️", label:"Modifier",         fn:()=>{onEdit();setMenu(false)} },
                  { icon:"📋", label:"Dupliquer",        fn:()=>{onDuplicate(project.id);setMenu(false)} },
                  { icon:"🏆", label:"Marquer terminé",  fn:()=>{onComplete(project.id);setMenu(false)} },
                  { icon:"📦", label:"Archiver",         fn:()=>{onArchive(project.id);setMenu(false)} },
                  { icon:"🗑️", label:"Supprimer",        fn:()=>{if(confirm("Supprimer ce projet ?"))onDelete(project.id);setMenu(false)}, danger:true },
                ].map((item,i) => (
                  <button key={i} onClick={item.fn}
                    style={{ display:"flex",alignItems:"center",gap:8,width:"100%",padding:"7px 10px",border:"none",background:"none",color:item.danger?"#f43f5e":"#f1f5f9",cursor:"pointer",borderRadius:7,fontSize:12,textAlign:"left" }}
                    onMouseOver={e=>e.currentTarget.style.background=item.danger?"rgba(244,63,94,0.1)":"rgba(255,255,255,0.06)"}
                    onMouseOut={e=>e.currentTarget.style.background="none"}>
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress */}
      {project.tasks.length > 0 && (
        <div style={{ marginTop:8 }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:3 }}>
            <span style={{ fontSize:10,color:"rgba(255,255,255,0.3)" }}>{project.tasks.filter(t=>t.done).length}/{project.tasks.length} tâches</span>
            <span style={{ fontSize:10,color:"rgba(255,255,255,0.4)",fontWeight:600 }}>{pct}%</span>
          </div>
          <div style={{ height:3,borderRadius:2,background:"rgba(255,255,255,0.06)",overflow:"hidden" }}>
            <div style={{ height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${project.color},${project.color}aa)`,borderRadius:2,transition:"width 0.4s" }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ACTIVE PROJECT CARD ──────────────────────────────────────────────────────
function ActiveProjectCard({ project, slotKey, onEdit, onView, onArchive, onDelete, onComplete, onRemoveFromSlot, onToggleTask, onAddTask, onDeleteTask, pomo, onStartPomo, onStopPomo, onResetPomo, dragStart, updateProject }) {
  const [taskInput, setTaskInput] = useState("");
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notesText, setNotesText] = useState(project.notes || "");
  const [logHours, setLogHours] = useState(false);
  const [hoursInput, setHoursInput] = useState("");
  const meta = SLOT_META[slotKey];
  const pct = progress(project);
  const due = daysUntil(project.dueDate);
  const overdue = isOverdue(project);
  const visibleTasks = showAllTasks ? project.tasks : project.tasks.slice(0, 4);
  const doneTasks = project.tasks.filter(t => t.done).length;

  const saveNotes = () => { updateProject(project.id, { notes: notesText }); setShowNotes(false); };

  return (
    <div draggable onDragStart={(e) => dragStart(e, project.id, slotKey)}
      style={{ padding:"14px 16px", cursor:"default" }}>
      {/* Header */}
      <div style={{ display:"flex",alignItems:"flex-start",gap:10,marginBottom:12 }}>
        <div style={{ position:"relative",flexShrink:0 }}>
          <div style={{ width:44,height:44,borderRadius:12,background:`${project.color}25`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>
            {project.icon}
          </div>
          <div style={{ position:"absolute",bottom:-2,right:-2,width:16,height:16,borderRadius:6,background:project.color,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <ProgressRing value={pct} size={16} stroke={2} color="white" />
          </div>
        </div>
        <div style={{ flex:1,minWidth:0 }}>
          <h4 style={{ margin:0,fontSize:15,fontWeight:700,color:"#f1f5f9",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{project.name||"Sans titre"}</h4>
          {project.description && <p style={{ margin:"2px 0 0",fontSize:11,color:"rgba(255,255,255,0.4)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{project.description}</p>}
          <div style={{ display:"flex",alignItems:"center",gap:6,marginTop:4,flexWrap:"wrap" }}>
            <span style={{ fontSize:10,padding:"1px 6px",borderRadius:10,background:PRIORITIES[project.priority].bg,color:PRIORITIES[project.priority].color }}>{PRIORITIES[project.priority].dot} {PRIORITIES[project.priority].label}</span>
            {project.dueDate && <DueBadge dueDate={project.dueDate} />}
          </div>
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
          <button onClick={onEdit} style={{ width:26,height:26,borderRadius:7,border:"none",background:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.5)",cursor:"pointer",fontSize:12 }}>✏️</button>
          <button onClick={() => onRemoveFromSlot(slotKey)} style={{ width:26,height:26,borderRadius:7,border:"none",background:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:11 }} title="Remettre en liste">↩</button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom:12 }}>
        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}>
          <span style={{ fontSize:11,color:"rgba(255,255,255,0.4)" }}>Progression</span>
          <span style={{ fontSize:12,fontWeight:700,color:project.color }}>{pct}%</span>
        </div>
        <div style={{ height:6,borderRadius:3,background:"rgba(255,255,255,0.07)",overflow:"hidden" }}>
          <div style={{ height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${project.color},${project.color}cc)`,borderRadius:3,transition:"width 0.5s ease",boxShadow:`0 0 10px ${project.color}60` }} />
        </div>
        {project.tasks.length > 0 && <div style={{ fontSize:10,color:"rgba(255,255,255,0.3)",marginTop:3,textAlign:"right" }}>{doneTasks}/{project.tasks.length} tâches</div>}
      </div>

      {/* Tasks */}
      <div style={{ marginBottom:10 }}>
        {visibleTasks.map(task => (
          <div key={task.id} style={{ display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
            <button onClick={() => onToggleTask(project.id, task.id)}
              style={{ width:18,height:18,borderRadius:5,border:`2px solid ${task.done ? project.color : "rgba(255,255,255,0.2)"}`,background:task.done?project.color:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s" }}>
              {task.done && <span style={{ color:"white",fontSize:10 }}>✓</span>}
            </button>
            <span style={{ flex:1,fontSize:12,color:task.done?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.75)",textDecoration:task.done?"line-through":"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }} title={task.text}>{task.text}</span>
            <button onClick={() => onDeleteTask(project.id, task.id)}
              style={{ background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.2)",fontSize:12,padding:0,opacity:0,transition:"opacity 0.15s" }}
              onMouseOver={e=>e.currentTarget.style.opacity="1"}
              onMouseOut={e=>e.currentTarget.style.opacity="0"}>×</button>
          </div>
        ))}
        {project.tasks.length > 4 && (
          <button onClick={() => setShowAllTasks(!showAllTasks)}
            style={{ marginTop:4,background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.3)",fontSize:11 }}>
            {showAllTasks ? `▲ Masquer` : `▼ ${project.tasks.length-4} de plus`}
          </button>
        )}
        {/* Add task */}
        <div style={{ display:"flex",gap:6,marginTop:8 }}>
          <input value={taskInput} onChange={e=>setTaskInput(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter"&&taskInput.trim()){ onAddTask(project.id,taskInput); setTaskInput(""); }}}
            placeholder="+ Ajouter une tâche..."
            style={{ flex:1,padding:"6px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.04)",color:"#f1f5f9",fontSize:12,outline:"none" }} />
          <button onClick={()=>{ if(taskInput.trim()){ onAddTask(project.id,taskInput); setTaskInput(""); }}}
            style={{ width:30,height:30,borderRadius:8,border:"none",background:`${project.color}30`,color:project.color,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center" }}>+</button>
        </div>
      </div>

      {/* Tags */}
      {project.tags.length > 0 && (
        <div style={{ display:"flex",gap:4,flexWrap:"wrap",marginBottom:10 }}>
          {project.tags.map(t=><TagBadge key={t} tag={t} small />)}
        </div>
      )}

      {/* Pomodoro */}
      <PomodoroWidget projectId={project.id} project={project} pomo={pomo} onStart={onStartPomo} onStop={onStopPomo} onReset={onResetPomo} fmtT={fmtTime} />

      {/* Bottom actions */}
      <div style={{ display:"flex",gap:6,marginTop:10 }}>
        <button onClick={onView}
          style={{ flex:1,padding:"6px",borderRadius:8,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.04)",color:"rgba(255,255,255,0.5)",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",gap:4 }}>
          👁 Détails
        </button>
        <button onClick={() => setShowNotes(!showNotes)}
          style={{ flex:1,padding:"6px",borderRadius:8,border:"1px solid rgba(255,255,255,0.08)",background:showNotes?"rgba(99,102,241,0.15)":"rgba(255,255,255,0.04)",color:showNotes?"#6366f1":"rgba(255,255,255,0.5)",cursor:"pointer",fontSize:11 }}>
          📝 Notes
        </button>
        <button onClick={() => onComplete(project.id)}
          style={{ flex:1,padding:"6px",borderRadius:8,border:"1px solid rgba(34,197,94,0.2)",background:"rgba(34,197,94,0.08)",color:"#22c55e",cursor:"pointer",fontSize:11 }}>
          🏆 Terminer
        </button>
      </div>

      {showNotes && (
        <div style={{ marginTop:10 }}>
          <textarea value={notesText} onChange={e=>setNotesText(e.target.value)}
            placeholder="Notes, idées, réflexions..."
            style={{ width:"100%",minHeight:80,padding:"8px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.04)",color:"#f1f5f9",fontSize:12,resize:"vertical",boxSizing:"border-box",outline:"none" }} />
          <button onClick={saveNotes} style={{ marginTop:4,padding:"4px 12px",borderRadius:7,border:"none",background:"#6366f1",color:"white",cursor:"pointer",fontSize:12 }}>Sauvegarder</button>
        </div>
      )}
    </div>
  );
}

// ─── EDIT MODAL ────────────────────────────────────────────────────────────────
function EditModal({ project, isNew, onSave, onClose, allTags }) {
  const [data, setData] = useState({ ...project });
  const [tagInput, setTagInput] = useState("");
  const [taskInput, setTaskInput] = useState("");
  const [tab, setTab] = useState("info");
  const upd = (k, v) => setData(d => ({ ...d, [k]: v }));

  const addTag = (t) => {
    t = t.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !data.tags.includes(t)) upd("tags", [...data.tags, t]);
    setTagInput("");
  };

  const addTask = () => {
    if (!taskInput.trim()) return;
    upd("tasks", [...data.tasks, { id: generateId(), text: taskInput.trim(), done: false }]);
    setTaskInput("");
  };

  const handleSave = () => {
    if (!data.name.trim()) return;
    onSave({ ...data, updatedAt: new Date().toISOString() });
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:"#0f172a",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,width:"100%",maxWidth:560,maxHeight:"90vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 40px 80px rgba(0,0,0,0.6)" }}>
        {/* Modal header */}
        <div style={{ padding:"18px 22px",borderBottom:"1px solid rgba(255,255,255,0.07)",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <h2 style={{ margin:0,fontSize:17,fontWeight:700,color:"#f1f5f9" }}>{isNew ? "✨ Nouveau projet" : "✏️ Modifier le projet"}</h2>
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:8,border:"none",background:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.5)",cursor:"pointer",fontSize:16 }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex",gap:4,padding:"10px 22px 0",borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
          {["info","tâches","tags","avancé"].map(t => (
            <button key={t} onClick={()=>setTab(t)}
              style={{ padding:"6px 14px",borderRadius:"8px 8px 0 0",border:"none",background:tab===t?"rgba(99,102,241,0.15)":"transparent",color:tab===t?"#818cf8":"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:12,fontWeight:tab===t?600:400,borderBottom:tab===t?"2px solid #6366f1":"2px solid transparent" }}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex:1,overflowY:"auto",padding:"18px 22px" }}>
          {tab === "info" && (
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              {/* Icon & Color row */}
              <div style={{ display:"flex",gap:12 }}>
                <div>
                  <label style={labelStyle}>Icône</label>
                  <div style={{ display:"flex",flexWrap:"wrap",gap:4,maxWidth:200 }}>
                    {ICONS.map(icon => (
                      <button key={icon} onClick={()=>upd("icon",icon)}
                        style={{ width:32,height:32,borderRadius:8,border:`2px solid ${data.icon===icon?"#6366f1":"transparent"}`,background:data.icon===icon?"rgba(99,102,241,0.2)":"rgba(255,255,255,0.04)",cursor:"pointer",fontSize:16,transition:"all 0.1s" }}>
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ flex:1 }}>
                  <label style={labelStyle}>Couleur</label>
                  <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                    {COLORS.map(c => (
                      <button key={c} onClick={()=>upd("color",c)}
                        style={{ width:24,height:24,borderRadius:"50%",background:c,border:data.color===c?"3px solid white":"3px solid transparent",cursor:"pointer",boxShadow:data.color===c?`0 0 0 2px ${c}`:"none",transition:"all 0.1s" }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,background:`${data.color}15`,border:`1px solid ${data.color}30` }}>
                <span style={{ fontSize:24 }}>{data.icon}</span>
                <span style={{ fontWeight:600,color:"#f1f5f9",fontSize:15 }}>{data.name || "Votre projet..."}</span>
              </div>

              <div>
                <label style={labelStyle}>Nom du projet *</label>
                <input value={data.name} onChange={e=>upd("name",e.target.value)}
                  placeholder="Ex: Développer mon portfolio" autoFocus
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea value={data.description} onChange={e=>upd("description",e.target.value)}
                  placeholder="Description courte du projet..."
                  style={{ ...inputStyle, minHeight:70, resize:"vertical" }} />
              </div>
              <div style={{ display:"flex",gap:12 }}>
                <div style={{ flex:1 }}>
                  <label style={labelStyle}>Priorité</label>
                  <select value={data.priority} onChange={e=>upd("priority",e.target.value)} style={inputStyle}>
                    {Object.entries(PRIORITIES).map(([k,v]) => <option key={k} value={k}>{v.dot} {v.label}</option>)}
                  </select>
                </div>
                <div style={{ flex:1 }}>
                  <label style={labelStyle}>Date limite</label>
                  <input type="date" value={data.dueDate} onChange={e=>upd("dueDate",e.target.value)} style={inputStyle} />
                </div>
              </div>
            </div>
          )}

          {tab === "tâches" && (
            <div>
              <div style={{ display:"flex",gap:8,marginBottom:12 }}>
                <input value={taskInput} onChange={e=>setTaskInput(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&addTask()}
                  placeholder="Ajouter une tâche..." style={{ ...inputStyle,flex:1,marginBottom:0 }} />
                <button onClick={addTask} style={btnPrimary}>+</button>
              </div>
              {data.tasks.length === 0 && <div style={{ textAlign:"center",color:"rgba(255,255,255,0.3)",fontSize:13,padding:20 }}>Aucune tâche pour le moment</div>}
              <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                {data.tasks.map((task,i) => (
                  <div key={task.id} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,background:"rgba(255,255,255,0.04)" }}>
                    <button onClick={()=>upd("tasks",data.tasks.map(t=>t.id===task.id?{...t,done:!t.done}:t))}
                      style={{ width:18,height:18,borderRadius:5,border:`2px solid ${task.done?data.color:"rgba(255,255,255,0.2)"}`,background:task.done?data.color:"transparent",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center" }}>
                      {task.done&&<span style={{ color:"white",fontSize:10 }}>✓</span>}
                    </button>
                    <input value={task.text}
                      onChange={e=>upd("tasks",data.tasks.map(t=>t.id===task.id?{...t,text:e.target.value}:t))}
                      style={{ flex:1,background:"none",border:"none",color:"#f1f5f9",fontSize:12,outline:"none",textDecoration:task.done?"line-through":"none",opacity:task.done?0.4:1 }} />
                    <button onClick={()=>upd("tasks",data.tasks.filter(t=>t.id!==task.id))}
                      style={{ background:"none",border:"none",cursor:"pointer",color:"rgba(244,63,94,0.5)",fontSize:14,padding:0 }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "tags" && (
            <div>
              <div style={{ display:"flex",gap:8,marginBottom:12 }}>
                <input value={tagInput} onChange={e=>setTagInput(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&addTag(tagInput)}
                  placeholder="Ajouter un tag..." style={{ ...inputStyle,flex:1,marginBottom:0 }} />
                <button onClick={()=>addTag(tagInput)} style={btnPrimary}>+</button>
              </div>
              <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginBottom:14 }}>
                {data.tags.map(t => <TagBadge key={t} tag={t} onRemove={()=>upd("tags",data.tags.filter(x=>x!==t))} />)}
              </div>
              {allTags.length > 0 && (
                <div>
                  <div style={{ fontSize:11,color:"rgba(255,255,255,0.3)",marginBottom:6 }}>TAGS EXISTANTS</div>
                  <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                    {allTags.filter(t=>!data.tags.includes(t)).map(t => (
                      <button key={t} onClick={()=>upd("tags",[...data.tags,t])}
                        style={{ padding:"3px 10px",borderRadius:20,border:"1px dashed rgba(255,255,255,0.15)",background:"transparent",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:11 }}>
                        + #{t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "avancé" && (
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              <div style={{ display:"flex",gap:12 }}>
                <div style={{ flex:1 }}>
                  <label style={labelStyle}>Heures estimées</label>
                  <input type="number" min="0" value={data.estimatedHours} onChange={e=>upd("estimatedHours",+e.target.value)} style={inputStyle} />
                </div>
                <div style={{ flex:1 }}>
                  <label style={labelStyle}>Heures travaillées</label>
                  <input type="number" min="0" value={data.loggedHours} onChange={e=>upd("loggedHours",+e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Notes détaillées</label>
                <textarea value={data.notes} onChange={e=>upd("notes",e.target.value)}
                  placeholder="Notes, idées, réflexions, ressources..."
                  style={{ ...inputStyle, minHeight:120, resize:"vertical" }} />
              </div>
              <div>
                <label style={labelStyle}>Ajouter un lien</label>
                <div style={{ display:"flex",gap:8 }}>
                  <input placeholder="https://..." id="link-input" style={{ ...inputStyle,flex:1,marginBottom:0 }} />
                  <button onClick={()=>{
                    const v=document.getElementById("link-input").value.trim();
                    if(v)upd("links",[...(data.links||[]),v]);
                    document.getElementById("link-input").value="";
                  }} style={btnPrimary}>+</button>
                </div>
                {(data.links||[]).map((l,i)=>(
                  <div key={i} style={{ display:"flex",gap:8,alignItems:"center",marginTop:6 }}>
                    <a href={l} target="_blank" rel="noopener" style={{ flex:1,fontSize:12,color:"#818cf8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{l}</a>
                    <button onClick={()=>upd("links",data.links.filter((_,j)=>j!==i))} style={{ background:"none",border:"none",cursor:"pointer",color:"rgba(244,63,94,0.5)" }}>×</button>
                  </div>
                ))}
              </div>
              <div>
                <label style={labelStyle}>Épingler ce projet</label>
                <label style={{ display:"flex",alignItems:"center",gap:8,cursor:"pointer" }}>
                  <div onClick={()=>upd("pinned",!data.pinned)} style={{ width:40,height:22,borderRadius:11,background:data.pinned?"#6366f1":"rgba(255,255,255,0.1)",position:"relative",cursor:"pointer",transition:"background 0.2s" }}>
                    <div style={{ position:"absolute",top:2,left:data.pinned?20:2,width:18,height:18,borderRadius:"50%",background:"white",transition:"left 0.2s" }} />
                  </div>
                  <span style={{ fontSize:12,color:"rgba(255,255,255,0.5)" }}>Mettre en avant dans la liste</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 22px",borderTop:"1px solid rgba(255,255,255,0.07)",display:"flex",gap:10,justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"9px 18px",borderRadius:9,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"rgba(255,255,255,0.5)",cursor:"pointer",fontSize:13 }}>Annuler</button>
          <button onClick={handleSave} disabled={!data.name.trim()}
            style={{ padding:"9px 22px",borderRadius:9,border:"none",background:data.name.trim()?"#6366f1":"rgba(99,102,241,0.3)",color:"white",cursor:data.name.trim()?"pointer":"not-allowed",fontSize:13,fontWeight:600 }}>
            {isNew ? "✨ Créer" : "💾 Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DETAIL MODAL ──────────────────────────────────────────────────────────────
function DetailModal({ project, onClose, onEdit, onToggleTask, onAddTask, onDeleteTask }) {
  const [taskInput, setTaskInput] = useState("");
  const pct = progress(project);

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:"#0f172a",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,width:"100%",maxWidth:540,maxHeight:"90vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 40px 80px rgba(0,0,0,0.6)" }}>
        {/* Colored header banner */}
        <div style={{ padding:"20px 22px",background:`linear-gradient(135deg,${project.color}30,${project.color}10)`,borderBottom:`1px solid ${project.color}30` }}>
          <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between" }}>
            <div style={{ display:"flex",alignItems:"center",gap:12 }}>
              <div style={{ width:52,height:52,borderRadius:14,background:`${project.color}25`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26 }}>{project.icon}</div>
              <div>
                <h2 style={{ margin:0,fontSize:18,fontWeight:700,color:"#f1f5f9" }}>{project.name}</h2>
                {project.description && <p style={{ margin:"3px 0 0",fontSize:12,color:"rgba(255,255,255,0.5)" }}>{project.description}</p>}
              </div>
            </div>
            <div style={{ display:"flex",gap:6 }}>
              <button onClick={onEdit} style={{ padding:"6px 12px",borderRadius:8,border:"none",background:"rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:12 }}>✏️ Modifier</button>
              <button onClick={onClose} style={{ width:30,height:30,borderRadius:8,border:"none",background:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.5)",cursor:"pointer",fontSize:16 }}>×</button>
            </div>
          </div>
          {/* Progress */}
          <div style={{ marginTop:14 }}>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
              <span style={{ fontSize:11,color:"rgba(255,255,255,0.5)" }}>{project.tasks.filter(t=>t.done).length}/{project.tasks.length} tâches complétées</span>
              <span style={{ fontSize:13,fontWeight:700,color:project.color }}>{pct}%</span>
            </div>
            <div style={{ height:8,borderRadius:4,background:"rgba(255,255,255,0.08)" }}>
              <div style={{ height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${project.color},${project.color}cc)`,borderRadius:4,boxShadow:`0 0 12px ${project.color}60` }} />
            </div>
          </div>
        </div>

        <div style={{ flex:1,overflowY:"auto",padding:"18px 22px" }}>
          {/* Meta info */}
          <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:16 }}>
            <span style={{ padding:"4px 10px",borderRadius:20,background:PRIORITIES[project.priority].bg,color:PRIORITIES[project.priority].color,fontSize:12,fontWeight:500 }}>
              {PRIORITIES[project.priority].dot} {PRIORITIES[project.priority].label}
            </span>
            {project.dueDate && <DueBadge dueDate={project.dueDate} />}
            {project.estimatedHours > 0 && <span style={{ padding:"4px 10px",borderRadius:20,background:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.5)",fontSize:12 }}>⏱ {project.estimatedHours}h estimées</span>}
            {project.loggedHours > 0 && <span style={{ padding:"4px 10px",borderRadius:20,background:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.5)",fontSize:12 }}>⏰ {project.loggedHours}h travaillées</span>}
            {project.pomodoroCount > 0 && <span style={{ padding:"4px 10px",borderRadius:20,background:"rgba(249,115,22,0.1)",color:"#f97316",fontSize:12 }}>🍅 {project.pomodoroCount} pomodoros</span>}
          </div>

          {/* Tags */}
          {project.tags.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11,color:"rgba(255,255,255,0.3)",marginBottom:6,fontWeight:600 }}>TAGS</div>
              <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>{project.tags.map(t=><TagBadge key={t} tag={t} />)}</div>
            </div>
          )}

          {/* Tasks */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:11,color:"rgba(255,255,255,0.3)",marginBottom:8,fontWeight:600 }}>TÂCHES</div>
            {project.tasks.map(task => (
              <div key={task.id} style={{ display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                <button onClick={()=>onToggleTask(project.id,task.id)}
                  style={{ width:20,height:20,borderRadius:6,border:`2px solid ${task.done?project.color:"rgba(255,255,255,0.2)"}`,background:task.done?project.color:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                  {task.done&&<span style={{ color:"white",fontSize:11 }}>✓</span>}
                </button>
                <span style={{ flex:1,fontSize:13,color:task.done?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.8)",textDecoration:task.done?"line-through":"none" }}>{task.text}</span>
                <button onClick={()=>onDeleteTask(project.id,task.id)} style={{ background:"none",border:"none",cursor:"pointer",color:"rgba(244,63,94,0.4)",fontSize:15 }}>×</button>
              </div>
            ))}
            <div style={{ display:"flex",gap:8,marginTop:10 }}>
              <input value={taskInput} onChange={e=>setTaskInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&taskInput.trim()){onAddTask(project.id,taskInput);setTaskInput("");}}}
                placeholder="+ Nouvelle tâche..." style={{ ...inputStyle,flex:1,marginBottom:0 }} />
              <button onClick={()=>{if(taskInput.trim()){onAddTask(project.id,taskInput);setTaskInput("");}}} style={btnPrimary}>+</button>
            </div>
          </div>

          {/* Notes */}
          {project.notes && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11,color:"rgba(255,255,255,0.3)",marginBottom:8,fontWeight:600 }}>NOTES</div>
              <div style={{ padding:"12px 14px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",fontSize:13,color:"rgba(255,255,255,0.6)",lineHeight:1.6,whiteSpace:"pre-wrap" }}>
                {project.notes}
              </div>
            </div>
          )}

          {/* Links */}
          {(project.links||[]).length > 0 && (
            <div>
              <div style={{ fontSize:11,color:"rgba(255,255,255,0.3)",marginBottom:8,fontWeight:600 }}>LIENS</div>
              {project.links.map((l,i)=>(
                <a key={i} href={l} target="_blank" rel="noopener"
                  style={{ display:"block",padding:"7px 12px",borderRadius:8,background:"rgba(255,255,255,0.04)",color:"#818cf8",fontSize:12,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                  🔗 {l}
                </a>
              ))}
            </div>
          )}

          {/* Meta dates */}
          <div style={{ marginTop:16,padding:"12px 14px",borderRadius:10,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ display:"flex",gap:20,flexWrap:"wrap" }}>
              <div style={{ fontSize:11,color:"rgba(255,255,255,0.3)" }}>
                <span style={{ display:"block",color:"rgba(255,255,255,0.2)",fontSize:10,marginBottom:2 }}>CRÉÉ LE</span>
                {new Date(project.createdAt).toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"})}
              </div>
              <div style={{ fontSize:11,color:"rgba(255,255,255,0.3)" }}>
                <span style={{ display:"block",color:"rgba(255,255,255,0.2)",fontSize:10,marginBottom:2 }}>MODIFIÉ LE</span>
                {new Date(project.updatedAt).toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"})}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Shared input styles
const inputStyle = { width:"100%",padding:"9px 12px",borderRadius:9,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"#f1f5f9",fontSize:13,boxSizing:"border-box",outline:"none",marginBottom:0,transition:"border 0.15s" };
const labelStyle = { display:"block",fontSize:11,color:"rgba(255,255,255,0.4)",fontWeight:600,marginBottom:5,letterSpacing:"0.05em" };
const btnPrimary = { padding:"9px 16px",borderRadius:9,border:"none",background:"#6366f1",color:"white",cursor:"pointer",fontWeight:600,fontSize:13,whiteSpace:"nowrap" };

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function ProjectFlow() {
  const [projects, setProjects] = useState([]);
  const [slots, setSlots] = useState({ primary: null, secondary: null, pleasure: null });
  const [editProj, setEditProj] = useState(null);
  const [viewProj, setViewProj] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [filterTag, setFilterTag] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [compact, setCompact] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [undoStack, setUndoStack] = useState([]);
  const [notif, setNotif] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [dragged, setDragged] = useState(null);
  const [pomos, setPomos] = useState({});
  const [loading, setLoading] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [theme, setTheme] = useState("#6366f1");

  const pomoIntervals = useRef({});
  const fileRef = useRef();
  const saveTimeout = useRef();

  const quote = QUOTES[new Date().getDay() % QUOTES.length];

  // ── STORAGE SYNC ────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(STORAGE_KEY);
        if (r?.value) {
          const d = JSON.parse(r.value);
          setProjects(d.projects || []);
          setSlots(d.slots || { primary:null, secondary:null, pleasure:null });
          setTheme(d.theme || "#6366f1");
          setCompact(d.compact || false);
        }
      } catch (e) {}
      setLoading(false);
    })();
  }, []);

  const persist = useCallback((p, s, extra = {}) => {
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      try {
        await window.storage.set(STORAGE_KEY, JSON.stringify({ projects: p, slots: s, theme, compact, ...extra }));
      } catch (e) {}
    }, 300);
  }, [theme, compact]);

  useEffect(() => { if (!loading) persist(projects, slots, { theme, compact }); }, [projects, slots, theme, compact, loading]);

  // ── NOTIFICATIONS ────────────────────────────────────────────────────────────
  const toast = (msg, type = "success") => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3200);
  };

  // ── UNDO ─────────────────────────────────────────────────────────────────────
  const pushUndo = useCallback(() => {
    setUndoStack(prev => [...prev.slice(-14), { projects, slots }]);
  }, [projects, slots]);

  const undo = () => {
    if (!undoStack.length) return;
    const last = undoStack[undoStack.length - 1];
    setProjects(last.projects);
    setSlots(last.slots);
    setUndoStack(s => s.slice(0, -1));
    toast("Action annulée", "info");
  };

  // ── PROJECT CRUD ──────────────────────────────────────────────────────────────
  const addProject = (data) => {
    pushUndo();
    const p = { ...defaultProject(), ...data };
    setProjects(prev => [p, ...prev]);
    toast(`✨ "${p.name}" créé !`);
  };

  const updateProject = useCallback((id, updates) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p));
  }, []);

  const deleteProject = (id) => {
    pushUndo();
    setSlots(prev => { const s={...prev}; Object.keys(s).forEach(k=>{if(s[k]===id)s[k]=null;}); return s; });
    setProjects(prev => prev.filter(p => p.id !== id));
    toast("Projet supprimé", "warning");
  };

  const archiveProject = (id) => {
    pushUndo();
    setSlots(prev => { const s={...prev}; Object.keys(s).forEach(k=>{if(s[k]===id)s[k]=null;}); return s; });
    updateProject(id, { archived: true });
    toast("Projet archivé 📦");
  };

  const restoreProject = (id) => {
    updateProject(id, { archived: false });
    toast("Projet restauré 🔄");
  };

  const duplicateProject = (id) => {
    pushUndo();
    const src = projects.find(p => p.id === id);
    if (!src) return;
    const copy = { ...src, id: generateId(), name: src.name + " (copie)", createdAt: new Date().toISOString(), pinned: false };
    setProjects(prev => [copy, ...prev]);
    toast("Projet dupliqué 📋");
  };

  const completeProject = (id) => {
    pushUndo();
    setSlots(prev => { const s={...prev}; Object.keys(s).forEach(k=>{if(s[k]===id)s[k]=null;}); return s; });
    updateProject(id, { completed: true, archived: true });
    toast("🏆 Projet terminé ! Félicitations !");
  };

  // ── SLOTS ──────────────────────────────────────────────────────────────────
  const assignToSlot = (projectId, slot) => {
    pushUndo();
    setSlots(prev => {
      const s = { ...prev };
      Object.keys(s).forEach(k => { if (s[k] === projectId) s[k] = null; });
      s[slot] = projectId;
      return s;
    });
    toast(`Assigné à ${SLOT_META[slot].label} ${SLOT_META[slot].emoji}`);
  };

  const removeFromSlot = (slot) => {
    pushUndo();
    setSlots(prev => ({ ...prev, [slot]: null }));
  };

  // ── DRAG & DROP ───────────────────────────────────────────────────────────
  const handleDragStart = (e, id, from) => {
    setDragged({ id, from });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, zone) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(zone);
  };

  const handleDrop = (e, zone) => {
    e.preventDefault();
    setDragOver(null);
    if (!dragged) return;
    if (zone === "backlog") {
      if (dragged.from !== "backlog") removeFromSlot(dragged.from);
    } else {
      assignToSlot(dragged.id, zone);
    }
    setDragged(null);
  };

  // ── TASKS ──────────────────────────────────────────────────────────────────
  const toggleTask = useCallback((projId, taskId) => {
    setProjects(prev => prev.map(p => p.id !== projId ? p : {
      ...p, updatedAt: new Date().toISOString(),
      tasks: p.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t)
    }));
  }, []);

  const addTask = useCallback((projId, text) => {
    if (!text.trim()) return;
    setProjects(prev => prev.map(p => p.id !== projId ? p : {
      ...p, updatedAt: new Date().toISOString(),
      tasks: [...p.tasks, { id: generateId(), text: text.trim(), done: false }]
    }));
  }, []);

  const deleteTask = useCallback((projId, taskId) => {
    setProjects(prev => prev.map(p => p.id !== projId ? p : {
      ...p, updatedAt: new Date().toISOString(),
      tasks: p.tasks.filter(t => t.id !== taskId)
    }));
  }, []);

  // ── POMODORO ───────────────────────────────────────────────────────────────
  const startPomo = (id) => {
    setPomos(prev => ({ ...prev, [id]: { active: true, seconds: 25 * 60 } }));
    pomoIntervals.current[id] = setInterval(() => {
      setPomos(prev => {
        const s = prev[id];
        if (!s?.active) return prev;
        if (s.seconds <= 1) {
          clearInterval(pomoIntervals.current[id]);
          toast("🍅 Pomodoro terminé !");
          setProjects(pr => pr.map(p => p.id === id ? { ...p, pomodoroCount: (p.pomodoroCount || 0) + 1 } : p));
          return { ...prev, [id]: { active: false, seconds: 0 } };
        }
        return { ...prev, [id]: { ...s, seconds: s.seconds - 1 } };
      });
    }, 1000);
  };

  const stopPomo = (id) => {
    clearInterval(pomoIntervals.current[id]);
    setPomos(prev => ({ ...prev, [id]: { ...prev[id], active: false } }));
  };

  const resetPomo = (id) => {
    stopPomo(id);
    setPomos(prev => ({ ...prev, [id]: { active: false, seconds: 25 * 60 } }));
  };

  // ── EXPORT / IMPORT ─────────────────────────────────────────────────────────
  const exportJSON = () => {
    const data = { version: "3.0", exportedAt: new Date().toISOString(), projects, slots };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `projectflow_${new Date().toISOString().split("T")[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast("Export JSON réussi 📥");
  };

  const importJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        pushUndo();
        if (Array.isArray(data.projects)) setProjects(data.projects);
        if (data.slots) setSlots(data.slots);
        toast(`Import réussi ! ${data.projects?.length || 0} projets chargés ✅`);
      } catch {
        toast("Erreur : JSON invalide ❌", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── COMPUTED ───────────────────────────────────────────────────────────────
  const slotIds = Object.values(slots).filter(Boolean);
  const allTags = [...new Set(projects.flatMap(p => p.tags))];

  const backlogProjects = projects.filter(p => {
    if (showArchived) return p.archived;
    if (p.archived || p.completed) return false;
    if (slotIds.includes(p.id)) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.description?.toLowerCase().includes(search.toLowerCase()) && !p.tags.some(t=>t.includes(search.toLowerCase()))) return false;
    if (filterTag && !p.tags.includes(filterTag)) return false;
    if (filterPriority && p.priority !== filterPriority) return false;
    return true;
  }).sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const ord = { critical:0, high:1, medium:2, low:3 };
    switch (sortBy) {
      case "name": return a.name.localeCompare(b.name);
      case "priority": return ord[a.priority] - ord[b.priority];
      case "progress": return progress(b) - progress(a);
      case "dueDate": return (a.dueDate||"9999") > (b.dueDate||"9999") ? 1 : -1;
      default: return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  const stats = {
    total: projects.filter(p => !p.archived && !p.completed).length,
    active: slotIds.length,
    done: projects.filter(p => p.completed).length,
    archived: projects.filter(p => p.archived && !p.completed).length,
    tasks: projects.reduce((s, p) => s + p.tasks.length, 0),
    tasksDone: projects.reduce((s, p) => s + p.tasks.filter(t => t.done).length, 0),
    pomodoros: projects.reduce((s, p) => s + (p.pomodoroCount || 0), 0),
    overdue: projects.filter(isOverdue).length,
    hours: projects.reduce((s, p) => s + (p.loggedHours || 0), 0),
  };

  const THEMES = ["#6366f1","#a855f7","#ec4899","#f43f5e","#f97316","#22c55e","#0ea5e9","#14b8a6"];

  // ── KEYBOARD SHORTCUTS ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") undo();
      if ((e.ctrlKey || e.metaKey) && e.key === "n" && !editProj) { e.preventDefault(); setEditProj(defaultProject()); setIsNew(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undoStack, editProj]);

  if (loading) return (
    <div style={{ height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0a0f1e",flexDirection:"column",gap:16 }}>
      <div style={{ fontSize:52 }}>🗂️</div>
      <div style={{ color:"rgba(255,255,255,0.3)",fontSize:14 }}>Chargement de ProjectFlow...</div>
      <div style={{ width:100,height:3,borderRadius:2,background:"rgba(255,255,255,0.05)",overflow:"hidden" }}>
        <div style={{ width:"60%",height:"100%",background:theme,borderRadius:2,animation:"pulse 1s infinite" }} />
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh",background:"#0a0f1e",color:"#f1f5f9",fontFamily:"'DM Sans',system-ui,sans-serif",display:"flex",flexDirection:"column" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <Toast notif={notif} />

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <header style={{ background:"rgba(15,20,40,0.95)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"10px 20px",display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:200 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0 }}>
          <span style={{ fontSize:26 }}>🗂️</span>
          <div>
            <div style={{ fontWeight:800,fontSize:17,color:"#f1f5f9",letterSpacing:"-0.02em" }}>ProjectFlow</div>
            <div style={{ fontSize:10,color:"rgba(255,255,255,0.3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:250 }}>{quote}</div>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display:"flex",gap:1,background:"rgba(255,255,255,0.04)",borderRadius:10,padding:3 }}>
          {[
            { val: stats.total, icon: "📁", tip: "projets" },
            { val: `${stats.active}/3`, icon: "⚡", tip: "actifs" },
            { val: `${stats.tasksDone}/${stats.tasks}`, icon: "✅", tip: "tâches" },
            { val: stats.pomodoros, icon: "🍅", tip: "pomodoros" },
          ].map((s, i) => (
            <div key={i} style={{ padding:"5px 10px",textAlign:"center" }}>
              <div style={{ fontSize:13,fontWeight:700,color:"#f1f5f9" }}>{s.icon} {s.val}</div>
              <div style={{ fontSize:9,color:"rgba(255,255,255,0.3)" }}>{s.tip}</div>
            </div>
          ))}
        </div>
        {stats.overdue > 0 && (
          <div style={{ padding:"5px 10px",borderRadius:8,background:"rgba(244,63,94,0.15)",color:"#f43f5e",fontSize:11,fontWeight:600,animation:"pulse 2s infinite" }}>
            ⏰ {stats.overdue} en retard
          </div>
        )}

        {/* Theme dots */}
        <div style={{ display:"flex",gap:4 }}>
          {THEMES.map(c => (
            <button key={c} onClick={() => setTheme(c)}
              style={{ width:18,height:18,borderRadius:"50%",background:c,border:theme===c?"2.5px solid white":"2.5px solid transparent",cursor:"pointer",boxShadow:theme===c?`0 0 0 2px ${c}`:undefined }} />
          ))}
        </div>

        {/* Actions */}
        <div style={{ display:"flex",gap:6 }}>
          <button onClick={() => setFocusMode(!focusMode)} title="Mode focus (cacher le backlog)"
            style={{ padding:"6px 10px",borderRadius:8,border:`1px solid ${focusMode?theme:"rgba(255,255,255,0.08)"}`,background:focusMode?`${theme}20`:"rgba(255,255,255,0.04)",color:focusMode?theme:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:12 }}>
            👁 {focusMode ? "Afficher" : "Focus"}
          </button>
          <button onClick={undo} disabled={!undoStack.length} title="Annuler (Ctrl+Z)"
            style={{ padding:"6px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.04)",color:undoStack.length?"rgba(255,255,255,0.5)":"rgba(255,255,255,0.15)",cursor:undoStack.length?"pointer":"not-allowed",fontSize:12 }}>
            ↩ Annuler
          </button>
          <button onClick={exportJSON}
            style={{ padding:"6px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.04)",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:12 }}>
            📥 Export
          </button>
          <label style={{ padding:"6px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.04)",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center" }}>
            📤 Import
            <input type="file" accept=".json" onChange={importJSON} style={{ display:"none" }} ref={fileRef} />
          </label>
        </div>
      </header>

      <div style={{ display:"flex",flex:1,overflow:"hidden" }}>
        {/* ── SIDEBAR: BACKLOG ────────────────────────────────────────────────── */}
        {!focusMode && (
          <aside style={{ width:310,borderRight:"1px solid rgba(255,255,255,0.06)",display:"flex",flexDirection:"column",background:"rgba(10,15,30,0.8)",flexShrink:0,height:"calc(100vh - 56px)",position:"sticky",top:56 }}>
            {/* Backlog header */}
            <div style={{ padding:"14px 14px 10px",borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
                <div style={{ fontWeight:700,fontSize:14,color:"#f1f5f9" }}>
                  📋 Backlog
                  <span style={{ marginLeft:6,padding:"1px 7px",borderRadius:20,background:`${theme}20`,color:theme,fontSize:11 }}>{backlogProjects.length}</span>
                </div>
                <div style={{ display:"flex",gap:4 }}>
                  <button onClick={() => setShowFilters(!showFilters)}
                    style={{ width:26,height:26,borderRadius:7,border:`1px solid ${showFilters?theme:"rgba(255,255,255,0.08)"}`,background:showFilters?`${theme}20`:"rgba(255,255,255,0.04)",color:showFilters?theme:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:12 }}>⚙</button>
                  <button onClick={() => setShowTemplates(true)}
                    style={{ padding:"4px 8px",borderRadius:7,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.04)",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:11 }}>📋</button>
                  <button onClick={() => setShowArchived(!showArchived)}
                    style={{ width:26,height:26,borderRadius:7,border:`1px solid ${showArchived?"rgba(148,163,184,0.5)":"rgba(255,255,255,0.08)"}`,background:showArchived?"rgba(148,163,184,0.1)":"rgba(255,255,255,0.04)",color:showArchived?"#94a3b8":"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:12 }}>📦</button>
                </div>
              </div>

              {/* Search */}
              <div style={{ position:"relative",marginBottom:showFilters?8:0 }}>
                <span style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"rgba(255,255,255,0.25)" }}>🔍</span>
                <input value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="Rechercher..."
                  style={{ width:"100%",padding:"7px 28px 7px 30px",borderRadius:8,border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.04)",color:"#f1f5f9",fontSize:12,boxSizing:"border-box",outline:"none" }} />
                {search && <button onClick={()=>setSearch("")} style={{ position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.3)",fontSize:14 }}>×</button>}
              </div>

              {/* Filters */}
              {showFilters && (
                <div style={{ padding:"10px",background:"rgba(255,255,255,0.03)",borderRadius:10,border:"1px solid rgba(255,255,255,0.06)",marginTop:8 }}>
                  <div style={{ marginBottom:8 }}>
                    <div style={{ fontSize:10,color:"rgba(255,255,255,0.3)",fontWeight:600,marginBottom:4 }}>TRI</div>
                    <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
                      style={{ width:"100%",padding:"5px 8px",borderRadius:7,border:"1px solid rgba(255,255,255,0.08)",background:"#0f172a",color:"#f1f5f9",fontSize:11 }}>
                      <option value="createdAt">Plus récent</option>
                      <option value="name">Nom A-Z</option>
                      <option value="priority">Priorité</option>
                      <option value="progress">Progression</option>
                      <option value="dueDate">Date limite</option>
                    </select>
                  </div>
                  <div style={{ marginBottom:8 }}>
                    <div style={{ fontSize:10,color:"rgba(255,255,255,0.3)",fontWeight:600,marginBottom:4 }}>PRIORITÉ</div>
                    <div style={{ display:"flex",gap:4,flexWrap:"wrap" }}>
                      {["","critical","high","medium","low"].map(p => {
                        const meta = p ? PRIORITIES[p] : null;
                        return (
                          <button key={p} onClick={() => setFilterPriority(p)}
                            style={{ padding:"2px 8px",borderRadius:20,border:`1px solid ${filterPriority===p?(meta?.color||theme):"rgba(255,255,255,0.08)"}`,background:filterPriority===p?(meta?.bg||`${theme}20`):"transparent",color:filterPriority===p?(meta?.color||theme):"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:10,fontWeight:filterPriority===p?600:400 }}>
                            {p ? `${meta.dot} ${meta.label}` : "Tout"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {allTags.length > 0 && (
                    <div>
                      <div style={{ fontSize:10,color:"rgba(255,255,255,0.3)",fontWeight:600,marginBottom:4 }}>TAGS</div>
                      <div style={{ display:"flex",gap:4,flexWrap:"wrap" }}>
                        <button onClick={()=>setFilterTag("")} style={{ padding:"2px 7px",borderRadius:20,border:`1px solid ${!filterTag?theme:"rgba(255,255,255,0.08)"}`,background:!filterTag?`${theme}20`:"transparent",color:!filterTag?theme:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:10 }}>Tout</button>
                        {allTags.map(t => (
                          <button key={t} onClick={()=>setFilterTag(filterTag===t?"":t)}
                            style={{ padding:"2px 7px",borderRadius:20,border:`1px solid ${filterTag===t?theme:"rgba(255,255,255,0.08)"}`,background:filterTag===t?`${theme}20`:"transparent",color:filterTag===t?theme:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:10 }}>
                            #{t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{ display:"flex",gap:4,marginTop:8 }}>
                    <button onClick={()=>setCompact(!compact)}
                      style={{ flex:1,padding:"4px 0",borderRadius:7,border:`1px solid ${compact?theme:"rgba(255,255,255,0.08)"}`,background:compact?`${theme}20`:"transparent",color:compact?theme:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:11 }}>
                      {compact ? "📑 Compact ✓" : "📋 Confortable"}
                    </button>
                    <button onClick={()=>{setSearch("");setFilterTag("");setFilterPriority("");}}
                      style={{ padding:"4px 8px",borderRadius:7,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"rgba(255,255,255,0.3)",cursor:"pointer",fontSize:11 }}>
                      Réinit
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Add button */}
            <div style={{ padding:"10px 14px 0" }}>
              <button onClick={() => { setEditProj(defaultProject()); setIsNew(true); }}
                style={{ width:"100%",padding:"9px",borderRadius:10,border:`2px dashed ${theme}50`,background:`${theme}08`,color:theme,cursor:"pointer",fontWeight:600,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"all 0.15s" }}
                onMouseOver={e=>{e.currentTarget.style.background=`${theme}15`;e.currentTarget.style.borderColor=theme}}
                onMouseOut={e=>{e.currentTarget.style.background=`${theme}08`;e.currentTarget.style.borderColor=`${theme}50`}}>
                + Nouveau projet <span style={{ fontSize:11,opacity:0.6 }}>(Ctrl+N)</span>
              </button>
            </div>

            {/* Backlog list drop zone */}
            <div style={{ flex:1,overflowY:"auto",padding:"10px 14px 14px" }}
              onDragOver={e=>handleDragOver(e,"backlog")}
              onDragLeave={()=>setDragOver(null)}
              onDrop={e=>handleDrop(e,"backlog")}>
              {dragOver === "backlog" && (
                <div style={{ padding:"14px",borderRadius:10,border:`2px dashed ${theme}`,background:`${theme}10`,textAlign:"center",color:theme,fontSize:12,marginBottom:8 }}>
                  ↩ Remettre en liste
                </div>
              )}
              {backlogProjects.length === 0 ? (
                <div style={{ textAlign:"center",padding:"32px 16px",color:"rgba(255,255,255,0.2)" }}>
                  <div style={{ fontSize:36,marginBottom:8 }}>{showArchived?"📦":"✨"}</div>
                  <div style={{ fontSize:13 }}>{showArchived?"Aucun projet archivé":"Votre liste est vide"}</div>
                  {!showArchived && <div style={{ fontSize:11,marginTop:4 }}>Créez un projet ou utilisez un template</div>}
                </div>
              ) : (
                <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
                  {backlogProjects.map(p => (
                    <BacklogCard key={p.id} project={p} compact={compact}
                      dragStart={handleDragStart}
                      onEdit={() => { setEditProj(p); setIsNew(false); }}
                      onView={() => setViewProj(p)}
                      onArchive={showArchived ? restoreProject : archiveProject}
                      onDelete={deleteProject}
                      onDuplicate={duplicateProject}
                      onComplete={completeProject}
                      onAssign={assignToSlot}
                      activeSlots={slots}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Archive count */}
            {stats.archived > 0 && !showArchived && (
              <div style={{ padding:"8px 14px",borderTop:"1px solid rgba(255,255,255,0.06)",textAlign:"center" }}>
                <button onClick={()=>setShowArchived(true)} style={{ background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.25)",fontSize:11 }}>
                  📦 {stats.archived} projet{stats.archived>1?"s":""} archivé{stats.archived>1?"s":""}
                </button>
              </div>
            )}
          </aside>
        )}

        {/* ── MAIN: SLOTS + DASHBOARD ─────────────────────────────────────────── */}
        <main style={{ flex:1,overflowY:"auto",padding:20,display:"flex",flexDirection:"column",gap:20 }}>
          {/* Active slots grid */}
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,minHeight:400 }}>
            {Object.entries(SLOT_META).map(([slotKey, meta]) => {
              const projId = slots[slotKey];
              const proj = projId ? projects.find(p => p.id === projId) : null;
              const isDrop = dragOver === slotKey;

              return (
                <div key={slotKey}
                  onDragOver={e=>handleDragOver(e,slotKey)}
                  onDragLeave={()=>setDragOver(null)}
                  onDrop={e=>handleDrop(e,slotKey)}
                  style={{
                    borderRadius:18,
                    border:`2px ${isDrop?"solid":"dashed"} ${isDrop?meta.accent:"rgba(255,255,255,0.07)"}`,
                    background:isDrop?`${meta.accent}10`:proj?`rgba(15,22,45,0.8)`:"rgba(255,255,255,0.02)",
                    transition:"all 0.2s",
                    overflow:"hidden",
                    boxShadow:proj?`0 0 40px ${proj.color}10`:undefined,
                  }}>
                  {/* Slot header */}
                  <div style={{ padding:"12px 16px",background:proj?`linear-gradient(135deg,${meta.accent}15,${meta.accent}05)`:`rgba(255,255,255,0.02)`,borderBottom:`1px solid ${proj?`${meta.accent}20`:"rgba(255,255,255,0.04)"}` }}>
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                      <div>
                        <div style={{ fontWeight:700,fontSize:13,color:meta.accent }}>{meta.emoji} {meta.label}</div>
                        <div style={{ fontSize:10,color:"rgba(255,255,255,0.3)",marginTop:1 }}>{meta.desc}</div>
                      </div>
                      <div style={{ display:"flex",gap:6,alignItems:"center" }}>
                        {proj && (
                          <div style={{ display:"flex",alignItems:"center",gap:4 }}>
                            <ProgressRing value={progress(proj)} size={32} stroke={3} color={meta.accent} />
                            <span style={{ fontSize:11,fontWeight:700,color:meta.accent }}>{progress(proj)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {proj ? (
                    <ActiveProjectCard
                      project={proj} slotKey={slotKey}
                      onEdit={() => { setEditProj(proj); setIsNew(false); }}
                      onView={() => setViewProj(proj)}
                      onArchive={archiveProject}
                      onDelete={deleteProject}
                      onComplete={completeProject}
                      onRemoveFromSlot={removeFromSlot}
                      onToggleTask={toggleTask}
                      onAddTask={addTask}
                      onDeleteTask={deleteTask}
                      pomo={pomos[proj.id]}
                      onStartPomo={startPomo}
                      onStopPomo={stopPomo}
                      onResetPomo={resetPomo}
                      dragStart={handleDragStart}
                      updateProject={updateProject}
                    />
                  ) : (
                    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:260,color:"rgba(255,255,255,0.15)",gap:10,padding:20 }}>
                      <div style={{ fontSize:40,opacity:0.3 }}>{meta.emoji}</div>
                      <div style={{ textAlign:"center",fontSize:12 }}>
                        <div style={{ color:"rgba(255,255,255,0.2)",marginBottom:4 }}>Slot {meta.label}</div>
                        <div style={{ fontSize:11 }}>Glissez un projet ici</div>
                        <div style={{ fontSize:11 }}>ou utilisez la flèche →</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Dashboard */}
          <div style={{ background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:18,overflow:"hidden" }}>
            <button onClick={() => setShowStats(!showStats)}
              style={{ width:"100%",padding:"14px 18px",border:"none",background:"transparent",color:"rgba(255,255,255,0.5)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:13,fontWeight:600 }}>
              <span>📊 Tableau de bord & Statistiques</span>
              <span style={{ fontSize:11 }}>{showStats?"▲ Masquer":"▼ Afficher"}</span>
            </button>
            {showStats && (
              <div style={{ padding:"0 18px 18px" }}>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:16 }}>
                  {[
                    { l:"Projets en liste",  v:stats.total,    i:"📁", c:theme },
                    { l:"Actifs (max 3)",    v:`${stats.active}/3`, i:"⚡", c:"#f97316" },
                    { l:"Tâches faites",     v:`${stats.tasksDone}/${stats.tasks}`, i:"✅", c:"#22c55e" },
                    { l:"Terminés",          v:stats.done,     i:"🏆", c:"#eab308" },
                    { l:"Archivés",          v:stats.archived, i:"📦", c:"#94a3b8" },
                    { l:"Pomodoros total",   v:stats.pomodoros,i:"🍅", c:"#f97316" },
                    { l:"Heures travaillées",v:`${stats.hours}h`, i:"⏱", c:"#0ea5e9" },
                    { l:"En retard",         v:stats.overdue,  i:"⏰", c:"#f43f5e" },
                  ].map((s, i) => (
                    <div key={i} style={{ background:"rgba(255,255,255,0.03)",borderRadius:12,padding:"14px 12px",textAlign:"center",border:"1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ fontSize:22,marginBottom:4 }}>{s.i}</div>
                      <div style={{ fontSize:22,fontWeight:800,color:s.c }}>{s.v}</div>
                      <div style={{ fontSize:10,color:"rgba(255,255,255,0.3)",marginTop:2 }}>{s.l}</div>
                    </div>
                  ))}
                </div>

                {/* All projects quick view */}
                <div>
                  <div style={{ fontSize:11,color:"rgba(255,255,255,0.3)",fontWeight:600,marginBottom:8 }}>TOUS LES PROJETS ACTIFS</div>
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8 }}>
                    {projects.filter(p=>!p.archived&&!p.completed).map(p => {
                      const pct2 = progress(p);
                      const inSlot2 = slotIds.includes(p.id);
                      return (
                        <div key={p.id} onClick={() => setViewProj(p)}
                          style={{ padding:"10px 12px",borderRadius:10,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",cursor:"pointer",borderLeft:`3px solid ${p.color}` }}
                          onMouseOver={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"}
                          onMouseOut={e=>e.currentTarget.style.background="rgba(255,255,255,0.03)"}>
                          <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:6 }}>
                            <span style={{ fontSize:14 }}>{p.icon}</span>
                            <span style={{ fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1 }}>{p.name}</span>
                            {inSlot2 && <span style={{ fontSize:9,color:"rgba(255,255,255,0.3)",background:"rgba(255,255,255,0.06)",padding:"1px 5px",borderRadius:10,flexShrink:0 }}>actif</span>}
                          </div>
                          <div style={{ height:3,borderRadius:2,background:"rgba(255,255,255,0.06)" }}>
                            <div style={{ height:"100%",width:`${pct2}%`,background:p.color,borderRadius:2,boxShadow:`0 0 6px ${p.color}60` }} />
                          </div>
                          <div style={{ fontSize:10,color:"rgba(255,255,255,0.3)",marginTop:3,textAlign:"right" }}>{pct2}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Keyboard shortcuts hint */}
          <div style={{ padding:"10px 16px",background:"rgba(255,255,255,0.015)",borderRadius:12,border:"1px solid rgba(255,255,255,0.04)",display:"flex",gap:16,flexWrap:"wrap" }}>
            {[
              { key:"Ctrl+N", action:"Nouveau projet" },
              { key:"Ctrl+Z", action:"Annuler" },
              { key:"Drag", action:"Déplacer vers un slot" },
              { key:"→", action:"Assigner à un slot" },
              { key:"↩", action:"Remettre en liste" },
            ].map((k, i) => (
              <div key={i} style={{ display:"flex",alignItems:"center",gap:6,fontSize:11,color:"rgba(255,255,255,0.25)" }}>
                <kbd style={{ padding:"2px 6px",borderRadius:5,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)",fontSize:10,fontFamily:"monospace" }}>{k.key}</kbd>
                {k.action}
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* ── MODALS ──────────────────────────────────────────────────────────── */}
      {editProj && (
        <EditModal project={editProj} isNew={isNew}
          onSave={(data) => {
            if (!isNew) { updateProject(data.id, data); toast(`"${data.name}" mis à jour ✏️`); }
            else addProject(data);
            setEditProj(null);
          }}
          onClose={() => setEditProj(null)}
          allTags={allTags}
        />
      )}

      {viewProj && (
        <DetailModal
          project={projects.find(p => p.id === viewProj.id) || viewProj}
          onClose={() => setViewProj(null)}
          onEdit={() => { setEditProj(projects.find(p => p.id === viewProj.id) || viewProj); setIsNew(false); setViewProj(null); }}
          onToggleTask={toggleTask}
          onAddTask={addTask}
          onDeleteTask={deleteTask}
        />
      )}

      {showTemplates && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}
          onClick={e=>e.target===e.currentTarget&&setShowTemplates(false)}>
          <div style={{ background:"#0f172a",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:26,width:"100%",maxWidth:520,boxShadow:"0 40px 80px rgba(0,0,0,0.6)" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18 }}>
              <h2 style={{ margin:0,fontSize:17,fontWeight:700 }}>📋 Templates de projets</h2>
              <button onClick={()=>setShowTemplates(false)} style={{ width:30,height:30,borderRadius:8,border:"none",background:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.5)",cursor:"pointer",fontSize:16 }}>×</button>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
              {TEMPLATES.map((t, i) => (
                <button key={i} onClick={() => {
                  const p = defaultProject();
                  Object.assign(p, { name:t.name, icon:t.icon, color:t.color, tags:t.tags, tasks:t.tasks.map(tx=>({id:generateId(),text:tx,done:false})) });
                  setEditProj(p); setIsNew(true); setShowTemplates(false);
                }}
                  style={{ padding:"14px",borderRadius:12,border:"2px solid rgba(255,255,255,0.06)",background:"rgba(255,255,255,0.03)",cursor:"pointer",textAlign:"left",transition:"all 0.15s" }}
                  onMouseOver={e=>{e.currentTarget.style.borderColor=t.color;e.currentTarget.style.background=`${t.color}10`}}
                  onMouseOut={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.06)";e.currentTarget.style.background="rgba(255,255,255,0.03)"}}>
                  <div style={{ fontSize:26,marginBottom:6 }}>{t.icon}</div>
                  <div style={{ fontWeight:600,fontSize:13,color:"#f1f5f9",marginBottom:3 }}>{t.name}</div>
                  <div style={{ color:"rgba(255,255,255,0.35)",fontSize:11 }}>{t.tasks.length} tâches • {t.tags.map(g=>`#${g}`).join(" ")}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes toastIn { from { transform:translateX(60px); opacity:0; } to { transform:translateX(0); opacity:1; } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        * { box-sizing:border-box; -webkit-font-smoothing:antialiased; }
        ::selection { background:${theme}40; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:3px; }
        input, select, textarea { color-scheme:dark; }
        input:focus, select:focus, textarea:focus { border-color:${theme}80 !important; box-shadow:0 0 0 3px ${theme}20; }
      `}</style>
    </div>
  );
}
