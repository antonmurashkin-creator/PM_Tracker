'use strict';

function getWaitingItems() {
  const items = new Array();
  activeRows('Tasks').filter(t => t.status === 'Ожидаем ответа от').forEach(t => {
    items.push({
      type: 'Задача', id: t.id, title: t.title, project_id: t.project_id,
      waiting_for: t.waiting_for, priority: t.priority, status: t.status,
      details: t.dod, date: t.deadline
    });
  });
  activeRows('Projects').filter(p => p.status === 'Ожидает ответа').forEach(p => {
    items.push({
      type: 'Проект', id: p.id, title: p.title, project_id: p.id,
      waiting_for: p.waiting_for, priority: p.priority, status: p.status,
      details: p.dod, date: p.deadline
    });
  });
  activeRows('Meetings').filter(m => m.status === 'Ожидаем от').forEach(m => {
    items.push({
      type: 'Встреча', id: m.id, title: m.title, project_id: m.project_id,
      waiting_for: m.waiting_for, priority: m.priority, status: m.status,
      details: m.agenda, date: m.meeting_date
    });
  });
  return items.filter(x => {
    if (STATE.projectId && x.project_id !== STATE.projectId) return false;
    if (STATE.person && x.waiting_for !== STATE.person) return false;
    if (STATE.waitingType && x.type !== STATE.waitingType) return false;
    return matchSearch([x.title, x.waiting_for, x.details]);
  });
}

function renderWaitingTable(list) {
  if (!list.length) return '<p class="muted">Нет элементов в статусе ожидания</p>';
  const rows = list.map(x => {
    const fn = x.type === 'Задача' ? 'openTaskModal(\'' + x.id + '\')'
      : x.type === 'Проект' ? 'openProjectModal(\'' + x.id + '\')'
      : 'openMeetingModal(\'' + x.id + '\')';
    const ov = getOverdueDays(x.date, x.status);
    return '<tr class="clickable" onclick="' + fn + '">' +
      '<td><span class="pill status-pill">' + x.type + '</span></td>' +
      '<td><b>' + esc(x.title) + '</b></td>' +
      '<td>' + esc(projectTitle(x.project_id)) + '</td>' +
      '<td><b>' + esc(x.waiting_for || '—') + '</b></td>' +
      '<td>' + priorityBadge(x.priority) + '</td>' +
      '<td>' + esc(x.status) + '</td>' +
      '<td class="muted">' + esc(x.details || '') + '</td>' +
      '<td class="' + (ov ? 'overdue-text' : '') + '">' + fmtDate(x.date) + '</td>' +
      '</tr>';
  }).join('');

  return '<div class="glass-table-wrap"><table><thead><tr>' +
    '<th>Тип</th><th>Название</th><th>Проект</th><th>Ожидаем от</th>' +
    '<th>Приоритет</th><th>Статус</th><th>DoD / Agenda</th><th>Дата / Дедлайн</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table></div>';
}

VIEWS.today = () => {
  $('#headerActions').innerHTML =
    '<button class="btn" onclick="openTaskModal()">+ Задача</button>' +
    '<button class="btn btn-glass" onclick="openProjectModal()">+ Проект</button>';
  renderFilterBar({ show: true, statuses: 'tasks' });

  const td = todayISO();
  const weekEnd = addDays(td, 7);

  const filterTask = t => {
    if (STATE.projectId && t.project_id !== STATE.projectId) return false;
    if (STATE.status && t.status !== STATE.status) return false;
    if (STATE.person && t.assignee !== STATE.person && t.waiting_for !== STATE.person) return false;
    return matchSearch([t.title, t.assignee, t.goal, t.dod]);
  };

  const openTasks = activeRows('Tasks').filter(t => t.status !== 'Готово' && t.status !== 'Отменено').filter(filterTask);
  const overdue = openTasks.filter(t => getOverdueDays(t.deadline, t.status) > 0);
  const dueToday = openTasks.filter(t => t.deadline === td);
  const nextWeek = openTasks.filter(t => t.deadline > td && t.deadline <= weekEnd);

  const redProjects = activeRows('Projects').filter(p => p.status !== 'Готово' && p.status !== 'Отменено' && calcProjectHealth(p) === 'red');
  const waitingItems = getWaitingItems();
  const weekMilestones = activeRows('Milestones').filter(m => m.is_done !== 'Да' && m.due_date && m.due_date <= weekEnd);
  const weekMeetings = activeRows('Meetings').filter(m => m.meeting_date && m.meeting_date >= td && m.meeting_date <= weekEnd);

  const msHtml = weekMilestones.map(m =>
    '<div>◆ <b>' + fmtDate(m.due_date) + '</b> — ' + esc(m.title) + ' <span class="muted">(' + esc(projectTitle(m.project_id)) + ')</span></div>'
  ).join('');
  const mtHtml = weekMeetings.map(m =>
    '<div style="cursor:pointer" onclick="openMeetingModal(\'' + m.id + '\')">● <b>' + fmtDate(m.meeting_date) + '</b> — ' + esc(m.title) + ' <span class="muted">(' + esc(projectTitle(m.project_id)) + ')</span></div>'
  ).join('');

  $('#viewContainer').innerHTML =
    '<div class="kpi-grid">' +
      '<div class="glass-card kpi-card"><b class="overdue-text">' + overdue.length + '</b><span>Просрочено задач</span></div>' +
      '<div class="glass-card kpi-card"><b>' + dueToday.length + '</b><span>На сегодня</span></div>' +
      '<div class="glass-card kpi-card"><b>' + nextWeek.length + '</b><span>На ближайшие 7 дней</span></div>' +
      '<div class="glass-card kpi-card"><b class="overdue-text">' + redProjects.length + '</b><span>Проектов в красной зоне</span></div>' +
      '<div class="glass-card kpi-card"><b>' + waitingItems.length + '</b><span>Ожидаем от</span></div>' +
    '</div>' +
    '<h2>Просроченные задачи</h2>' + renderTasksTable(overdue) +
    '<h2>Задачи на сегодня (' + fmtDate(td) + ')</h2>' + renderTasksTable(dueToday) +
    '<h2>Задачи на ближайшую неделю</h2>' + renderTasksTable(nextWeek) +
    '<h2>Проекты в красной зоне</h2>' +
    (redProjects.length ? '<div class="cards-grid">' + redProjects.map(renderProjectCard).join('') + '</div>' : '<p class="muted">Нет проектов в красной зоне</p>') +
    '<h2>Ожидаем от</h2>' + renderWaitingTable(waitingItems) +
    '<h2>Вехи и встречи на неделе</h2>' +
    '<div class="glass-card">' + (msHtml + mtHtml || '<span class="muted">На ближайшие 7 дней вех и встреч нет</span>') + '</div>';
};
