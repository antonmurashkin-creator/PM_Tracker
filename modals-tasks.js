'use strict';

function calcNextRecurrenceDate(dateStr, rule) {
  const d = new Date(dateStr || todayISO());
  if (rule === 'ежедневно') d.setDate(d.getDate() + 1);
  else if (rule === 'по будням') {
    do {
      d.setDate(d.getDate() + 1);
    } while (d.getDay() === 0 || d.getDay() === 6);
  } else if (rule === 'еженедельно') d.setDate(d.getDate() + 7);
  else if (rule === 'раз в 2 недели') d.setDate(d.getDate() + 14);
  else if (rule === 'ежемесячно') d.setMonth(d.getMonth() + 1);
  else if (rule === 'ежеквартально') d.setMonth(d.getMonth() + 3);
  return d.toISOString().slice(0, 10);
}

function handleRecurringSpawn(task, prevStatus) {
  if (task.status === 'Готово' && prevStatus !== 'Готово' && task.is_recurring === 'Да' && task.recurrence_rule) {
    const duration = (task.start_date && task.deadline) ? diffDays(task.start_date, task.deadline) : 0;
    const baseStart = task.start_date || todayISO();
    const nextStart = calcNextRecurrenceDate(baseStart, task.recurrence_rule);
    const nextDeadline = task.deadline ? addDays(nextStart, Math.max(0, duration)) : '';

    upsertRecord('Tasks', {
      title: task.title,
      assignee: task.assignee,
      project_id: task.project_id,
      linked_ids: task.linked_ids,
      status: 'В работе',
      priority: task.priority,
      start_date: nextStart,
      deadline: nextDeadline,
      waiting_for: '',
      goal: task.goal,
      dod: task.dod,
      result: '',
      notes: task.notes,
      is_recurring: 'Да',
      recurrence_rule: task.recurrence_rule,
      meeting_id: '',
      done_at: ''
    });
  }
}

window.openTaskModal = id => {
  const t = id ? activeRows('Tasks').find(x => x.id === id) : { status: 'В работе', priority: 'Нормальный', is_recurring: 'Нет', recurrence_rule: 'еженедельно' };
  const isNew = !t.id;
  const prevStatus = t.status;
  const linkedSet = new Set(String(t.linked_ids || '').split(',').map(s => s.trim()).filter(Boolean));
  const otherTasks = activeRows('Tasks').filter(x => x.id !== t.id);

  const linksHtml = otherTasks.map(ot =>
    '<label class="check-item">' +
      '<input type="checkbox" class="link-chk" value="' + ot.id + '" ' + (linkedSet.has(ot.id) ? 'checked' : '') + '>' +
      '<span>' + esc(ot.title) + ' <span class="muted">(' + esc(projectTitle(ot.project_id)) + ')</span></span>' +
    '</label>'
  ).join('') || '<span class="muted">Других задач нет</span>';

  openModal(
    '<h2 style="margin:0">' + (isNew ? 'Новая задача' : 'Редактирование задачи') + '</h2>' +
    '<label class="field">Название задачи *<input name="title" required value="' + esc(t.title || '') + '"></label>' +
    '<div class="form-grid-2">' +
      '<label class="field">Проект<select name="project_id">' + projectOptions(t.project_id) + '</select></label>' +
      '<label class="field">Исполнитель<input name="assignee" list="peopleDatalist" value="' + esc(t.assignee || '') + '"></label>' +
      '<label class="field">Статус<select name="status">' + selectOptions(TASK_STATUSES, t.status) + '</select></label>' +
      '<label class="field">Приоритет<select name="priority">' + selectOptions(PRIORITIES, t.priority) + '</select></label>' +
      '<label class="field">Дата начала<input type="date" name="start_date" value="' + esc(t.start_date || '') + '"></label>' +
      '<label class="field">Дедлайн<input type="date" name="deadline" value="' + esc(t.deadline || '') + '"></label>' +
      '<label class="field">Ожидаем от (ФИО)<input name="waiting_for" list="peopleDatalist" value="' + esc(t.waiting_for || '') + '"></label>' +
      '<span></span>' +
      '<label class="field">Повторяющаяся задача<select name="is_recurring">' +
        '<option value="Нет" ' + (t.is_recurring !== 'Да' ? 'selected' : '') + '>Нет</option>' +
        '<option value="Да" ' + (t.is_recurring === 'Да' ? 'selected' : '') + '>Да</option>' +
      '</select></label>' +
      '<label class="field">Периодичность<select name="recurrence_rule">' + selectOptions(RECURRENCE_RULES, t.recurrence_rule) + '</select></label>' +
    '</div>' +
    '<label class="field">Цель / Суть задачи<textarea name="goal">' + esc(t.goal || '') + '</textarea></label>' +
    '<label class="field">Критерии завершенности (DoD)<textarea name="dod">' + esc(t.dod || '') + '</textarea></label>' +
    '<label class="field">Фактический результат (обязателен для статуса «Готово»)<textarea name="result">' + esc(t.result || '') + '</textarea></label>' +
    '<label class="field">Заметки<textarea name="notes">' + esc(t.notes || '') + '</textarea></label>' +
    '<details style="border:1px solid var(--glass-border);border-radius:12px;padding:8px">' +
      '<summary style="cursor:pointer;font-weight:600">Связанные задачи (' + linkedSet.size + ')</summary>' +
      '<div style="max-height:140px;overflow-y:auto;margin-top:8px;display:grid;gap:4px">' + linksHtml + '</div>' +
    '</details>' +
    '<div class="row" style="justify-content:space-between;margin-top:6px">' +
      '<div>' + (!isNew ? '<button type="button" class="btn btn-danger" onclick="deleteEntity(\'Tasks\',\'' + t.id + '\')">Удалить</button>' : '') + '</div>' +
      '<div class="row">' +
        '<button type="button" class="btn btn-glass" onclick="$(\'#modalDialog\').close()">Отмена</button>' +
        '<button type="submit" class="btn">Сохранить</button>' +
      '</div>' +
    '</div>'
  );

  $('#modalForm').onsubmit = e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.target));
    if (v.status === 'Готово' && !v.result.trim()) {
      return alert('Quality Gate: Заполните поле «Фактический результат» перед переводом задачи в статус «Готово».');
    }
    if (v.status === 'Ожидаем ответа от' && !v.waiting_for.trim()) {
      return alert('Quality Gate: Укажите ФИО в поле «Ожидаем от».');
    }
    const checkedLinks = Array.from(document.querySelectorAll('.link-chk:checked')).map(el => el.value);
    const doneAt = v.status === 'Готово' ? (t.done_at || todayISO()) : '';
    const record = { id: t.id, meeting_id: t.meeting_id || '', ...v, linked_ids: checkedLinks.join(','), done_at: doneAt };
    upsertRecord('Tasks', record);
    handleRecurringSpawn(record, prevStatus);
    $('#modalDialog').close();
    saveLocal();
  };
};
