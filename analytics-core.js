'use strict';

function getWeekBounds(dateStr = todayISO()) {
  const d = new Date(dateStr);
  const day = (d.getDay() + 6) % 7;
  const mon = new Date(d);
  mon.setDate(d.getDate() - day);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return [mon.toISOString().slice(0, 10), sun.toISOString().slice(0, 10)];
}

function getMonthBounds(dateStr = todayISO()) {
  const d = new Date(dateStr);
  const y = d.getFullYear(), m = d.getMonth();
  const start = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  const end = new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10);
  return [start, end];
}

function getReportBounds() {
  const td = new Date();
  const y = td.getFullYear(), m = td.getMonth();
  if (STATE.reportPeriod === 'custom') {
    return [STATE.reportFrom || addDays(todayISO(), -30), STATE.reportTo || todayISO()];
  }
  if (STATE.reportPeriod === 'week') return getWeekBounds();
  if (STATE.reportPeriod === 'month') return getMonthBounds();
  if (STATE.reportPeriod === 'quarter') {
    const q = Math.floor(m / 3) * 3;
    return [new Date(Date.UTC(y, q, 1)).toISOString().slice(0, 10), new Date(Date.UTC(y, q + 3, 0)).toISOString().slice(0, 10)];
  }
  if (STATE.reportPeriod === 'half') {
    const h = m < 6 ? 0 : 6;
    return [new Date(Date.UTC(y, h, 1)).toISOString().slice(0, 10), new Date(Date.UTC(y, h + 6, 0)).toISOString().slice(0, 10)];
  }
  return [y + '-01-01', y + '-12-31'];
}

function buildPeriodSnapshot(start, end, projectFilter = '') {
  const byProj = item => !projectFilter || item.project_id === projectFilter;
  const inRange = d => d && d >= start && d <= end;

  const closedTasks = activeRows('Tasks').filter(t => byProj(t) && t.status === 'Готово' && inRange(t.done_at || (t.updated_at || '').slice(0, 10)));
  const closedProjects = activeRows('Projects').filter(p => (!projectFilter || p.id === projectFilter) && p.status === 'Готово' && inRange((p.updated_at || '').slice(0, 10)));
  const overdueTasks = activeRows('Tasks').filter(t => byProj(t) && getOverdueDays(t.deadline, t.status) > 0);
  const waitingTasks = activeRows('Tasks').filter(t => byProj(t) && t.status === 'Ожидаем ответа от');

  const nextStart = addDays(end, 1);
  const nextEnd = addDays(end, 7);
  const nextPeriodTasks = activeRows('Tasks').filter(t => byProj(t) && t.status !== 'Готово' && t.status !== 'Отменено' && t.deadline && t.deadline >= nextStart && t.deadline <= nextEnd);

  const projects = activeRows('Projects').filter(p => !projectFilter || p.id === projectFilter);
  const unmitigatedRisks = activeRows('Risks').filter(r => byProj(r) && r.status !== 'Закрыт' && !String(r.mitigation || '').trim());

  return { start, end, closedTasks, closedProjects, overdueTasks, waitingTasks, nextPeriodTasks, projects, unmitigatedRisks };
}

function renderAnalyticsTables(snap) {
  const projRows = snap.projects.map(p => {
    const ov = activeRows('Tasks').filter(t => t.project_id === p.id && getOverdueDays(t.deadline, t.status) > 0).length;
    const rk = activeRows('Risks').filter(r => r.project_id === p.id && r.status !== 'Закрыт').length;
    return '<tr class="clickable" onclick="openProjectModal(\'' + p.id + '\')">' +
      '<td><b>' + esc(p.title) + '</b></td>' +
      '<td>' + esc(p.status) + '</td>' +
      '<td>' + healthBadge(calcProjectHealth(p)) + '</td>' +
      '<td><b>' + calcProjectProgress(p.id) + '%</b></td>' +
      '<td class="' + (ov ? 'overdue-text' : '') + '">' + ov + '</td>' +
      '<td>' + rk + '</td>' +
      '</tr>';
  }).join('') || '<tr><td colspan="6" class="muted">Нет проектов</td></tr>';

  const riskRows = snap.unmitigatedRisks.map(r =>
    '<tr class="clickable" onclick="openRiskModal(\'' + r.id + '\')">' +
      '<td>' + esc(projectTitle(r.project_id)) + '</td>' +
      '<td><b>' + esc(r.risk) + '</b></td>' +
      '<td>' + esc(r.probability) + '</td>' +
      '<td>' + esc(r.impact) + '</td>' +
      '<td>' + esc(r.owner || '—') + '</td>' +
    '</tr>'
  ).join('') || '<tr><td colspan="5" class="muted">Все активные риски имеют план реагирования</td></tr>';

  return '<div class="kpi-grid">' +
      '<div class="glass-card kpi-card"><b>' + snap.closedTasks.length + '</b><span>Закрыто задач</span></div>' +
      '<div class="glass-card kpi-card"><b>' + snap.closedProjects.length + '</b><span>Закрыто проектов</span></div>' +
      '<div class="glass-card kpi-card"><b class="overdue-text">' + snap.overdueTasks.length + '</b><span>Просрочено задач</span></div>' +
      '<div class="glass-card kpi-card"><b>' + snap.waitingTasks.length + '</b><span>Ожидаем от</span></div>' +
      '<div class="glass-card kpi-card"><b>' + snap.nextPeriodTasks.length + '</b><span>На след. период</span></div>' +
    '</div>' +
    '<h2>Сводка по проектам</h2>' +
    '<div class="glass-table-wrap"><table><thead><tr><th>Проект</th><th>Статус</th><th>Health</th><th>%</th><th>Просрочено задач</th><th>Открытых рисков</th></tr></thead><tbody>' + projRows + '</tbody></table></div>' +
    '<h2>Закрытые задачи за период</h2>' + renderTasksTable(snap.closedTasks) +
    '<h2>Просроченные задачи</h2>' + renderTasksTable(snap.overdueTasks) +
    '<h2>Задачи на следующий период</h2>' + renderTasksTable(snap.nextPeriodTasks) +
    '<h2>Риски без решения</h2>' +
    '<div class="glass-table-wrap"><table><thead><tr><th>Проект</th><th>Риск</th><th>Вероятность</th><th>Влияние</th><th>Ответственный</th></tr></thead><tbody>' + riskRows + '</tbody></table></div>';
}
