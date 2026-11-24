'use strict';

VIEWS.projects = () => {
  $('#headerActions').innerHTML = '<button class="btn" onclick="openProjectModal()">+ Проект</button>';
  renderFilterBar({ show: true, project: false, statuses: 'projects' });

  const list = activeRows('Projects').filter(p => {
    if (STATE.status && p.status !== STATE.status) return false;
    if (STATE.person && p.assignee !== STATE.person && p.owner !== STATE.person) return false;
    return matchSearch([p.title, p.goal, p.owner, p.assignee]);
  });

  $('#viewContainer').innerHTML = list.length
    ? '<div class="cards-grid">' + list.map(renderProjectCard).join('') + '</div>'
    : '<p class="muted">Проектов не найдено</p>';
};

VIEWS.tasks = () => {
  $('#headerActions').innerHTML = '<button class="btn" onclick="openTaskModal()">+ Задача</button>';
  renderFilterBar({ show: true, statuses: 'tasks' });

  const list = activeRows('Tasks').filter(t => {
    if (STATE.projectId && t.project_id !== STATE.projectId) return false;
    if (STATE.status && t.status !== STATE.status) return false;
    if (STATE.person && t.assignee !== STATE.person && t.waiting_for !== STATE.person) return false;
    return matchSearch([t.title, t.assignee, t.goal, t.dod, t.result]);
  });

  $('#viewContainer').innerHTML = renderTasksTable(list);
};

VIEWS.meetings = () => {
  $('#headerActions').innerHTML = '<button class="btn" onclick="openMeetingModal()">+ Встреча</button>';
  renderFilterBar({ show: true, statuses: 'meetings' });

  const list = activeRows('Meetings')
    .filter(m => {
      if (STATE.projectId && m.project_id !== STATE.projectId) return false;
      if (STATE.status && m.status !== STATE.status) return false;
      if (STATE.person && m.organizer !== STATE.person && !String(m.participants || '').includes(STATE.person)) return false;
      return matchSearch([m.title, m.organizer, m.participants, m.agenda, m.summary]);
    })
    .sort((a, b) => (b.meeting_date || '').localeCompare(a.meeting_date || ''));

  if (!list.length) {
    $('#viewContainer').innerHTML = '<p class="muted">Встреч не найдено</p>';
    return;
  }

  $('#viewContainer').innerHTML = '<div class="cards-grid">' + list.map(m => {
    const linkedTasks = activeRows('Tasks').filter(t => t.meeting_id === m.id);
    const tasksHtml = linkedTasks.length
      ? '<div style="margin-top:8px;font-size:12px;border-top:1px solid var(--glass-border);padding-top:6px"><b>Задачи встречи (' + linkedTasks.length + '):</b>' +
        linkedTasks.map(t => '<div>' + (t.status === 'Готово' ? '☑' : '☐') + ' ' + esc(t.title) + ' (' + esc(t.assignee || '—') + ')</div>').join('') +
        '</div>'
      : '';

    return '<div class="glass-card" style="cursor:pointer" onclick="openMeetingModal(\'' + m.id + '\')">' +
      '<div class="row" style="justify-content:space-between"><b>' + fmtDate(m.meeting_date) + ' · ' + esc(m.title) + '</b><span class="pill status-pill">' + esc(m.status) + '</span></div>' +
      '<div class="muted" style="font-size:12px;margin-top:4px">Проект: ' + esc(projectTitle(m.project_id)) + ' · Орг.: ' + esc(m.organizer || '—') + '</div>' +
      (m.agenda ? '<div style="margin-top:8px"><b>Agenda:</b> <span class="muted">' + esc(m.agenda) + '</span></div>' : '') +
      (m.summary ? '<div style="margin-top:6px"><b>Follow-up:</b> <span class="muted">' + esc(m.summary) + '</span></div>' : '') +
      tasksHtml + '</div>';
  }).join('') + '</div>';
};

VIEWS.waiting = () => {
  $('#headerActions').innerHTML = '';
  renderFilterBar({ show: true, waitingType: true });
  $('#viewContainer').innerHTML = renderWaitingTable(getWaitingItems());
};

VIEWS.risks = () => {
  $('#headerActions').innerHTML = '<button class="btn" onclick="openRiskModal()">+ Риск</button>';
  renderFilterBar({ show: true, statuses: 'risks' });

  const list = activeRows('Risks').filter(r => {
    if (STATE.projectId && r.project_id !== STATE.projectId) return false;
    if (STATE.status && r.status !== STATE.status) return false;
    if (STATE.person && r.owner !== STATE.person) return false;
    return matchSearch([r.risk, r.mitigation, r.owner]);
  });

  if (!list.length) {
    $('#viewContainer').innerHTML = '<p class="muted">Рисков не найдено</p>';
    return;
  }

  const rows = list.map(r => {
    const noMit = !String(r.mitigation || '').trim() && r.status !== 'Закрыт';
    return '<tr class="clickable" onclick="openRiskModal(\'' + r.id + '\')">' +
      '<td>' + esc(projectTitle(r.project_id)) + '</td>' +
      '<td><span class="pill status-pill">' + esc(r.status) + '</span></td>' +
      '<td>' + esc(r.owner || '—') + '</td>' +
      '<td><b>' + esc(r.risk) + '</b></td>' +
      '<td>' + esc(r.probability) + '</td>' +
      '<td>' + esc(r.impact) + '</td>' +
      '<td class="' + (noMit ? 'overdue-text' : 'muted') + '">' + esc(r.mitigation || 'Не заполнено') + '</td>' +
      '</tr>';
  }).join('');

  $('#viewContainer').innerHTML = '<div class="glass-table-wrap"><table><thead><tr>' +
    '<th>Проект</th><th>Статус</th><th>Ответственный</th><th>Риск</th><th>Вероятность</th><th>Влияние</th><th>Решение по риску</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table></div>';
};
