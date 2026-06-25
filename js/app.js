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
  owner: 'Cuenta principal',
  admin: 'Administrador',
  manager: 'Editor avanzado',
  contributor: 'Creador de recursos',
  viewer: 'Solo lectura',
  unassigned: 'Sin perfil asignado',
};

const categoryKeys = {
  status: 'resourceStatuses',
  type: 'resourceTypes',
  group: 'resourceGroups',
};

const categoryFallbacks = {
  status: 'planned',
  type: 'other',
  group: 'general',
};

const defaultCategories = {
  status: [
    { id: 'exists', title: 'Existe', color: '#247548', active: true },
    { id: 'planned', title: 'Por anadir', color: '#b7791f', active: true },
    { id: 'missing', title: 'Falta', color: '#b4233b', active: true },
    { id: 'review', title: 'Por revisar', color: '#d89521', active: true },
    { id: 'approved', title: 'Aprobado', color: '#16815f', active: true },
    { id: 'discarded', title: 'Descartado', color: '#667085', active: true },
  ],
  type: [
    { id: 'video', title: 'Video', color: '#1e4f87', active: true },
    { id: 'link', title: 'Link', color: '#2b746b', active: true },
    { id: 'file', title: 'Archivo', color: '#7047a8', active: true },
    { id: 'page', title: 'Pagina Moodle', color: '#8a5a1f', active: true },
    { id: 'h5p', title: 'H5P', color: '#0f766e', active: true },
    { id: 'quiz', title: 'Pregunta/reto', color: '#9f2d3d', active: true },
    { id: 'other', title: 'Otro', color: '#607086', active: true },
  ],
  group: [
    { id: 'general', title: 'General', color: '#607086', active: true },
    { id: 'simuladores', title: 'Simuladores', color: '#19a974', active: true },
    { id: 'videos', title: 'Videos', color: '#1e4f87', active: true },
    { id: 'lecturas', title: 'Lecturas', color: '#7047a8', active: true },
    { id: 'resumenes', title: 'Resumenes', color: '#d89521', active: true },
    { id: 'competencias', title: 'Competencias', color: '#b4233b', active: true },
    { id: 'material-apoyo', title: 'Material de apoyo', color: '#2b746b', active: true },
    { id: 'moodle', title: 'Moodle', color: '#8a5a1f', active: true },
  ],
};

const profileStatusLabels = {
  profile_ready: 'Perfil activo',
  missing_profile: 'Sin perfil publico',
  no_auth_user: 'Sin cuenta Auth',
};

const assignableRoles = ['admin', 'manager', 'contributor', 'viewer'];

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
  admin: {
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
  groupFilters: [],
  search: '',
  pendingDeleteResourceId: null,
  pendingDeleteAuditId: null,
  pendingDeleteKind: '',
  draftLinks: [],
  draftFiles: [],
  session: null,
  isEditor: false,
  isMainEditor: false,
  userRole: 'unassigned',
  authMode: 'login',
  returnRoute: '#/mapa',
  recoveringPassword: false,
  currentView: 'course',
  cloudReady: false,
  cloudStatus: 'local',
  structureDraft: null,
  structureDirty: false,
  categoryDraft: null,
  categoryDirty: false,
  loadedEditors: [],
  loadedRegisteredUsers: [],
  currentUserProfile: null,
  resourceAuditLog: [],
  auditSearch: '',
  auditPage: 1,
  auditPageSize: 20,
  accessChecked: false,
  hasCourseAccess: false,
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
  groupFilter: document.querySelector('#group-filter'),
  search: document.querySelector('#search'),
  form: document.querySelector('#resource-form'),
  formTitle: document.querySelector('#form-title'),
  resourceId: document.querySelector('#resource-id'),
  resourceTitle: document.querySelector('#resource-title'),
  resourceType: document.querySelector('#resource-type'),
  resourceStatus: document.querySelector('#resource-status'),
  resourceGroup: document.querySelector('#resource-group'),
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
  deleteConfirmTitle: document.querySelector('#delete-confirm-title'),
  deleteConfirmCopy: document.querySelector('#delete-confirm-copy'),
  deleteConfirmResource: document.querySelector('#delete-confirm-resource'),
  confirmDelete: document.querySelector('#confirm-delete'),
  cancelDelete: document.querySelector('#cancel-delete'),
  cloudStatus: document.querySelector('#cloud-status'),
  authGate: document.querySelector('#auth-gate'),
  appShell: document.querySelector('.app-shell'),
  loginName: document.querySelector('#login-name'),
  loginEmail: document.querySelector('#login-email'),
  loginIdentifierLabel: document.querySelector('#login-identifier-label'),
  loginEmailField: document.querySelector('#login-email-field'),
  loginPasswordField: document.querySelector('#login-password-field'),
  loginPasswordLabel: document.querySelector('#login-password-label'),
  loginPassword: document.querySelector('#login-password'),
  confirmPassword: document.querySelector('#confirm-password'),
  loginButton: document.querySelector('#login-button'),
  signupButton: document.querySelector('#signup-button'),
  updatePasswordButton: document.querySelector('#update-password-button'),
  authLoginMode: document.querySelector('#auth-login-mode'),
  authSignupMode: document.querySelector('#auth-signup-mode'),
  authModeNote: document.querySelector('#auth-mode-note'),
  authTitle: document.querySelector('#auth-title'),
  authDescription: document.querySelector('#auth-description'),
  resetPasswordButton: document.querySelector('#reset-password-button'),
  logoutButton: document.querySelector('#logout-button'),
  courseEyebrowDisplay: document.querySelector('#course-eyebrow-display'),
  courseDescriptionDisplay: document.querySelector('#course-description-display'),
  courseEyebrowInput: document.querySelector('#course-eyebrow-input'),
  courseTitleInput: document.querySelector('#course-title-input'),
  courseDescriptionInput: document.querySelector('#course-description-input'),
  coursePeriodInput: document.querySelector('#course-period-input'),
  courseOwnerInput: document.querySelector('#course-owner-input'),
  courseMoodleUrlInput: document.querySelector('#course-moodle-url-input'),
  moduleEditSelect: document.querySelector('#module-edit-select'),
  moduleTitleInput: document.querySelector('#module-title-input'),
  newModuleTitleInput: document.querySelector('#new-module-title-input'),
  sectionEditSelect: document.querySelector('#section-edit-select'),
  sectionTitleInput: document.querySelector('#section-title-input'),
  sectionDescriptionInput: document.querySelector('#section-description-input'),
  editorEmailInput: document.querySelector('#editor-email-input'),
  editorRoleInput: document.querySelector('#editor-role-input'),
  addEditorButton: document.querySelector('#add-editor'),
  editorList: document.querySelector('#editor-list'),
  registeredUserList: document.querySelector('#registered-user-list'),
  syncRegisteredUsersButton: document.querySelector('#sync-registered-users'),
  auditSearch: document.querySelector('#audit-search'),
  auditStatus: document.querySelector('#audit-status'),
  auditList: document.querySelector('#audit-list'),
  auditPagination: document.querySelector('#audit-pagination'),
  refreshAuditLog: document.querySelector('#refresh-audit-log'),
  structureStatus: document.querySelector('#structure-status'),
  saveStructure: document.querySelector('#save-structure'),
  discardStructure: document.querySelector('#discard-structure'),
  structureNewModuleTitle: document.querySelector('#structure-new-module-title'),
  structureAddModule: document.querySelector('#structure-add-module'),
  categoryStatus: document.querySelector('#category-status'),
  saveCategories: document.querySelector('#save-categories'),
  discardCategories: document.querySelector('#discard-categories'),
  statusCategoryList: document.querySelector('#status-category-list'),
  typeCategoryList: document.querySelector('#type-category-list'),
  groupCategoryList: document.querySelector('#group-category-list'),
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
  const resetMode = state.authMode === 'reset';
  const updateMode = state.authMode === 'update';
  const checkingAccess = Boolean(cloudClient) && signedIn && !state.accessChecked && !updateMode;
  const blockedByAccess = Boolean(cloudClient) && signedIn && state.accessChecked && !state.hasCourseAccess && !updateMode;
  document.body.classList.toggle('signed-out', !signedIn);
  document.body.classList.toggle('can-edit', canEdit());
  document.body.classList.toggle('can-create-resource', hasCapability('createResources'));
  document.body.classList.toggle('can-manage-structure', hasCapability('manageStructure'));
  document.body.classList.toggle('can-manage-users', hasCapability('manageUsers'));
  document.body.classList.toggle('main-editor', state.isMainEditor || !remoteEditingActive());
  document.body.classList.toggle('auth-login-mode', state.authMode === 'login');
  document.body.classList.toggle('auth-signup-mode', signupMode);
  document.body.classList.toggle('auth-reset-mode', resetMode);
  document.body.classList.toggle('auth-update-mode', updateMode);
  dom.authGate.hidden = signedIn && !updateMode && !checkingAccess && !blockedByAccess;
  dom.appShell.hidden = !signedIn || updateMode || checkingAccess || blockedByAccess;
  dom.loginName.hidden = signedIn || !signupMode;
  dom.loginEmail.hidden = signedIn || updateMode;
  dom.loginPassword.hidden = signedIn && !updateMode;
  dom.loginButton.hidden = signedIn || state.authMode !== 'login';
  dom.signupButton.hidden = signedIn || !signupMode;
  dom.resetPasswordButton.hidden = signedIn || !resetMode;
  if (dom.updatePasswordButton) dom.updatePasswordButton.hidden = !updateMode;
  dom.logoutButton.hidden = !signedIn;
  if (dom.loginIdentifierLabel) {
    dom.loginIdentifierLabel.textContent = signupMode || resetMode ? 'Correo' : 'Correo o nombre de usuario';
  }
  if (dom.loginPasswordLabel) {
    dom.loginPasswordLabel.textContent = updateMode ? 'Nueva contrasena' : 'Contrasena';
  }
  dom.loginEmail.placeholder = signupMode || resetMode ? 'Correo' : 'Correo o nombre de usuario';
  dom.loginPassword.autocomplete = signupMode || updateMode ? 'new-password' : 'current-password';
  dom.authLoginMode?.classList.toggle('active', !signupMode);
  dom.authSignupMode?.classList.toggle('active', signupMode);
  if (dom.authTitle) {
    dom.authTitle.textContent =
      checkingAccess
        ? 'Verificando perfil de acceso'
        : blockedByAccess
          ? 'Cuenta sin perfil asignado'
          : state.authMode === 'signup'
        ? 'Registrate para entrar al organizador'
        : state.authMode === 'reset'
          ? 'Recupera tu contrasena'
          : state.authMode === 'update'
            ? 'Crea una nueva contrasena'
            : 'Inicia sesion para ver el organizador';
  }
  if (dom.authDescription) {
    dom.authDescription.textContent =
      checkingAccess
        ? 'Estamos revisando si esta cuenta tiene un perfil autorizado para entrar al organizador.'
        : blockedByAccess
          ? 'La cuenta existe, pero la cuenta principal aun no le ha asignado un perfil de acceso.'
          : state.authMode === 'signup'
        ? 'Crea un usuario con nombre, correo y contrasena. Luego podras iniciar sesion para ver el organizador.'
        : state.authMode === 'reset'
          ? 'Escribe el correo registrado. Te enviaremos un enlace para elegir una contrasena nueva.'
          : state.authMode === 'update'
            ? 'Escribe y confirma la nueva contrasena que reemplazara la anterior.'
            : 'Debes iniciar sesion para ver modulos, lecciones, recursos y administracion.';
  }
  if (dom.authModeNote) {
    dom.authModeNote.textContent =
      checkingAccess
        ? 'Esto puede tardar unos segundos.'
        : blockedByAccess
          ? 'Pide a la cuenta principal que asigne un perfil en Administracion.'
          : state.authMode === 'signup'
        ? 'El nombre de usuario puede tener espacios. El correo debe ser unico.'
        : state.authMode === 'reset'
          ? 'Solo se enviara el enlace si el correo ya esta registrado.'
          : state.authMode === 'update'
            ? 'La nueva contrasena puede tener hasta 72 caracteres.'
            : 'Usa tu correo o nombre de usuario y tu contrasena.';
  }
  if (signedIn) {
    dom.logoutButton.textContent = state.isMainEditor
      ? `Cerrar sesion (${state.session.user.email}, principal)`
      : state.isEditor
        ? `Cerrar sesion (${state.session.user.email}, ${labels[state.userRole] ?? state.userRole})`
        : `Cerrar sesion (${state.session.user.email}, sin permiso)`;
  }
}

function remoteEditingActive() {
  return Boolean(cloudClient);
}

function canEdit() {
  return !remoteEditingActive() || hasCapability('createResources') || hasCapability('manageStructure') || hasCapability('manageUsers');
}

function hasCapability(capability) {
  if (!remoteEditingActive()) return true;
  if (capability === 'deleteAudit') return state.isMainEditor;
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

function authModeForRoute(page) {
  if (page === 'login' || page === 'iniciar-sesion') return 'login';
  if (page === 'registro' || page === 'registrarse') return 'signup';
  if (page === 'recuperar' || page === 'recuperar-contrasena') return state.recoveringPassword ? 'update' : 'reset';
  return '';
}

function routeForAuthMode(mode) {
  if (mode === 'signup') return '#/registro';
  if (mode === 'reset' || mode === 'update') return '#/recuperar';
  return '#/login';
}

function requiresSignIn() {
  return Boolean(cloudClient);
}

function currentHashRoute() {
  return window.location.hash || '#/mapa';
}

function setAuthMode(mode, { updateRoute = false, replace = false } = {}) {
  state.authMode = mode;
  if (updateRoute) {
    const route = routeForAuthMode(mode);
    if (window.location.hash !== route) {
      if (replace) {
        history.replaceState(null, '', route);
      } else {
        history.pushState(null, '', route);
      }
    }
  }
  updateAuthUi();
}

function normalizeView(view) {
  if (view === 'categories' && !hasCapability('manageStructure')) return 'course';
  if (view === 'structure' && !hasCapability('manageStructure')) return 'course';
  if (view === 'admin' && !hasCapability('manageUsers')) return 'course';
  if (!['course', 'module', 'categories', 'structure', 'admin'].includes(view)) return 'course';
  return view;
}

function routeForCurrentState() {
  if (state.currentView === 'categories') return '#/categorias';
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
  const authMode = authModeForRoute(page);
  const signedIn = Boolean(state.session?.user);

  if (authMode) {
    setAuthMode(authMode, { updateRoute: false });
    if (signedIn && authMode !== 'update') {
      state.currentView = normalizeView(state.currentView || 'course');
      syncRouteFromState({ replace: true });
    }
    if (renderNow) render();
    return;
  }

  if (requiresSignIn() && !signedIn) {
    state.returnRoute = currentHashRoute();
    setAuthMode('login', { updateRoute: true, replace: true });
    if (renderNow) render();
    return;
  }

  if (page === 'categorias' || page === 'categorias-recursos') {
    state.currentView = normalizeView('categories');
  } else if (page === 'estructura') {
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
      (button.dataset.view === 'categories' && !hasCapability('manageStructure')) ||
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

function canChangeAccounts() {
  return !remoteEditingActive() || state.isMainEditor;
}

function requireMainEditorPermission() {
  if (canChangeAccounts()) return true;
  alert('Solo la cuenta principal puede cambiar cuentas, perfiles y usuarios.');
  return false;
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

async function saveData() {
  ensureCategoryData(state.data);
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
        ensureCategoryData(parsed);
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

function normalizeHexColor(value, fallback = '#607086') {
  return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : fallback;
}

function normalizeCategoryList(list, defaults) {
  const byId = new Map();
  const source = Array.isArray(list) && list.length ? list : defaults;
  source.forEach((item) => {
    const id = slugify(item?.id || item?.title || '');
    if (!id) return;
    const fallback = defaults.find((defaultItem) => defaultItem.id === id);
    byId.set(id, {
      id,
      title: String(item?.title || labels[id] || id).trim() || id,
      color: normalizeHexColor(item?.color, fallback?.color || '#607086'),
      active: item?.active !== false,
    });
  });
  return Array.from(byId.values());
}

function normalizeResourceCategory(value, kind) {
  const list = state.data?.[categoryKeys[kind]] || defaultCategories[kind];
  const fallback = categoryFallbacks[kind];
  const id = String(value || '').trim();
  return list.some((item) => item.id === id) ? id : fallback;
}

function ensureCategoryData(data) {
  if (!data) return data;
  Object.keys(categoryKeys).forEach((kind) => {
    data[categoryKeys[kind]] = normalizeCategoryList(data[categoryKeys[kind]], defaultCategories[kind]);
  });
  (data.modules || []).forEach((module) => {
    (module.lessons || []).forEach((lesson) => {
      lesson.resources = Array.isArray(lesson.resources) ? lesson.resources : [];
      lesson.resources.forEach((resource) => {
        Object.keys(categoryKeys).forEach((kind) => {
          const key = kind === 'group' ? 'group' : kind;
          const value = String(resource[key] || '').trim();
          const exists = data[categoryKeys[kind]].some((item) => item.id === value);
          const fallback = data[categoryKeys[kind]].find((item) => item.id === categoryFallbacks[kind])?.id || data[categoryKeys[kind]][0]?.id || categoryFallbacks[kind];
          resource[key] = exists ? value : fallback;
        });
      });
    });
  });
  return data;
}

function categoryList(kind, { activeOnly = false } = {}) {
  const list = state.data?.[categoryKeys[kind]] || defaultCategories[kind];
  return activeOnly ? list.filter((item) => item.active !== false) : list;
}

function findCategory(kind, id) {
  return categoryList(kind).find((item) => item.id === id) || defaultCategories[kind].find((item) => item.id === id);
}

function categoryLabel(kind, id) {
  return findCategory(kind, id)?.title || labels[id] || id || '';
}

function categoryColor(kind, id) {
  return normalizeHexColor(findCategory(kind, id)?.color, '#607086');
}

function categoryStyle(kind, id) {
  return `--category-color: ${categoryColor(kind, id)};`;
}

function setCategoryStyle(element, kind, id) {
  element.style.setProperty('--category-color', categoryColor(kind, id));
}

function fallbackCategoryId(kind) {
  const list = categoryList(kind);
  return list.find((item) => item.id === categoryFallbacks[kind])?.id || list[0]?.id || categoryFallbacks[kind];
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

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function currentActor() {
  const email = state.session?.user?.email?.toLowerCase() || '';
  return {
    email,
    name: state.currentUserProfile?.full_name || state.session?.user?.user_metadata?.full_name || email || 'Usuario',
  };
}

function actorText(name, email) {
  if (name && email && name.toLowerCase() !== email.toLowerCase()) return `${name} (${email})`;
  return name || email || 'Sin registro';
}

function resourceAuditSnapshot(resource) {
  if (!resource) return null;
  return {
    id: resource.id,
    title: resource.title,
    type: resource.type,
    status: resource.status,
    group: resource.group,
    section: resource.section,
    priority: resource.priority,
    owner: resource.owner,
    notes: resource.notes,
    links: normalizeLinks(resource).map((link) => ({
      id: link.id,
      label: link.label,
      url: link.url,
    })),
    files: normalizeFiles(resource).map((file) => ({
      id: file.id,
      name: file.name,
      type: file.type,
      size: file.size,
      path: file.path || '',
    })),
    createdByName: resource.createdByName || '',
    createdByEmail: resource.createdByEmail || '',
    createdAt: resource.createdAt || '',
    updatedByName: resource.updatedByName || '',
    updatedByEmail: resource.updatedByEmail || '',
    updatedAt: resource.updatedAt || '',
    orderIndex: Number.isInteger(resource.orderIndex) ? resource.orderIndex : null,
  };
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
  return {
    id: uid('file'),
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    path,
    addedAt: new Date().toISOString(),
  };
}

function triggerBrowserDownload(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'archivo';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  triggerBrowserDownload(url, filename);
  URL.revokeObjectURL(url);
}

async function downloadResourceFile(file) {
  if (!hasCapability('openAssets')) return;
  const filename = file.name || 'archivo';
  if (remoteEditingActive() && file.path) {
    const { data, error } = await cloudClient.storage
      .from(cloudConfig.storageBucket)
      .createSignedUrl(file.path, 120);
    if (error) {
      alert(`No se pudo preparar la descarga: ${error.message}`);
      return;
    }
    try {
      const response = await fetch(data.signedUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      downloadBlob(filename, blob);
    } catch {
      alert('No se pudo descargar el archivo sin salir de la pagina. Intenta de nuevo.');
    }
    return;
  }
  const url = file.publicUrl || file.dataUrl || file.path;
  if (!url) return;
  if (url.startsWith('data:')) {
    triggerBrowserDownload(url, filename);
    return;
  }
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    downloadBlob(filename, blob);
  } catch {
    alert('No se pudo descargar el archivo sin salir de la pagina. Intenta de nuevo.');
  }
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

function preferredSectionIdForLesson(lesson) {
  const resourceSectionId = state.data.sections.find((section) =>
    (lesson?.resources || []).some((resource) => resource.section === section.id)
  )?.id;
  return resourceSectionId || state.data.sections[0]?.id || 'preparacion';
}

function scrollToResourceWorkspace() {
  window.setTimeout(() => {
    document.querySelector('.resource-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 60);
}

function selectModulePage(module, { scrollToResources = false } = {}) {
  state.selectedModuleId = module?.id ?? null;
  const lesson = module?.lessons[0] ?? null;
  state.selectedLessonId = lesson?.id ?? null;
  state.selectedSectionId = preferredSectionIdForLesson(lesson);
  clearForm();
  setView('module', { renderNow: true });
  if (scrollToResources) scrollToResourceWorkspace();
}

function selectLessonPage(module, lesson, { scrollToResources = false, sectionId = '' } = {}) {
  state.selectedModuleId = module?.id ?? null;
  state.selectedLessonId = lesson?.id ?? null;
  state.selectedSectionId = sectionId || preferredSectionIdForLesson(lesson);
  clearForm();
  setView('module', { renderNow: true });
  if (scrollToResources) scrollToResourceWorkspace();
}

function selectFirstAvailable() {
  const firstModule = state.data.modules[0];
  const firstLesson = firstModule?.lessons[0];
  state.selectedModuleId = firstModule?.id ?? null;
  state.selectedLessonId = firstLesson?.id ?? null;
  state.selectedSectionId = preferredSectionIdForLesson(firstLesson);
}

function renderSummary() {
  const resources = allResources().map((item) => item.resource);
  const course = state.data.course || {};
  document.querySelector('h1').textContent = course.title ?? 'Calculo III';
  if (dom.courseEyebrowDisplay) dom.courseEyebrowDisplay.textContent = course.eyebrow || 'Propuesta de organizador Moodle';
  if (dom.courseDescriptionDisplay) {
    dom.courseDescriptionDisplay.textContent = course.description || 'Organizador de recursos para construir y revisar un curso en Moodle.';
    dom.courseDescriptionDisplay.hidden = !dom.courseDescriptionDisplay.textContent.trim();
  }
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

  const indexSection = document.createElement('section');
  indexSection.className = 'module-group module-index-group';
  indexSection.innerHTML = '<p class="nav-kicker">Indice de modulos</p>';
  state.data.modules.forEach((module, moduleIndex) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'module-index-button';
    if (module.id === state.selectedModuleId) button.classList.add('active');
    button.innerHTML = `
      <small>Modulo ${moduleIndex + 1}</small>
      <span>${module.title}</span>
    `;
    button.addEventListener('click', () => selectModulePage(module));
    indexSection.appendChild(button);
  });
  dom.nav.appendChild(indexSection);

  const module = currentModule();
  if (!module) return;

  const lessons = document.createElement('section');
  lessons.className = 'module-group current-module-lessons';
  lessons.innerHTML = '<p class="nav-kicker">Lecciones del modulo</p>';
  module.lessons.forEach((lesson, lessonIndex) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'lesson-button';
    if (lesson.id === state.selectedLessonId) button.classList.add('active');
    button.innerHTML = `
      <small>Leccion ${lessonIndex + 1}</small>
      <span>${lesson.title}</span>
    `;
    button.addEventListener('click', () => selectLessonPage(module, lesson, { scrollToResources: true }));
    lessons.appendChild(button);
  });
  dom.nav.appendChild(lessons);
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
    button.addEventListener('click', () => selectModulePage(module));
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
    const course = state.data.course || {};
    const courseFacts = [
      course.period ? `<span><strong>Periodo</strong>${course.period}</span>` : '',
      course.owner ? `<span><strong>Responsable</strong>${course.owner}</span>` : '',
      course.moodleUrl ? `<a href="${normalizeUrl(course.moodleUrl)}" target="_blank" rel="noopener noreferrer"><strong>Moodle</strong>Abrir curso</a>` : '',
    ].filter(Boolean).join('');
    overview.innerHTML = `
      <div>
        <p class="map-kicker">Vista general</p>
        <h4>Selecciona un modulo para abrir su pagina de trabajo</h4>
        <p class="muted">${course.description || 'El mapa mantiene la vision general limpia; cada modulo concentra sus lecciones, partes y recursos en una pagina propia.'}</p>
        ${courseFacts ? `<div class="course-facts">${courseFacts}</div>` : ''}
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
        selectLessonPage(module, lesson, { scrollToResources: true });
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
          selectLessonPage(module, lesson, { scrollToResources: true, sectionId: section.id });
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

function renderFilterGroup(kind) {
  const container = kind === 'status' ? dom.statusFilter : kind === 'type' ? dom.typeFilter : dom.groupFilter;
  if (!container) return;
  const legend = container.querySelector('legend')?.textContent || '';
  const selectedValues = kind === 'status' ? state.statusFilters : kind === 'type' ? state.typeFilters : state.groupFilters;
  container.innerHTML = '';
  const legendNode = document.createElement('legend');
  legendNode.textContent = legend || (kind === 'group' ? 'Grupo visual' : kind);
  container.appendChild(legendNode);
  const reset = document.createElement('button');
  reset.className = 'filter-reset';
  reset.dataset.filterReset = kind;
  reset.type = 'button';
  reset.textContent = 'Todos';
  reset.addEventListener('click', () => resetMultiFilter(kind));
  container.appendChild(reset);
  categoryList(kind, { activeOnly: true }).forEach((category) => {
    const label = document.createElement('label');
    label.style.setProperty('--category-color', category.color);
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = category.id;
    input.checked = selectedValues.includes(category.id);
    const swatch = document.createElement('span');
    swatch.className = 'category-swatch';
    label.append(input, swatch, document.createTextNode(category.title));
    container.appendChild(label);
  });
}

function renderFilters() {
  renderFilterGroup('status');
  renderFilterGroup('type');
  renderFilterGroup('group');
}

function populateCategorySelect(select, kind, currentValue = '') {
  if (!select) return;
  const previous = currentValue || select.value || fallbackCategoryId(kind);
  select.innerHTML = '';
  const categories = categoryList(kind);
  categories
    .filter((category) => category.active !== false || category.id === previous)
    .forEach((category) => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.active === false ? `${category.title} (inactiva)` : category.title;
      select.appendChild(option);
    });
  select.value = categories.some((category) => category.id === previous) ? previous : fallbackCategoryId(kind);
}

function renderResourceSelects() {
  populateCategorySelect(dom.resourceType, 'type');
  populateCategorySelect(dom.resourceStatus, 'status');
  populateCategorySelect(dom.resourceGroup, 'group');
}

function resourceMatches(resource) {
  const sectionMatch = resource.section === state.selectedSectionId;
  const statusMatch = !state.statusFilters.length || state.statusFilters.includes(resource.status);
  const typeMatch = !state.typeFilters.length || state.typeFilters.includes(resource.type);
  const groupMatch = !state.groupFilters.length || state.groupFilters.includes(resource.group);
  const linkText = normalizeLinks(resource).map((link) => `${link.label} ${link.url}`).join(' ');
  const fileText = normalizeFiles(resource).map((file) => file.name).join(' ');
  const auditText = `${resource.createdByName} ${resource.createdByEmail} ${resource.updatedByName} ${resource.updatedByEmail}`;
  const categoryText = `${categoryLabel('status', resource.status)} ${categoryLabel('type', resource.type)} ${categoryLabel('group', resource.group)}`;
  const haystack = `${resource.title} ${resource.url} ${linkText} ${fileText} ${resource.owner} ${resource.notes} ${categoryText} ${auditText}`.toLowerCase();
  const searchMatch = !state.search || haystack.includes(state.search.toLowerCase());
  return sectionMatch && statusMatch && typeMatch && groupMatch && searchMatch;
}

function resourcePeopleText(resource) {
  const parts = [];
  if (resource.createdByName || resource.createdByEmail) {
    const createdDate = formatDateTime(resource.createdAt);
    parts.push(`Creado por ${actorText(resource.createdByName, resource.createdByEmail)}${createdDate ? `, ${createdDate}` : ''}`);
  } else {
    parts.push('Creacion sin registro');
  }

  const hasDistinctUpdate =
    (resource.updatedByName || resource.updatedByEmail) &&
    (resource.updatedAt !== resource.createdAt || resource.updatedByEmail !== resource.createdByEmail);
  if (hasDistinctUpdate) {
    const updatedDate = formatDateTime(resource.updatedAt);
    parts.push(`Ultima edicion por ${actorText(resource.updatedByName, resource.updatedByEmail)}${updatedDate ? `, ${updatedDate}` : ''}`);
  }

  return parts.join(' | ');
}

function resourceCardNode(resource) {
  const node = dom.template.content.firstElementChild.cloneNode(true);
  node.dataset.resourceId = resource.id;
  node.querySelector('h4').textContent = resource.title;
  node.querySelector('.resource-people').textContent = resourcePeopleText(resource);
  node.querySelector('.resource-meta').textContent = `${categoryLabel('type', resource.type)} | Prioridad ${labels[resource.priority] ?? resource.priority}`;
  node.querySelector('.resource-notes').textContent = resource.notes || 'Sin notas.';

  renderResourceAssets(node.querySelector('.resource-assets'), resource);

  const badges = node.querySelector('.badges');
  badges.innerHTML = `
    <span class="badge category-badge" style="${categoryStyle('status', resource.status)}">${categoryLabel('status', resource.status)}</span>
    <span class="badge category-badge" style="${categoryStyle('group', resource.group)}">${categoryLabel('group', resource.group)}</span>
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
  return node;
}

function groupedResources(resources) {
  const groups = categoryList('group');
  const orderedIds = groups.map((category) => category.id);
  const buckets = new Map();
  resources.forEach((resource) => {
    const groupId = groups.some((category) => category.id === resource.group) ? resource.group : fallbackCategoryId('group');
    if (!buckets.has(groupId)) buckets.set(groupId, []);
    buckets.get(groupId).push(resource);
  });
  return Array.from(buckets.entries()).sort(([groupA], [groupB]) => {
    const indexA = orderedIds.indexOf(groupA);
    const indexB = orderedIds.indexOf(groupB);
    return (indexA < 0 ? Number.MAX_SAFE_INTEGER : indexA) - (indexB < 0 ? Number.MAX_SAFE_INTEGER : indexB);
  });
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
    dom.list.innerHTML = '<p class="empty-state">No hay recursos con estos filtros. Puedes crear uno con el editor de recursos.</p>';
    return;
  }

  groupedResources(resources).forEach(([groupId, items]) => {
    const group = document.createElement('section');
    group.className = 'resource-group-section';
    setCategoryStyle(group, 'group', groupId);
    const heading = document.createElement('div');
    heading.className = 'resource-group-heading';
    heading.innerHTML = `
      <h4 class="resource-group-title"><span class="resource-group-swatch"></span>${categoryLabel('group', groupId)}</h4>
      <span class="resource-group-count">${plural(items.length, 'recurso', 'recursos')}</span>
    `;
    const list = document.createElement('div');
    list.className = 'resource-group-items';
    items.forEach((resource) => {
      list.appendChild(resourceCardNode(resource));
    });
    group.append(heading, list);
    dom.list.appendChild(group);
  });
  return;
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
        item.href = '#';
        item.addEventListener('click', (event) => {
          event.preventDefault();
          downloadResourceFile(file);
        });
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
  const course = state.data.course || {};
  if (dom.courseEyebrowInput) dom.courseEyebrowInput.value = course.eyebrow || 'Propuesta de organizador Moodle';
  if (dom.courseTitleInput) dom.courseTitleInput.value = course.title ?? '';
  if (dom.courseDescriptionInput) dom.courseDescriptionInput.value = course.description ?? '';
  if (dom.coursePeriodInput) dom.coursePeriodInput.value = course.period ?? '';
  if (dom.courseOwnerInput) dom.courseOwnerInput.value = course.owner ?? '';
  if (dom.courseMoodleUrlInput) dom.courseMoodleUrlInput.value = course.moodleUrl ?? '';

  if (dom.moduleEditSelect) {
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
  }

  if (dom.sectionEditSelect) {
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

  const lockAccounts = remoteEditingActive() && !canChangeAccounts();
  if (dom.editorEmailInput) dom.editorEmailInput.disabled = lockAccounts;
  if (dom.editorRoleInput) dom.editorRoleInput.disabled = lockAccounts;
  if (dom.addEditorButton) {
    dom.addEditorButton.disabled = lockAccounts;
    dom.addEditorButton.textContent = lockAccounts ? 'Solo cuenta principal' : 'Guardar perfil';
  }
  if (dom.syncRegisteredUsersButton) dom.syncRegisteredUsersButton.disabled = lockAccounts;
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

function cloneCategoryData(data = state.data) {
  return {
    resourceStatuses: cloneCourseData(data.resourceStatuses || defaultCategories.status),
    resourceTypes: cloneCourseData(data.resourceTypes || defaultCategories.type),
    resourceGroups: cloneCourseData(data.resourceGroups || defaultCategories.group),
  };
}

function ensureCategoryDraft({ reset = false } = {}) {
  if (!state.data) return null;
  if (reset || !state.categoryDraft) {
    state.categoryDraft = cloneCategoryData();
    state.categoryDirty = false;
  }
  return state.categoryDraft;
}

function setCategoryDirty(isDirty = true) {
  state.categoryDirty = isDirty;
  if (!dom.categoryStatus) return;
  dom.categoryStatus.textContent = isDirty ? 'Cambios pendientes sin guardar' : 'Sin cambios pendientes';
  dom.categoryStatus.dataset.dirty = isDirty ? 'true' : 'false';
}

function categoryDraftList(kind) {
  ensureCategoryDraft();
  return state.categoryDraft?.[categoryKeys[kind]] || [];
}

function countResourcesUsingCategory(kind, categoryId) {
  const resourceKey = kind === 'group' ? 'group' : kind;
  return allResources().filter(({ resource }) => resource[resourceKey] === categoryId).length;
}

function uniqueCategoryId(kind, title) {
  const list = categoryDraftList(kind);
  const base = slugify(title || 'categoria');
  let id = base;
  let counter = 2;
  while (list.some((category) => category.id === id)) {
    id = `${base}-${counter}`;
    counter += 1;
  }
  return id;
}

function moveCategoryDraft(kind, categoryId, direction) {
  if (!requireCapability('manageStructure', 'Tu perfil no puede modificar categorias.')) return;
  const list = categoryDraftList(kind);
  const index = list.findIndex((category) => category.id === categoryId);
  if (!moveDraftItem(list, index, direction)) return;
  setCategoryDirty(true);
  renderCategoryEditors();
}

function deleteCategoryDraft(kind, categoryId) {
  if (!requireCapability('manageStructure', 'Tu perfil no puede modificar categorias.')) return;
  const list = categoryDraftList(kind);
  if (list.length <= 1) {
    alert('Debe quedar al menos una categoria en esta lista.');
    return;
  }
  const category = list.find((item) => item.id === categoryId);
  if (!category) return;
  const used = countResourcesUsingCategory(kind, categoryId);
  const replacement = list.find((item) => item.id !== categoryId);
  const warning = used
    ? ` Hay ${used} recursos usando esta categoria; al guardar se moveran a "${replacement.title}".`
    : '';
  if (!confirm(`Quitar la categoria "${category.title}"?${warning}`)) return;
  state.categoryDraft[categoryKeys[kind]] = list.filter((item) => item.id !== categoryId);
  setCategoryDirty(true);
  renderCategoryEditors();
}

function addCategoryDraft(kind, title, color) {
  if (!requireCapability('manageStructure', 'Tu perfil no puede modificar categorias.')) return;
  const cleanTitle = title.trim();
  if (!cleanTitle) return;
  categoryDraftList(kind).push({
    id: uniqueCategoryId(kind, cleanTitle),
    title: cleanTitle,
    color: normalizeHexColor(color, '#607086'),
    active: true,
  });
  setCategoryDirty(true);
  renderCategoryEditors();
}

function categoryEditorRow(kind, category, index) {
  const row = document.createElement('div');
  row.className = 'category-row';
  if (category.active === false) row.classList.add('inactive');

  const color = document.createElement('input');
  color.type = 'color';
  color.value = normalizeHexColor(category.color);
  color.addEventListener('input', () => {
    category.color = color.value;
    setCategoryDirty(true);
  });

  const nameWrap = document.createElement('div');
  nameWrap.className = 'category-name-field';
  const name = document.createElement('input');
  name.value = category.title || '';
  name.placeholder = 'Nombre de la categoria';
  name.addEventListener('input', () => {
    category.title = name.value;
    setCategoryDirty(true);
  });
  const id = document.createElement('small');
  id.className = 'category-id';
  id.textContent = `ID interno: ${category.id}`;
  nameWrap.append(name, id);

  const active = document.createElement('label');
  active.className = 'category-active';
  const activeInput = document.createElement('input');
  activeInput.type = 'checkbox';
  activeInput.checked = category.active !== false;
  activeInput.addEventListener('change', () => {
    category.active = activeInput.checked;
    setCategoryDirty(true);
    renderCategoryEditors();
  });
  active.append(activeInput, document.createTextNode('Visible'));

  const actions = document.createElement('div');
  actions.className = 'category-actions';
  actions.append(
    createStructureButton('Subir', 'mini-btn', () => moveCategoryDraft(kind, category.id, -1)),
    createStructureButton('Bajar', 'mini-btn', () => moveCategoryDraft(kind, category.id, 1)),
    createStructureButton('Quitar', 'mini-btn delete', () => deleteCategoryDraft(kind, category.id))
  );
  if (index === 0) actions.firstElementChild.disabled = true;
  if (index === categoryDraftList(kind).length - 1) actions.children[1].disabled = true;

  row.append(color, nameWrap, active, actions);
  return row;
}

function categoryCreateRow(kind) {
  const row = document.createElement('div');
  row.className = 'category-create-row';
  const color = document.createElement('input');
  color.type = 'color';
  color.value = kind === 'status' ? '#1e4f87' : kind === 'type' ? '#2b746b' : '#19a974';
  const input = document.createElement('input');
  input.placeholder = kind === 'group' ? 'Nuevo grupo visual' : 'Nueva categoria';
  const add = createStructureButton('Crear', 'mini-btn accent', () => {
    addCategoryDraft(kind, input.value, color.value);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addCategoryDraft(kind, input.value, color.value);
    }
  });
  row.append(color, input, add);
  return row;
}

function renderCategoryEditor(kind, container) {
  if (!container) return;
  ensureCategoryDraft({ reset: !state.categoryDirty });
  container.innerHTML = '';
  categoryDraftList(kind).forEach((category, index) => {
    container.appendChild(categoryEditorRow(kind, category, index));
  });
  container.appendChild(categoryCreateRow(kind));
}

function renderCategoryEditors() {
  if (!dom.statusCategoryList || !state.data) return;
  ensureCategoryDraft({ reset: !state.categoryDirty });
  setCategoryDirty(state.categoryDirty);
  renderCategoryEditor('status', dom.statusCategoryList);
  renderCategoryEditor('type', dom.typeCategoryList);
  renderCategoryEditor('group', dom.groupCategoryList);
}

function validateCategoryDraft() {
  const draft = ensureCategoryDraft();
  for (const kind of Object.keys(categoryKeys)) {
    const list = draft[categoryKeys[kind]];
    if (!list.length) return 'Cada lista debe tener al menos una categoria.';
    if (list.some((category) => !category.title.trim())) return 'Todas las categorias deben tener nombre.';
    const ids = new Set();
    for (const category of list) {
      if (ids.has(category.id)) return 'Hay IDs de categorias repetidos.';
      ids.add(category.id);
      category.color = normalizeHexColor(category.color);
      category.title = category.title.trim();
    }
  }
  return '';
}

function reconcileResourcesWithCategories() {
  const replacements = {
    status: fallbackCategoryId('status'),
    type: fallbackCategoryId('type'),
    group: fallbackCategoryId('group'),
  };
  allResources().forEach(({ resource }) => {
    Object.keys(categoryKeys).forEach((kind) => {
      const key = kind === 'group' ? 'group' : kind;
      const exists = categoryList(kind).some((category) => category.id === resource[key]);
      if (!exists) resource[key] = replacements[kind];
    });
  });
}

async function saveCategoryDraft() {
  if (!requireCapability('manageStructure', 'Tu perfil no puede modificar categorias.')) return;
  ensureCategoryDraft();
  const error = validateCategoryDraft();
  if (error) {
    alert(error);
    return;
  }
  state.data.resourceStatuses = cloneCourseData(state.categoryDraft.resourceStatuses);
  state.data.resourceTypes = cloneCourseData(state.categoryDraft.resourceTypes);
  state.data.resourceGroups = cloneCourseData(state.categoryDraft.resourceGroups);
  reconcileResourcesWithCategories();
  if (!(await saveData())) return;
  ensureCategoryDraft({ reset: true });
  render();
}

function discardCategoryDraft() {
  if (!state.categoryDirty || confirm('Descartar los cambios de categorias sin guardar?')) {
    ensureCategoryDraft({ reset: true });
    renderCategoryEditors();
  }
}

function render() {
  renderView();
  renderSummary();
  renderFilters();
  renderResourceSelects();
  renderModuleStrip();
  renderNavigation();
  renderCourseMap();
  renderTabs();
  renderTargets();
  renderLessonControls();
  renderAdminControls();
  renderStructureList();
  renderCategoryEditors();
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
    anchor.href = '#';
    anchor.textContent = 'Descargar';
    anchor.addEventListener('click', (event) => {
      event.preventDefault();
      downloadResourceFile(file);
    });
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
  renderResourceSelects();
  dom.form.reset();
  dom.resourceId.value = '';
  dom.formTitle.textContent = 'Nuevo recurso';
  dom.resourcePriority.value = 'medium';
  dom.resourceType.value = fallbackCategoryId('type');
  dom.resourceStatus.value = categoryList('status').some((category) => category.id === 'planned') ? 'planned' : fallbackCategoryId('status');
  dom.resourceGroup.value = fallbackCategoryId('group');
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
  populateCategorySelect(dom.resourceType, 'type', resource.type);
  populateCategorySelect(dom.resourceStatus, 'status', resource.status);
  populateCategorySelect(dom.resourceGroup, 'group', resource.group);
  dom.resourceType.value = categoryList('type').some((category) => category.id === resource.type) ? resource.type : fallbackCategoryId('type');
  dom.resourceStatus.value = categoryList('status').some((category) => category.id === resource.status) ? resource.status : fallbackCategoryId('status');
  dom.resourceGroup.value = categoryList('group').some((category) => category.id === resource.group) ? resource.group : fallbackCategoryId('group');
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
    group: dom.resourceGroup.value,
    url: locationSummary,
    links,
    files,
    owner: dom.resourceOwner.value.trim(),
    priority: dom.resourcePriority.value,
    notes: dom.resourceNotes.value.trim(),
  };
}

function resourceContext(moduleId, lessonId, sectionId) {
  const module = state.data.modules.find((item) => item.id === moduleId);
  const lesson = module?.lessons.find((item) => item.id === lessonId);
  const section = state.data.sections.find((item) => item.id === sectionId);
  return {
    module,
    lesson,
    section,
    moduleId,
    lessonId,
    sectionId,
    moduleTitle: module?.title || '',
    lessonTitle: lesson?.title || '',
    sectionTitle: section?.title || '',
  };
}

function applyResourceAuditFields(resource, existingResource = null) {
  const actor = currentActor();
  const now = new Date().toISOString();
  if (existingResource) {
    resource.createdByEmail = existingResource.createdByEmail || '';
    resource.createdByName = existingResource.createdByName || '';
    resource.createdAt = existingResource.createdAt || '';
    resource.updatedByEmail = actor.email;
    resource.updatedByName = actor.name;
    resource.updatedAt = now;
    return;
  }
  resource.createdByEmail = actor.email;
  resource.createdByName = actor.name;
  resource.createdAt = now;
  resource.updatedByEmail = '';
  resource.updatedByName = '';
  resource.updatedAt = '';
}

function auditActionLabel(action) {
  return {
    create: 'Creacion',
    update: 'Edicion',
    move: 'Movimiento',
    delete: 'Eliminacion',
  }[action] || action;
}

function auditActionSentence(action) {
  return {
    create: 'Creo este recurso.',
    update: 'Edito este recurso.',
    move: 'Reordeno este recurso.',
    delete: 'Elimino este recurso.',
  }[action] || 'Registro un cambio en este recurso.';
}

function auditContextLabel(entry) {
  const moduleIndex = state.data?.modules?.findIndex((module) => module.id === entry.module_id) ?? -1;
  const module = moduleIndex >= 0 ? state.data.modules[moduleIndex] : null;
  const lessonIndex = module?.lessons?.findIndex((lesson) => lesson.id === entry.lesson_id) ?? -1;
  const lesson = lessonIndex >= 0 ? module.lessons[lessonIndex] : null;
  const sectionIndex = state.data?.sections?.findIndex((section) => section.id === entry.section_id) ?? -1;
  const section = sectionIndex >= 0 ? state.data.sections[sectionIndex] : null;
  const moduleLabel = module
    ? `Modulo ${moduleIndex + 1}: ${module.title}`
    : entry.module_title
      ? `Modulo sin ubicar: ${entry.module_title}`
      : 'Modulo sin registro';
  const lessonLabel = lesson
    ? `Leccion ${lessonIndex + 1}: ${lesson.title}`
    : entry.lesson_title
      ? `Leccion sin ubicar: ${entry.lesson_title}`
      : 'Leccion sin registro';
  const sectionLabel = section
    ? `Parte ${sectionIndex + 1}: ${section.title}`
    : entry.section_title
      ? `Parte sin ubicar: ${entry.section_title}`
      : 'Parte sin registro';
  return `${moduleLabel} / ${lessonLabel} / ${sectionLabel}`;
}

function compactValue(value) {
  if (value === null || value === undefined || value === '') return 'vacio';
  return String(value);
}

function valuesChanged(before, after) {
  return JSON.stringify(before ?? null) !== JSON.stringify(after ?? null);
}

function auditFieldValue(key, value) {
  if (key === 'status' || key === 'type' || key === 'group') {
    return categoryLabel(key, value) || compactValue(value);
  }
  if (key === 'priority') {
    return labels[value] ?? compactValue(value);
  }
  if (key === 'section') {
    const index = state.data?.sections?.findIndex((section) => section.id === value) ?? -1;
    const section = index >= 0 ? state.data.sections[index] : null;
    return section ? `Parte ${index + 1}: ${section.title}` : compactValue(value);
  }
  return compactValue(value);
}

const auditTrackedFields = [
  ['title', 'Titulo'],
  ['type', 'Tipo'],
  ['status', 'Estado'],
  ['group', 'Grupo visual'],
  ['section', 'Parte'],
  ['priority', 'Prioridad'],
  ['owner', 'Responsable'],
  ['notes', 'Notas'],
];

function auditLinks(resource) {
  return Array.isArray(resource?.links) ? resource.links : [];
}

function auditFiles(resource) {
  return Array.isArray(resource?.files) ? resource.files : [];
}

function auditLinkLabel(link) {
  return link?.label || 'Enlace';
}

function auditLinkUrl(link) {
  return link?.url || 'Sin URL';
}

function auditFileLabel(file) {
  const size = file?.size ? ` (${formatFileSize(file.size)})` : '';
  return `${file?.name || 'Archivo'}${size}`;
}

function auditAssetText(items, formatter) {
  if (!Array.isArray(items) || !items.length) return 'Ninguno';
  return items.map(formatter).join(' | ');
}

function auditSnapshotResource(entry) {
  if (entry.action === 'delete') return entry.previous_data || null;
  return entry.new_data || entry.previous_data || null;
}

function auditSnapshotTitle(entry) {
  if (entry.action === 'create') return 'Contenido creado';
  if (entry.action === 'delete') return 'Contenido eliminado';
  if (entry.action === 'move') return 'Contenido del recurso movido';
  return 'Contenido despues de editar';
}

function auditSnapshotRows(resource) {
  if (!resource) return [];
  const rows = auditTrackedFields
    .filter(([key]) => key !== 'section')
    .map(([key, label]) => ({
      label,
      value: auditFieldValue(key, resource[key]),
      kind: 'text',
    }));
  rows.push({
    label: 'Enlaces',
    value: auditLinks(resource),
    kind: 'links',
  });
  rows.push({
    label: 'Archivos',
    value: auditFiles(resource),
    kind: 'files',
  });
  return rows;
}

function auditChangeDetails(entry) {
  const previousData = entry.previous_data || null;
  const newData = entry.new_data || null;
  if (entry.action === 'create' || entry.action === 'delete') return [];
  if (entry.action === 'move') {
    return [{
      label: 'Orden en la parte',
      before: Number.isInteger(previousData?.orderIndex) ? `Posicion ${previousData.orderIndex + 1}` : 'Sin registro',
      after: Number.isInteger(newData?.orderIndex) ? `Posicion ${newData.orderIndex + 1}` : 'Sin registro',
      kind: 'text',
    }];
  }

  const details = [];
  auditTrackedFields.forEach(([key, label]) => {
    if (!valuesChanged(previousData?.[key], newData?.[key])) return;
    details.push({
      label,
      before: auditFieldValue(key, previousData?.[key]),
      after: auditFieldValue(key, newData?.[key]),
      kind: 'text',
    });
  });
  if (valuesChanged(previousData?.links, newData?.links)) {
    details.push({
      label: 'Enlaces',
      before: auditLinks(previousData),
      after: auditLinks(newData),
      kind: 'links',
    });
  }
  if (valuesChanged(previousData?.files, newData?.files)) {
    details.push({
      label: 'Archivos',
      before: auditFiles(previousData),
      after: auditFiles(newData),
      kind: 'files',
    });
  }
  return details;
}

function auditValueText(value, kind = 'text') {
  if (kind === 'links') {
    return auditAssetText(value, (link) => `${auditLinkLabel(link)}: ${auditLinkUrl(link)}`);
  }
  if (kind === 'files') {
    return auditAssetText(value, auditFileLabel);
  }
  return compactValue(value);
}

function auditEntrySearchText(entry) {
  const snapshot = auditSnapshotResource(entry);
  const snapshotText = auditSnapshotRows(snapshot)
    .map((row) => `${row.label} ${auditValueText(row.value, row.kind)}`)
    .join(' ');
  const changeText = auditChangeDetails(entry)
    .map((change) => `${change.label} antes ${auditValueText(change.before, change.kind)} ahora ${auditValueText(change.after, change.kind)}`)
    .join(' ');
  return `${snapshotText} ${changeText}`;
}

function appendAuditValue(parent, value, kind = 'text') {
  if (kind === 'links') {
    appendAuditAssetList(parent, value, 'links');
    return;
  }
  if (kind === 'files') {
    appendAuditAssetList(parent, value, 'files');
    return;
  }
  const text = document.createElement('span');
  text.className = 'audit-text-value';
  text.textContent = compactValue(value);
  parent.appendChild(text);
}

function appendAuditAssetList(parent, items, kind) {
  const values = Array.isArray(items) ? items : [];
  if (!values.length) {
    const empty = document.createElement('span');
    empty.className = 'audit-empty-value';
    empty.textContent = 'Ninguno';
    parent.appendChild(empty);
    return;
  }
  const list = document.createElement('ul');
  list.className = 'audit-asset-list';
  values.forEach((item) => {
    const row = document.createElement('li');
    if (kind === 'links') {
      const label = document.createElement('span');
      label.className = 'audit-asset-name';
      label.textContent = auditLinkLabel(item);
      const url = document.createElement('span');
      url.className = 'audit-asset-url';
      url.textContent = auditLinkUrl(item);
      url.title = auditLinkUrl(item);
      row.append(label, url);
    } else {
      const label = document.createElement('span');
      label.className = 'audit-asset-name';
      label.textContent = auditFileLabel(item);
      row.appendChild(label);
    }
    list.appendChild(row);
  });
  parent.appendChild(list);
}

function appendAuditSnapshot(row, entry) {
  const resource = auditSnapshotResource(entry);
  if (!resource) return;
  const panel = document.createElement('section');
  panel.className = 'audit-detail-panel audit-snapshot-panel';
  const heading = document.createElement('h4');
  heading.textContent = auditSnapshotTitle(entry);
  const grid = document.createElement('div');
  grid.className = 'audit-resource-grid';
  auditSnapshotRows(resource).forEach((item) => {
    const block = document.createElement('div');
    block.className = `audit-resource-item audit-resource-${item.kind}`;
    const label = document.createElement('span');
    label.className = 'audit-detail-label';
    label.textContent = item.label;
    const value = document.createElement('div');
    value.className = 'audit-detail-value';
    appendAuditValue(value, item.value, item.kind);
    block.append(label, value);
    grid.appendChild(block);
  });
  panel.append(heading, grid);
  row.appendChild(panel);
}

function appendAuditChanges(row, entry) {
  const changes = auditChangeDetails(entry);
  if (!changes.length) return;
  const panel = document.createElement('section');
  panel.className = 'audit-detail-panel audit-change-panel';
  const heading = document.createElement('h4');
  heading.textContent = 'Cambios detectados';
  const list = document.createElement('div');
  list.className = 'audit-change-list';
  changes.forEach((change) => {
    const block = document.createElement('article');
    block.className = `audit-change-card audit-change-${change.kind}`;
    const label = document.createElement('strong');
    label.textContent = change.label;
    const beforeAfter = document.createElement('div');
    beforeAfter.className = 'audit-before-after';
    [
      ['Antes', change.before],
      ['Ahora', change.after],
    ].forEach(([caption, value]) => {
      const side = document.createElement('div');
      side.className = `audit-change-side audit-${caption.toLowerCase()}`;
      const sideLabel = document.createElement('span');
      sideLabel.textContent = caption;
      const sideValue = document.createElement('div');
      sideValue.className = 'audit-detail-value';
      appendAuditValue(sideValue, value, change.kind);
      side.append(sideLabel, sideValue);
      beforeAfter.appendChild(side);
    });
    block.append(label, beforeAfter);
    list.appendChild(block);
  });
  panel.append(heading, list);
  row.appendChild(panel);
}

async function logResourceAudit(action, resource, context, previousResource = null, summary = '') {
  if (!remoteEditingActive() || !cloudClient || !state.session?.user || !resource) return;
  const actor = currentActor();
  const payload = {
    resource_id: resource.id,
    resource_title: resource.title || '',
    action,
    actor_email: actor.email,
    actor_name: actor.name,
    module_id: context?.moduleId || '',
    module_title: context?.moduleTitle || '',
    lesson_id: context?.lessonId || '',
    lesson_title: context?.lessonTitle || '',
    section_id: context?.sectionId || resource.section || '',
    section_title: context?.sectionTitle || '',
    summary: summary || auditActionLabel(action),
    previous_data: previousResource ? resourceAuditSnapshot(previousResource) : null,
    new_data: action === 'delete' ? null : resourceAuditSnapshot(resource),
  };
  const { error } = await cloudClient.from('resource_audit_log').insert(payload);
  if (error) {
    console.warn('No se pudo guardar el historial del recurso.', error.message);
    return;
  }
  if (state.isMainEditor) await loadResourceAudit();
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
  const existingResource = existingIndex >= 0 ? { ...sourceLesson.resources[existingIndex] } : null;
  if (existingIndex >= 0) {
    if (!requireCapability('manageResources', 'Tu perfil puede crear recursos, pero no editar recursos existentes.')) return;
  } else if (!requireCapability('createResources', 'Tu perfil no puede crear recursos.')) {
    return;
  }
  applyResourceAuditFields(resource, existingResource);
  if (existingIndex >= 0) {
    sourceLesson.resources.splice(existingIndex, 1);
  }

  targetLesson.resources = targetLesson.resources || [];
  targetLesson.resources.push(resource);
  state.selectedModuleId = targetModuleId;
  state.selectedLessonId = targetLessonId;
  state.selectedSectionId = targetSectionId;
  if (!(await saveData())) return;
  const context = resourceContext(targetModuleId, targetLessonId, targetSectionId);
  const action = existingResource ? 'update' : 'create';
  const summary = existingResource
    ? `Edito el recurso en ${context.moduleTitle} / ${context.lessonTitle} / ${context.sectionTitle}`
    : `Creo el recurso en ${context.moduleTitle} / ${context.lessonTitle} / ${context.sectionTitle}`;
  await logResourceAudit(action, resource, context, existingResource, summary);
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
  state.pendingDeleteKind = 'resource';
  state.pendingDeleteResourceId = resourceId;
  state.pendingDeleteAuditId = null;
  if (dom.deleteConfirmTitle) dom.deleteConfirmTitle.textContent = 'Eliminar recurso';
  if (dom.deleteConfirmCopy) dom.deleteConfirmCopy.textContent = 'Esta accion quitara el recurso del organizador.';
  dom.deleteConfirmResource.textContent = resource.title;
  dom.confirmDelete.textContent = 'Eliminar recurso';
  dom.deleteConfirm.hidden = false;
  dom.confirmDelete.focus();
}

function closeDeleteConfirm() {
  state.pendingDeleteKind = '';
  state.pendingDeleteResourceId = null;
  state.pendingDeleteAuditId = null;
  dom.deleteConfirm.hidden = true;
  dom.deleteConfirmResource.textContent = '';
}

async function confirmDeletePending() {
  if (state.pendingDeleteKind === 'audit') {
    await confirmDeleteAuditEntry();
    return;
  }
  await confirmDeleteResource();
}

async function confirmDeleteResource() {
  const lesson = currentLesson();
  if (!lesson || !state.pendingDeleteResourceId) {
    closeDeleteConfirm();
    return;
  }
  const resourceId = state.pendingDeleteResourceId;
  const resource = (lesson.resources || []).find((item) => item.id === resourceId);
  const context = resourceContext(state.selectedModuleId, state.selectedLessonId, resource?.section || state.selectedSectionId);
  lesson.resources = (lesson.resources || []).filter((resource) => resource.id !== resourceId);
  if (!(await saveData())) return;
  if (resource) {
    await logResourceAudit('delete', resource, context, resource, `Elimino el recurso de ${context.moduleTitle} / ${context.lessonTitle} / ${context.sectionTitle}`);
  }
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
  const movingResource = resources[indexA];
  const beforeMove = {
    ...movingResource,
    orderIndex: indexA,
  };
  [resources[indexA], resources[indexB]] = [resources[indexB], resources[indexA]];
  if (!(await saveData())) return;
  const afterMove = {
    ...movingResource,
    orderIndex: indexB,
  };
  const context = resourceContext(state.selectedModuleId, state.selectedLessonId, movingResource.section || state.selectedSectionId);
  await logResourceAudit('move', afterMove, context, beforeMove, `Reordeno el recurso en ${context.moduleTitle} / ${context.lessonTitle} / ${context.sectionTitle}`);
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
  state.data.course.eyebrow = dom.courseEyebrowInput?.value.trim() || 'Propuesta de organizador Moodle';
  state.data.course.title = dom.courseTitleInput.value.trim() || 'Calculo III';
  state.data.course.description = dom.courseDescriptionInput.value.trim();
  state.data.course.period = dom.coursePeriodInput?.value.trim() || '';
  state.data.course.owner = dom.courseOwnerInput?.value.trim() || '';
  state.data.course.moodleUrl = dom.courseMoodleUrlInput?.value.trim() || '';
  document.querySelector('h1').textContent = state.data.course.title;
  if (dom.courseEyebrowDisplay) dom.courseEyebrowDisplay.textContent = state.data.course.eyebrow;
  if (dom.courseDescriptionDisplay) {
    dom.courseDescriptionDisplay.textContent = state.data.course.description;
    dom.courseDescriptionDisplay.hidden = !state.data.course.description;
  }
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
    ['Modulo', 'Leccion', 'Seccion', 'Titulo', 'Tipo', 'Estado', 'Grupo visual', 'Prioridad', 'Responsable', 'Enlaces', 'Archivos', 'Notas'],
    ...allResources().map(({ module, lesson, resource }) => [
      module.title,
      lesson.title,
      labels[resource.section] ?? state.data.sections.find((section) => section.id === resource.section)?.title ?? resource.section,
      resource.title,
      categoryLabel('type', resource.type),
      categoryLabel('status', resource.status),
      categoryLabel('group', resource.group),
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
      state.data = ensureCategoryData(imported);
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
  if (!state.hasCourseAccess) {
    setAuthMode('login', { updateRoute: true, replace: true });
    render();
    return;
  }
  const loaded = await reloadCloudDataAfterSignIn();
  if (!loaded) {
    updateAuthUi();
    render();
    return;
  }
  dom.loginEmail.value = '';
  setViewFromReturnRoute();
}

async function lookupRegisteredEmail(identifier) {
  if (!identifier || !cloudClient) return null;
  const { data, error } = await cloudClient.rpc('email_for_login', {
    login_identifier: identifier,
  });
  if (error) {
    return null;
  }
  return data;
}

function isEmailIdentifier(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

async function resolveLoginEmail(identifier) {
  const cleanIdentifier = identifier.trim();
  if (isEmailIdentifier(cleanIdentifier)) return cleanIdentifier.toLowerCase();
  return lookupRegisteredEmail(cleanIdentifier);
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
  const existingEmail = await lookupRegisteredEmail(email);
  if (existingEmail) {
    alert('Ese correo ya esta registrado. Inicia sesion o recupera la contrasena.');
    return;
  }
  const existingName = await lookupRegisteredEmail(name);
  if (existingName) {
    alert('Ese nombre de usuario ya esta registrado. Escoge otro.');
    return;
  }
  if (dom.confirmPassword && dom.confirmPassword.value !== password) {
    alert('Las contrasenas no coinciden.');
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
    const probablyExists = /already|registered|exists|exist/i.test(error.message);
    alert(
      probablyExists
        ? 'Ese correo ya existe en el sistema. Inicia sesion o recupera la contrasena; si no aparece en usuarios registrados, usa Sincronizar usuarios desde Administracion.'
        : `No se pudo registrar la cuenta: ${error.message}`
    );
    return;
  }
  if (data.user) {
    await upsertUserProfile(data.user, name);
  }
  dom.loginName.value = '';
  dom.loginPassword.value = '';
  if (dom.confirmPassword) dom.confirmPassword.value = '';
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
  if (!isEmailIdentifier(email)) {
    alert('Escribe un correo valido para recuperar la contrasena.');
    return;
  }
  const { error } = await cloudClient.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.href.split('#')[0]}#/recuperar`,
  });
  if (error) {
    alert(`No se pudo enviar la recuperacion: ${error.message}`);
    return;
  }
  setCloudStatus('Si el correo esta registrado, recibira un enlace para cambiar la contrasena.', 'pending');
}

async function updatePasswordFromRecovery() {
  if (!cloudClient) {
    alert('Supabase aun no esta configurado.');
    return;
  }
  const password = dom.loginPassword.value;
  const confirmation = dom.confirmPassword?.value || '';
  if (!password || !confirmation) {
    alert('Escribe y confirma la nueva contrasena.');
    return;
  }
  if (password.length > 72) {
    alert('La contrasena supera el maximo de 72 caracteres.');
    return;
  }
  if (password !== confirmation) {
    alert('Las contrasenas no coinciden.');
    return;
  }
  const { error } = await cloudClient.auth.updateUser({ password });
  if (error) {
    alert(`No se pudo cambiar la contrasena: ${error.message}`);
    return;
  }
  dom.loginPassword.value = '';
  if (dom.confirmPassword) dom.confirmPassword.value = '';
  state.recoveringPassword = false;
  setCloudStatus('Contrasena actualizada. Ya puedes usar tu cuenta.', 'ok');
  await refreshEditorStatus();
  if (!state.hasCourseAccess) {
    setAuthMode('login', { updateRoute: true, replace: true });
    render();
    return;
  }
  await reloadCloudDataAfterSignIn();
  setViewFromReturnRoute();
}

async function reloadCloudDataAfterSignIn() {
  const cloudData = await loadCloudData();
  if (cloudData) {
    state.data = cloudData;
    selectFirstAvailable();
    clearForm();
    return true;
  }
  return false;
}

function setViewFromReturnRoute() {
  const target = state.returnRoute && !['#/login', '#/registro', '#/recuperar'].includes(state.returnRoute)
    ? state.returnRoute
    : '#/mapa';
  history.replaceState(null, '', target);
  applyRouteFromLocation({ renderNow: false });
  render();
}

async function upsertUserProfile(user, name = '') {
  if (!cloudClient || !user?.email) return;
  const fullName = name || user.user_metadata?.full_name || user.email;
  const payload = {
    id: user.id,
    email: user.email.toLowerCase(),
    full_name: fullName,
    updated_at: new Date().toISOString(),
  };
  const { error } = await cloudClient.from('user_profiles').upsert(payload);
  if (error) {
    const canRetryWithEmail = fullName !== user.email && /duplicate|unique/i.test(error.message);
    if (canRetryWithEmail) {
      const { error: retryError } = await cloudClient.from('user_profiles').upsert({
        ...payload,
        full_name: user.email.toLowerCase(),
      });
      if (!retryError) {
        state.currentUserProfile = { email: payload.email, full_name: user.email.toLowerCase() };
        return;
      }
      console.warn('No se pudo guardar el perfil de usuario.', retryError.message);
      return;
    }
    console.warn('No se pudo guardar el perfil de usuario.', error.message);
    return;
  }
  state.currentUserProfile = { email: payload.email, full_name: payload.full_name };
}

async function loadCurrentUserProfile() {
  if (!cloudClient || !state.session?.user) {
    state.currentUserProfile = null;
    return null;
  }
  const { data, error } = await cloudClient
    .from('user_profiles')
    .select('email, full_name')
    .eq('id', state.session.user.id)
    .maybeSingle();
  if (!error && data) {
    state.currentUserProfile = data;
    return data;
  }
  return state.currentUserProfile;
}

async function logoutEditor() {
  if (!cloudClient) return;
  await cloudClient.auth.signOut();
  state.session = null;
  state.isEditor = false;
  state.isMainEditor = false;
  state.userRole = 'unassigned';
  state.accessChecked = false;
  state.hasCourseAccess = false;
  state.returnRoute = '#/mapa';
  state.currentView = 'course';
  state.currentUserProfile = null;
  state.resourceAuditLog = [];
  history.replaceState(null, '', '#/login');
  setAuthMode('login', { updateRoute: false });
  renderEditorList([]);
  renderRegisteredUsers([]);
  renderResourceAudit();
  render();
  setCloudStatus('Sesion cerrada. Inicia sesion para entrar al organizador.', state.cloudReady ? 'pending' : 'local');
}

function renderEditorList(editors = []) {
  if (!dom.editorList) return;
  if (!remoteEditingActive()) {
    dom.editorList.innerHTML = '<p class="asset-empty">Activa Supabase para administrar editores.</p>';
    return;
  }
  if (!canManageEditors()) {
    dom.editorList.innerHTML = '<p class="asset-empty">Solo la cuenta principal o un administrador puede ver perfiles. Solo la cuenta principal puede modificarlos.</p>';
    return;
  }
  if (!editors.length) {
    dom.editorList.innerHTML = '<p class="asset-empty">No hay editores cargados.</p>';
    return;
  }
  dom.editorList.innerHTML = '';
  const header = document.createElement('div');
  header.className = 'editor-list-header';
  header.innerHTML = '<span>Cuenta</span><span>Perfil</span><span>Accion</span>';
  dom.editorList.appendChild(header);
  editors.forEach((editor) => {
    const row = document.createElement('div');
    row.className = 'editor-row';
    const isMainAccount = editor.email?.toLowerCase() === MAIN_EDITOR_EMAIL;
    if (isMainAccount) row.classList.add('main-account');
    const account = document.createElement('div');
    account.className = 'editor-account';
    const email = document.createElement('strong');
    email.textContent = editor.email;
    const meta = document.createElement('small');
    meta.textContent = isMainAccount ? 'Cuenta principal' : 'Cuenta autorizada';
    account.append(email, meta);
    let roleControl;
    let action;
    if (isMainAccount || !canChangeAccounts()) {
      roleControl = document.createElement('span');
      roleControl.className = `role-pill role-${editor.role || 'owner'}`;
      roleControl.textContent = labels[editor.role || 'owner'] ?? editor.role;
      action = document.createElement('span');
      action.className = 'fixed-account-label';
      action.textContent = isMainAccount ? 'Fijo' : 'Solo principal';
    } else {
      roleControl = document.createElement('select');
      roleControl.className = 'inline-role-select';
      assignableRoles.forEach((roleValue) => {
        const option = document.createElement('option');
        option.value = roleValue;
        option.textContent = labels[roleValue] ?? roleValue;
        if ((editor.role || 'manager') === roleValue) option.selected = true;
        roleControl.appendChild(option);
      });
      action = document.createElement('div');
      action.className = 'editor-row-actions';
      const update = document.createElement('button');
      update.className = 'mini-btn';
      update.type = 'button';
      update.textContent = 'Actualizar';
      update.addEventListener('click', () => updateEditorRole(editor.email, roleControl.value));
      const remove = document.createElement('button');
      remove.className = 'mini-btn delete';
      remove.type = 'button';
      remove.textContent = 'Quitar perfil';
      remove.addEventListener('click', () => removeEditor(editor.email));
      action.append(update, remove);
    }
    row.append(account, roleControl, action);
    dom.editorList.appendChild(row);
  });
}

function renderRegisteredUsers(users = []) {
  if (!dom.registeredUserList) return;
  if (!remoteEditingActive()) {
    dom.registeredUserList.innerHTML = '<p class="asset-empty">Activa Supabase para ver usuarios registrados.</p>';
    return;
  }
  if (!canManageEditors()) {
    dom.registeredUserList.innerHTML = '<p class="asset-empty">Solo la cuenta principal o un administrador puede ver usuarios registrados.</p>';
    return;
  }
  if (!users.length) {
    dom.registeredUserList.innerHTML = '<p class="asset-empty">No hay usuarios registrados cargados.</p>';
    return;
  }
  const editorRoles = new Map((state.loadedEditors || []).map((editor) => [editor.email.toLowerCase(), editor.role || 'manager']));
  dom.registeredUserList.innerHTML = '';
  users.forEach((user) => {
    const row = document.createElement('div');
    row.className = 'registered-user-row';
    if (user.profile_status === 'missing_profile') row.classList.add('missing-profile');
    const account = document.createElement('div');
    account.className = 'editor-account';
    const name = document.createElement('strong');
    name.textContent = user.full_name || 'Sin nombre de usuario';
    const email = document.createElement('small');
    email.textContent = user.email;
    account.append(name, email);
    if (user.email_confirmed === false) {
      const unconfirmed = document.createElement('small');
      unconfirmed.textContent = 'Correo sin confirmar';
      account.append(unconfirmed);
    }
    const badges = document.createElement('div');
    badges.className = 'registered-user-badges';
    const role = document.createElement('span');
    const normalizedEmail = user.email?.toLowerCase() || '';
    const roleValue = normalizedEmail === MAIN_EDITOR_EMAIL ? 'owner' : editorRoles.get(normalizedEmail) || 'unassigned';
    role.className = `role-pill role-${roleValue}`;
    role.textContent = labels[roleValue] ?? roleValue;
    badges.appendChild(role);
    const profileStatus = user.profile_status || 'profile_ready';
    const profile = document.createElement('span');
    profile.className = `role-pill profile-${profileStatus}`;
    profile.textContent = profileStatusLabels[profileStatus] ?? profileStatus;
    badges.appendChild(profile);
    let action;
    if (normalizedEmail === MAIN_EDITOR_EMAIL || !canChangeAccounts()) {
      action = document.createElement('span');
      action.className = 'fixed-account-label';
      action.textContent = normalizedEmail === MAIN_EDITOR_EMAIL ? 'Fijo' : 'Solo principal';
    } else {
      action = document.createElement('button');
      action.className = 'mini-btn delete';
      action.type = 'button';
      action.textContent = 'Borrar cuenta';
      action.addEventListener('click', () => deleteRegisteredAccount(user.email));
    }
    row.append(account, badges, action);
    dom.registeredUserList.appendChild(row);
  });
}

function requestDeleteAuditEntry(entry) {
  if (!requireCapability('deleteAudit', 'Solo la cuenta principal puede eliminar entradas del historial.')) return;
  state.pendingDeleteKind = 'audit';
  state.pendingDeleteAuditId = entry.id;
  state.pendingDeleteResourceId = null;
  if (dom.deleteConfirmTitle) dom.deleteConfirmTitle.textContent = 'Eliminar entrada del historial';
  if (dom.deleteConfirmCopy) dom.deleteConfirmCopy.textContent = 'Esta accion quitara solo este registro del historial. No cambia el recurso ni la estructura del curso.';
  dom.deleteConfirmResource.textContent = `${entry.resource_title || 'Recurso sin titulo'} | ${auditActionLabel(entry.action)} | ${formatDateTime(entry.created_at) || 'Sin fecha'}`;
  dom.confirmDelete.textContent = 'Eliminar del historial';
  dom.deleteConfirm.hidden = false;
  dom.confirmDelete.focus();
}

async function confirmDeleteAuditEntry() {
  if (!state.pendingDeleteAuditId) {
    closeDeleteConfirm();
    return;
  }
  const auditId = state.pendingDeleteAuditId;
  const { error } = await cloudClient
    .from('resource_audit_log')
    .delete()
    .eq('id', auditId);
  if (error) {
    alert(`No se pudo eliminar la entrada del historial: ${error.message}. Ejecuta el SQL actualizado en Supabase y vuelve a intentar.`);
    return;
  }
  state.resourceAuditLog = (state.resourceAuditLog || []).filter((entry) => entry.id !== auditId);
  closeDeleteConfirm();
  renderResourceAudit();
}

function renderResourceAudit() {
  if (!dom.auditList || !dom.auditStatus) return;
  if (!remoteEditingActive()) {
    dom.auditStatus.textContent = 'Activa Supabase para guardar historial de recursos.';
    dom.auditList.innerHTML = '';
    if (dom.auditPagination) dom.auditPagination.innerHTML = '';
    return;
  }
  if (!canManageEditors()) {
    dom.auditStatus.textContent = 'Solo la cuenta principal o un administrador puede ver el historial.';
    dom.auditList.innerHTML = '';
    if (dom.auditPagination) dom.auditPagination.innerHTML = '';
    return;
  }

  const search = state.auditSearch.trim().toLowerCase();
  const entries = (state.resourceAuditLog || []).filter((entry) => {
    if (!search) return true;
    const haystack = [
      entry.resource_title,
      entry.action,
      auditActionLabel(entry.action),
      entry.actor_name,
      entry.actor_email,
      auditContextLabel(entry),
      entry.summary,
      auditEntrySearchText(entry),
    ].join(' ').toLowerCase();
    return haystack.includes(search);
  });

  dom.auditList.innerHTML = '';
  if (dom.auditPagination) dom.auditPagination.innerHTML = '';
  const totalPages = Math.max(1, Math.ceil(entries.length / state.auditPageSize));
  state.auditPage = Math.min(Math.max(state.auditPage, 1), totalPages);
  const startIndex = (state.auditPage - 1) * state.auditPageSize;
  const pageEntries = entries.slice(startIndex, startIndex + state.auditPageSize);

  dom.auditStatus.textContent = entries.length
    ? `Mostrando ${startIndex + 1}-${Math.min(startIndex + pageEntries.length, entries.length)} de ${entries.length} movimientos.`
    : 'No hay movimientos que coincidan con la busqueda.';

  pageEntries.forEach((entry) => {
    const row = document.createElement('article');
    row.className = 'audit-row';
    const head = document.createElement('div');
    head.className = 'audit-row-head';
    const title = document.createElement('strong');
    title.textContent = entry.resource_title || 'Recurso sin titulo';
    const action = document.createElement('span');
    action.className = `role-pill audit-action-${entry.action || 'update'}`;
    action.textContent = auditActionLabel(entry.action);
    const rowActions = document.createElement('div');
    rowActions.className = 'audit-row-actions';
    rowActions.appendChild(action);
    if (state.isMainEditor) {
      const remove = document.createElement('button');
      remove.className = 'mini-btn delete audit-delete-button';
      remove.type = 'button';
      remove.textContent = 'Eliminar historial';
      remove.addEventListener('click', () => requestDeleteAuditEntry(entry));
      rowActions.appendChild(remove);
    }
    head.append(title, rowActions);

    const meta = document.createElement('p');
    meta.className = 'audit-meta';
    meta.textContent = `${actorText(entry.actor_name, entry.actor_email)} | ${formatDateTime(entry.created_at) || 'Sin fecha'}`;

    const place = document.createElement('p');
    place.className = 'audit-place';
    place.textContent = auditContextLabel(entry);

    const summary = document.createElement('p');
    summary.className = 'audit-summary';
    summary.textContent = auditActionSentence(entry.action);

    row.append(head, meta, place, summary);
    appendAuditSnapshot(row, entry);
    appendAuditChanges(row, entry);
    dom.auditList.appendChild(row);
  });

  renderAuditPagination(totalPages);
}

function renderAuditPagination(totalPages) {
  if (!dom.auditPagination || totalPages <= 1) return;
  for (let page = 1; page <= totalPages; page += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'audit-page-button';
    button.textContent = page;
    if (page === state.auditPage) {
      button.classList.add('active');
      button.setAttribute('aria-current', 'page');
    }
    button.addEventListener('click', () => {
      state.auditPage = page;
      renderResourceAudit();
    });
    dom.auditPagination.appendChild(button);
  }
}

async function loadResourceAudit() {
  if (!cloudClient || !canManageEditors()) {
    state.resourceAuditLog = [];
    renderResourceAudit();
    return;
  }
  const { data, error } = await cloudClient
    .from('resource_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) {
    state.resourceAuditLog = [];
    if (dom.auditStatus) {
      dom.auditStatus.textContent = `No se pudo cargar el historial. Ejecuta el SQL actualizado en Supabase. Detalle: ${error.message}`;
    }
    if (dom.auditList) dom.auditList.innerHTML = '';
    return;
  }
  state.resourceAuditLog = data || [];
  renderResourceAudit();
}

async function refreshEditorStatus() {
  if (!cloudClient || !state.session?.user) {
    state.isEditor = false;
    state.isMainEditor = false;
    state.userRole = 'unassigned';
    state.currentUserProfile = null;
    state.resourceAuditLog = [];
    state.accessChecked = false;
    state.hasCourseAccess = false;
    updateAuthUi();
    renderEditorList([]);
    renderRegisteredUsers([]);
    renderResourceAudit();
    return;
  }
  const email = state.session.user.email?.toLowerCase() || '';
  await loadCurrentUserProfile();
  state.isMainEditor = email === MAIN_EDITOR_EMAIL;
  const { data, error } = await cloudClient
    .from('course_editors')
    .select('email, role')
    .eq('email', email)
    .maybeSingle();
  state.accessChecked = true;
  state.userRole = state.isMainEditor ? 'owner' : data?.role || 'unassigned';
  state.hasCourseAccess = state.isMainEditor || Boolean(data?.role);
  state.isEditor = ['owner', 'admin', 'manager', 'contributor'].includes(state.userRole) && !error;
  if (!state.hasCourseAccess && !state.recoveringPassword) {
    state.currentView = 'course';
    state.returnRoute = '#/mapa';
    if (!['#/login', '#/registro', '#/recuperar'].includes(window.location.hash)) {
      history.replaceState(null, '', '#/login');
    }
  }
  updateAuthUi();
  setCloudStatus(
    state.hasCourseAccess
      ? `Sesion activa: ${labels[state.userRole] ?? state.userRole}.`
      : 'Sesion iniciada, pero este correo no tiene perfil asignado.',
    state.hasCourseAccess ? 'ok' : 'pending'
  );
  await loadEditors();
  if (state.data) render();
}

async function loadEditors() {
  if (!cloudClient || !canManageEditors()) {
    state.loadedEditors = [];
    state.loadedRegisteredUsers = [];
    state.resourceAuditLog = [];
    renderEditorList([]);
    renderRegisteredUsers([]);
    renderResourceAudit();
    return;
  }
  const { data, error } = await cloudClient
    .from('course_editors')
    .select('email, role, created_at')
    .order('email');
  if (error) {
    state.loadedEditors = [];
    state.loadedRegisteredUsers = [];
    state.resourceAuditLog = [];
    renderEditorList([]);
    renderRegisteredUsers([]);
    renderResourceAudit();
    return;
  }
  state.loadedEditors = data || [];
  renderEditorList(data);
  await loadRegisteredUsers();
  await loadResourceAudit();
}

async function loadRegisteredUsers() {
  if (!cloudClient || !canManageEditors()) {
    state.loadedRegisteredUsers = [];
    renderRegisteredUsers([]);
    return;
  }
  const { data: accountData, error: accountError } = await cloudClient.rpc('list_registered_accounts');
  if (!accountError) {
    state.loadedRegisteredUsers = accountData || [];
    renderRegisteredUsers(state.loadedRegisteredUsers);
    return;
  }
  const { data, error } = await cloudClient
    .from('user_profiles')
    .select('email, full_name, created_at, updated_at')
    .order('created_at', { ascending: false });
  if (error) {
    state.loadedRegisteredUsers = [];
    dom.registeredUserList.innerHTML = `<p class="asset-empty">No se pudieron cargar usuarios registrados: ${accountError.message || error.message}</p>`;
    return;
  }
  state.loadedRegisteredUsers = (data || []).map((user) => ({
    ...user,
    profile_status: 'profile_ready',
  }));
  renderRegisteredUsers(state.loadedRegisteredUsers);
}

async function addEditor() {
  if (!requireMainEditorPermission()) return;
  const email = dom.editorEmailInput.value.trim().toLowerCase();
  const role = dom.editorRoleInput.value;
  if (!email) return;
  const account = await lookupRegisteredAccount(email);
  if (!account?.email) {
    alert('Ese correo todavia no aparece como cuenta registrada. Si ya se registro, ejecuta el SQL de reparacion y luego usa Sincronizar usuarios.');
    return;
  }
  const { error } = await cloudClient.from('course_editors').upsert({ email, role });
  if (error) {
    alert(`No se pudo autorizar este correo: ${error.message}`);
    return;
  }
  dom.editorEmailInput.value = '';
  await loadEditors();
}

async function updateEditorRole(email, role) {
  if (!requireMainEditorPermission()) return;
  if (email?.toLowerCase() === MAIN_EDITOR_EMAIL) {
    alert('La cuenta principal siempre conserva acceso completo.');
    return;
  }
  const { error } = await cloudClient.from('course_editors').upsert({ email: email.toLowerCase(), role });
  if (error) {
    alert(`No se pudo actualizar el perfil: ${error.message}`);
    return;
  }
  setCloudStatus(`Perfil actualizado para ${email}.`, 'ok');
  await loadEditors();
}

async function lookupRegisteredAccount(email) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !cloudClient) return null;
  const loadedAccount = (state.loadedRegisteredUsers || []).find((user) => user.email?.toLowerCase() === normalizedEmail);
  if (loadedAccount) return loadedAccount;
  const { data, error } = await cloudClient.rpc('registered_account_status', {
    account_email: normalizedEmail,
  });
  if (!error) {
    const account = Array.isArray(data) ? data[0] : data;
    if (account?.email) return account;
  }
  const registeredEmail = await lookupRegisteredEmail(normalizedEmail);
  return registeredEmail ? { email: registeredEmail, profile_status: 'profile_ready' } : null;
}

async function syncRegisteredUsers() {
  if (!requireMainEditorPermission()) return;
  const { data, error } = await cloudClient.rpc('sync_registered_user_profiles');
  if (error) {
    alert(`No se pudieron sincronizar usuarios: ${error.message}. Ejecuta supabase/repair-user-profiles.sql en Supabase y vuelve a intentarlo.`);
    return;
  }
  setCloudStatus(`Usuarios sincronizados. Filas revisadas: ${data ?? 0}.`, 'ok');
  await loadEditors();
}

async function removeEditor(email) {
  if (!requireMainEditorPermission()) return;
  if (email?.toLowerCase() === MAIN_EDITOR_EMAIL) {
    alert('No se puede quitar el perfil de la cuenta principal.');
    return;
  }
  if (email === state.session?.user?.email && !confirm('Estas quitando tu propio permiso de editor. Continuar?')) return;
  const { error } = await cloudClient.from('course_editors').delete().eq('email', email);
  if (error) {
    alert(`No se pudo quitar este editor: ${error.message}`);
    return;
  }
  await refreshEditorStatus();
}

async function deleteRegisteredAccount(email) {
  if (!requireMainEditorPermission()) return;
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) return;
  if (normalizedEmail === MAIN_EDITOR_EMAIL) {
    alert('No se puede borrar la cuenta principal.');
    return;
  }
  const confirmation = prompt(`Esto borrara la cuenta ${normalizedEmail}, su perfil, permisos y credenciales de inicio de sesion. Escribe BORRAR para confirmar.`);
  if (confirmation !== 'BORRAR') return;
  const { error } = await cloudClient.rpc('delete_registered_account', {
    account_email: normalizedEmail,
  });
  if (error) {
    alert(`No se pudo borrar la cuenta: ${error.message}. Ejecuta el SQL actualizado de supabase/repair-user-profiles.sql y vuelve a intentarlo.`);
    return;
  }
  setCloudStatus(`Cuenta borrada: ${normalizedEmail}.`, 'ok');
  await loadEditors();
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
  dom.groupFilter?.addEventListener('change', () => updateMultiFilter('group'));
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
  dom.saveCategories?.addEventListener('click', saveCategoryDraft);
  dom.discardCategories?.addEventListener('click', discardCategoryDraft);
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
  dom.updatePasswordButton?.addEventListener('click', updatePasswordFromRecovery);
  dom.authLoginMode?.addEventListener('click', () => setAuthMode('login', { updateRoute: true }));
  dom.authSignupMode?.addEventListener('click', () => setAuthMode('signup', { updateRoute: true }));
  dom.resetPasswordButton.addEventListener('click', resetPassword);
  dom.logoutButton.addEventListener('click', logoutEditor);
  dom.loginPassword.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (state.authMode === 'signup') {
        signupEditor();
      } else if (state.authMode === 'update') {
        updatePasswordFromRecovery();
      } else {
        loginEditor();
      }
    }
  });
  dom.loginEmail.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && state.authMode === 'reset') {
      event.preventDefault();
      resetPassword();
    }
  });
  dom.confirmPassword?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (state.authMode === 'signup') signupEditor();
      if (state.authMode === 'update') updatePasswordFromRecovery();
    }
  });
  document.querySelector('#save-course-settings').addEventListener('click', updateCourseSettings);
  onOptional('#add-module', 'click', addModule);
  onOptional('#update-module', 'click', updateModule);
  onOptional('#delete-module', 'click', deleteModule);
  onOptional('#update-section', 'click', updateSection);
  document.querySelector('#add-editor').addEventListener('click', addEditor);
  dom.syncRegisteredUsersButton?.addEventListener('click', syncRegisteredUsers);
  dom.refreshAuditLog?.addEventListener('click', loadResourceAudit);
  dom.auditSearch?.addEventListener('input', (event) => {
    state.auditSearch = event.target.value;
    state.auditPage = 1;
    renderResourceAudit();
  });
  dom.moduleEditSelect?.addEventListener('change', () => {
    const module = state.data.modules.find((item) => item.id === dom.moduleEditSelect.value);
    dom.moduleTitleInput.value = module?.title ?? '';
  });
  dom.sectionEditSelect?.addEventListener('change', () => {
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
  dom.confirmDelete.addEventListener('click', confirmDeletePending);
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
  const container = kind === 'status' ? dom.statusFilter : kind === 'type' ? dom.typeFilter : dom.groupFilter;
  const values = Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map((input) => input.value);
  if (kind === 'status') {
    state.statusFilters = values;
  } else if (kind === 'type') {
    state.typeFilters = values;
  } else {
    state.groupFilters = values;
  }
  renderResources();
}

function resetMultiFilter(kind) {
  const container = kind === 'status' ? dom.statusFilter : kind === 'type' ? dom.typeFilter : dom.groupFilter;
  container.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.checked = false;
  });
  if (kind === 'status') {
    state.statusFilters = [];
  } else if (kind === 'type') {
    state.typeFilters = [];
  } else {
    state.groupFilters = [];
  }
  renderResources();
}

async function loadCloudData() {
  if (!cloudClient) return null;
  if (!state.session?.user) {
    setCloudStatus('Inicia sesion para cargar los datos compartidos.', 'pending');
    return null;
  }
  if (!state.accessChecked) {
    await refreshEditorStatus();
  }
  if (!state.hasCourseAccess) {
    setCloudStatus('Sesion iniciada, pero este correo no tiene perfil asignado.', 'pending');
    return null;
  }
  const { data, error } = await cloudClient
    .from('course_state')
    .select('data, updated_at')
    .eq('id', cloudConfig.courseStateId)
    .single();
  if (error) {
    state.cloudReady = false;
    setCloudStatus('No se pudieron cargar los datos compartidos. Revisa la configuracion de Supabase.', 'local');
    return null;
  }
  state.cloudReady = true;
  setCloudStatus(`Datos compartidos activos. Ultima sincronizacion: ${formatDateTime(data.updated_at)}.`, 'ok');
  return ensureCategoryData(data.data);
}

async function initCloudSession() {
  if (!cloudClient) {
    setCloudStatus('Modo local. Supabase no esta configurado.', 'local');
    updateAuthUi();
    return;
  }
  const { data } = await cloudClient.auth.getSession();
  state.session = data.session;
  if (window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery')) {
    state.recoveringPassword = true;
    state.authMode = 'update';
    history.replaceState(null, '', '#/recuperar');
  }
  updateAuthUi();
  cloudClient.auth.onAuthStateChange(async (event, session) => {
    state.session = session;
    if (event === 'PASSWORD_RECOVERY') {
      state.recoveringPassword = true;
      setAuthMode('update', { updateRoute: true, replace: true });
      updateAuthUi();
      return;
    }
    updateAuthUi();
    if (session) {
      await refreshEditorStatus();
      if (state.hasCourseAccess) await reloadCloudDataAfterSignIn();
    } else {
      await refreshEditorStatus();
    }
    if (state.cloudReady) {
      if (!session) setCloudStatus('Modo lectura. Inicia sesion para editar.', 'pending');
    }
  });
}

async function init(forceDefault = false) {
  await initCloudSession();
  let cloudData = null;
  if (!forceDefault && cloudClient && state.session?.user) {
    await refreshEditorStatus();
    if (state.hasCourseAccess) cloudData = await loadCloudData();
  } else if (!forceDefault && !cloudClient) {
    cloudData = await loadCloudData();
  }
  const stored = forceDefault || cloudClient || cloudData ? null : loadStoredData();
  if (cloudData) {
    state.data = ensureCategoryData(cloudData);
  } else if (stored) {
    state.data = ensureCategoryData(stored);
    renderEditorList([]);
  } else {
    localStorage.removeItem(STORAGE_KEY);
    const response = await fetch('js/data.json');
    state.data = ensureCategoryData(await response.json());
    if (!cloudClient || (forceDefault && state.session?.user && state.hasCourseAccess)) {
      await saveData();
    }
  }
  selectFirstAvailable();
  applyRouteFromLocation({ renderNow: false });
  clearForm();
  if (!requiresSignIn() || (state.session?.user && state.hasCourseAccess)) syncRouteFromState();
  render();
  if (state.session?.user && state.hasCourseAccess) await loadEditors();
}

wireEvents();
init();
