'use strict';

const STORAGE_KEY = 'pm_liquid_db_v1';
const CFG_KEY = 'pm_liquid_cfg_v1';

const PROJECT_STATUSES = [
  'Черновик/Backlog', 'Инициация', 'Планирование', 'В работе',
  'Отложено', 'Отменено', 'Ожидает ответа', 'В приемке',
  'Анализ эффектов', 'Готово'
];
const TASK_STATUSES = [
  'Черновик/Backlog', 'В работе', 'Отложено', 'Отменено', 'Ожидаем ответа от', 'Готово'
];
const MEETING_STATUSES = [
  'Ожидаем от', 'Нужно назначить', 'Назначена', 'Проведена'
];
const PRIORITIES = ['Не срочно', 'Нормальный', 'Срочно', 'Критичный'];
const RECURRENCE_RULES = [
  'ежедневно', 'по будням', 'еженедельно', 'раз в 2 недели', 'ежемесячно', 'ежеквартально'
];
const RISK_LEVELS = ['Низкая', 'Средняя', 'Высокая'];
const RISK_STATUSES = ['Открыт', 'В работе', 'Закрыт'];

const NAV_ITEMS = [
  { id: 'today', label: 'Сегодня' },
  { id: 'projects', label: 'Проекты' },
  { id: 'tasks', label: 'Задачи' },
  { id: 'meetings', label: 'Встречи' },
  { id: 'waiting', label: 'Ожидание' },
  { id: 'risks', label: 'Риски' },
  { id: 'weekly', label: 'Weekly Review' },
  { id: 'monthly', label: 'Monthly Review' },
  { id: 'reports', label: 'Отчёты' },
  { id: 'settings', label: 'Настройки' }
];

const VIEWS = {};

let DB = {
  Projects: new Array(),
  Tasks: new Array(),
  Meetings: new Array(),
  Milestones: new Array(),
  Risks: new Array(),
  Reviews: new Array()
};

let CFG = {
  url: '',
  token: '',
  theme: 'system',
  lastSync: '',
  sheetUrl: '',
  dirty: false
};

let STATE = {
  view: location.hash.slice(1) || 'today',
  search: '',
  projectId: '',
  status: '',
  person: '',
  waitingType: '',
  reportPeriod: 'week',
  reportFrom: '',
  reportTo: ''
};

const $ = sel => document.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[m]));
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
const nowISO = () => new Date().toISOString();
const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const addDays = (isoStr, n) => {
  const d = new Date(isoStr || todayISO());
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const diffDays = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const fmtDate = s => s ? new Date(s).toLocaleDateString('ru-RU') : '—';

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.keys(DB).forEach(k => {
        DB[k] = Array.isArray(parsed[k]) ? parsed[k] : new Array();
      });
    }
    const rawCfg = localStorage.getItem(CFG_KEY);
    if (rawCfg) CFG = { ...CFG, ...JSON.parse(rawCfg) };
  } catch (e) {
    console.error('Ошибка чтения кэша', e);
  }
  applyTheme();
}

function saveCfg() {
  localStorage.setItem(CFG_KEY, JSON.stringify(CFG));
}

function saveLocal(markDirty = true) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
  if (markDirty) {
    CFG.dirty = true;
    saveCfg();
    clearTimeout(saveLocal._timer);
    saveLocal._timer = setTimeout(() => syncWithServer(true), 3000);
  }
  updateSyncBadge();
  updatePeopleDatalist();
  if (typeof render === 'function') render();
}

function applyTheme() {
  if (CFG.theme === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', CFG.theme);
  }
}

function updateSyncBadge(customText) {
  const el = $('#syncStatus');
  if (!el) return;
  if (customText) {
    el.textContent = customText;
    return;
  }
  if (!CFG.url) {
    el.textContent = 'Локальный режим (нет URL)';
    return;
  }
  const online = navigator.onLine ? '' : 'Офлайн · ';
  const state = CFG.dirty
    ? 'Есть несохранённые правки'
    : (CFG.lastSync ? 'Синк: ' + new Date(CFG.lastSync).toLocaleTimeString('ru-RU') : 'Готово к синку');
  el.textContent = online + state;
}

async function syncWithServer(silent = false) {
  if (!CFG.url) {
    if (!silent) alert('Укажите URL Web App в разделе «Настройки».');
    return;
  }
  if (!navigator.onLine) {
    updateSyncBadge();
    return;
  }
  updateSyncBadge('Синхронизация...');
  try {
    const res = await fetch(CFG.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'sync', token: CFG.token, data: DB })
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);

    if (json.data) {
      Object.keys(DB).forEach(k => {
        DB[k] = Array.isArray(json.data[k]) ? json.data[k] : new Array();
      });
    }
    if (json.sheetUrl) CFG.sheetUrl = json.sheetUrl;
    CFG.dirty = false;
    CFG.lastSync = json.syncedAt || nowISO();
    saveCfg();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
    updateSyncBadge();
    updatePeopleDatalist();
    if (typeof render === 'function') render();
  } catch (err) {
    updateSyncBadge('Ошибка синка');
    if (!silent) alert('Ошибка синхронизации: ' + err.message);
  }
}

const activeRows = table => (DB[table] || new Array()).filter(r => !r.is_deleted);
const getProject = id => activeRows('Projects').find(p => p.id === id);
const projectTitle = id => getProject(id)?.title || '—';

function getOverdueDays(deadline, status) {
  if (!deadline || status === 'Готово' || status === 'Отменено') return 0;
  const td = todayISO();
  return deadline < td ? diffDays(deadline, td) : 0;
}

function getMilestoneOverdueDays(m) {
  if (!m.due_date || m.is_done === 'Да' || m.is_done === true) return 0;
  const td = todayISO();
  return m.due_date < td ? diffDays(m.due_date, td) : 0;
}

function calcProjectProgress(projectId) {
  const tasks = activeRows('Tasks').filter(t => t.project_id === projectId && t.status !== 'Отменено');
  if (!tasks.length) return 0;
  const done = tasks.filter(t => t.status === 'Готово').length;
  return Math.round((done / tasks.length) * 100);
}

function calcProjectHealth(p) {
  const tasks = activeRows('Tasks').filter(t => t.project_id === p.id);
  const overdueTasks = tasks.filter(t => getOverdueDays(t.deadline, t.status) > 0).length;
  const milestones = activeRows('Milestones').filter(m => m.project_id === p.id);
  const overdueMs = milestones.some(m => getMilestoneOverdueDays(m) > 0);
  const projectOverdue = getOverdueDays(p.deadline, p.status) > 0;
  const risks = activeRows('Risks').filter(r => r.project_id === p.id && r.status !== 'Закрыт');
  const unmitigatedRisk = risks.some(r => !String(r.mitigation || '').trim());

  if (overdueTasks > 2 || overdueMs || projectOverdue) return 'red';
  if (overdueTasks >= 1 || unmitigatedRisk) return 'yellow';
  return 'green';
}

function healthBadge(h) {
  const map = {
    green: ['Зелёный', 'health-green'],
    yellow: ['Жёлтый', 'health-yellow'],
    red: ['Красный', 'health-red']
  };
  const [label, cls] = map[h] || map.green;
  return '<span class="pill ' + cls + '">' + label + '</span>';
}

function priorityBadge(p) {
  const cls = p === 'Критичный' ? 'prio-critical'
    : p === 'Срочно' ? 'prio-urgent'
    : p === 'Не срочно' ? 'prio-low'
    : 'prio-normal';
  return '<span class="pill ' + cls + '">' + esc(p || 'Нормальный') + '</span>';
}

function collectAllPeople() {
  const set = new Set();
  const add = val => {
    String(val || '').split(',').map(s => s.trim()).filter(Boolean).forEach(n => set.add(n));
  };
  activeRows('Projects').forEach(p => { add(p.owner); add(p.assignee); add(p.waiting_for); });
  activeRows('Tasks').forEach(t => { add(t.assignee); add(t.waiting_for); });
  activeRows('Meetings').forEach(m => { add(m.organizer); add(m.participants); add(m.waiting_for); });
  activeRows('Risks').forEach(r => add(r.owner));
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'));
}

function updatePeopleDatalist() {
  const dl = $('#peopleDatalist');
  if (dl) dl.innerHTML = collectAllPeople().map(n => '<option value="' + esc(n) + '">').join('');
}

function upsertRecord(table, obj) {
  const list = DB[table];
  const idx = list.findIndex(x => x.id === obj.id);
  const ts = nowISO();
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...obj, updated_at: ts };
  } else {
    list.push({ id: uuid(), created_at: ts, updated_at: ts, is_deleted: false, ...obj });
  }
}

function softDeleteRecord(table, id) {
  const item = DB[table].find(x => x.id === id);
  if (item) {
    item.is_deleted = true;
    item.updated_at = nowISO();
  }
}
