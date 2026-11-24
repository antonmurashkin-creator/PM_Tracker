'use strict';

window.openMeetingModal = id => {
  const m = id ? activeRows('Meetings').find(x => x.id === id) : { meeting_date: todayISO(), status: 'Назначена', priority: 'Нормальный' };
  const isNew = !m.id;
  const tasks = activeRows('Tasks');

  openModal(
    '<h2 style="margin:0">' + (isNew ? 'Новая встреча' : 'Карточка встречи') + '</h2>' +
    '<div class="form-grid-2">' +
      '<label class="field">Название встречи *<input name="title" required value="' + esc(m.title || '') + '"></label>' +
      '<label class="field">Дата встречи *<input type="date" name="meeting_date" required value="' + esc(m.meeting_date || '') + '"></label>' +
      '<label class="field">Проект<select name="project_id">' + projectOptions(m.project_id) + '</select></label>' +
      '<label class="field">Связанная задача<select name="task_id"><option value="">— Нет —</option>' +
        tasks.map(t => '<option value="' + t.id + '" ' + (t.id === m.task_id ? 'selected' : '') + '>' + esc(t.title) + '</option>').join('') +
      '</select></label>' +
      '<label class="field">Организатор<input name="organizer" list="peopleDatalist" value="' + esc(m.organizer || '') + '"></label>' +
      '<label class="field">Статус<select name="status">' + selectOptions(MEETING_STATUSES, m.status) + '</select></label>' +
      '<label class="field">Приоритет<select name="priority">' + selectOptions(PRIORITIES, m.priority) + '</select></label>' +
      '<label class="field">Ожидаем от (ФИО)<input name="waiting_for" list="peopleDatalist" value="' + esc(m.waiting_for || '') + '"></label>' +
    '</div>' +
    '<label class="field">Участники (через запятую)<input name="participants" list="peopleDatalist" value="' + esc(m.participants || '') + '"></label>' +
    '<label class="field">Agenda / Повестка<textarea name="agenda">' + esc(m.agenda || '') + '</textarea></label>' +
    '<label class="field">Резюме / Post meet / Follow-up<textarea name="summary">' + esc(m.summary || '') + '</textarea></label>' +
    '<label class="field">Заметки<textarea name="notes">' + esc(m.notes || '') + '</textarea></label>' +
    '<label class="field">Быстрое создание задач по итогам встречи (по одной на строку: Название | Исполнитель | Срок ГГГГ-ММ-ДД | Ждём от)' +
      '<textarea name="quick_tasks" placeholder="Подготовить протокол | Иванов И.И. | 2026-12-01 | "></textarea>' +
    '</label>' +
    '<div class="row" style="justify-content:space-between;margin-top:6px">' +
      '<div>' + (!isNew ? '<button type="button" class="btn btn-danger" onclick="deleteEntity(\'Meetings\',\'' + m.id + '\')">Удалить</button>' : '') + '</div>' +
      '<div class="row">' +
        '<button type="button" class="btn btn-glass" onclick="$(\'#modalDialog\').close()">Отмена</button>' +
        '<button type="submit" class="btn">Сохранить</button>' +
      '</div>' +
    '</div>'
  );

  $('#modalForm').onsubmit = e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.target));
    if (v.status === 'Ожидаем от' && !v.waiting_for.trim()) {
      return alert('Quality Gate: Укажите ФИО в поле «Ожидаем от».');
    }
    const quickLines = v.quick_tasks;
    delete v.quick_tasks;
    const meetingId = m.id || uuid();
    upsertRecord('Meetings', { id: meetingId, ...v });

    String(quickLines || '').split('\n').map(s => s.trim()).filter(Boolean).forEach(line => {
      const parts = line.split('|').map(x => (x || '').trim());
      const title = parts.at(0) || '';
      const assignee = parts.at(1) || '';
      const deadline = parts.at(2) || '';
      const waitFor = parts.at(3) || '';
      if (!title) return;
      upsertRecord('Tasks', {
        title,
        assignee,
        project_id: v.project_id,
        status: waitFor ? 'Ожидаем ответа от' : 'В работе',
        priority: 'Нормальный',
        deadline,
        waiting_for: waitFor,
        is_recurring: 'Нет',
        meeting_id: meetingId
      });
    });

    $('#modalDialog').close();
    saveLocal();
  };
};

window.openRiskModal = (id = null, defaultProjectId = '') => {
  const r = id ? activeRows('Risks').find(x => x.id === id) : { project_id: defaultProjectId, probability: 'Средняя', impact: 'Средняя', status: 'Открыт' };
  const isNew = !r.id;

  openModal(
    '<h2 style="margin:0">' + (isNew ? 'Новый риск' : 'Редактирование риска') + '</h2>' +
    '<label class="field">Описание риска *<input name="risk" required value="' + esc(r.risk || '') + '"></label>' +
    '<div class="form-grid-2">' +
      '<label class="field">Проект<select name="project_id">' + projectOptions(r.project_id) + '</select></label>' +
      '<label class="field">Ответственный<input name="owner" list="peopleDatalist" value="' + esc(r.owner || '') + '"></label>' +
      '<label class="field">Вероятность<select name="probability">' + selectOptions(RISK_LEVELS, r.probability) + '</select></label>' +
      '<label class="field">Влияние<select name="impact">' + selectOptions(RISK_LEVELS, r.impact) + '</select></label>' +
      '<label class="field">Статус<select name="status">' + selectOptions(RISK_STATUSES, r.status) + '</select></label>' +
    '</div>' +
    '<label class="field">Решение по риску (план митигации)<textarea name="mitigation">' + esc(r.mitigation || '') + '</textarea></label>' +
    '<div class="row" style="justify-content:space-between;margin-top:6px">' +
      '<div>' + (!isNew ? '<button type="button" class="btn btn-danger" onclick="deleteEntity(\'Risks\',\'' + r.id + '\')">Удалить</button>' : '') + '</div>' +
      '<div class="row">' +
        '<button type="button" class="btn btn-glass" onclick="$(\'#modalDialog\').close()">Отмена</button>' +
        '<button type="submit" class="btn">Сохранить</button>' +
      '</div>' +
    '</div>'
  );

  $('#modalForm').onsubmit = e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.target));
    upsertRecord('Risks', { id: r.id, ...v });
    $('#modalDialog').close();
    saveLocal();
  };
};

/* ---------- Запуск приложения ---------- */
function renderViewOnly() {
  const titleObj = NAV_ITEMS.find(n => n.id === STATE.view);
  $('#pageTitle').textContent = titleObj ? titleObj.label : 'Сегодня';
  $('#pageSubtitle').textContent = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  (VIEWS[STATE.view] || VIEWS.today)();
}

function render() {
  renderNav();
  renderViewOnly();
}

document.addEventListener('click', e => {
  const nav = e.target.closest('[data-nav]');
  if (nav) {
    e.preventDefault();
    STATE.view = nav.dataset.nav;
    STATE.search = '';
    STATE.status = '';
    STATE.waitingType = '';
    location.hash = STATE.view;
    render();
  }
});

window.addEventListener('hashchange', () => {
  STATE.view = location.hash.slice(1) || 'today';
  render();
});

window.addEventListener('online', () => {
  updateSyncBadge();
  if (CFG.dirty) syncWithServer(true);
});
window.addEventListener('offline', () => updateSyncBadge());

$('#btnQuickSync').addEventListener('click', () => syncWithServer(false));

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

loadLocal();
updateSyncBadge();
updatePeopleDatalist();
render();
if (CFG.url && navigator.onLine) {
  syncWithServer(true);
}
