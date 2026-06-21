const STORAGE_KEY = 'calculo-iii-moodle-organizer-v2';
const LEGACY_STORAGE_KEYS = ['calculo-iii-moodle-organizer-v1', 'calculo-iii-moodle-organizer-v0'];
const MAIN_EDITOR_EMAIL = 'maira2004hernandez@gmail.com';
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
  owner: 'Acceso completo',
  manager: 'Editor avanzado',
  contributor: 'Creador de recursos',
  viewer: 'Solo lectura',
};

const roleCapabilities = {
  owner: {
    manageUsers: true,
    manageStructure: true,
    manageResources: true,
    createResources: true,
    deleteResources: true,
    moveResources: true,
    openAssets: true,
  },
  manager: {
    manageStructure: true,
    manageResources: true,
    createResources: true,
    deleteResources: true,
    moveResources: true,
    openAssets: true,
  },
  contributor: {
    createResources: true,
    openAssets: true,
  },
  viewer: {},
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
  isMainEditor: false,
  userRole: 'viewer',
  authMode: 'login',
  currentView: 'course',
  cloudReady: false,
  cloudStatus: 'local',
  structureDraft: null,
  structureDirty: false,
};

const dom = {
  nav: document.querySelector('#course-nav'),
  viewButtons: document.querySelectorAll('[data-view]'),
  viewPanels: document.querySelectorAll('[data-view-panel]'),
  map: document.querySelector('#course-map'),
  moduleStrip: document.querySelector('#module-strip'),
  routeBack: document.querySelector('#route-back'),
  routeForward: document.querySelector('#route-forward'),
  tabs: document.querySelector('#section-tabs'),
  list: document.querySelector('#resource-list'),
  totalResources: document.querySelector('#total-resources'),
  missingResources: document.querySelector('#missing-resources'),
  approvedResources: document.querySelector('#approved-resources'),
  reviewResources: document.querySelector('#review-resources'),
  moduleLabel: document.querySelector('#current-module-label'),
  lessonTitle: document.querySelector('#current-lesson-title'),
  lessonMeta: document.querySelector('#current-lesson-meta'),
  mapTitle: document.querySelector('#map-title'),
  mapDescription: document.querySelector('#map-description'),
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
  lessonOrderSelect: document.querySelector('#lesson-order-select'),
  moduleOrderSelect: document.querySelector('#module-order-select'),
  sectionOrderSelect: document.querySelector('#section-order-select'),
  lessonTitleInput: document.querySelector('#lesson-title-input'),
  lessonEditTitleInput: document.querySelector('#lesson-edit-title-input'),
  structureList: document.querySelector('#structure-list'),
  deleteConfirm: document.querySelector('#delete-confirm'),
  deleteConfirmResource: document.querySelector('#delete-confirm-resource'),
  confirmDelete: document.querySelector('#confirm-delete'),
  cancelDelete: document.querySelector('#cancel-delete'),
  cloudStatus: document.querySelector('#cloud-status'),
  authGate: document.querySelector('#auth-gate'),
  appShell: document.querySelector('.app-shell'),
  loginName: document.querySelector('#login-name'),
  loginEmail: document.querySelector('#login-email'),
  loginIdentifierLabel: document.querySelector('#login-identifier-label'),
  loginPassword: document.querySelector('#login-password'),
  loginButton: document.querySelector('#login-button'),
  signupButton: document.querySelector('#signup-button'),
  authLoginMode: document.querySelector('#auth-login-mode'),
  authSignupMode: document.querySelector('#auth-signup-mode'),
  authTitle: document.querySelector('#auth-title'),
  authDescription: document.querySelector('#auth-description'),
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
  editorRoleInput: document.querySelector('#editor-role-input'),
  editorList: document.querySelector('#editor-list'),
  structureStatus: document.querySelector('#structure-status'),
  saveStructure: document.querySelector('#save-structure'),
  discardStructure: document.querySelector('#discard-structure'),
  structureNewModuleTitle: document.querySelector('#structure-new-module-title'),
  structureAddModule: document.querySelector('#structure-add-module'),
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
  const signupMode = state.authMode === 'signup';
  document.body.classList.toggle('signed-out', !signedIn);
  document.body.classList.toggle('can-edit', canEdit());
  document.body.classList.toggle('can-create-resource', hasCapability('createResources'));
  document.body.classList.toggle('can-manage-structure', hasCapability('manageStructure'));
  document.body.classList.toggle('can-manage-users', hasCapability('manageUsers'));
  document.body.classList.toggle('main-editor', state.isMainEditor || !remoteEditingActive());
  document.body.classList.toggle('auth-login-mode', !signupMode);
  document.body.classList.toggle('auth-signup-mode', signupMode);
  dom.authGate.hidden = signedIn;
  dom.appShell.hidden = !signedIn;
  dom.loginName.hidden = signedIn;
  dom.loginEmail.hidden = signedIn;
  dom.loginPassword.hidden = signedIn;
  dom.loginButton.hidden = signedIn || signupMode;
  dom.signupButton.hidden = signedIn || !signupMode;
  dom.resetPasswordButton.hidden = signedIn || signupMode;
  dom.logoutButton.hidden = !signedIn;
  if (dom.loginIdentifierLabel) {
    dom.loginIdentifierLabel.textContent = signupMode ? 'Correo' : 'Correo o nombre de usuario';
  }
  dom.loginEmail.placeholder = signupMode ? 'Correo' : 'Correo o nombre de usuario';
  dom.loginPassword.autocomplete = signupMode ? 'new-password' : 'current-password';
  dom.authLoginMode?.classList.toggle('active', !signupMode);
  dom.authSignupMode?.classList.toggle('active', signupMode);
  if (dom.authTitle) {
    dom.authTitle.textContent = signupMode ? 'Registrate para entrar al organizador' : 'Inicia sesion para ver el organizador';
  }
  if (dom.authDescription) {
    dom.authDescription.textContent = signupMode
      ? 'Crea un usuario con correo y contrasena. Despues la cuenta principal podra darte permiso de editor si corresponde.'
      : 'Los editores autorizados podran modificar y descargar; los demas usuarios registrados solo podran revisar la estructura.';
  }
  if (signedIn) {
    dom.logoutButton.textContent = state.isMainEditor
      ? `Salir (${state.session.user.email}, principal)`
      : state.isEditor
        ? `Salir (${state.session.user.email}, ${labels[state.userRole] ?? state.userRole})`
        : `Salir (${state.session.user.email}, sin permiso)`;
  }
}

function remoteEditingActive() {
  return state.cloudReady && Boolean(cloudClient);
}

function canEdit() {
  return !remoteEditingActive() || hasCapability('createResources') || hasCapability('manageStructure') || hasCapability('manageUsers');
}

function hasCapability(capability) {
  if (!remoteEditingActive()) return true;
  if (capability === 'manageUsers') return state.isMainEditor;
  return Boolean(roleCapabilities[state.userRole]?.[capability]);
}

function requireCapability(capability, message) {
  if (hasCapability(capability)) return true;
  alert(message || 'Tu perfil no tiene permiso para realizar esta accion.');
  return false;
}

function requireEditPermission() {
  return requireCapability('createResources', 'Para editar o crear recursos debes tener un perfil autorizado.');
}

function setAuthMode(mode) {
  state.authMode = mode;
  updateAuthUi();
}

function normalizeView(view) {
  if (view === 'structure' && !hasCapability('manageStructure')) return 'course';
  if (view === 'admin' && !hasCapability('manageUsers')) return 'course';
  if (!['course', 'module', 'structure', 'admin'].includes(view)) return 'course';
  return view;
}

function routeForCurrentState() {
  if (state.currentView === 'structure') return '#/estructura';
  if (state.currentView === 'admin') return '#/admin';
  if (state.currentView === 'module' && state.selectedModuleId) return `#/modulo/${encodeURIComponent(state.selectedModuleId)}`;
  return '#/mapa';
}

function syncRouteFromState({ replace = false } = {}) {
  const route = routeForCurrentState();
  if (window.location.hash !== route) {
    if (replace) {
      history.replaceState(null, '', route);
    } else {
      history.pushState(null, '', route);
    }
  }
}

function applyRouteFromLocation({ renderNow = true } = {}) {
  if (!state.data) return;
  const route = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [page, rawId] = route;

  if (page === 'estructura') {
    state.currentView = normalizeView('structure');
  } else if (page === 'admin') {
    state.currentView = normalizeView('admin');
  } else if (page === 'modulo') {
    const moduleId = rawId ? decodeURIComponent(rawId) : null;
    const module = state.data.modules.find((item) => item.id === moduleId) ?? state.data.modules[0];
    state.selectedModuleId = module?.id ?? null;
    state.selectedLessonId = module?.lessons.some((lesson) => lesson.id === state.selectedLessonId)
      ? state.selectedLessonId
      : module?.lessons[0]?.id ?? null;
    state.selectedSectionId = state.selectedSectionId || state.data.sections[0]?.id || 'preparacion';
    state.currentView = 'module';
  } else {
    state.currentView = 'course';
  }

  state.currentView = normalizeView(state.currentView);
  syncRouteFromState({ replace: true });
  if (renderNow) render();
}

function setView(view, { updateRoute = true, renderNow = false } = {}) {
  state.currentView = normalizeView(view);
  if (updateRoute) syncRouteFromState();
  if (renderNow) {
    render();
  } else {
    renderView();
  }
}

function renderView() {
  state.currentView = normalizeView(state.currentView);
  dom.viewButtons.forEach((button) => {
    const active = button.dataset.view === state.currentView || (button.dataset.view === 'course' && state.currentView === 'module');
    button.classList.toggle('active', active);
    button.hidden =
      (button.dataset.view === 'structure' && !hasCapability('manageStructure')) ||
      (button.dataset.view === 'admin' && !hasCapability('manageUsers'));
  });
  dom.viewPanels.forEach((panel) => {
    const panelViews = (panel.dataset.viewPanel || '').split(/\s+/);
    panel.hidden = !panelViews.includes(state.currentView);
  });
}

function canManageEditors() {
  return hasCapability('manageUsers');
}

function requireMainEditorPermission() {
  if (canManageEditors()) return true;
  alert('Solo la cuenta principal puede autorizar o quitar editores.');
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
    if (module.id === state.selectedModuleId) moduleNode.classList.add('active');
    moduleNode.innerHTML = `
      <p class="nav-kicker">Modulo ${moduleIndex + 1}</p>
      <button class="module-nav-button" type="button">${module.title}</button>
    `;
    moduleNode.querySelector('.module-nav-button').addEventListener('click', () => {
      state.selectedModuleId = module.id;
      state.selectedLessonId = module.lessons[0]?.id ?? null;
      state.selectedSectionId = state.data.sections[0]?.id ?? 'preparacion';
      clearForm();
      setView('module');
      render();
    });

    module.lessons.forEach((lesson, lessonIndex) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'lesson-button';
      if (module.id === state.selectedModuleId && lesson.id === state.selectedLessonId) {
        button.classList.add('active');
      }
      button.innerHTML = `
        <small>Leccion ${lessonIndex + 1}</small>
        <span>${lesson.title}</span>
      `;
      button.addEventListener('click', () => {
        state.selectedModuleId = module.id;
        state.selectedLessonId = lesson.id;
        clearForm();
        setView('module');
        render();
      });
      moduleNode.appendChild(button);
    });

    dom.nav.appendChild(moduleNode);
  });
}

function renderModuleStrip() {
  if (!dom.moduleStrip) return;
  dom.moduleStrip.innerHTML = '';

  if (!state.data.modules.length) {
    dom.moduleStrip.innerHTML = '<p class="empty-state">No hay modulos cargados.</p>';
    return;
  }

  state.data.modules.forEach((module, moduleIndex) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'module-strip-button';
    if (state.currentView === 'module' && module.id === state.selectedModuleId) button.classList.add('active');
    button.innerHTML = `
      <span>Modulo ${moduleIndex + 1}</span>
      <strong>${module.title}</strong>
    `;
    button.addEventListener('click', () => {
      state.selectedModuleId = module.id;
      state.selectedLessonId = module.lessons[0]?.id ?? null;
      state.selectedSectionId = state.data.sections[0]?.id ?? 'preparacion';
      clearForm();
      setView('module', { renderNow: true });
    });
    dom.moduleStrip.appendChild(button);
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

  if (state.currentView === 'course') {
    dom.moduleLabel.textContent = 'Estructura general';
    dom.lessonTitle.textContent = 'Mapa del curso';
    dom.lessonMeta.textContent = 'Escoge un modulo en la fila superior para revisar sus lecciones, partes y recursos.';
    dom.mapTitle.textContent = 'Mapa del curso';
    dom.mapDescription.textContent = 'Los cuatro modulos quedan siempre arriba para navegar sin cargar toda la informacion a la vez.';
    const courseTotals = state.data.modules.reduce(
      (acc, module) => {
        acc.modules += 1;
        acc.lessons += module.lessons.length;
        module.lessons.forEach((lesson) => {
          const stats = lessonStats(lesson);
          acc.resources += stats.total;
          acc.missing += stats.missing;
          acc.review += stats.review;
          acc.approved += stats.approved;
        });
        return acc;
      },
      { modules: 0, lessons: 0, resources: 0, missing: 0, review: 0, approved: 0 }
    );
    const overview = document.createElement('article');
    overview.className = 'course-overview-panel';
    overview.innerHTML = `
      <div>
        <p class="map-kicker">Vista general</p>
        <h4>Selecciona un modulo para abrir su pagina de trabajo</h4>
        <p class="muted">El mapa mantiene la vision general limpia; cada modulo concentra sus lecciones, partes y recursos en una pagina propia.</p>
      </div>
      <div class="course-overview-stats">
        <span><strong>${courseTotals.modules}</strong> modulos</span>
        <span><strong>${courseTotals.lessons}</strong> lecciones</span>
        <span><strong>${courseTotals.resources}</strong> recursos</span>
        <span><strong>${courseTotals.missing}</strong> faltantes</span>
        <span><strong>${courseTotals.review}</strong> por revisar</span>
        <span><strong>${courseTotals.approved}</strong> aprobados</span>
      </div>
    `;
    dom.map.appendChild(overview);
    return;
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
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'module-overview-card';
      if (module.id === state.selectedModuleId) card.classList.add('active');
      card.innerHTML = `
        <span class="map-kicker">Modulo ${moduleIndex + 1}</span>
        <strong>${module.title}</strong>
        <span class="module-overview-meta">${plural(module.lessons.length, 'leccion', 'lecciones')} · ${plural(totals.total, 'recurso', 'recursos')}</span>
      `;
      card.addEventListener('click', () => {
        state.selectedModuleId = module.id;
        state.selectedLessonId = module.lessons[0]?.id ?? null;
        state.selectedSectionId = state.data.sections[0]?.id ?? 'preparacion';
        clearForm();
        setView('module');
        render();
      });
      dom.map.appendChild(card);
    });
    return;
  }

  const module = currentModule() ?? state.data.modules[0];
  const moduleIndex = state.data.modules.findIndex((item) => item.id === module.id);
  dom.mapTitle.textContent = `Modulo ${moduleIndex + 1}`;
  dom.mapDescription.textContent = 'Selecciona una leccion o una parte para trabajar sus recursos.';
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
  if (state.currentView === 'course') return;
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

    const actions = node.querySelector('.resource-actions');
    const canManageResource = hasCapability('manageResources');
    actions.hidden = !canManageResource && !hasCapability('deleteResources') && !hasCapability('moveResources');
    node.querySelector('.edit').hidden = !canManageResource;
    node.querySelector('.delete').hidden = !hasCapability('deleteResources');
    node.querySelector('.move-up').hidden = !hasCapability('moveResources');
    node.querySelector('.move-down').hidden = !hasCapability('moveResources');
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
      const canOpen = hasCapability('openAssets');
      const item = document.createElement(canOpen ? 'a' : 'span');
      item.className = `asset-chip link-chip${canOpen ? '' : ' locked-asset'}`;
      if (canOpen) {
        item.href = normalizeUrl(link.url);
        item.target = '_blank';
        item.rel = 'noopener noreferrer';
      }
      item.textContent = canOpen ? link.label || link.url : `${link.label || 'Enlace'} (requiere permiso)`;
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
      const canOpen = hasCapability('openAssets');
      const item = document.createElement(canOpen ? 'a' : 'span');
      item.className = `asset-chip file-chip${canOpen ? '' : ' locked-asset'}`;
      if (canOpen) {
        item.href = file.publicUrl || file.dataUrl || file.path || '#';
        item.download = file.name;
      }
      item.textContent = `${file.name} (${formatFileSize(file.size)})${canOpen ? '' : ' - requiere permiso'}`;
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
  if (
    !dom.lessonModuleSelect ||
    !dom.lessonEditSelect ||
    !dom.lessonOrderSelect ||
    !dom.moduleOrderSelect ||
    !dom.sectionOrderSelect
  ) {
    return;
  }
  dom.lessonModuleSelect.innerHTML = '';
  dom.lessonEditSelect.innerHTML = '';
  dom.lessonOrderSelect.innerHTML = '';
  dom.moduleOrderSelect.innerHTML = '';
  dom.sectionOrderSelect.innerHTML = '';

  state.data.modules.forEach((module, moduleIndex) => {
    const moduleOption = document.createElement('option');
    moduleOption.value = module.id;
    moduleOption.textContent = `Modulo ${moduleIndex + 1}: ${module.title}`;
    dom.lessonModuleSelect.appendChild(moduleOption);
    dom.moduleOrderSelect.appendChild(moduleOption.cloneNode(true));

    module.lessons.forEach((lesson, lessonIndex) => {
      const lessonOption = document.createElement('option');
      lessonOption.value = `${module.id}|${lesson.id}`;
      lessonOption.textContent = `Modulo ${moduleIndex + 1} / Leccion ${lessonIndex + 1}: ${lesson.title}`;
      dom.lessonEditSelect.appendChild(lessonOption);
      dom.lessonOrderSelect.appendChild(lessonOption.cloneNode(true));
    });
  });

  dom.lessonModuleSelect.value = state.selectedModuleId ?? state.data.modules[0]?.id ?? '';
  dom.lessonEditSelect.value = `${state.selectedModuleId}|${state.selectedLessonId}`;
  dom.lessonOrderSelect.value = `${state.selectedModuleId}|${state.selectedLessonId}`;
  dom.moduleOrderSelect.value = state.selectedModuleId ?? state.data.modules[0]?.id ?? '';
  state.data.sections.forEach((section, index) => {
    const option = document.createElement('option');
    option.value = section.id;
    option.textContent = `Parte ${index + 1}: ${section.title}`;
    dom.sectionOrderSelect.appendChild(option);
  });
  dom.sectionOrderSelect.value = state.selectedSectionId ?? state.data.sections[0]?.id ?? '';
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

function cloneCourseData(data) {
  return JSON.parse(JSON.stringify(data));
}

function ensureStructureDraft({ reset = false } = {}) {
  if (!state.data) return null;
  if (reset || !state.structureDraft) {
    state.structureDraft = cloneCourseData(state.data);
    state.structureDirty = false;
  }
  return state.structureDraft;
}

function setStructureDirty(isDirty = true) {
  state.structureDirty = isDirty;
  if (!dom.structureStatus) return;
  dom.structureStatus.textContent = isDirty ? 'Cambios pendientes sin guardar' : 'Sin cambios pendientes';
  dom.structureStatus.dataset.dirty = isDirty ? 'true' : 'false';
}

function updateStructureStatus() {
  setStructureDirty(state.structureDirty);
}

function structureDraftModule(moduleId) {
  return state.structureDraft?.modules.find((module) => module.id === moduleId);
}

function structureDraftLesson(moduleId, lessonId) {
  return structureDraftModule(moduleId)?.lessons.find((lesson) => lesson.id === lessonId);
}

function moveDraftItem(items, index, direction) {
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= items.length) return false;
  [items[index], items[targetIndex]] = [items[targetIndex], items[index]];
  return true;
}

function normalizeStructureSelection() {
  const modules = state.data.modules;
  const module = modules.find((item) => item.id === state.selectedModuleId) ?? modules[0];
  state.selectedModuleId = module?.id ?? null;
  const lesson = module?.lessons.find((item) => item.id === state.selectedLessonId) ?? module?.lessons[0];
  state.selectedLessonId = lesson?.id ?? null;
  const section = state.data.sections.find((item) => item.id === state.selectedSectionId) ?? state.data.sections[0];
  state.selectedSectionId = section?.id ?? 'preparacion';
}

function createStructureButton(label, className, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

function createStructureInput(value, placeholder, onInput) {
  const input = document.createElement('input');
  input.value = value || '';
  input.placeholder = placeholder;
  input.addEventListener('input', () => {
    onInput(input.value);
    setStructureDirty(true);
  });
  return input;
}

function renderStructureParts(lessonBlock) {
  const parts = document.createElement('div');
  parts.className = 'structure-parts';
  const title = document.createElement('p');
  title.className = 'structure-subtitle';
  title.textContent = 'Partes comunes de la leccion';
  parts.appendChild(title);

  state.structureDraft.sections.forEach((section, sectionIndex) => {
    const row = document.createElement('div');
    row.className = 'structure-part-row';
    const label = document.createElement('span');
    label.className = 'structure-index';
    label.textContent = `Parte ${sectionIndex + 1}`;
    const fields = document.createElement('div');
    fields.className = 'structure-part-fields';
    fields.append(
      createStructureInput(section.title, 'Nombre de la parte', (value) => {
        section.title = value;
      }),
      createStructureInput(section.description, 'Descripcion breve', (value) => {
        section.description = value;
      })
    );
    const actions = document.createElement('div');
    actions.className = 'structure-actions';
    actions.append(
      createStructureButton('Subir', 'mini-btn', () => moveStructureSection(section.id, -1)),
      createStructureButton('Bajar', 'mini-btn', () => moveStructureSection(section.id, 1)),
      createStructureButton('Eliminar', 'mini-btn delete', () => deleteStructureSection(section.id))
    );
    row.append(label, fields, actions);
    parts.appendChild(row);
  });

  const creator = document.createElement('div');
  creator.className = 'structure-create-row';
  const titleInput = document.createElement('input');
  titleInput.placeholder = 'Nueva parte';
  const descriptionInput = document.createElement('input');
  descriptionInput.placeholder = 'Descripcion';
  creator.append(
    titleInput,
    descriptionInput,
    createStructureButton('Crear parte', 'mini-btn accent', () => {
      addStructureSection(titleInput.value, descriptionInput.value);
    })
  );
  parts.appendChild(creator);
  lessonBlock.appendChild(parts);
}

function renderStructureList() {
  if (!dom.structureList || !state.data) return;
  ensureStructureDraft({ reset: !state.structureDirty });
  updateStructureStatus();
  dom.structureList.innerHTML = '';

  state.structureDraft.modules.forEach((module, moduleIndex) => {
    const card = document.createElement('article');
    card.className = 'structure-module-card';

    const head = document.createElement('div');
    head.className = 'structure-module-head';
    const moduleFields = document.createElement('div');
    const kicker = document.createElement('p');
    kicker.className = 'map-kicker';
    kicker.textContent = `Modulo ${moduleIndex + 1}`;
    moduleFields.append(kicker, createStructureInput(module.title, 'Nombre del modulo', (value) => {
      module.title = value;
    }));
    const moduleActions = document.createElement('div');
    moduleActions.className = 'structure-actions';
    moduleActions.append(
      createStructureButton('Subir', 'mini-btn', () => moveStructureModule(module.id, -1)),
      createStructureButton('Bajar', 'mini-btn', () => moveStructureModule(module.id, 1)),
      createStructureButton('Eliminar', 'mini-btn delete', () => deleteStructureModule(module.id))
    );
    head.append(moduleFields, moduleActions);
    card.appendChild(head);

    const lessons = document.createElement('div');
    lessons.className = 'structure-lessons';
    module.lessons.forEach((lesson, lessonIndex) => {
      const lessonBlock = document.createElement('section');
      lessonBlock.className = 'structure-lesson-block';
      const row = document.createElement('div');
      row.className = 'structure-lesson-row';
      const label = document.createElement('span');
      label.className = 'structure-index';
      label.textContent = `Leccion ${lessonIndex + 1}`;
      const input = createStructureInput(lesson.title, 'Nombre de la leccion', (value) => {
        lesson.title = value;
      });
      const actions = document.createElement('div');
      actions.className = 'structure-actions';
      actions.append(
        createStructureButton('Subir', 'mini-btn', () => moveStructureLesson(module.id, lesson.id, -1)),
        createStructureButton('Bajar', 'mini-btn', () => moveStructureLesson(module.id, lesson.id, 1)),
        createStructureButton('Eliminar', 'mini-btn delete', () => deleteStructureLesson(module.id, lesson.id))
      );
      row.append(label, input, actions);
      lessonBlock.appendChild(row);
      renderStructureParts(lessonBlock);
      lessons.appendChild(lessonBlock);
    });

    const creator = document.createElement('div');
    creator.className = 'structure-create-row';
    const lessonInput = document.createElement('input');
    lessonInput.placeholder = 'Nueva leccion en este modulo';
    creator.append(
      lessonInput,
      createStructureButton('Crear leccion', 'mini-btn accent', () => {
        addStructureLesson(module.id, lessonInput.value);
      })
    );
    lessons.appendChild(creator);
    card.appendChild(lessons);
    dom.structureList.appendChild(card);
  });
}

function render() {
  renderView();
  renderSummary();
  renderModuleStrip();
  renderNavigation();
  renderCourseMap();
  renderTabs();
  renderTargets();
  renderLessonControls();
  renderAdminControls();
  renderStructureList();
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
    row.className = 'asset-row editable-asset-row';
    const fields = document.createElement('div');
    fields.className = 'asset-edit-fields';
    const labelInput = document.createElement('input');
    labelInput.value = link.label || '';
    labelInput.placeholder = 'Nombre del enlace';
    labelInput.addEventListener('input', () => {
      link.label = labelInput.value;
    });
    const urlInput = document.createElement('input');
    urlInput.value = link.url || '';
    urlInput.placeholder = 'https://...';
    urlInput.addEventListener('input', () => {
      link.url = urlInput.value;
    });
    fields.append(labelInput, urlInput);
    const actions = document.createElement('div');
    actions.className = 'asset-row-actions';
    const open = document.createElement('a');
    open.className = 'mini-btn';
    open.href = normalizeUrl(link.url);
    open.target = '_blank';
    open.rel = 'noopener noreferrer';
    open.textContent = 'Abrir';
    const remove = document.createElement('button');
    remove.className = 'mini-btn delete';
    remove.type = 'button';
    remove.textContent = 'Quitar';
    remove.addEventListener('click', () => {
      state.draftLinks = state.draftLinks.filter((item) => item.id !== link.id);
      renderDraftLinks();
    });
    actions.append(open, remove);
    row.append(fields, actions);
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
    row.className = 'asset-row editable-asset-row';
    const fields = document.createElement('div');
    fields.className = 'asset-edit-fields';
    const nameInput = document.createElement('input');
    nameInput.value = file.name || '';
    nameInput.placeholder = 'Nombre visible del archivo';
    nameInput.addEventListener('input', () => {
      file.name = nameInput.value;
    });
    const detail = document.createElement('small');
    detail.textContent = `${formatFileSize(file.size)}${file.type ? ` · ${file.type}` : ''}`;
    fields.append(nameInput, detail);
    const actions = document.createElement('div');
    actions.className = 'asset-row-actions';
    const anchor = document.createElement('a');
    anchor.className = 'mini-btn';
    anchor.href = file.publicUrl || file.dataUrl || file.path || '#';
    anchor.download = file.name;
    anchor.textContent = 'Abrir';
    const remove = document.createElement('button');
    remove.className = 'mini-btn delete';
    remove.type = 'button';
    remove.textContent = 'Quitar';
    remove.addEventListener('click', () => {
      state.draftFiles = state.draftFiles.filter((item) => item.id !== file.id);
      renderDraftFiles();
    });
    actions.append(anchor, remove);
    row.append(fields, actions);
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
  setView('module');
  dom.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  if (!dom.resourceTitle.value.trim()) return;
  const [targetModuleId, targetLessonId, targetSectionId] = dom.resourceTarget.value.split('|');
  const targetLesson = findLesson(targetModuleId, targetLessonId);
  if (!targetLesson) return;

  const resource = formResource();
  resource.section = targetSectionId;

  const sourceLesson = currentLesson();
  const existingIndex = sourceLesson?.resources.findIndex((item) => item.id === resource.id) ?? -1;
  if (existingIndex >= 0) {
    if (!requireCapability('manageResources', 'Tu perfil puede crear recursos, pero no editar recursos existentes.')) return;
  } else if (!requireCapability('createResources', 'Tu perfil no puede crear recursos.')) {
    return;
  }
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
  if (!requireCapability('createResources', 'Tu perfil no puede agregar enlaces a recursos.')) return;
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
  if (!requireCapability('createResources', 'Tu perfil no puede agregar archivos a recursos.')) {
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
  if (!requireCapability('deleteResources', 'Tu perfil no puede eliminar recursos.')) return;
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
  if (!requireCapability('moveResources', 'Tu perfil no puede reordenar recursos.')) return;
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
  if (!requireCapability('manageStructure', 'Tu perfil no puede modificar la estructura del curso.')) return;
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
  if (!requireCapability('manageStructure', 'Tu perfil no puede modificar la estructura del curso.')) return;
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
  if (!requireCapability('manageStructure', 'Tu perfil no puede modificar la configuracion del curso.')) return;
  state.data.course = state.data.course || {};
  state.data.course.title = dom.courseTitleInput.value.trim() || 'Calculo III';
  state.data.course.description = dom.courseDescriptionInput.value.trim();
  document.querySelector('h1').textContent = state.data.course.title;
  if (!(await saveData())) return;
  render();
}

async function addModule() {
  if (!requireCapability('manageStructure', 'Tu perfil no puede crear modulos.')) return;
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
  if (!requireCapability('manageStructure', 'Tu perfil no puede modificar modulos.')) return;
  const module = state.data.modules.find((item) => item.id === dom.moduleEditSelect.value);
  const title = dom.moduleTitleInput.value.trim();
  if (!module || !title) return;
  module.title = title;
  state.selectedModuleId = module.id;
  if (!(await saveData())) return;
  render();
}

async function deleteModule() {
  if (!requireCapability('manageStructure', 'Tu perfil no puede eliminar modulos.')) return;
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
  if (!requireCapability('manageStructure', 'Tu perfil no puede modificar las partes de las lecciones.')) return;
  const section = state.data.sections.find((item) => item.id === dom.sectionEditSelect.value);
  const title = dom.sectionTitleInput.value.trim();
  if (!section || !title) return;
  section.title = title;
  section.description = dom.sectionDescriptionInput.value.trim();
  state.selectedSectionId = section.id;
  if (!(await saveData())) return;
  render();
}

async function moveModuleOrder(direction) {
  if (!requireCapability('manageStructure', 'Tu perfil no puede reordenar modulos.')) return;
  const index = state.data.modules.findIndex((module) => module.id === dom.moduleOrderSelect.value);
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= state.data.modules.length) return;
  [state.data.modules[index], state.data.modules[targetIndex]] = [state.data.modules[targetIndex], state.data.modules[index]];
  state.selectedModuleId = state.data.modules[targetIndex].id;
  if (!(await saveData())) return;
  render();
}

async function moveLessonOrder(direction) {
  if (!requireCapability('manageStructure', 'Tu perfil no puede reordenar lecciones.')) return;
  const [moduleId, lessonId] = dom.lessonOrderSelect.value.split('|');
  const module = state.data.modules.find((item) => item.id === moduleId);
  if (!module) return;
  const index = module.lessons.findIndex((lesson) => lesson.id === lessonId);
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= module.lessons.length) return;
  [module.lessons[index], module.lessons[targetIndex]] = [module.lessons[targetIndex], module.lessons[index]];
  state.selectedModuleId = module.id;
  state.selectedLessonId = module.lessons[targetIndex].id;
  if (!(await saveData())) return;
  render();
}

async function moveSectionOrder(direction) {
  if (!requireCapability('manageStructure', 'Tu perfil no puede reordenar las partes de las lecciones.')) return;
  const index = state.data.sections.findIndex((section) => section.id === dom.sectionOrderSelect.value);
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= state.data.sections.length) return;
  [state.data.sections[index], state.data.sections[targetIndex]] = [state.data.sections[targetIndex], state.data.sections[index]];
  state.selectedSectionId = state.data.sections[targetIndex].id;
  if (!(await saveData())) return;
  render();
}

async function updateModuleTitleInline(moduleId, titleValue) {
  if (!requireCapability('manageStructure', 'Tu perfil no puede modificar modulos.')) return;
  const module = state.data.modules.find((item) => item.id === moduleId);
  const title = titleValue.trim();
  if (!module || !title) return render();
  module.title = title;
  state.selectedModuleId = module.id;
  if (!(await saveData())) return;
  render();
}

async function updateLessonTitleInline(moduleId, lessonId, titleValue) {
  if (!requireCapability('manageStructure', 'Tu perfil no puede modificar lecciones.')) return;
  const lesson = findLesson(moduleId, lessonId);
  const title = titleValue.trim();
  if (!lesson || !title) return render();
  lesson.title = title;
  state.selectedModuleId = moduleId;
  state.selectedLessonId = lessonId;
  if (!(await saveData())) return;
  render();
}

async function moveModuleById(moduleId, direction) {
  dom.moduleOrderSelect.value = moduleId;
  await moveModuleOrder(direction);
}

async function moveLessonById(moduleId, lessonId, direction) {
  dom.lessonOrderSelect.value = `${moduleId}|${lessonId}`;
  await moveLessonOrder(direction);
}

async function deleteModuleById(moduleId) {
  if (!requireCapability('manageStructure', 'Tu perfil no puede eliminar modulos.')) return;
  const module = state.data.modules.find((item) => item.id === moduleId);
  if (!module) return;
  const lessonCount = module.lessons?.length ?? 0;
  if (!confirm(`Eliminar el modulo "${module.title}" y sus ${lessonCount} lecciones?`)) return;
  state.data.modules = state.data.modules.filter((item) => item.id !== module.id);
  selectFirstAvailable();
  if (!(await saveData())) return;
  clearForm();
  render();
}

async function deleteLessonById(moduleId, lessonId) {
  if (!requireCapability('manageStructure', 'Tu perfil no puede eliminar lecciones.')) return;
  const module = state.data.modules.find((item) => item.id === moduleId);
  const lesson = module?.lessons.find((item) => item.id === lessonId);
  if (!module || !lesson) return;
  const resourceCount = lesson.resources?.length ?? 0;
  if (!confirm(`Eliminar la leccion "${lesson.title}" y sus ${resourceCount} recursos?`)) return;
  module.lessons = module.lessons.filter((item) => item.id !== lesson.id);
  state.selectedModuleId = module.id;
  state.selectedLessonId = module.lessons[0]?.id ?? null;
  if (!(await saveData())) return;
  clearForm();
  render();
}

function addStructureModule() {
  if (!requireCapability('manageStructure', 'Tu perfil no puede modificar la estructura del curso.')) return;
  ensureStructureDraft();
  const title = dom.structureNewModuleTitle?.value.trim();
  if (!title) return;
  state.structureDraft.modules.push({ id: uid('m'), title, lessons: [] });
  if (dom.structureNewModuleTitle) dom.structureNewModuleTitle.value = '';
  setStructureDirty(true);
  renderStructureList();
}

function addStructureLesson(moduleId, titleValue) {
  if (!requireCapability('manageStructure', 'Tu perfil no puede modificar la estructura del curso.')) return;
  const module = structureDraftModule(moduleId);
  const title = titleValue.trim();
  if (!module || !title) return;
  module.lessons.push({ id: uid('l'), title, resources: [] });
  setStructureDirty(true);
  renderStructureList();
}

function addStructureSection(titleValue, descriptionValue) {
  if (!requireCapability('manageStructure', 'Tu perfil no puede modificar la estructura del curso.')) return;
  ensureStructureDraft();
  const title = titleValue.trim();
  if (!title) return;
  state.structureDraft.sections.push({
    id: uid('s'),
    title,
    description: descriptionValue.trim(),
  });
  setStructureDirty(true);
  renderStructureList();
}

function moveStructureModule(moduleId, direction) {
  if (!requireCapability('manageStructure', 'Tu perfil no puede modificar la estructura del curso.')) return;
  ensureStructureDraft();
  const index = state.structureDraft.modules.findIndex((module) => module.id === moduleId);
  if (!moveDraftItem(state.structureDraft.modules, index, direction)) return;
  setStructureDirty(true);
  renderStructureList();
}

function moveStructureLesson(moduleId, lessonId, direction) {
  if (!requireCapability('manageStructure', 'Tu perfil no puede modificar la estructura del curso.')) return;
  const module = structureDraftModule(moduleId);
  if (!module) return;
  const index = module.lessons.findIndex((lesson) => lesson.id === lessonId);
  if (!moveDraftItem(module.lessons, index, direction)) return;
  setStructureDirty(true);
  renderStructureList();
}

function moveStructureSection(sectionId, direction) {
  if (!requireCapability('manageStructure', 'Tu perfil no puede modificar la estructura del curso.')) return;
  ensureStructureDraft();
  const index = state.structureDraft.sections.findIndex((section) => section.id === sectionId);
  if (!moveDraftItem(state.structureDraft.sections, index, direction)) return;
  setStructureDirty(true);
  renderStructureList();
}

function deleteStructureModule(moduleId) {
  if (!requireCapability('manageStructure', 'Tu perfil no puede modificar la estructura del curso.')) return;
  const module = structureDraftModule(moduleId);
  if (!module) return;
  const resourceCount = module.lessons.reduce((total, lesson) => total + (lesson.resources?.length ?? 0), 0);
  if (!confirm(`Eliminar el modulo "${module.title}" con ${module.lessons.length} lecciones y ${resourceCount} recursos?`)) return;
  state.structureDraft.modules = state.structureDraft.modules.filter((item) => item.id !== moduleId);
  setStructureDirty(true);
  renderStructureList();
}

function deleteStructureLesson(moduleId, lessonId) {
  if (!requireCapability('manageStructure', 'Tu perfil no puede modificar la estructura del curso.')) return;
  const module = structureDraftModule(moduleId);
  const lesson = structureDraftLesson(moduleId, lessonId);
  if (!module || !lesson) return;
  const resourceCount = lesson.resources?.length ?? 0;
  if (!confirm(`Eliminar la leccion "${lesson.title}" y sus ${resourceCount} recursos?`)) return;
  module.lessons = module.lessons.filter((item) => item.id !== lessonId);
  setStructureDirty(true);
  renderStructureList();
}

function deleteStructureSection(sectionId) {
  if (!requireCapability('manageStructure', 'Tu perfil no puede modificar la estructura del curso.')) return;
  ensureStructureDraft();
  if (state.structureDraft.sections.length <= 1) {
    alert('Debe quedar al menos una parte en las lecciones.');
    return;
  }
  const section = state.structureDraft.sections.find((item) => item.id === sectionId);
  if (!section) return;
  const fallback = state.structureDraft.sections.find((item) => item.id !== sectionId);
  const affectedResources = state.structureDraft.modules.reduce((total, module) => (
    total + module.lessons.reduce((lessonTotal, lesson) => (
      lessonTotal + (lesson.resources || []).filter((resource) => resource.section === sectionId).length
    ), 0)
  ), 0);
  if (!confirm(`Eliminar la parte "${section.title}"? ${affectedResources} recursos se moveran a "${fallback.title}".`)) return;
  state.structureDraft.modules.forEach((module) => {
    module.lessons.forEach((lesson) => {
      (lesson.resources || []).forEach((resource) => {
        if (resource.section === sectionId) resource.section = fallback.id;
      });
    });
  });
  state.structureDraft.sections = state.structureDraft.sections.filter((item) => item.id !== sectionId);
  setStructureDirty(true);
  renderStructureList();
}

function validateStructureDraft() {
  const data = state.structureDraft;
  if (!data.modules.length) return 'Debe quedar al menos un modulo.';
  if (!data.sections.length) return 'Debe quedar al menos una parte.';
  const emptyModule = data.modules.find((module) => !module.title.trim());
  if (emptyModule) return 'Todos los modulos deben tener nombre.';
  const emptyLesson = data.modules.flatMap((module) => module.lessons).find((lesson) => !lesson.title.trim());
  if (emptyLesson) return 'Todas las lecciones deben tener nombre.';
  const emptySection = data.sections.find((section) => !section.title.trim());
  if (emptySection) return 'Todas las partes deben tener nombre.';
  return '';
}

async function saveStructureDraft() {
  if (!requireCapability('manageStructure', 'Tu perfil no puede modificar la estructura del curso.')) return;
  ensureStructureDraft();
  const error = validateStructureDraft();
  if (error) {
    alert(error);
    return;
  }
  state.data = cloneCourseData(state.structureDraft);
  normalizeStructureSelection();
  if (!(await saveData())) return;
  ensureStructureDraft({ reset: true });
  clearForm();
  render();
}

function discardStructureDraft() {
  if (!state.structureDirty || confirm('Descartar los cambios de estructura sin guardar?')) {
    ensureStructureDraft({ reset: true });
    renderStructureList();
  }
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
  const identifier = dom.loginEmail.value.trim();
  const password = dom.loginPassword.value;
  if (!identifier || !password) {
    alert('Escribe correo o nombre de usuario, y contrasena.');
    return;
  }
  const email = await resolveLoginEmail(identifier);
  if (!email) {
    alert('No se encontro una cuenta con ese correo o nombre de usuario.');
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

async function resolveLoginEmail(identifier) {
  if (identifier.includes('@')) return identifier;
  const { data, error } = await cloudClient.rpc('email_for_login', {
    login_identifier: identifier,
  });
  if (error) {
    return identifier;
  }
  return data;
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
  const existingEmail = await resolveLoginEmail(name);
  if (existingEmail && existingEmail !== name) {
    alert('Ese nombre de usuario ya esta registrado. Escoge otro.');
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
  state.isMainEditor = false;
  state.userRole = 'viewer';
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
  if (!state.isMainEditor) {
    dom.editorList.innerHTML = '<p class="asset-empty">Solo la cuenta principal puede ver y modificar editores.</p>';
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
    email.textContent = `${editor.email} · ${labels[editor.role || 'manager'] ?? editor.role}`;
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
    state.isMainEditor = false;
    state.userRole = 'viewer';
    updateAuthUi();
    renderEditorList([]);
    return;
  }
  const email = state.session.user.email;
  state.isMainEditor = email.toLowerCase() === MAIN_EDITOR_EMAIL;
  const { data, error } = await cloudClient
    .from('course_editors')
    .select('email, role')
    .eq('email', email)
    .maybeSingle();
  state.userRole = state.isMainEditor ? 'owner' : data?.role || 'viewer';
  state.isEditor = state.userRole !== 'viewer' && !error;
  updateAuthUi();
  setCloudStatus(
    state.isEditor ? `Sesion activa: ${labels[state.userRole] ?? state.userRole}.` : 'Sesion iniciada, pero este correo no esta autorizado para editar.',
    state.isEditor ? 'ok' : 'pending'
  );
  await loadEditors();
  if (state.data) render();
}

async function loadEditors() {
  if (!cloudClient || !state.isMainEditor) {
    renderEditorList([]);
    return;
  }
  const { data, error } = await cloudClient
    .from('course_editors')
    .select('email, role, created_at')
    .order('email');
  if (error) {
    renderEditorList([]);
    return;
  }
  renderEditorList(data);
}

async function addEditor() {
  if (!requireMainEditorPermission()) return;
  const email = dom.editorEmailInput.value.trim().toLowerCase();
  const role = dom.editorRoleInput.value;
  if (!email) return;
  const { error } = await cloudClient.from('course_editors').upsert({ email, role });
  if (error) {
    alert(`No se pudo autorizar este correo: ${error.message}`);
    return;
  }
  dom.editorEmailInput.value = '';
  await loadEditors();
}

async function removeEditor(email) {
  if (!requireMainEditorPermission()) return;
  if (email === state.session?.user?.email && !confirm('Estas quitando tu propio permiso de editor. Continuar?')) return;
  const { error } = await cloudClient.from('course_editors').delete().eq('email', email);
  if (error) {
    alert(`No se pudo quitar este editor: ${error.message}`);
    return;
  }
  await refreshEditorStatus();
}

function wireEvents() {
  dom.viewButtons.forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.view, { renderNow: true }));
  });
  dom.routeBack?.addEventListener('click', () => history.back());
  dom.routeForward?.addEventListener('click', () => history.forward());
  window.addEventListener('hashchange', () => applyRouteFromLocation());
  dom.search.addEventListener('input', (event) => {
    state.search = event.target.value;
    renderResources();
  });
  dom.statusFilter.addEventListener('change', () => updateMultiFilter('status'));
  dom.typeFilter.addEventListener('change', () => updateMultiFilter('type'));
  document.querySelectorAll('[data-filter-reset]').forEach((button) => {
    button.addEventListener('click', () => resetMultiFilter(button.dataset.filterReset));
  });
  onOptional('#save-lesson', 'click', addLesson);
  onOptional('#update-lesson', 'click', updateLesson);
  onOptional('#lesson-up', 'click', () => moveLessonOrder(-1));
  onOptional('#lesson-down', 'click', () => moveLessonOrder(1));
  onOptional('#module-up', 'click', () => moveModuleOrder(-1));
  onOptional('#module-down', 'click', () => moveModuleOrder(1));
  onOptional('#section-up', 'click', () => moveSectionOrder(-1));
  onOptional('#section-down', 'click', () => moveSectionOrder(1));
  dom.saveStructure?.addEventListener('click', saveStructureDraft);
  dom.discardStructure?.addEventListener('click', discardStructureDraft);
  dom.structureAddModule?.addEventListener('click', addStructureModule);
  dom.structureNewModuleTitle?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addStructureModule();
    }
  });
  dom.lessonEditSelect?.addEventListener('change', () => {
    const [moduleId, lessonId] = dom.lessonEditSelect.value.split('|');
    const lesson = findLesson(moduleId, lessonId);
    dom.lessonEditTitleInput.value = lesson?.title ?? '';
  });
  document.querySelector('#clear-form').addEventListener('click', clearForm);
  document.querySelector('#duplicate-resource').addEventListener('click', duplicateResource);
  dom.loginButton.addEventListener('click', loginEditor);
  dom.signupButton.addEventListener('click', signupEditor);
  dom.authLoginMode.addEventListener('click', () => setAuthMode('login'));
  dom.authSignupMode.addEventListener('click', () => setAuthMode('signup'));
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
  applyRouteFromLocation({ renderNow: false });
  clearForm();
  syncRouteFromState();
  render();
  if (state.cloudReady) await loadEditors();
}

wireEvents();
init();
