const STORAGE_KEY = 'calculo-iii-moodle-organizer-v1';

const labels = {
  exists: 'Existe',
  planned: 'Por anadir',
  missing: 'Falta',
  review: 'Por revisar',
  approved: 'Aprobado',
  discarded: 'Descartado',
  video: 'Video',
  link: 'Link',
  file: 'Archivo',
  page: 'Pagina Moodle',
  h5p: 'H5P',
  quiz: 'Pregunta/reto',
  other: 'Otro',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

const state = {
  data: null,
  selectedModuleId: null,
  selectedLessonId: null,
  selectedSectionId: 'preparacion',
  statusFilter: 'all',
  typeFilter: 'all',
  search: '',
};

const dom = {
  nav: document.querySelector('#course-nav'),
  map: document.querySelector('#course-map'),
  tabs: document.querySelector('#section-tabs'),
  list: document.querySelector('#resource-list'),
  totalResources: document.querySelector('#total-resources'),
  missingResources: document.querySelector('#missing-resources'),
  approvedResources: document.querySelector('#approved-resources'),
  reviewResources: document.querySelector('#review-resources'),
  moduleLabel: document.querySelector('#current-module-label'),
  lessonTitle: document.querySelector('#current-lesson-title'),
  lessonMeta: document.querySelector('#current-lesson-meta'),
  sectionHeading: document.querySelector('#section-heading'),
  sectionDescription: document.querySelector('#section-description'),
  statusFilter: document.querySelector('#status-filter'),
  typeFilter: document.querySelector('#type-filter'),
  search: document.querySelector('#search'),
  form: document.querySelector('#resource-form'),
  formTitle: document.querySelector('#form-title'),
  resourceId: document.querySelector('#resource-id'),
  resourceTitle: document.querySelector('#resource-title'),
  resourceType: document.querySelector('#resource-type'),
  resourceStatus: document.querySelector('#resource-status'),
  resourceUrl: document.querySelector('#resource-url'),
  resourceFile: document.querySelector('#resource-file'),
  resourceOwner: document.querySelector('#resource-owner'),
  resourcePriority: document.querySelector('#resource-priority'),
  resourceTarget: document.querySelector('#resource-target'),
  resourceNotes: document.querySelector('#resource-notes'),
  moduleTitleInput: document.querySelector('#module-title-input'),
  lessonTitleInput: document.querySelector('#lesson-title-input'),
  template: document.querySelector('#resource-template'),
};

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
}

function loadStoredData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function allResources() {
  return state.data.modules.flatMap((module) =>
    module.lessons.flatMap((lesson) =>
      (lesson.resources || []).map((resource) => ({ module, lesson, resource }))
    )
  );
}

function currentModule() {
  return state.data.modules.find((module) => module.id === state.selectedModuleId);
}

function currentLesson() {
  const module = currentModule();
  return module?.lessons.find((lesson) => lesson.id === state.selectedLessonId);
}

function currentSection() {
  return state.data.sections.find((section) => section.id === state.selectedSectionId) ?? state.data.sections[0];
}

function selectFirstAvailable() {
  const firstModule = state.data.modules[0];
  const firstLesson = firstModule?.lessons[0];
  state.selectedModuleId = firstModule?.id ?? null;
  state.selectedLessonId = firstLesson?.id ?? null;
  state.selectedSectionId = state.data.sections[0]?.id ?? 'preparacion';
}

function renderSummary() {
  const resources = allResources().map((item) => item.resource);
  dom.totalResources.textContent = resources.length;
  dom.missingResources.textContent = resources.filter((resource) => resource.status === 'missing').length;
  dom.approvedResources.textContent = resources.filter((resource) => resource.status === 'approved').length;
  dom.reviewResources.textContent = resources.filter((resource) => resource.status === 'review').length;
}

function renderNavigation() {
  dom.nav.innerHTML = '';

  state.data.modules.forEach((module) => {
    const moduleNode = document.createElement('section');
    moduleNode.className = 'module-group';
    moduleNode.innerHTML = `<h3>${module.title}</h3>`;

    module.lessons.forEach((lesson) => {
      const resources = lesson.resources || [];
      const missing = resources.filter((resource) => resource.status === 'missing').length;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'lesson-button';
      if (module.id === state.selectedModuleId && lesson.id === state.selectedLessonId) {
        button.classList.add('active');
      }
      button.innerHTML = `
        <span>${lesson.title}</span>
        <small>${resources.length} recursos${missing ? `, ${missing} faltan` : ''}</small>
      `;
      button.addEventListener('click', () => {
        state.selectedModuleId = module.id;
        state.selectedLessonId = lesson.id;
        clearForm();
        render();
      });
      moduleNode.appendChild(button);
    });

    dom.nav.appendChild(moduleNode);
  });
}

function lessonStats(lesson) {
  const resources = lesson.resources || [];
  return {
    total: resources.length,
    missing: resources.filter((resource) => resource.status === 'missing').length,
    review: resources.filter((resource) => resource.status === 'review').length,
    approved: resources.filter((resource) => resource.status === 'approved').length,
  };
}

function renderCourseMap() {
  dom.map.innerHTML = '';

  state.data.modules.forEach((module, moduleIndex) => {
    const totals = module.lessons.reduce(
      (acc, lesson) => {
        const stats = lessonStats(lesson);
        acc.total += stats.total;
        acc.missing += stats.missing;
        acc.review += stats.review;
        acc.approved += stats.approved;
        return acc;
      },
      { total: 0, missing: 0, review: 0, approved: 0 }
    );

    const card = document.createElement('article');
    card.className = 'map-module';
    card.innerHTML = `
      <div class="map-module-header">
        <div>
          <p class="map-kicker">Modulo ${moduleIndex + 1}</p>
          <h4>${module.title}</h4>
        </div>
        <span class="map-count">${totals.total} recursos</span>
      </div>
      <div class="map-stats">
        <span>${module.lessons.length} lecciones</span>
        <span>${totals.missing} faltan</span>
        <span>${totals.review} revisar</span>
        <span>${totals.approved} aprobados</span>
      </div>
    `;

    const lessons = document.createElement('div');
    lessons.className = 'map-lessons';
    module.lessons.forEach((lesson) => {
      const stats = lessonStats(lesson);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'map-lesson';
      if (module.id === state.selectedModuleId && lesson.id === state.selectedLessonId) {
        button.classList.add('active');
      }
      button.innerHTML = `
        <span class="lesson-name">${lesson.title}</span>
        <span class="lesson-pills">
          <span>${stats.total} rec.</span>
          <span class="${stats.missing ? 'pill-danger' : ''}">${stats.missing} falta</span>
          <span class="${stats.review ? 'pill-warning' : ''}">${stats.review} rev.</span>
        </span>
      `;
      button.addEventListener('click', () => {
        state.selectedModuleId = module.id;
        state.selectedLessonId = lesson.id;
        clearForm();
        render();
      });
      lessons.appendChild(button);
    });

    card.appendChild(lessons);
    dom.map.appendChild(card);
  });
}

function renderTabs() {
  dom.tabs.innerHTML = '';
  state.data.sections.forEach((section) => {
    const count = (currentLesson()?.resources || []).filter((resource) => resource.section === section.id).length;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tab-button';
    if (section.id === state.selectedSectionId) button.classList.add('active');
    button.textContent = `${section.title} (${count})`;
    button.addEventListener('click', () => {
      state.selectedSectionId = section.id;
      clearForm();
      render();
    });
    dom.tabs.appendChild(button);
  });
}

function resourceMatches(resource) {
  const sectionMatch = resource.section === state.selectedSectionId;
  const statusMatch = state.statusFilter === 'all' || resource.status === state.statusFilter;
  const typeMatch = state.typeFilter === 'all' || resource.type === state.typeFilter;
  const haystack = `${resource.title} ${resource.url} ${resource.owner} ${resource.notes}`.toLowerCase();
  const searchMatch = !state.search || haystack.includes(state.search.toLowerCase());
  return sectionMatch && statusMatch && typeMatch && searchMatch;
}

function renderResources() {
  const module = currentModule();
  const lesson = currentLesson();
  const section = currentSection();
  dom.moduleLabel.textContent = module?.title ?? 'Modulo';
  dom.lessonTitle.textContent = lesson?.title ?? 'Selecciona una leccion';
  dom.lessonMeta.textContent = lesson
    ? `${(lesson.resources || []).length} recursos registrados en esta leccion.`
    : 'Elige un punto del curso para organizar sus recursos.';
  dom.sectionHeading.textContent = section?.title ?? 'Recursos';
  dom.sectionDescription.textContent = section?.description ?? '';
  dom.list.innerHTML = '';

  if (!lesson) {
    dom.list.innerHTML = '<p class="empty-state">No hay una leccion seleccionada.</p>';
    return;
  }

  const resources = (lesson.resources || []).filter(resourceMatches);
  if (!resources.length) {
    dom.list.innerHTML = '<p class="empty-state">No hay recursos con estos filtros. Puedes crear uno con el panel de la derecha.</p>';
    return;
  }

  resources.forEach((resource) => {
    const node = dom.template.content.firstElementChild.cloneNode(true);
    node.dataset.resourceId = resource.id;
    node.querySelector('h4').textContent = resource.title;
    node.querySelector('.resource-meta').textContent = `${labels[resource.type] ?? resource.type} · Prioridad ${labels[resource.priority] ?? resource.priority}`;
    node.querySelector('.resource-notes').textContent = resource.notes || 'Sin notas.';

    const link = node.querySelector('.resource-link');
    if (resource.url) {
      link.textContent = resource.url;
      link.title = resource.url;
    } else {
      link.textContent = 'Sin enlace o archivo asociado.';
    }

    const badges = node.querySelector('.badges');
    badges.innerHTML = `
      <span class="badge status-${resource.status}">${labels[resource.status] ?? resource.status}</span>
      ${resource.owner ? `<span class="badge neutral">${resource.owner}</span>` : ''}
    `;

    node.querySelector('.edit').addEventListener('click', () => editResource(resource.id));
    node.querySelector('.delete').addEventListener('click', () => deleteResource(resource.id));
    node.querySelector('.move-up').addEventListener('click', () => moveResource(resource.id, -1));
    node.querySelector('.move-down').addEventListener('click', () => moveResource(resource.id, 1));
    dom.list.appendChild(node);
  });
}

function renderTargets() {
  const currentValue = `${state.selectedModuleId}|${state.selectedLessonId}|${state.selectedSectionId}`;
  dom.resourceTarget.innerHTML = '';
  state.data.modules.forEach((module) => {
    module.lessons.forEach((lesson) => {
      state.data.sections.forEach((section) => {
        const option = document.createElement('option');
        option.value = `${module.id}|${lesson.id}|${section.id}`;
        option.textContent = `${module.title} / ${lesson.title} / ${section.title}`;
        dom.resourceTarget.appendChild(option);
      });
    });
  });
  dom.resourceTarget.value = currentValue;
}

function render() {
  renderSummary();
  renderNavigation();
  renderCourseMap();
  renderTabs();
  renderTargets();
  renderResources();
}

function clearForm() {
  dom.form.reset();
  dom.resourceId.value = '';
  dom.formTitle.textContent = 'Nuevo recurso';
  dom.resourcePriority.value = 'medium';
  dom.resourceStatus.value = 'planned';
  renderTargets();
}

function editResource(resourceId) {
  const lesson = currentLesson();
  const resource = lesson?.resources.find((item) => item.id === resourceId);
  if (!resource) return;
  dom.formTitle.textContent = 'Editar recurso';
  dom.resourceId.value = resource.id;
  dom.resourceTitle.value = resource.title ?? '';
  dom.resourceType.value = resource.type ?? 'link';
  dom.resourceStatus.value = resource.status ?? 'planned';
  dom.resourceUrl.value = resource.url ?? '';
  dom.resourceOwner.value = resource.owner ?? '';
  dom.resourcePriority.value = resource.priority ?? 'medium';
  dom.resourceNotes.value = resource.notes ?? '';
  dom.resourceTarget.value = `${state.selectedModuleId}|${state.selectedLessonId}|${resource.section}`;
}

function findLesson(moduleId, lessonId) {
  const module = state.data.modules.find((item) => item.id === moduleId);
  return module?.lessons.find((item) => item.id === lessonId);
}

function formResource() {
  const selectedFile = dom.resourceFile.files[0];
  const url = selectedFile
    ? `${selectedFile.name} (${Math.round(selectedFile.size / 1024)} KB)`
    : dom.resourceUrl.value.trim();

  return {
    id: dom.resourceId.value || uid('r'),
    title: dom.resourceTitle.value.trim(),
    type: dom.resourceType.value,
    status: dom.resourceStatus.value,
    url,
    owner: dom.resourceOwner.value.trim(),
    priority: dom.resourcePriority.value,
    notes: dom.resourceNotes.value.trim(),
  };
}

function saveResource(event) {
  event.preventDefault();
  if (!dom.resourceTitle.value.trim()) return;
  const [targetModuleId, targetLessonId, targetSectionId] = dom.resourceTarget.value.split('|');
  const targetLesson = findLesson(targetModuleId, targetLessonId);
  if (!targetLesson) return;

  const resource = formResource();
  resource.section = targetSectionId;

  const sourceLesson = currentLesson();
  const existingIndex = sourceLesson?.resources.findIndex((item) => item.id === resource.id) ?? -1;
  if (existingIndex >= 0) {
    sourceLesson.resources.splice(existingIndex, 1);
  }

  targetLesson.resources = targetLesson.resources || [];
  targetLesson.resources.push(resource);
  state.selectedModuleId = targetModuleId;
  state.selectedLessonId = targetLessonId;
  state.selectedSectionId = targetSectionId;
  saveData();
  clearForm();
  render();
}

function duplicateResource() {
  if (!dom.resourceId.value) return;
  dom.resourceId.value = '';
  dom.resourceTitle.value = `${dom.resourceTitle.value} (copia)`;
  dom.formTitle.textContent = 'Duplicar recurso';
}

function deleteResource(resourceId) {
  const lesson = currentLesson();
  if (!lesson) return;
  if (!confirm('Eliminar este recurso del organizador?')) return;
  lesson.resources = (lesson.resources || []).filter((resource) => resource.id !== resourceId);
  saveData();
  clearForm();
  render();
}

function moveResource(resourceId, direction) {
  const lesson = currentLesson();
  if (!lesson) return;
  const resources = lesson.resources || [];
  const visible = resources.filter((resource) => resource.section === state.selectedSectionId);
  const visibleIndex = visible.findIndex((resource) => resource.id === resourceId);
  const neighbor = visible[visibleIndex + direction];
  if (!neighbor) return;
  const indexA = resources.findIndex((resource) => resource.id === resourceId);
  const indexB = resources.findIndex((resource) => resource.id === neighbor.id);
  [resources[indexA], resources[indexB]] = [resources[indexB], resources[indexA]];
  saveData();
  render();
}

function addModule() {
  const title = dom.moduleTitleInput.value.trim();
  if (!title) return;
  const module = { id: uid('m'), title, lessons: [] };
  state.data.modules.push(module);
  state.selectedModuleId = module.id;
  state.selectedLessonId = null;
  dom.moduleTitleInput.value = '';
  saveData();
  render();
}

function addLesson() {
  const module = currentModule();
  const title = dom.lessonTitleInput.value.trim();
  if (!module || !title) return;
  const lesson = { id: uid('l'), title, resources: [] };
  module.lessons.push(lesson);
  state.selectedLessonId = lesson.id;
  dom.lessonTitleInput.value = '';
  saveData();
  render();
}

function exportJson() {
  downloadFile('organizador-calculo-iii.json', JSON.stringify(state.data, null, 2), 'application/json');
}

function exportCsv() {
  const rows = [
    ['Modulo', 'Leccion', 'Seccion', 'Titulo', 'Tipo', 'Estado', 'Prioridad', 'Responsable', 'Ubicacion', 'Notas'],
    ...allResources().map(({ module, lesson, resource }) => [
      module.title,
      lesson.title,
      labels[resource.section] ?? state.data.sections.find((section) => section.id === resource.section)?.title ?? resource.section,
      resource.title,
      labels[resource.type] ?? resource.type,
      labels[resource.status] ?? resource.status,
      labels[resource.priority] ?? resource.priority,
      resource.owner ?? '',
      resource.url ?? '',
      resource.notes ?? '',
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  downloadFile('inventario-recursos-calculo-iii.csv', csv, 'text/csv');
}

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function importJson(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!imported.modules || !imported.sections) throw new Error('Invalid structure');
      state.data = imported;
      selectFirstAvailable();
      saveData();
      clearForm();
      render();
    } catch {
      alert('El archivo no tiene la estructura esperada del organizador.');
    }
  };
  reader.readAsText(file);
}

function resetData() {
  if (!confirm('Restaurar los datos de demostracion? Esto borra los cambios guardados en este navegador.')) return;
  localStorage.removeItem(STORAGE_KEY);
  init(true);
}

function wireEvents() {
  dom.search.addEventListener('input', (event) => {
    state.search = event.target.value;
    renderResources();
  });
  dom.statusFilter.addEventListener('change', (event) => {
    state.statusFilter = event.target.value;
    renderResources();
  });
  dom.typeFilter.addEventListener('change', (event) => {
    state.typeFilter = event.target.value;
    renderResources();
  });
  document.querySelector('#add-resource').addEventListener('click', clearForm);
  document.querySelector('#add-module').addEventListener('click', () => dom.moduleTitleInput.focus());
  document.querySelector('#add-lesson').addEventListener('click', () => dom.lessonTitleInput.focus());
  document.querySelector('#save-module').addEventListener('click', addModule);
  document.querySelector('#save-lesson').addEventListener('click', addLesson);
  document.querySelector('#clear-form').addEventListener('click', clearForm);
  document.querySelector('#duplicate-resource').addEventListener('click', duplicateResource);
  document.querySelector('#export-json').addEventListener('click', exportJson);
  document.querySelector('#export-csv').addEventListener('click', exportCsv);
  document.querySelector('#import-json').addEventListener('change', importJson);
  document.querySelector('#reset-data').addEventListener('click', resetData);
  dom.form.addEventListener('submit', saveResource);
}

async function init(forceDefault = false) {
  const stored = forceDefault ? null : loadStoredData();
  if (stored) {
    state.data = stored;
  } else {
    const response = await fetch('js/data.json');
    state.data = await response.json();
    saveData();
  }
  selectFirstAvailable();
  clearForm();
  render();
}

wireEvents();
init();
