'use strict';

const REVIEW_CHECKLIST = [
  'Разобрать входящие и бэклог',
  'Проверить waiting for и напомнить',
  'Обновить статусы по проектам и задачам',
  'Проверить и пересмотреть риски',
  'Проверить вехи на 2 недели',
  'Запланировать приоритеты на неделю'
];

function renderReviewView(type) {
  const [start, end] = type === 'Weekly' ? getWeekBounds() : getMonthBounds();
  $('#headerActions').innerHTML = '<button class="btn btn-glass" onclick="window.print()">Печать / PDF</button>';
  renderFilterBar({ show: false });

  const rev = activeRows('Reviews').find(r => r.type === type && r.period_start === start);
  const checks = rev && rev.checks_json ? JSON.parse(rev.checks_json) : new Array();
  const snap = buildPeriodSnapshot(start, end);
  const pastReviews = activeRows('Reviews')
    .filter(r => r.type === type && r.period_start !== start)
    .sort((a, b) => (b.period_start || '').localeCompare(a.period_start || ''));

  const checklistHtml = REVIEW_CHECKLIST.map((label, idx) =>
    '<label class="check-item">' +
      '<input type="checkbox" ' + (checks.includes(idx) ? 'checked' : '') + ' onchange="toggleReviewCheck(\'' + type + '\',\'' + start + '\',\'' + end + '\',' + idx + ',this.checked)">' +
      '<span>' + esc(label) + '</span>' +
    '</label>'
  ).join('');

  const pastHtml = pastReviews.length
    ? '<h2>Прошлые обзоры (' + type + ')</h2><div class="cards-grid">' + pastReviews.map(r =>
        '<div class="glass-card" style="cursor:pointer" onclick="openPastReviewModal(\'' + r.id + '\')">' +
          '<b>' + fmtDate(r.period_start) + ' — ' + fmtDate(r.period_end) + '</b>' +
          '<div class="muted" style="font-size:12px;margin-top:6px">' +
            (r.achievements ? '<div>✔ ' + esc(r.achievements.slice(0, 90)) + '</div>' : '') +
            (r.next_focus ? '<div>→ ' + esc(r.next_focus.slice(0, 90)) + '</div>' : '') +
          '</div>' +
        '</div>'
      ).join('') + '</div>'
    : '';

  $('#viewContainer').innerHTML =
    '<div class="glass-card"><b>Период: ' + fmtDate(start) + ' — ' + fmtDate(end) + '</b><div class="checklist-grid">' + checklistHtml + '</div></div>' +
    '<div class="glass-card" style="margin-top:14px">' +
      '<h2 style="margin-top:0">Рефлексия и итоги периода</h2>' +
      '<div class="form-grid-2">' +
        '<label class="field">Достижения периода<textarea onchange="saveReviewField(\'' + type + '\',\'' + start + '\',\'' + end + '\',\'achievements\',this.value)">' + esc(rev?.achievements || '') + '</textarea></label>' +
        '<label class="field">Проблемы / блокеры<textarea onchange="saveReviewField(\'' + type + '\',\'' + start + '\',\'' + end + '\',\'blockers\',this.value)">' + esc(rev?.blockers || '') + '</textarea></label>' +
        '<label class="field">Где требуется эскалация и помощь руководителя<textarea onchange="saveReviewField(\'' + type + '\',\'' + start + '\',\'' + end + '\',\'escalation\',this.value)">' + esc(rev?.escalation || '') + '</textarea></label>' +
        '<label class="field">Фокус на следующий период<textarea onchange="saveReviewField(\'' + type + '\',\'' + start + '\',\'' + end + '\',\'next_focus\',this.value)">' + esc(rev?.next_focus || '') + '</textarea></label>' +
      '</div>' +
      '<label class="field" style="margin-top:10px">Выводы / уроки<textarea onchange="saveReviewField(\'' + type + '\',\'' + start + '\',\'' + end + '\',\'lessons\',this.value)">' + esc(rev?.lessons || '') + '</textarea></label>' +
    '</div>' +
    renderAnalyticsTables(snap) +
    pastHtml;
}

window.toggleReviewCheck = (type, start, end, idx, checked) => {
  const rev = activeRows('Reviews').find(r => r.type === type && r.period_start === start);
  let checks = rev && rev.checks_json ? JSON.parse(rev.checks_json) : new Array();
  checks = checks.filter(i => i !== idx);
  if (checked) checks.push(idx);
  const snap = buildPeriodSnapshot(start, end);
  upsertRecord('Reviews', {
    id: rev?.id,
    type,
    period_start: start,
    period_end: end,
    checks_json: JSON.stringify(checks),
    metrics_json: JSON.stringify({ closedTasks: snap.closedTasks.length, overdue: snap.overdueTasks.length })
  });
  saveLocal();
};

window.saveReviewField = (type, start, end, field, value) => {
  const rev = activeRows('Reviews').find(r => r.type === type && r.period_start === start);
  const snap = buildPeriodSnapshot(start, end);
  upsertRecord('Reviews', {
    id: rev?.id,
    type,
    period_start: start,
    period_end: end,
    [field]: value,
    metrics_json: JSON.stringify({ closedTasks: snap.closedTasks.length, overdue: snap.overdueTasks.length })
  });
  saveLocal();
};

window.openPastReviewModal = id => {
  const r = activeRows('Reviews').find(x => x.id === id);
  if (!r) return;
  openModal(
    '<h2 style="margin:0">Обзор ' + esc(r.type) + ': ' + fmtDate(r.period_start) + ' — ' + fmtDate(r.period_end) + '</h2>' +
    '<div><b>Достижения:</b><div class="muted">' + esc(r.achievements || '—') + '</div></div>' +
    '<div><b>Проблемы / блокеры:</b><div class="muted">' + esc(r.blockers || '—') + '</div></div>' +
    '<div><b>Эскалация:</b><div class="muted">' + esc(r.escalation || '—') + '</div></div>' +
    '<div><b>Фокус следующего периода:</b><div class="muted">' + esc(r.next_focus || '—') + '</div></div>' +
    '<div><b>Выводы / уроки:</b><div class="muted">' + esc(r.lessons || '—') + '</div></div>' +
    '<div class="row" style="justify-content:flex-end"><button type="button" class="btn" onclick="$(\'#modalDialog\').close()">Закрыть</button></div>'
  );
};

VIEWS.weekly = () => renderReviewView('Weekly');
VIEWS.monthly = () => renderReviewView('Monthly');
