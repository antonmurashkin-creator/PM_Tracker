'use strict';

function openModal(html) {
  const dlg = $('#modalDialog');
  const form = $('#modalForm');
  form.innerHTML = html;
  dlg.showModal();
}

function selectOptions(arr, cur) {
  return arr.map(v => '<option value="' + esc(v) + '" ' + (v === cur ? 'selected' : '') + '>' + esc(v) + '</option>').join('');
}

function projectOptions(cur) {
  return '<option value="">— Без проекта —</option>' +
    activeRows('Projects').map(p => '<option value="' + p.id + '" ' + (p.id === cur ? 'selected' : '') + '>' + esc(p.title) + '</option>').join('');
}

window.deleteEntity = (table, id) => {
  if (!confirm('Удалить запись?')) return;
  softDeleteRecord(table, id);
  $('#modalDialog').close();
  saveLocal();
};

window.openProjectModal = id => {
  const p = id ? getProject(id) : { status: 'Инициация', priority: 'Нормальный' };
  const isNew = !p.id;
  const milestones = isNew ? new Array() : activeRows('Milestones').filter(m => m.project_id === p.id);
  const risks = isNew ? new Array() : activeRows('Risks').filter(r => r.project_id === p.id);

  let extraBlocks = '';
  if (!isNew) {
    const msRows = milestones.map(m =>
      '<div class="row" style="justify-content:space-between;font-size:13px">' +
        '<span>' + (m.is_done === 'Да' ? '☑' : '◆') + ' ' + esc(m.title) + ' — <b>' + fmtDate(m.due_date) + '</b></span>' +
        '<button type="button" class="btn btn-glass btn-sm" onclick="openMilestoneModal(\'' + p.id + '\',\'' + m.id + '\')">Изм.</button>' +
      '</div>'
    ).join('') || '<span class="muted">Вех нет</span>';

    const rkRows = risks.map(r =>
      '<div class="row" style="justify-content:space-between;font-size:13px">' +
        '<span>[' + esc(r.status) + '] ' + esc(r.risk) + ' (Отв.: ' + esc(r.owner || '—') + ')</span>' +
        '<button type="button" class="btn btn-glass btn-sm" onclick="openRiskModal(\'' + r.id + '\')">Изм.</button>' +
      '</div>'
    ).join('') || '<span class="muted">Рисков нет</span>';

    extraBlocks =
      '<div class="glass-card" style="padding:12px">' +
        '<div class="row" style="justify-content:space-between"><b>Вехи проекта (' + milestones.length + ')</b>' +
        '<button type="button" class="btn btn-glass btn-sm" onclick="openMilestoneModal(\'' + p.id + '\')">+ Веха</button></div>' +
        '<div style="margin-top:8px;display:grid;gap:4px">' + msRows + '</div>' +
      '</div>' +
      '<div class="glass-card" style="padding:12px">' +
        '<div class="row" style="justify-content:space-between"><b>Риски проекта (' + risks.length + ')</b>' +
        '<button type="button" class="btn btn-glass btn-sm" onclick="openRiskModal(null,\'' + p.id + '\')">+ Риск</button></div>' +
        '<div style="margin-top:8px;display:grid;gap:4px">' + rkRows + '</div>' +
      '</div>';
  }

  openModal(
    '<h2 style="margin:0">' + (isNew ? 'Новый проект' : 'Редактирование проекта') + '</h2>' +
    '<label class="field">Название проекта *<input name="title" required value="' + esc(p.title || '') + '"></label>' +
    '<div class="form-grid-2">' +
      '<label class="field">Владелец / Инициатор<input name="owner" list="peopleDatalist" value="' + esc(p.owner || '') + '"></label>' +
      '<label class="field">Исполнитель<input name="assignee" list="peopleDatalist" value="' + esc(p.assignee || '') + '"></label>' +
      '<label class="field">Статус<select name="status">' + selectOptions(PROJECT_STATUSES, p.status) + '</select></label>' +
      '<label class="field">Приоритет<select name="priority">' + selectOptions(PRIORITIES, p.priority) + '</select></label>' +
      '<label class="field">Ожидаем от (ФИО)<input name="waiting_for" list="peopleDatalist" value="' + esc(p.waiting_for || '') + '"></label>' +
      '<span></span>' +
      '<label class="field">Дата начала<input type="date" name="start_date" value="' + esc(p.start_date || '') + '"></label>' +
      '<label class="field">Дедлайн<input type="date" name="deadline" value="' + esc(p.deadline || '') + '"></label>' +
    '</div>' +
    '<label class="field">Цель / Суть проекта<textarea name="goal">' + esc(p.goal || '') + '</textarea></label>' +
    '<div class="form-grid-2">' +
      '<label class="field">Критерии завершенности (DoD)<textarea name="dod">' + esc(p.dod || '') + '</textarea></label>' +
      '<label class="field">Мотивация<textarea name="motivation">' + esc(p.motivation || '') + '</textarea></label>' +
      '<label class="field">Ресурсы<textarea name="resources">' + esc(p.resources || '') + '</textarea></label>' +
      '<label class="field">Критерии пользы (DoV)<textarea name="dov">' + esc(p.dov || '') + '</textarea></label>' +
      '<label class="field">Критерии успеха (DoS)<textarea name="dos">' + esc(p.dos || '') + '</textarea></label>' +
      '<label class="field">Финансы<textarea name="finance">' + esc(p.finance || '') + '</textarea></label>' +
      '<label class="field">Отчёт о закрытии проекта (обязателен для «В приемке»)<textarea name="closure_report">' + esc(p.closure_report || '') + '</textarea></label>' +
      '<label class="field">Отчёт о пользе проекта (обязателен для «Готово»)<textarea name="benefit_report">' + esc(p.benefit_report || '') + '</textarea></label>' +
    '</div>' +
    '<label class="field">Заметки<textarea name="notes">' + esc(p.notes || '') + '</textarea></label>' +
    extraBlocks +
    '<div class="row" style="justify-content:space-between;margin-top:6px">' +
      '<div>' + (!isNew ? '<button type="button" class="btn btn-danger" onclick="deleteEntity(\'Projects\',\'' + p.id + '\')">Удалить</button>' : '') + '</div>' +
      '<div class="row">' +
        '<button type="button" class="btn btn-glass" onclick="$(\'#modalDialog\').close()">Отмена</button>' +
        '<button type="submit" class="btn">Сохранить</button>' +
      '</div>' +
    '</div>'
  );

  $('#modalForm').onsubmit = e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.target));
    if (v.status === 'В приемке' && !v.closure_report.trim()) {
      return alert('Quality Gate: Заполните «Отчёт о закрытии проекта» перед переводом в статус «В приемке».');
    }
    if (v.status === 'Готово' && !v.benefit_report.trim()) {
      return alert('Quality Gate: Заполните «Отчёт о пользе проекта» перед переводом в статус «Готово».');
    }
    if (v.status === 'Ожидает ответа' && !v.waiting_for.trim()) {
      return alert('Quality Gate: Укажите ФИО в поле «Ожидаем от».');
    }
    upsertRecord('Projects', { id: p.id, ...v });
    $('#modalDialog').close();
    saveLocal();
  };
};

window.openMilestoneModal = (projectId, msId = null) => {
  const m = msId ? activeRows('Milestones').find(x => x.id === msId) : { project_id: projectId, is_done: 'Нет' };
  openModal(
    '<h2 style="margin:0">' + (msId ? 'Редактирование вехи' : 'Новая веха') + '</h2>' +
    '<label class="field">Название вехи *<input name="title" required value="' + esc(m.title || '') + '"></label>' +
    '<div class="form-grid-2">' +
      '<label class="field">Дата вехи *<input type="date" name="due_date" required value="' + esc(m.due_date || '') + '"></label>' +
      '<label class="field">Выполнена<select name="is_done"><option value="Нет" ' + (m.is_done !== 'Да' ? 'selected' : '') + '>Нет</option><option value="Да" ' + (m.is_done === 'Да' ? 'selected' : '') + '>Да</option></select></label>' +
    '</div>' +
    '<div class="row" style="justify-content:space-between">' +
      '<div>' + (msId ? '<button type="button" class="btn btn-danger" onclick="deleteEntity(\'Milestones\',\'' + msId + '\');openProjectModal(\'' + projectId + '\')">Удалить</button>' : '') + '</div>' +
      '<div class="row">' +
        '<button type="button" class="btn btn-glass" onclick="openProjectModal(\'' + projectId + '\')">Назад к проекту</button>' +
        '<button type="submit" class="btn">Сохранить</button>' +
      '</div>' +
    '</div>'
  );

  $('#modalForm').onsubmit = e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.target));
    upsertRecord('Milestones', { id: m.id, project_id: projectId, ...v });
    saveLocal();
    openProjectModal(projectId);
  };
};
