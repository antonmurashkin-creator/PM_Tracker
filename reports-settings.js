'use strict';

VIEWS.reports = () => {
  const [start, end] = getReportBounds();
  $('#headerActions').innerHTML =
    '<button class="btn btn-glass" onclick="exportReportCSV()">Экспорт CSV</button>' +
    '<button class="btn" onclick="window.print()">Печать / PDF</button>';
  renderFilterBar({ show: false });

  const projects = activeRows('Projects');
  const snap = buildPeriodSnapshot(start, end, STATE.projectId);
  const periods = [
    ['week', 'Неделя'], ['month', 'Месяц'], ['quarter', 'Квартал'],
    ['half', 'Полугодие'], ['year', 'Год'], ['custom', 'Произвольный период']
  ];

  const customInputs = STATE.reportPeriod === 'custom'
    ? '<input type="date" value="' + esc(start) + '" onchange="STATE.reportFrom=this.value;render()"><span>—</span>' +
      '<input type="date" value="' + esc(end) + '" onchange="STATE.reportTo=this.value;render()">'
    : '';

  $('#viewContainer').innerHTML =
    '<div class="glass-card no-print"><div class="row">' +
      '<select onchange="STATE.reportPeriod=this.value;render()">' +
        periods.map(([k, v]) => '<option value="' + k + '" ' + (STATE.reportPeriod === k ? 'selected' : '') + '>' + v + '</option>').join('') +
      '</select>' +
      customInputs +
      '<select onchange="STATE.projectId=this.value;render()">' +
        '<option value="">Все проекты</option>' +
        projects.map(p => '<option value="' + p.id + '" ' + (STATE.projectId === p.id ? 'selected' : '') + '>' + esc(p.title) + '</option>').join('') +
      '</select>' +
    '</div></div>' +
    '<div class="subtitle" style="margin-top:8px">Отчётный период: <b>' + fmtDate(start) + ' — ' + fmtDate(end) + '</b></div>' +
    renderAnalyticsTables(snap);
};

window.exportReportCSV = () => {
  const [start, end] = getReportBounds();
  const snap = buildPeriodSnapshot(start, end, STATE.projectId);
  const rows = [
    ['Категория', 'Название', 'Проект', 'Исполнитель', 'Приоритет', 'Статус', 'Дедлайн', 'Критерии / DoD', 'Результат'],
    ...snap.closedTasks.map(t => ['Закрыто', t.title, projectTitle(t.project_id), t.assignee, t.priority, t.status, t.deadline, t.dod, t.result]),
    ...snap.overdueTasks.map(t => ['Просрочено', t.title, projectTitle(t.project_id), t.assignee, t.priority, t.status, t.deadline, t.dod, t.result]),
    ...snap.nextPeriodTasks.map(t => ['След. период', t.title, projectTitle(t.project_id), t.assignee, t.priority, t.status, t.deadline, t.dod, t.result])
  ];
  const csv = '\uFEFF' + rows.map(r => r.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'PM_Report_' + start + '_' + end + '.csv';
  a.click();
};

VIEWS.settings = () => {
  $('#headerActions').innerHTML = '';
  renderFilterBar({ show: false });

  const sheetLink = CFG.sheetUrl
    ? '<div>Ссылка на таблицу: <a href="' + esc(CFG.sheetUrl) + '" target="_blank" style="color:var(--accent);font-weight:600">Открыть Google Таблицу ↗</a></div>'
    : '';

  $('#viewContainer').innerHTML =
    '<div class="cards-grid">' +
      '<div class="glass-card" style="display:grid;gap:12px">' +
        '<h2 style="margin:0">Подключение Google Apps Script</h2>' +
        '<label class="field">URL веб-приложения (/exec)<input id="cfgUrl" value="' + esc(CFG.url) + '" placeholder="https://google.com"></label>' +
        '<label class="field">Секретный ключ доступа / PIN-код<input id="cfgToken" type="password" value="' + esc(CFG.token) + '" placeholder="Введите секретный ключ"></label>' +
        '<div class="row">' +
          '<button class="btn" onclick="saveConnectionSettings()">Сохранить и синхронизировать</button>' +
          '<button class="btn btn-glass" onclick="syncWithServer(false)">↻ Принудительная синхронизация</button>' +
        '</div>' +
        '<div class="muted" style="font-size:12px">Статус: <b>' + (CFG.lastSync ? 'Синхронизировано ' + new Date(CFG.lastSync).toLocaleString('ru-RU') : 'Не синхронизировалось') + '</b></div>' +
      '</div>' +

      '<div class="glass-card" style="display:grid;gap:12px">' +
        '<h2 style="margin:0">Инициализация БД и внешний вид</h2>' +
        '<div class="muted" style="font-size:13px">Автоматически создаст новую Google Таблицу на вашем Диске со всеми необходимыми листами и заголовками.</div>' +
        '<div><button class="btn" onclick="initRemoteSpreadsheet()">Создать пустую таблицу для первого запуска</button></div>' +
        sheetLink +
        '<label class="field">Тема оформления Liquid Glass' +
          '<select onchange="CFG.theme=this.value;saveCfg();applyTheme()">' +
            '<option value="system" ' + (CFG.theme === 'system' ? 'selected' : '') + '>Системная</option>' +
            '<option value="light" ' + (CFG.theme === 'light' ? 'selected' : '') + '>Светлая</option>' +
            '<option value="dark" ' + (CFG.theme === 'dark' ? 'selected' : '') + '>Тёмная</option>' +
          '</select>' +
        '</label>' +

        '<div style="border-top:1px solid var(--glass-border);padding-top:10px;display:grid;gap:8px">' +
          '<div style="font-size:12px;font-weight:600;color:var(--text-muted)">Резервное копирование (JSON)</div>' +
          '<div class="row">' +
            '<button class="btn btn-glass btn-sm" onclick="exportDatabaseJSON()">⬇ Скачать JSON</button>' +
            '<label class="btn btn-glass btn-sm" style="cursor:pointer">⬆ Объединить из JSON<input type="file" accept=".json" style="display:none" onchange="importDatabaseJSON(this,false)"></label>' +
            '<label class="btn btn-glass btn-sm" style="cursor:pointer">↻ Заменить из JSON<input type="file" accept=".json" style="display:none" onchange="importDatabaseJSON(this,true)"></label>' +
          '</div>' +
        '</div>' +

        '<div style="border-top:1px solid var(--glass-border);padding-top:10px;display:grid;gap:8px">' +
          '<div style="font-size:12px;font-weight:600;color:var(--text-muted)">Управление данными</div>' +
          '<div class="row">' +
            '<button class="btn btn-glass btn-sm" onclick="loadDemoData()">+ Загрузить демо-данные</button>' +
            '<button class="btn btn-glass btn-sm" onclick="clearDemoData()">Удалить только демо-данные</button>' +
            '<button class="btn btn-danger btn-sm" onclick="clearLocalCache()">Очистить весь кэш</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
};

window.saveConnectionSettings = () => {
  CFG.url = $('#cfgUrl').value.trim();
  CFG.token = $('#cfgToken').value.trim();
  saveCfg();
  syncWithServer(false);
};

window.initRemoteSpreadsheet = async () => {
  const url = $('#cfgUrl')?.value.trim() || CFG.url;
  const token = $('#cfgToken')?.value.trim() || CFG.token;
  if (!url) return alert('Сначала укажите URL веб-приложения Apps Script.');
  CFG.url = url;
  CFG.token = token;
  saveCfg();

  updateSyncBadge('Создание таблицы...');
  try {
    const res = await fetch(CFG.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'init', createNew: true, token: CFG.token })
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    CFG.sheetUrl = json.sheetUrl || '';
    saveCfg();
    updateSyncBadge('Таблица готова');
    render();
    alert('Google Таблица успешно создана и инициализирована!');
  } catch (e) {
    updateSyncBadge('Ошибка инициализации');
    alert('Ошибка: ' + e.message);
  }
};

window.clearLocalCache = () => {
  if (!confirm('Очистить весь локальный кэш браузера? Несинхронизированные данные будут потеряны.')) return;
  localStorage.removeItem(STORAGE_KEY);
  Object.keys(DB).forEach(k => { DB[k] = new Array(); });
  CFG.dirty = false;
  saveCfg();
  render();
};
