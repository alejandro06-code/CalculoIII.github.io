const STORAGE_KEY = 'calculo-iii-moodle-organizer-v2';
const LEGACY_STORAGE_KEYS = ['calculo-iii-moodle-organizer-v1', 'calculo-iii-moodle-organizer-v0'];
const cloudConfig = window.SUPABASE_CONFIG ?? {};
const cloudClient =
  window.supabase && cloudConfig.url && cloudConfig.publishableKey
    ? window.supabase.createClient(cloudConfig.url, cloudConfig.publishableKey)
    : null;

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

function plural(count, singular, pluralText) {
  return `${count} ${count === 1 ? singular : pluralText}`;
}

const state = {
  data: null,
  selectedModuleId: null,
  selectedLessonId: null,
  selectedSectionId: 'preparacion',
  statusFilters: [],
  typeFilters: [],
  search: '',
  pendingDeleteResourceId: null,
  draftLinks: [],
  draftFiles: [],
  session: null,
  isEditor: false,
  cloudReady: false,
  cloudStatus: 'local',
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
  linkLabel: document.querySelector('#link-label'),
  linkUrl: document.querySelector('#link-url'),
  addLink: document.querySelector('#add-link'),
  linksList: document.querySelector('#links-list'),
  resourceFiles: document.querySelector('#resource-files'),
  filesList: document.querySelector('#files-list'),
  resourceOwner: document.querySelector('#resource-owner'),
  resourcePriority: document.querySelector('#resource-priority'),
  resourceTarget: document.querySelector('#resource-target'),
  resourceNotes: document.querySelector('#resource-notes'),
  lessonModuleSelect: document.querySelector('#lesson-module-select'),
  lessonEditSelect: document.querySelector('#lesson-edit-select'),
  lessonTitleInput: document.querySelector('#lesson-title-input'),
  lessonEditTitleInput: document.querySelector('#lesson-edit-title-input'),
  deleteConfirm: document.querySelector('#delete-confirm'),
  deleteConfirmResource: document.querySelector('#delete-confirm-resource'),
  confirmDelete: document.querySelector('#confirm-delete'),
  cancelDelete: document.querySelector('#cancel-delete'),
  cloudStatus: document.querySelector('#cloud-status'),
  authGate: document.querySelector('#auth-gate'),
  appShell: document.querySelector('.app-shell'),
  loginName: document.querySelector('#login-name'),
  loginEmail: document.querySelector('#login-email'),
  loginPassword: document.querySelector('#login-password'),
  loginButton: document.querySelector('#login-button'),
  signupButton: document.querySelector('#signup-button'),
  resetPasswordButton: document.querySelector('#reset-password-button'),
  logoutButton: document.querySelector('#logout-button'),
  courseTitleInput: document.querySelector('#course-title-input'),
  courseDescriptionInput: document.querySelector('#course-description-input'),
  moduleEditSelect: document.querySelector('#module-edit-select'),
  moduleTitleInput: document.querySelector('#module-title-input'),
  newModuleTitleInput: document.querySelector('#new-module-title-input'),
  sectionEditSelect: document.querySelector('#section-edit-select'),
  sectionTitleInput: document.querySelector('#section-title-input'),
  sectionDescriptionInput: document.querySelector('#section-description-input'),
  editorEmailInput: document.querySelector('#editor-email-input'),
  editorList: document.querySelector('#editor-list'),
  template: document.querySelector('#resource-template'),
};

function onOptional(selector, eventName, handler) {
  const element = document.querySelector(selector);
  if (element) element.addEventListener(eventName, handler);
}

function setCloudStatus(message, mode = 'local') {
  state.cloudStatus = mode;
  if (!dom.cloudStatus) return;
  dom.cloudStatus.textContent = message;
  dom.cloudStatus.dataset.mode = mode;
}

function updateAuthUi() {
  if (!dom.loginName || !dom.loginEmail || !dom.loginPassword || !dom.loginButton || !dom.signupButton || !dom.resetPasswordButton || !dom.logoutButton) return;
  const signedIn = Boolean(state.session?.user);
  document.body.classList.toggle('signed-out', !signedIn);
  document.body.classList.toggle('can-edit', state.isEditor || !remoteEditingActive());
  dom.authGate.hidden = signedIn;
  dom.appShell.hidden = !signedIn;
  dom.loginName.hidden = signedIn;
  dom.loginEmail.hidden = signedIn;
  dom.loginPassword.hidden = signedIn;
  dom.loginButton.hidden = signedIn;
  dom.signupButton.hidden = signedIn;
  dom.resetPasswordButton.hidden = signedIn;
  dom.logoutButton.hidden = !signedIn;
  if (signedIn) {
    dom.logoutButton.textContent = state.isEditor
      ? `Salir (${state.session.user.email})`
      : `Salir (${state.session.user.email}, sin permiso)`;
  }
}

function remoteEditingActive() {
  return state.cloudReady && Boolean(cloudClient);
}

function canEdit() {
  return !remoteEditingActive() || state.isEditor;
}

function requireEditPermission() {
  if (canEdit()) return true;
  alert('Para editar, subir archivos o guardar cambios debes iniciar sesion con un correo autorizado como editor.');
  return false;
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

async function saveData() {
  if (remoteEditingActive()) {
    if (!requireEditPermission()) return false;
    const { error } = await cloudClient
      .from('course_state')
      .upsert({
        id: cloudConfig.courseStateId,
        data: state.data,
        updated_at: new Date().toISOString(),
      });
    if (error) {
      alert(`No se pudo guardar en Supabase: ${error.message}`);
      return false;
    }
    setCloudStatus('Cambios guardados en la nube.', 'ok');
    return true;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
    return true;
  } catch {
    alert('No se pudo guardar. El navegador no tiene espacio suficiente para estos archivos. Prueba con archivos mas livianos o guarda el archivo definitivo en la carpeta archivos-recursos del repositorio.');
    return false;
  }
}

function loadStoredData() {
  const keys = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];
  for (const key of keys) {
    const stored = localStorage.getItem(key);
    if (!stored) continue;
    try {
      const parsed = JSON.parse(stored);
      if (isUsableCourseData(parsed)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        return parsed;
      }
      localStorage.removeItem(key);
    } catch {
      localStorage.removeItem(key);
    }
  }
  return null;
}

function isUsableCourseData(data) {
  return Boolean(
    data &&
      Array.isArray(data.modules) &&
      data.modules.length > 0 &&
      data.modules.some((module) => Array.isArray(module.lessons) && module.lessons.length > 0) &&
      Array.isArray(data.sections) &&
      data.sections.length > 0
  );
}

function allResources() {
  return state.data.modules.flatMap((module) =>
    module.lessons.flatMap((lesson) =>
      (lesson.resources || []).map((resource) => ({ module, lesson, resource }))
    )
  );
}

function normalizeLinks(resource) {
  const links = Array.isArray(resource.links) ? resource.links : [];
  if (links.length) return links;
  if (!resource.url) return [];
  const value = resource.url.trim();
  if (!value) return [];
  const isWebUrl = /^(https?:\/\/|www\.)/i.test(value);
  return isWebUrl
    ? [{ id: uid('link'), label: 'Enlace', url: normalizeUrl(value) }]
    : [];
}

function normalizeFiles(resource) {
  return Array.isArray(resource.files) ? resource.files : [];
}

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function formatFileSize(size = 0) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToResourceFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        id: uid('file'),
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl: reader.result,
        addedAt: new Date().toISOString(),
      });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function slugify(value) {
  return String(value || 'archivo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'archivo';
}

async function uploadResourceFile(file) {
  const module = currentModule();
  const lesson = currentLesson();
  const section = currentSection();
  const folder = [
    slugify(module?.title ?? state.selectedModuleId),
    slugify(lesson?.title ?? state.selectedLessonId),
    slugify(section?.title ?? state.selectedSectionId),
  ].join('/');
  const filename = `${Date.now()}-${uid('file')}-${slugify(file.name)}`;
  const path = `${folder}/${filename}`;
  const { error } = await cloudClient.storage
    .from(cloudConfig.storageBucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });
  if (error) throw error;
  const { data } = cloudClient.storage.from(cloudConfig.storageBucket).getPublicUrl(path);
  return {
    id: uid('file'),
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    path,
    publicUrl: data.publicUrl,
    addedAt: new Date().toISOString(),
  };
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
  document.querySelector('h1').textContent = state.data.course?.title ?? 'Calculo III';
  dom.totalResources.textContent = resources.length;
  dom.missingResources.textContent = resources.filter((resource) => resource.status === 'missing').length;
  dom.approvedResources.textContent = resources.filter((resource) => resource.status === 'approved').length;
  dom.reviewResources.textContent = resources.filter((resource) => resource.status === 'review').length;
}

function renderNavigation() {
  dom.nav.innerHTML = '';

  if (!state.data.modules.length) {
    dom.nav.innerHTML = '<p class="empty-state">No hay modulos cargados. Usa Restaurar demo para volver a la estructura base.</p>';
    return;
  }

  state.data.modules.forEach((module, moduleIndex) => {
    const moduleNode = document.createElement('section');
    moduleNode.className = 'module-group';
    moduleNode.innerHTML = `
      <p class="nav-kicker">Modulo ${moduleIndex + 1}</p>
      <h3>${module.title}</h3>
    `;

    module.lessons.forEach((lesson, lessonIndex) => {
      const resources = lesson.resources || [];
      const missing = resources.filter((resource) => resource.status === 'missing').length;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'lesson-button';
      if (module.id === state.selectedModuleId && lesson.id === state.selectedLessonId) {
        button.classList.add('active');
      }
      button.innerHTML = `
        <small>Leccion ${lessonIndex + 1}</small>
        <span>${lesson.title}</span>
        <small>${resources.length} recursos registrados${missing ? ` · ${missing} faltan` : ''}</small>
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

function sectionStats(lesson, sectionId) {
  const resources = (lesson.resources || []).filter((resource) => resource.section === sectionId);
  return {
    total: resources.length,
    missing: resources.filter((resource) => resource.status === 'missing').length,
    review: resources.filter((resource) => resource.status === 'review').length,
    approved: resources.filter((resource) => resource.status === 'approved').length,
  };
}

function renderCourseMap() {
  dom.map.innerHTML = '';

  if (!state.data.modules.length) {
    dom.map.innerHTML = '<p class="empty-state">No hay estructura cargada. La pagina intentara recuperar la estructura base al recargar.</p>';
    return;
  }

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
        <span class="map-count"><strong>${totals.total}</strong><span> ${totals.total === 1 ? 'recurso registrado' : 'recursos registrados'}</span></span>
      </div>
      <div class="map-stats">
        <span>${plural(module.lessons.length, 'leccion', 'lecciones')}</span>
        <span class="${totals.missing ? 'pill-danger' : ''}">${plural(totals.missing, 'faltante', 'faltantes')}</span>
        <span class="${totals.review ? 'pill-warning' : ''}">${totals.review} por revisar</span>
        <span class="${totals.approved ? 'pill-ok' : ''}">${plural(totals.approved, 'aprobado', 'aprobados')}</span>
      </div>
    `;

    const lessons = document.createElement('div');
    lessons.className = 'map-lessons';
    module.lessons.forEach((lesson, lessonIndex) => {
      const stats = lessonStats(lesson);
      const lessonBlock = document.createElement('section');
      lessonBlock.className = 'map-lesson';
      if (module.id === state.selectedModuleId && lesson.id === state.selectedLessonId) {
        lessonBlock.classList.add('active');
      }
      lessonBlock.innerHTML = `
        <button class="map-lesson-title" type="button">
          <span>
            <span class="map-kicker">Leccion ${lessonIndex + 1}</span>
            <span class="lesson-name">${lesson.title}</span>
          </span>
          <span class="lesson-pills">
            <span class="total-pill">${stats.total} en total</span>
            <span class="${stats.missing ? 'pill-danger' : ''}">${plural(stats.missing, 'falta', 'faltan')}</span>
            <span class="${stats.review ? 'pill-warning' : ''}">${stats.review} revisar</span>
          </span>
        </button>
      `;
      lessonBlock.querySelector('.map-lesson-title').addEventListener('click', () => {
        state.selectedModuleId = module.id;
        state.selectedLessonId = lesson.id;
        clearForm();
        render();
      });

      const sectionList = document.createElement('div');
      sectionList.className = 'map-sections';
      state.data.sections.forEach((section) => {
        const partStats = sectionStats(lesson, section.id);
        const sectionButton = document.createElement('button');
        sectionButton.type = 'button';
        sectionButton.className = 'map-section';
        if (
          module.id === state.selectedModuleId &&
          lesson.id === state.selectedLessonId &&
          section.id === state.selectedSectionId
        ) {
          sectionButton.classList.add('active');
        }
        sectionButton.innerHTML = `
          <span>${section.title}</span>
          <small class="section-total">${plural(partStats.total, 'recurso registrado', 'recursos registrados')}</small>
          <small class="section-status">
            <span>${plural(partStats.missing, 'falta', 'faltan')}</span>
            <span>${partStats.review} revisar</span>
            <span>${plural(partStats.approved, 'aprobado', 'aprobados')}</span>
          </small>
        `;
        sectionButton.addEventListener('click', () => {
          state.selectedModuleId = module.id;
          state.selectedLessonId = lesson.id;
          state.selectedSectionId = section.id;
          clearForm();
          render();
        });
        sectionList.appendChild(sectionButton);
      });
      lessonBlock.appendChild(sectionList);
      lessons.appendChild(lessonBlock);
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
  const statusMatch = !state.statusFilters.length || state.statusFilters.includes(resource.status);
  const typeMatch = !state.typeFilters.length || state.typeFilters.includes(resource.type);
  const linkText = normalizeLinks(resource).map((link) => `${link.label} ${link.url}`).join(' ');
  const fileText = normalizeFiles(resource).map((file) => file.name).join(' ');
  const haystack = `${resource.title} ${resource.url} ${linkText} ${fileText} ${resource.owner} ${resource.notes}`.toLowerCase();
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

    renderResourceAssets(node.querySelector('.resource-assets'), resource);

    const badges = node.querySelector('.badges');
    badges.innerHTML = `
      <span class="badge status-${resource.status}">${labels[resource.status] ?? resource.status}</span>
      ${resource.owner ? `<span class="badge neutral">${resource.owner}</span>` : ''}
    `;

    node.querySelector('.resource-actions').hidden = remoteEditingActive() && !state.isEditor;
    node.querySelector('.edit').addEventListener('click', () => editResource(resource.id));
    node.querySelector('.delete').addEventListener('click', () => deleteResource(resource.id));
    node.querySelector('.move-up').addEventListener('click', () => moveResource(resource.id, -1));
    node.querySelector('.move-down').addEventListener('click', () => moveResource(resource.id, 1));
    dom.list.appendChild(node);
  });
}

function renderResourceAssets(container, resource) {
  container.innerHTML = '';
  const links = normalizeLinks(resource);
  const files = normalizeFiles(resource);

  if (!links.length && !files.length && resource.url) {
    const legacy = document.createElement('p');
    legacy.className = 'resource-location';
    legacy.textContent = resource.url;
    container.appendChild(legacy);
    return;
  }

  if (!links.length && !files.length) {
    const empty = document.createElement('p');
    empty.className = 'resource-location';
    empty.textContent = 'Sin enlaces ni archivos asociados.';
    container.appendChild(empty);
    return;
  }

  if (links.length) {
    const group = document.createElement('div');
    group.className = 'asset-chip-group';
    const title = document.createElement('p');
    title.className = 'asset-label';
    title.textContent = 'Enlaces';
    group.appendChild(title);
    links.forEach((link) => {
      const item = document.createElement(state.isEditor ? 'a' : 'span');
      item.className = `asset-chip link-chip${state.isEditor ? '' : ' locked-asset'}`;
      if (state.isEditor) {
        item.href = normalizeUrl(link.url);
        item.target = '_blank';
        item.rel = 'noopener noreferrer';
      }
      item.textContent = state.isEditor ? link.label || link.url : `${link.label || 'Enlace'} (solo editores)`;
      group.appendChild(item);
    });
    container.appendChild(group);
  }

  if (files.length) {
    const group = document.createElement('div');
    group.className = 'asset-chip-group';
    const title = document.createElement('p');
    title.className = 'asset-label';
    title.textContent = 'Archivos';
    group.appendChild(title);
    files.forEach((file) => {
      const item = document.createElement(state.isEditor ? 'a' : 'span');
      item.className = `asset-chip file-chip${state.isEditor ? '' : ' locked-asset'}`;
      if (state.isEditor) {
        item.href = file.publicUrl || file.dataUrl || file.path || '#';
        item.download = file.name;
      }
      item.textContent = `${file.name} (${formatFileSize(file.size)})${state.isEditor ? '' : ' - solo editores'}`;
      group.appendChild(item);
    });
    container.appendChild(group);
  }
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

function renderLessonControls() {
  dom.lessonModuleSelect.innerHTML = '';
  dom.lessonEditSelect.innerHTML = '';

  state.data.modules.forEach((module, moduleIndex) => {
    const moduleOption = document.createElement('option');
    moduleOption.value = module.id;
    moduleOption.textContent = `Modulo ${moduleIndex + 1}: ${module.title}`;
    dom.lessonModuleSelect.appendChild(moduleOption);

    module.lessons.forEach((lesson, lessonIndex) => {
      const lessonOption = document.createElement('option');
      lessonOption.value = `${module.id}|${lesson.id}`;
      lessonOption.textContent = `Modulo ${moduleIndex + 1} / Leccion ${lessonIndex + 1}: ${lesson.title}`;
      dom.lessonEditSelect.appendChild(lessonOption);
    });
  });

  dom.lessonModuleSelect.value = state.selectedModuleId ?? state.data.modules[0]?.id ?? '';
  dom.lessonEditSelect.value = `${state.selectedModuleId}|${state.selectedLessonId}`;
  const selectedLesson = currentLesson();
  if (selectedLesson && !dom.lessonEditTitleInput.value) {
    dom.lessonEditTitleInput.placeholder = selectedLesson.title;
  }
}

function renderAdminControls() {
  if (!state.data) return;
  dom.courseTitleInput.value = state.data.course?.title ?? '';
  dom.courseDescriptionInput.value = state.data.course?.description ?? '';

  dom.moduleEditSelect.innerHTML = '';
  state.data.modules.forEach((module, index) => {
    const option = document.createElement('option');
    option.value = module.id;
    option.textContent = `Modulo ${index + 1}: ${module.title}`;
    dom.moduleEditSelect.appendChild(option);
  });
  dom.moduleEditSelect.value = state.selectedModuleId ?? state.data.modules[0]?.id ?? '';
  const selectedModule = state.data.modules.find((module) => module.id === dom.moduleEditSelect.value);
  dom.moduleTitleInput.value = selectedModule?.title ?? '';

  dom.sectionEditSelect.innerHTML = '';
  state.data.sections.forEach((section, index) => {
    const option = document.createElement('option');
    option.value = section.id;
    option.textContent = `Parte ${index + 1}: ${section.title}`;
    dom.sectionEditSelect.appendChild(option);
  });
  dom.sectionEditSelect.value = state.selectedSectionId ?? state.data.sections[0]?.id ?? '';
  const selectedSection = state.data.sections.find((section) => section.id === dom.sectionEditSelect.value);
  dom.sectionTitleInput.value = selectedSection?.title ?? '';
  dom.sectionDescriptionInput.value = selectedSection?.description ?? '';
}

function render() {
  renderSummary();
  renderNavigation();
  renderCourseMap();
  renderTabs();
  renderTargets();
  renderLessonControls();
  renderAdminControls();
  renderResources();
}

function renderDraftAssets() {
  renderDraftLinks();
  renderDraftFiles();
}

function renderDraftLinks() {
  dom.linksList.innerHTML = '';
  if (!state.draftLinks.length) {
    dom.linksList.innerHTML = '<p class="asset-empty">No hay enlaces agregados.</p>';
    return;
  }
  state.draftLinks.forEach((link) => {
    const row = document.createElement('div');
    row.className = 'asset-row';
    const anchor = document.createElement('a');
    anchor.href = normalizeUrl(link.url);
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = link.label || link.url;
    const remove = document.createElement('button');
    remove.className = 'mini-btn delete';
    remove.type = 'button';
    remove.textContent = 'Quitar';
    remove.addEventListener('click', () => {
      state.draftLinks = state.draftLinks.filter((item) => item.id !== link.id);
      renderDraftLinks();
    });
    row.append(anchor, remove);
    dom.linksList.appendChild(row);
  });
}

function renderDraftFiles() {
  dom.filesList.innerHTML = '';
  if (!state.draftFiles.length) {
    dom.filesList.innerHTML = '<p class="asset-empty">No hay archivos agregados.</p>';
    return;
  }
  state.draftFiles.forEach((file) => {
    const row = document.createElement('div');
    row.className = 'asset-row';
    const anchor = document.createElement('a');
    anchor.href = file.publicUrl || file.dataUrl || file.path || '#';
    anchor.download = file.name;
    anchor.textContent = `${file.name} (${formatFileSize(file.size)})`;
    const remove = document.createElement('button');
    remove.className = 'mini-btn delete';
    remove.type = 'button';
    remove.textContent = 'Quitar';
    remove.addEventListener('click', () => {
      state.draftFiles = state.draftFiles.filter((item) => item.id !== file.id);
      renderDraftFiles();
    });
    row.append(anchor, remove);
    dom.filesList.appendChild(row);
  });
}

function clearForm() {
  dom.form.reset();
  dom.resourceId.value = '';
  dom.formTitle.textContent = 'Nuevo recurso';
  dom.resourcePriority.value = 'medium';
  dom.resourceStatus.value = 'planned';
  state.draftLinks = [];
  state.draftFiles = [];
  renderDraftAssets();
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
  dom.resourceOwner.value = resource.owner ?? '';
  dom.resourcePriority.value = resource.priority ?? 'medium';
  dom.resourceNotes.value = resource.notes ?? '';
  dom.resourceTarget.value = `${state.selectedModuleId}|${state.selectedLessonId}|${resource.section}`;
  state.draftLinks = normalizeLinks(resource).map((link) => ({ ...link }));
  state.draftFiles = normalizeFiles(resource).map((file) => ({ ...file }));
  renderDraftAssets();
}

function findLesson(moduleId, lessonId) {
  const module = state.data.modules.find((item) => item.id === moduleId);
  return module?.lessons.find((item) => item.id === lessonId);
}

function formResource() {
  const links = state.draftLinks.map((link) => ({
    ...link,
    url: normalizeUrl(link.url),
  }));
  const files = state.draftFiles.map((file) => ({ ...file }));
  const locationSummary = [
    ...links.map((link) => link.url),
    ...files.map((file) => file.name),
  ].join(' | ');

  return {
    id: dom.resourceId.value || uid('r'),
    title: dom.resourceTitle.value.trim(),
    type: dom.resourceType.value,
    status: dom.resourceStatus.value,
    url: locationSummary,
    links,
    files,
    owner: dom.resourceOwner.value.trim(),
    priority: dom.resourcePriority.value,
    notes: dom.resourceNotes.value.trim(),
  };
}

async function saveResource(event) {
  event.preventDefault();
  if (!requireEditPermission()) return;
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
  if (!(await saveData())) return;
  clearForm();
  render();
}

function addLink() {
  if (!requireEditPermission()) return;
  const url = normalizeUrl(dom.linkUrl.value);
  if (!url) return;
  state.draftLinks.push({
    id: uid('link'),
    label: dom.linkLabel.value.trim() || url,
    url,
  });
  dom.linkLabel.value = '';
  dom.linkUrl.value = '';
  renderDraftLinks();
}

async function addFiles(event) {
  if (!requireEditPermission()) {
    dom.resourceFiles.value = '';
    return;
  }
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  try {
    const loaded = remoteEditingActive()
      ? await Promise.all(files.map(uploadResourceFile))
      : await Promise.all(files.map(fileToResourceFile));
    state.draftFiles.push(...loaded);
    renderDraftFiles();
  } catch {
    alert('No se pudieron cargar uno o mas archivos.');
  } finally {
    dom.resourceFiles.value = '';
  }
}

function duplicateResource() {
  if (!dom.resourceId.value) return;
  dom.resourceId.value = '';
  dom.resourceTitle.value = `${dom.resourceTitle.value} (copia)`;
  dom.formTitle.textContent = 'Duplicar recurso';
}

function deleteResource(resourceId) {
  if (!requireEditPermission()) return;
  const lesson = currentLesson();
  if (!lesson) return;
  const resource = (lesson.resources || []).find((item) => item.id === resourceId);
  if (!resource) return;
  state.pendingDeleteResourceId = resourceId;
  dom.deleteConfirmResource.textContent = resource.title;
  dom.deleteConfirm.hidden = false;
  dom.confirmDelete.focus();
}

function closeDeleteConfirm() {
  state.pendingDeleteResourceId = null;
  dom.deleteConfirm.hidden = true;
  dom.deleteConfirmResource.textContent = '';
}

async function confirmDeleteResource() {
  const lesson = currentLesson();
  if (!lesson || !state.pendingDeleteResourceId) {
    closeDeleteConfirm();
    return;
  }
  const resourceId = state.pendingDeleteResourceId;
  lesson.resources = (lesson.resources || []).filter((resource) => resource.id !== resourceId);
  if (!(await saveData())) return;
  clearForm();
  closeDeleteConfirm();
  render();
}

async function moveResource(resourceId, direction) {
  if (!requireEditPermission()) return;
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
  if (!(await saveData())) return;
  render();
}

async function addLesson() {
  if (!requireEditPermission()) return;
  const module = state.data.modules.find((item) => item.id === dom.lessonModuleSelect.value);
  const title = dom.lessonTitleInput.value.trim();
  if (!module || !title) return;
  const lesson = { id: uid('l'), title, resources: [] };
  module.lessons.push(lesson);
  state.selectedModuleId = module.id;
  state.selectedLessonId = lesson.id;
  state.selectedSectionId = state.data.sections[0]?.id ?? 'preparacion';
  dom.lessonTitleInput.value = '';
  if (!(await saveData())) return;
  render();
}

async function updateLesson() {
  if (!requireEditPermission()) return;
  const [moduleId, lessonId] = dom.lessonEditSelect.value.split('|');
  const lesson = findLesson(moduleId, lessonId);
  const title = dom.lessonEditTitleInput.value.trim();
  if (!lesson || !title) return;
  lesson.title = title;
  state.selectedModuleId = moduleId;
  state.selectedLessonId = lessonId;
  dom.lessonEditTitleInput.value = '';
  if (!(await saveData())) return;
  render();
}

async function updateCourseSettings() {
  if (!requireEditPermission()) return;
  state.data.course = state.data.course || {};
  state.data.course.title = dom.courseTitleInput.value.trim() || 'Calculo III';
  state.data.course.description = dom.courseDescriptionInput.value.trim();
  document.querySelector('h1').textContent = state.data.course.title;
  if (!(await saveData())) return;
  render();
}

async function addModule() {
  if (!requireEditPermission()) return;
  const title = dom.newModuleTitleInput.value.trim();
  if (!title) return;
  const module = { id: uid('m'), title, lessons: [] };
  state.data.modules.push(module);
  state.selectedModuleId = module.id;
  state.selectedLessonId = null;
  dom.newModuleTitleInput.value = '';
  if (!(await saveData())) return;
  render();
}

async function updateModule() {
  if (!requireEditPermission()) return;
  const module = state.data.modules.find((item) => item.id === dom.moduleEditSelect.value);
  const title = dom.moduleTitleInput.value.trim();
  if (!module || !title) return;
  module.title = title;
  state.selectedModuleId = module.id;
  if (!(await saveData())) return;
  render();
}

async function deleteModule() {
  if (!requireEditPermission()) return;
  const module = state.data.modules.find((item) => item.id === dom.moduleEditSelect.value);
  if (!module) return;
  const lessonCount = module.lessons?.length ?? 0;
  if (!confirm(`Eliminar el modulo "${module.title}" y sus ${lessonCount} lecciones?`)) return;
  state.data.modules = state.data.modules.filter((item) => item.id !== module.id);
  selectFirstAvailable();
  if (!(await saveData())) return;
  clearForm();
  render();
}

async function updateSection() {
  if (!requireEditPermission()) return;
  const section = state.data.sections.find((item) => item.id === dom.sectionEditSelect.value);
  const title = dom.sectionTitleInput.value.trim();
  if (!section || !title) return;
  section.title = title;
  section.description = dom.sectionDescriptionInput.value.trim();
  state.selectedSectionId = section.id;
  if (!(await saveData())) return;
  render();
}

function exportJson() {
  downloadFile('organizador-calculo-iii.json', JSON.stringify(state.data, null, 2), 'application/json');
}

function exportCsv() {
  const rows = [
    ['Modulo', 'Leccion', 'Seccion', 'Titulo', 'Tipo', 'Estado', 'Prioridad', 'Responsable', 'Enlaces', 'Archivos', 'Notas'],
    ...allResources().map(({ module, lesson, resource }) => [
      module.title,
      lesson.title,
      labels[resource.section] ?? state.data.sections.find((section) => section.id === resource.section)?.title ?? resource.section,
      resource.title,
      labels[resource.type] ?? resource.type,
      labels[resource.status] ?? resource.status,
      labels[resource.priority] ?? resource.priority,
      resource.owner ?? '',
      normalizeLinks(resource).map((link) => `${link.label}: ${link.url}`).join(' | '),
      normalizeFiles(resource).map((file) => file.name).join(' | '),
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
  reader.onload = async () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!imported.modules || !imported.sections) throw new Error('Invalid structure');
      state.data = imported;
      selectFirstAvailable();
      if (!(await saveData())) return;
      clearForm();
      render();
    } catch {
      alert('El archivo no tiene la estructura esperada del organizador.');
    }
  };
  reader.readAsText(file);
}

async function resetData() {
  if (!confirm('Restaurar los datos de demostracion? Esto borra los cambios guardados en este navegador.')) return;
  if (!requireEditPermission()) return;
  localStorage.removeItem(STORAGE_KEY);
  LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  init(true);
}

async function loginEditor() {
  if (!cloudClient) {
    alert('Supabase aun no esta configurado.');
    return;
  }
  const email = dom.loginEmail.value.trim();
  const password = dom.loginPassword.value;
  if (!email || !password) {
    alert('Escribe correo y contrasena.');
    return;
  }
  const { error } = await cloudClient.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    alert(`No se pudo iniciar sesion: ${error.message}`);
    return;
  }
  dom.loginPassword.value = '';
  setCloudStatus('Sesion iniciada. Verificando permisos...', 'pending');
  const { data } = await cloudClient.auth.getUser();
  if (data.user) await upsertUserProfile(data.user);
  await refreshEditorStatus();
}

async function signupEditor() {
  if (!cloudClient) {
    alert('Supabase aun no esta configurado.');
    return;
  }
  const name = dom.loginName.value.trim();
  const email = dom.loginEmail.value.trim();
  const password = dom.loginPassword.value;
  if (!name || !email || !password) {
    alert('Escribe nombre, correo y contrasena para registrarte.');
    return;
  }
  if (name.length > 80 || password.length > 72) {
    alert('El nombre o la contrasena superan el maximo permitido.');
    return;
  }
  const { data, error } = await cloudClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.href.split('#')[0],
      data: {
        full_name: name,
      },
    },
  });
  if (error) {
    alert(`No se pudo registrar la cuenta: ${error.message}`);
    return;
  }
  if (data.user) {
    await upsertUserProfile(data.user, name);
  }
  dom.loginName.value = '';
  dom.loginPassword.value = '';
  setCloudStatus('Cuenta creada. Si Supabase pide confirmacion, revisa el correo antes de entrar.', 'pending');
}

async function resetPassword() {
  if (!cloudClient) {
    alert('Supabase aun no esta configurado.');
    return;
  }
  const email = dom.loginEmail.value.trim();
  if (!email) {
    alert('Escribe el correo para recuperar la contrasena.');
    return;
  }
  const { error } = await cloudClient.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.href.split('#')[0],
  });
  if (error) {
    alert(`No se pudo enviar la recuperacion: ${error.message}`);
    return;
  }
  setCloudStatus('Revisa el correo para recuperar la contrasena.', 'pending');
}

async function upsertUserProfile(user, name = '') {
  if (!cloudClient || !user?.email) return;
  const fullName = name || user.user_metadata?.full_name || user.email;
  const { error } = await cloudClient.from('user_profiles').upsert({
    id: user.id,
    email: user.email,
    full_name: fullName,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.warn('No se pudo guardar el perfil de usuario.', error.message);
  }
}

async function logoutEditor() {
  if (!cloudClient) return;
  await cloudClient.auth.signOut();
  state.session = null;
  state.isEditor = false;
  updateAuthUi();
  renderEditorList([]);
  setCloudStatus('Modo lectura. Inicia sesion para editar.', state.cloudReady ? 'pending' : 'local');
}

function renderEditorList(editors = []) {
  if (!dom.editorList) return;
  if (!remoteEditingActive()) {
    dom.editorList.innerHTML = '<p class="asset-empty">Activa Supabase para administrar editores.</p>';
    return;
  }
  if (!state.isEditor) {
    dom.editorList.innerHTML = '<p class="asset-empty">Inicia sesion con un correo editor para ver y modificar esta lista.</p>';
    return;
  }
  if (!editors.length) {
    dom.editorList.innerHTML = '<p class="asset-empty">No hay editores cargados.</p>';
    return;
  }
  dom.editorList.innerHTML = '';
  editors.forEach((editor) => {
    const row = document.createElement('div');
    row.className = 'editor-row';
    const email = document.createElement('span');
    email.textContent = editor.email;
    const remove = document.createElement('button');
    remove.className = 'mini-btn delete';
    remove.type = 'button';
    remove.textContent = 'Quitar';
    remove.addEventListener('click', () => removeEditor(editor.email));
    row.append(email, remove);
    dom.editorList.appendChild(row);
  });
}

async function refreshEditorStatus() {
  if (!cloudClient || !state.session?.user || !state.cloudReady) {
    state.isEditor = false;
    updateAuthUi();
    renderEditorList([]);
    return;
  }
  const email = state.session.user.email;
  const { data, error } = await cloudClient
    .from('course_editors')
    .select('email')
    .eq('email', email)
    .maybeSingle();
  state.isEditor = Boolean(data?.email && !error);
  updateAuthUi();
  setCloudStatus(
    state.isEditor ? 'Sesion de editor activa.' : 'Sesion iniciada, pero este correo no esta autorizado para editar.',
    state.isEditor ? 'ok' : 'pending'
  );
  await loadEditors();
  if (state.data) render();
}

async function loadEditors() {
  if (!cloudClient || !state.isEditor) {
    renderEditorList([]);
    return;
  }
  const { data, error } = await cloudClient
    .from('course_editors')
    .select('email, created_at')
    .order('email');
  if (error) {
    renderEditorList([]);
    return;
  }
  renderEditorList(data);
}

async function addEditor() {
  if (!requireEditPermission()) return;
  const email = dom.editorEmailInput.value.trim().toLowerCase();
  if (!email) return;
  const { error } = await cloudClient.from('course_editors').insert({ email });
  if (error) {
    alert(`No se pudo autorizar este correo: ${error.message}`);
    return;
  }
  dom.editorEmailInput.value = '';
  await loadEditors();
}

async function removeEditor(email) {
  if (!requireEditPermission()) return;
  if (email === state.session?.user?.email && !confirm('Estas quitando tu propio permiso de editor. Continuar?')) return;
  const { error } = await cloudClient.from('course_editors').delete().eq('email', email);
  if (error) {
    alert(`No se pudo quitar este editor: ${error.message}`);
    return;
  }
  await refreshEditorStatus();
}

function wireEvents() {
  dom.search.addEventListener('input', (event) => {
    state.search = event.target.value;
    renderResources();
  });
  dom.statusFilter.addEventListener('change', () => updateMultiFilter('status'));
  dom.typeFilter.addEventListener('change', () => updateMultiFilter('type'));
  document.querySelectorAll('[data-filter-reset]').forEach((button) => {
    button.addEventListener('click', () => resetMultiFilter(button.dataset.filterReset));
  });
  document.querySelector('#save-lesson').addEventListener('click', addLesson);
  document.querySelector('#update-lesson').addEventListener('click', updateLesson);
  dom.lessonEditSelect.addEventListener('change', () => {
    const [moduleId, lessonId] = dom.lessonEditSelect.value.split('|');
    const lesson = findLesson(moduleId, lessonId);
    dom.lessonEditTitleInput.value = lesson?.title ?? '';
  });
  document.querySelector('#clear-form').addEventListener('click', clearForm);
  document.querySelector('#duplicate-resource').addEventListener('click', duplicateResource);
  dom.loginButton.addEventListener('click', loginEditor);
  dom.signupButton.addEventListener('click', signupEditor);
  dom.resetPasswordButton.addEventListener('click', resetPassword);
  dom.logoutButton.addEventListener('click', logoutEditor);
  dom.loginPassword.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      loginEditor();
    }
  });
  document.querySelector('#save-course-settings').addEventListener('click', updateCourseSettings);
  document.querySelector('#add-module').addEventListener('click', addModule);
  document.querySelector('#update-module').addEventListener('click', updateModule);
  document.querySelector('#delete-module').addEventListener('click', deleteModule);
  document.querySelector('#update-section').addEventListener('click', updateSection);
  document.querySelector('#add-editor').addEventListener('click', addEditor);
  dom.moduleEditSelect.addEventListener('change', () => {
    const module = state.data.modules.find((item) => item.id === dom.moduleEditSelect.value);
    dom.moduleTitleInput.value = module?.title ?? '';
  });
  dom.sectionEditSelect.addEventListener('change', () => {
    const section = state.data.sections.find((item) => item.id === dom.sectionEditSelect.value);
    dom.sectionTitleInput.value = section?.title ?? '';
    dom.sectionDescriptionInput.value = section?.description ?? '';
  });
  dom.addLink.addEventListener('click', addLink);
  dom.linkUrl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addLink();
    }
  });
  dom.resourceFiles.addEventListener('change', addFiles);
  dom.confirmDelete.addEventListener('click', confirmDeleteResource);
  dom.cancelDelete.addEventListener('click', closeDeleteConfirm);
  dom.deleteConfirm.addEventListener('click', (event) => {
    if (event.target === dom.deleteConfirm) closeDeleteConfirm();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !dom.deleteConfirm.hidden) closeDeleteConfirm();
  });
  onOptional('#export-json', 'click', exportJson);
  onOptional('#export-csv', 'click', exportCsv);
  onOptional('#import-json', 'change', importJson);
  onOptional('#reset-data', 'click', resetData);
  dom.form.addEventListener('submit', saveResource);
}

function updateMultiFilter(kind) {
  const container = kind === 'status' ? dom.statusFilter : dom.typeFilter;
  const values = Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map((input) => input.value);
  if (kind === 'status') {
    state.statusFilters = values;
  } else {
    state.typeFilters = values;
  }
  renderResources();
}

function resetMultiFilter(kind) {
  const container = kind === 'status' ? dom.statusFilter : dom.typeFilter;
  container.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.checked = false;
  });
  if (kind === 'status') {
    state.statusFilters = [];
  } else {
    state.typeFilters = [];
  }
  renderResources();
}

async function loadCloudData() {
  if (!cloudClient) return null;
  const { data, error } = await cloudClient
    .from('course_state')
    .select('data, updated_at')
    .eq('id', cloudConfig.courseStateId)
    .single();
  if (error) {
    setCloudStatus('Falta ejecutar la configuracion de Supabase. Usando modo local.', 'local');
    return null;
  }
  state.cloudReady = true;
  setCloudStatus(`Datos compartidos activos. Ultima sincronizacion: ${new Date(data.updated_at).toLocaleString()}.`, 'ok');
  return data.data;
}

async function initCloudSession() {
  if (!cloudClient) {
    setCloudStatus('Modo local. Supabase no esta configurado.', 'local');
    updateAuthUi();
    return;
  }
  const { data } = await cloudClient.auth.getSession();
  state.session = data.session;
  updateAuthUi();
  cloudClient.auth.onAuthStateChange(async (_event, session) => {
    state.session = session;
    updateAuthUi();
    await refreshEditorStatus();
    if (state.cloudReady) {
      if (!session) setCloudStatus('Modo lectura. Inicia sesion para editar.', 'pending');
    }
  });
}

async function init(forceDefault = false) {
  await initCloudSession();
  const cloudData = forceDefault ? null : await loadCloudData();
  const stored = forceDefault || cloudData ? null : loadStoredData();
  if (cloudData) {
    state.data = cloudData;
    await refreshEditorStatus();
  } else if (stored) {
    state.data = stored;
    renderEditorList([]);
  } else {
    localStorage.removeItem(STORAGE_KEY);
    const response = await fetch('js/data.json');
    state.data = await response.json();
    await saveData();
  }
  selectFirstAvailable();
  clearForm();
  render();
  if (state.cloudReady) await loadEditors();
}

wireEvents();
init();
