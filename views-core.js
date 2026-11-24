'use strict';

function renderNav() {
  const td = todayISO();
  const counts = {
    today: activeRows('Tasks').filter(t => t.status !== 'Готово' && t.status !== 'Отменено' && t.deadline && t.deadline <= td).length,
    waiting: activeRows('Tasks').filter(t => t.status === 'Ожидаем ответа от').length +
             activeRows('Projects').filter(p => p.status === 'Ожидает ответа').length +
             activeRows('Meetings').filter(m => m.status === 'Ожидаем от').length,
    risks: activeRows('Risks').filter(r => r.status !== 'Закрыт').length
  };
  $('#navMenu').innerHTML = NAV_ITEMS.map(item => {
    const cls = STATE.view === item.id ? 'active' : '';
    const badge = counts[item.id] ? '<span class="nav-badge">' + counts[item.id] + '</span>' : '';
    return '<a href="#' + item.id + '" data-nav="' + item.id + '" class="' + cls + '">' +
           '<span>' + item.label + '</span>' + badge + '</a>';
  }).join('');
}

function renderFilterBar(opts = {}) {
  const bar = $('#filterBar');
  if (!opts.show) {
    bar.innerHTML = '';
    return;
  }
  const projects = activeRows('Projects');
  const people = collectAllPeople();
  let statuses = new Array();
  if (opts.statuses === 'projects') statuses = PROJECT_STATUSES;
  if (opts.statuses === 'tasks') statuses = TASK_STATUSES;
  if (opts.statuses === 'meetings') statuses = MEETING_STATUSES;
  if (opts.statuses === 'risks') statuses = RISK_STATUSES;

  let html = '<input id="fSearch" type="search" placeholder="Поиск..." value="' + esc(STATE.search) + '">';

  if (opts.project !== false) {
    html += '<select id="fProject"><option value="">Все проекты</option>' +
      projects.map(p => '<option value="' + p.id + '" ' + (STATE.projectId === p.id ? 'selected' : '') + '>' + esc(p.title) + '</option>').join('') +
      '</select>';
  }
  if (statuses.length) {
    html += '<select id="fStatus"><option value="">Все статусы</option>' +
      statuses.map(s => '<option value="' + s + '" ' + (STATE.status === s ? 'selected' : '') + '>' + esc(s) + '</option>').join('') +
      '</select>';
  }
  if (opts.person !== false) {
    html += '<select id="fPerson"><option value="">Все ФИО</option>' +
      people.map(p => '<option value="' + esc(p) + '" ' + (STATE.person === p ? 'selected' : '') + '>' + esc(p) + '</option>').join('') +
      '</select>';
  }
  if (opts.waitingType) {
    html += '<select id="fWaitType">' +
      '<option value="">Все типы</option>' +
      '<option value="Задача" ' + (STATE.waitingType === 'Задача' ? 'selected' : '') + '>Задачи</option>' +
      '<option value="Проект" ' + (STATE.waitingType === 'Проект' ? 'selected' : '') + '>Проекты</option>' +
      '<option value="Встреча" ' + (STATE.waitingType === 'Встреча' ? 'selected' : '') + '>Встречи</option>' +
      '</select>';
  }

  bar.innerHTML = html;

  $('#fSearch')?.addEventListener('input', e => {
    STATE.search = e.target.value;
    if (typeof renderViewOnly === 'function') renderViewOnly();
  });
  $('#fProject')?.addEventListener('change', e => { STATE.projectId = e.target.value; render(); });
  $('#fStatus')?.addEventListener('change', e => { STATE.status = e.target.value; render(); });
  $('#fPerson')?.addEventListener('change', e => { STATE.person = e.target.value; render(); });
  $('#fWaitType')?.addEventListener('change', e => { STATE.waitingType = e.target.value; render(); });
}

function matchSearch(fields) {
  if (!STATE.search.trim()) return true;
  const q = STATE.search.toLowerCase();
  return fields.some(f => String(f || '').toLowerCase().includes(q));
}

function renderTasksTable(list) {
  if (!list.length) return '<p class="muted">Нет задач</p>';
  const rows = list.map(t => {
    const ov = getOverdueDays(t.deadline, t.status);
    const rec = t.is_recurring === 'Да' ? ' <span class="pill status-pill">↻</span>' : '';
    const wait = (t.status === 'Ожидаем ответа от' && t.waiting_for)
      ? '<div class="muted" style="font-size:12px">Ждём: ' + esc(t.waiting_for) + '</div>' : '';
    return '<tr class="clickable" onclick="openTaskModal(\'' + t.id + '\')">' +
      '<td><b>' + esc(t.title) + '</b>' + rec + wait + '</td>' +
      '<td>' + esc(projectTitle(t.project_id)) + '</td>' +
      '<td>' + esc(t.assignee || '—') + '</td>' +
      '<td>' + priorityBadge(t.priority) + '</td>' +
      '<td><span class="pill status-pill">' + esc(t.status) + '</span></td>' +
      '<td class="' + (ov ? 'overdue-text' : '') + '">' + fmtDate(t.deadline) + (ov ? '<div>+' + ov + ' дн.</div>' : '') + '</td>' +
      '<td class="muted">' + esc(t.dod || '') + '</td>' +
      '<td class="muted">' + esc(t.result || '') + '</td>' +
      '</tr>';
  }).join('');

  return '<div class="glass-table-wrap"><table><thead><tr>' +
    '<th>Задача</th><th>Проект</th><th>Исполнитель</th><th>Приоритет</th>' +
    '<th>Статус</th><th>Дедлайн</th><th>DoD</th><th>Фактический результат</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table></div>';
}

function renderProjectCard(p) {
  const progress = calcProjectProgress(p.id);
  const health = calcProjectHealth(p);
  const tasks = activeRows('Tasks').filter(t => t.project_id === p.id);
  const inWork = tasks.filter(t => t.status === 'В работе').length;
  const overdue = tasks.filter(t => getOverdueDays(t.deadline, t.status) > 0).length;
  const risks = activeRows('Risks').filter(r => r.project_id === p.id && r.status !== 'Закрыт').length;
  const milestones = activeRows('Milestones').filter(m => m.project_id === p.id);
  const pOverdue = getOverdueDays(p.deadline, p.status);

  const msHtml = milestones.length ? '<div style="margin-top:8px;font-size:12px;border-top:1px solid var(--glass-border);padding-top:6px">' +
    milestones.map(m => {
      const mOv = getMilestoneOverdueDays(m);
      return '<div class="' + (mOv ? 'overdue-text' : '') + '">' + (m.is_done === 'Да' ? '☑' : '◆') + ' ' + esc(m.title) + ' (' + fmtDate(m.due_date) + ')</div>';
    }).join('') + '</div>' : '';

  return '<div class="glass-card" style="cursor:pointer" onclick="openProjectModal(\'' + p.id + '\')">' +
    '<div class="row" style="justify-content:space-between;align-items:flex-start"><b style="font-size:16px">' + esc(p.title) + '</b>' + healthBadge(health) + '</div>' +
    '<div class="muted" style="font-size:12px;margin-top:4px"><span class="pill status-pill">' + esc(p.status) + '</span> · Исп.: ' + esc(p.assignee || '—') + '</div>' +
    '<div class="muted" style="font-size:12px;margin-top:4px">' + fmtDate(p.start_date) + ' — <span class="' + (pOverdue ? 'overdue-text' : '') + '">' + fmtDate(p.deadline) + (pOverdue ? ' (+' + pOverdue + ' дн.)' : '') + '</span></div>' +
    '<div class="row" style="margin:10px 0"><div class="progress-track"><div class="progress-fill" style="width:' + progress + '%"></div></div><b>' + progress + '%</b></div>' +
    '<div class="muted" style="font-size:12px">Задач: <b>' + tasks.length + '</b> · в работе: <b>' + inWork + '</b> · просрочено: <b class="' + (overdue ? 'overdue-text' : '') + '">' + overdue + '</b> · рисков: <b>' + risks + '</b></div>' +
    (p.goal ? '<div style="margin-top:8px;font-size:13px">' + esc(p.goal) + '</div>' : '') +
    msHtml + '</div>';
}
