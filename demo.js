'use strict';

window.loadDemoData = () => {
  const hasDemo = Object.values(DB).some(list => (list || new Array()).some(r => !r.is_deleted && String(r.id).startsWith('demo-')));
  if (hasDemo && !confirm('Демо-данные уже загружены. Добавить ещё один комплект?')) return;

  const td = todayISO();
  const dId = () => 'demo-' + uuid();
  const p1 = dId(), p2 = dId(), p3 = dId();
  const t1 = dId(), t2 = dId(), m1 = dId();

  upsertRecord('Projects', {
    id: p1,
    title: 'Внедрение единого мониторинга',
    owner: 'Смирнов А.В.',
    assignee: 'Иванов И.И.',
    status: 'В работе',
    priority: 'Критичный',
    waiting_for: '',
    start_date: addDays(td, -20),
    deadline: addDays(td, 25),
    goal: 'Покрыть 100% критичных сервисов алертингом и сократить MTTR на 30%',
    dod: 'Настроены дашборды, алерты в Telegram, проведено обучение дежурных',
    motivation: 'Снижение времени простоя при инцидентах',
    resources: '2 DevOps-инженера, сервер Prometheus/Grafana',
    dov: 'Сокращение убытков от простоев на 1.5 млн руб./год',
    dos: '0 пропущенных критичных инцидентов за 2 месяца после запуска',
    finance: 'Бюджет 450 000 руб. (в рамках лимита)',
    notes: 'Пилот на 5 сервисах прошёл успешно'
  });

  upsertRecord('Projects', {
    id: p2,
    title: 'Миграция портала самообслуживания',
    owner: 'Козлова Е.С.',
    assignee: 'Петров П.П.',
    status: 'Ожидает ответа',
    priority: 'Срочно',
    waiting_for: 'Белов Д.М. (ИБ)',
    start_date: addDays(td, -14),
    deadline: addDays(td, 12),
    goal: 'Перевести приём заявок сотрудников на новый портал JSM',
    dod: 'Согласована матрица доступов, перенесены 15 шаблонов заявок',
    motivation: 'Уход от устаревшей системы заявок',
    resources: 'Аналитик, администратор Jira',
    dov: 'Ускорение обработки заявок на 40%',
    dos: 'CSI пользователей не ниже 4.6 из 5',
    finance: 'Внутренние ресурсы команды'
  });

  upsertRecord('Projects', {
    id: p3,
    title: 'Аудит подрядчиков ИТ-инфраструктуры',
    owner: 'Смирнов А.В.',
    assignee: 'Сидорова М.К.',
    status: 'В приемке',
    priority: 'Нормальный',
    waiting_for: '',
    start_date: addDays(td, -35),
    deadline: addDays(td, -2),
    goal: 'Проверить соблюдение SLA по всем действующим договорам сопровождения',
    dod: 'Подготовлен сводный отчёт и план оптимизации контрактов',
    closure_report: 'Аудит 12 подрядчиков завершён. Выявлено 3 договора с завышенными тарифами.',
    benefit_report: ''
  });

  upsertRecord('Milestones', { id: dId(), project_id: p1, title: 'Запуск пилота на продакшн-кластере', due_date: addDays(td, -5), is_done: 'Да' });
  upsertRecord('Milestones', { id: dId(), project_id: p1, title: 'Подключение всех 20 микросервисов', due_date: addDays(td, 4), is_done: 'Нет' });
  upsertRecord('Milestones', { id: dId(), project_id: p2, title: 'Согласование требований ИБ', due_date: addDays(td, -1), is_done: 'Нет' });

  upsertRecord('Tasks', {
    id: t1,
    title: 'Собрать матрицу метрик по сервисам',
    assignee: 'Иванов И.И.',
    project_id: p1,
    linked_ids: '',
    status: 'Готово',
    priority: 'Критичный',
    start_date: addDays(td, -18),
    deadline: addDays(td, -10),
    goal: 'Определить пороги срабатывания алертов',
    dod: 'Таблица метрик согласована с тимлидами',
    result: 'Согласовано 48 метрик по 20 сервисам, файл приложен в Confluence',
    is_recurring: 'Нет',
    done_at: addDays(td, -9)
  });

  upsertRecord('Tasks', {
    id: t2,
    title: 'Настроить интеграцию алертов в Telegram',
    assignee: 'Иванов И.И.',
    project_id: p1,
    linked_ids: t1,
    status: 'В работе',
    priority: 'Срочно',
    start_date: addDays(td, -4),
    deadline: td,
    goal: 'Оперативное оповещение дежурной смены',
    dod: 'Тестовый алерт приходит в канал дежурных за < 15 секунд',
    is_recurring: 'Нет'
  });

  upsertRecord('Tasks', {
    id: dId(),
    title: 'Подготовить инструкцию для первой линии поддержки',
    assignee: 'Сидорова М.К.',
    project_id: p1,
    linked_ids: t2,
    status: 'В работе',
    priority: 'Нормальный',
    start_date: addDays(td, -7),
    deadline: addDays(td, -2),
    goal: 'Снизить эскалации на 2-ю линию',
    dod: 'Опубликована база знаний из 10 типовых сценариев',
    is_recurring: 'Нет'
  });

  upsertRecord('Tasks', {
    id: dId(),
    title: 'Согласовать модель ролей и прав доступа',
    assignee: 'Петров П.П.',
    project_id: p2,
    linked_ids: '',
    status: 'Ожидаем ответа от',
    priority: 'Критичный',
    start_date: addDays(td, -5),
    deadline: addDays(td, 2),
    waiting_for: 'Белов Д.М. (ИБ)',
    goal: 'Получить официальное одобрение от отдела информационной безопасности',
    dod: 'Подписанный чек-лист ИБ',
    is_recurring: 'Нет'
  });

  upsertRecord('Tasks', {
    id: dId(),
    title: 'Еженедельный статус-отчёт по портфелю проектов',
    assignee: 'Смирнов А.В.',
    project_id: '',
    linked_ids: '',
    status: 'В работе',
    priority: 'Нормальный',
    start_date: td,
    deadline: addDays(td, 3),
    goal: 'Синхронизация с руководством по статусам и блокерам',
    dod: 'Отправлено резюме по всем активным проектам',
    is_recurring: 'Да',
    recurrence_rule: 'еженедельно'
  });

  upsertRecord('Meetings', {
    id: m1,
    title: 'Синк по архитектуре мониторинга и алертинга',
    meeting_date: addDays(td, 1),
    project_id: p1,
    task_id: t2,
    organizer: 'Смирнов А.В.',
    participants: 'Смирнов А.В., Иванов И.И., Сидорова М.К.',
    waiting_for: '',
    status: 'Назначена',
    priority: 'Срочно',
    agenda: '1. Проверка нагрузочного тестирования Prometheus\n2. Правила эскалации ночных инцидентов'
  });

  upsertRecord('Meetings', {
    id: dId(),
    title: 'Согласование требований ИБ по порталу',
    meeting_date: addDays(td, 3),
    project_id: p2,
    task_id: '',
    organizer: 'Козлова Е.С.',
    participants: 'Козлова Е.С., Петров П.П., Белов Д.М. (ИБ)',
    waiting_for: 'Белов Д.М. (ИБ)',
    status: 'Ожидаем от',
    priority: 'Критичный',
    agenda: 'Разбор замечаний ИБ по хранению персональных данных в заявках'
  });

  upsertRecord('Risks', {
    id: dId(),
    project_id: p1,
    risk: 'Высокая нагрузка на БД при сборе метрик каждые 5 секунд',
    probability: 'Средняя',
    impact: 'Высокая',
    mitigation: 'Увеличить интервал опроса некритичных сервисов до 30 сек и настроить ретеншн 14 дней',
    status: 'В работе',
    owner: 'Иванов И.И.'
  });

  upsertRecord('Risks', {
    id: dId(),
    project_id: p2,
    risk: 'Задержка запуска портала из-за замечаний отдела ИБ',
    probability: 'Высокая',
    impact: 'Высокая',
    mitigation: '',
    status: 'Открыт',
    owner: 'Козлова Е.С.'
  });

  saveLocal();
  alert('Демонстрационные данные загружены!');
};

window.clearDemoData = () => {
  let removed = 0;
  Object.keys(DB).forEach(table => {
    (DB[table] || new Array()).forEach(item => {
      if (!item.is_deleted && String(item.id).startsWith('demo-')) {
        softDeleteRecord(table, item.id);
        removed++;
      }
    });
  });
  if (!removed) return alert('Активных демо-данных не найдено.');
  saveLocal();
  alert('Удалено демо-записей: ' + removed + '. Ваши рабочие данные сохранены.');
};

window.exportDatabaseJSON = () => {
  const payload = {
    exported_at: nowISO(),
    version: '1.0',
    data: DB
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'PM_Liquid_Backup_' + todayISO() + '.json';
  a.click();
};

window.importDatabaseJSON = (input, replaceAll) => {
  const file = input.files && input.files.item(0);
  if (!file) return;
  file.text().then(text => {
    try {
      const parsed = JSON.parse(text);
      const source = parsed.data || parsed;
      const validTables = Object.keys(DB).filter(k => Array.isArray(source[k]));
      if (!validTables.length) throw new Error('Файл не содержит таблиц трекера');

      if (replaceAll) {
        if (!confirm('Полностью заменить текущую локальную базу данными из файла?')) return;
        const ts = nowISO();
        Object.keys(DB).forEach(k => {
          DB[k] = Array.isArray(source[k])
            ? source[k].map(row => ({ ...row, updated_at: ts }))
            : new Array();
        });
      } else {
        let count = 0;
        validTables.forEach(k => {
          source[k].forEach(row => {
            if (row && row.id) {
              upsertRecord(k, row);
              count++;
            }
          });
        });
        alert('Объединено записей: ' + count);
      }
      saveLocal();
    } catch (e) {
      alert('Ошибка чтения JSON: ' + e.message);
    } finally {
      input.value = '';
    }
  });
};
