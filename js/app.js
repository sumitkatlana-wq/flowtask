// ─── FlowTask App — Core ──────────────────────────────────────────────────

const App = {
  state: {
    view: 'dashboard',
    panel: 'work',
    activeProjectId: null,
    activeTaskId: null,
    sortBy: 'priority',
    sortDir: 'desc',
    filterStatus: 'all',
    filterPanel: 'all',
    calView: 'month',
    calDate: new Date(),
    timerInterval: null,
    timerSeconds: 0,
    timerRunning: false,
    pomodoroMode: false,
    pomodoroPhase: 'work', // 'work'|'break'
    pomodoroSecondsLeft: 25 * 60,
    searchQuery: '',
  },

  // ── Init ──────────────────────────────────────────────────────────────────
  init() {
    DB.seedIfEmpty();
    this.registerSW();
    this.bindGlobalKeys();
    this.checkMorningRitual();
    this.scheduleNotificationTimers();
    this.navigate(new URLSearchParams(location.search).get('view') || 'dashboard');
    this.renderSidebar();
  },

  registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  },

  // ── Routing ───────────────────────────────────────────────────────────────
  navigate(view, params = {}) {
    this.state.view = view;
    Object.assign(this.state, params);
    this.renderSidebar();
    this.renderMain();
    this.closeDetail();
    document.title = `FlowTask — ${this.viewTitle(view)}`;
    // Auto-close sidebar on mobile after navigation
    const sb = document.getElementById('sidebar');
    if (sb) sb.classList.remove('open');
  },

  viewTitle(v) {
    return { dashboard: 'Projects', 'all-tasks': 'All Tasks', today: "Today's Focus", tomorrow: 'Tomorrow', assigned: 'Assigned to Others', calendar: 'Calendar', insights: 'Insights', planning: 'Daily Planning', weekly: 'Weekly Review', goals: 'Goals', focus: 'Focus Mode', inbox: 'Inbox', commitments: 'Commitments', settings: 'Settings' }[v] || v;
  },

  // ── Render Sidebar ────────────────────────────────────────────────────────
  renderSidebar() {
    const tasks = DB.getTasks();
    const todayCount = tasks.filter(t => t.tags.includes('today') && t.status !== 'completed').length;
    const inboxCount = tasks.filter(t => t.isInbox).length;
    const settings = DB.getSettings();

    const navItems = [
      { id: 'dashboard',   icon: 'ti-layout-board',   label: 'Projects' },
      { id: 'all-tasks',   icon: 'ti-list',            label: 'All tasks' },
      { id: 'today',       icon: 'ti-sun',             label: 'Today', badge: todayCount, badgeClass: todayCount > 0 ? 'red' : '' },
      { id: 'tomorrow',    icon: 'ti-calendar-due',    label: 'Tomorrow' },
      { id: 'assigned',    icon: 'ti-users',           label: 'Assigned to others' },
      { id: 'commitments', icon: 'ti-shield-check',    label: 'Commitments' },
      { id: 'calendar',    icon: 'ti-calendar',        label: 'Calendar' },
      { id: 'inbox',       icon: 'ti-inbox',           label: 'Inbox', badge: inboxCount, badgeClass: 'green' },
    ];
    const planningItems = [
      { id: 'planning',    icon: 'ti-sunrise',         label: 'Daily planning' },
      { id: 'weekly',      icon: 'ti-calendar-stats',  label: 'Weekly review' },
      { id: 'goals',       icon: 'ti-target',          label: 'Goals' },
      { id: 'insights',    icon: 'ti-chart-bar',       label: 'Insights' },
    ];

    const projects = DB.getProjects().filter(p => p.panel === this.state.panel);

    document.getElementById('sidebar').innerHTML = `
      <div class="sidebar-logo">
        <i class="ti ti-checkbox logo-icon" aria-hidden="true"></i>
        <span>FlowTask</span>
        <button class="btn btn-ghost btn-icon" style="margin-left:auto" onclick="App.toggleTheme()" title="Toggle theme">
          <i class="ti ti-moon" aria-hidden="true"></i>
        </button>
      </div>
      <div class="panel-toggle">
        <button class="panel-btn ${this.state.panel==='personal'?'active':''}" onclick="App.setPanel('personal')">Personal</button>
        <button class="panel-btn ${this.state.panel==='work'?'active':''}" onclick="App.setPanel('work')">Work</button>
      </div>
      <nav>
        <div class="nav-section">Views</div>
        ${navItems.map(n => `
          <div class="nav-item ${this.state.view===n.id?'active':''}" onclick="App.navigate('${n.id}')">
            <i class="ti ${n.icon} nav-icon" aria-hidden="true"></i>
            <span>${n.label}</span>
            ${n.badge ? `<span class="nav-badge ${n.badgeClass||''}">${n.badge}</span>` : ''}
          </div>`).join('')}
        <div class="nav-section" style="margin-top:8px">Planning</div>
        ${planningItems.map(n => `
          <div class="nav-item ${this.state.view===n.id?'active':''}" onclick="App.navigate('${n.id}')">
            <i class="ti ${n.icon} nav-icon" aria-hidden="true"></i>
            <span>${n.label}</span>
          </div>`).join('')}
      </nav>
      <div class="sidebar-projects">
        <div class="nav-section" style="margin-top:4px">Projects
          <button class="btn btn-ghost btn-icon btn-sm" style="float:right;margin-top:-2px" onclick="App.openNewProject()" title="New project"><i class="ti ti-plus"></i></button>
        </div>
        ${projects.map(p => `
          <div class="proj-nav-item ${this.state.activeProjectId===p.id?'active':''}" onclick="App.navigate('dashboard',{activeProjectId:'${p.id}'})">
            <span class="proj-color-dot" style="background:${p.color}"></span>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this.esc(p.name)}</span>
            <span class="badge badge-p-${p.priority}" style="font-size:9px">${p.priority[0].toUpperCase()}</span>
          </div>`).join('')}
      </div>
      <div class="sidebar-footer">
        <div class="nav-item" onclick="App.navigate('settings')">
          <i class="ti ti-settings nav-icon" aria-hidden="true"></i>
          <span>Settings</span>
        </div>
        <div class="nav-item" onclick="App.openFocusMode()">
          <i class="ti ti-bolt nav-icon" aria-hidden="true"></i>
          <span>Focus mode</span>
        </div>
      </div>
    `;
  },

  // ── Render Main ───────────────────────────────────────────────────────────
  renderMain() {
    const area = document.getElementById('main-area');
    const views = {
      dashboard:   () => Views.dashboard(),
      'all-tasks': () => Views.allTasks(),
      today:       () => Views.today(),
      tomorrow:    () => Views.tomorrow(),
      assigned:    () => Views.assigned(),
      commitments: () => Views.commitments(),
      calendar:    () => Views.calendar(),
      inbox:       () => Views.inbox(),
      planning:    () => Views.planning(),
      weekly:      () => Views.weekly(),
      goals:       () => Views.goals(),
      insights:    () => Views.insights(),
      settings:    () => Views.settings(),
    };
    area.innerHTML = (views[this.state.view] || views.dashboard)();
    area.querySelector('.view-content')?.classList.add('fade-in');
  },

  // ── Detail Panel ──────────────────────────────────────────────────────────
  openDetail(taskId) {
    this.state.activeTaskId = taskId;
    const panel = document.getElementById('detail-panel');
    panel.classList.add('open', 'slide-in');
    panel.innerHTML = Views.taskDetail(taskId);
  },
  closeDetail() {
    this.state.activeTaskId = null;
    const panel = document.getElementById('detail-panel');
    panel.classList.remove('open');
  },
  refreshDetail() {
    if (this.state.activeTaskId) this.openDetail(this.state.activeTaskId);
  },

  // ── Panel / Navigation ────────────────────────────────────────────────────
  setPanel(panel) {
    this.state.panel = panel;
    this.state.activeProjectId = null;
    this.navigate(this.state.view);
  },

  // ── Task Actions ──────────────────────────────────────────────────────────
  toggleTaskComplete(id, e) {
    e && e.stopPropagation();
    const task = DB.getTasks().find(t => t.id === id);
    if (!task) return;
    task.status = task.status === 'completed' ? 'in-progress' : 'completed';
    task.completedAt = task.status === 'completed' ? DB.now() : null;
    DB.saveTask(task);
    this.renderMain();
    if (this.state.activeTaskId === id) this.refreshDetail();
  },

  deleteTask(id) {
    if (!confirm('Delete this task?')) return;
    DB.deleteTask(id);
    this.closeDetail();
    this.renderMain();
  },

  // ── Dependencies ─────────────────────────────────────────────────────────
  isBlocked(task) {
    if (!task.dependencies || !task.dependencies.length) return false;
    const allTasks = DB.getTasks();
    return task.dependencies.some(depId => {
      const dep = allTasks.find(t => t.id === depId);
      return dep && dep.status !== 'completed';
    });
  },

  getBlockedBy(task) {
    if (!task.dependencies || !task.dependencies.length) return [];
    const allTasks = DB.getTasks();
    return task.dependencies
      .map(id => allTasks.find(t => t.id === id))
      .filter(t => t && t.status !== 'completed');
  },

  getBlocks(taskId) {
    // Tasks that depend on this task
    return DB.getTasks().filter(t => t.dependencies && t.dependencies.includes(taskId));
  },

  addDependency(taskId, depId) {
    if (taskId === depId) { this.toast('A task cannot depend on itself'); return; }
    const task = DB.getTasks().find(t => t.id === taskId);
    if (!task) return;
    if (task.dependencies.includes(depId)) { this.toast('Already a dependency'); return; }
    // Prevent circular: check depId doesn't already depend on taskId
    if (this.wouldCreateCycle(taskId, depId)) { this.toast('This would create a circular dependency'); return; }
    task.dependencies = [...task.dependencies, depId];
    DB.saveTask(task);
    this.refreshDetail();
    this.renderMain();
  },

  removeDependency(taskId, depId) {
    const task = DB.getTasks().find(t => t.id === taskId);
    if (!task) return;
    task.dependencies = task.dependencies.filter(id => id !== depId);
    DB.saveTask(task);
    this.refreshDetail();
    this.renderMain();
  },

  wouldCreateCycle(taskId, newDepId) {
    // BFS: check if taskId is reachable from newDepId through its own dependencies
    const allTasks = DB.getTasks();
    const visited = new Set();
    const queue = [newDepId];
    while (queue.length) {
      const current = queue.shift();
      if (current === taskId) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      const t = allTasks.find(x => x.id === current);
      if (t && t.dependencies) t.dependencies.forEach(id => queue.push(id));
    }
    return false;
  },

  openDependencyPicker(taskId) {
    const task = DB.getTasks().find(t => t.id === taskId);
    if (!task) return;
    const allTasks = DB.getTasks()
      .filter(t => t.id !== taskId && t.status !== 'completed')
      .sort((a, b) => b.priorityScore - a.priorityScore);

    const modal = `
      <div class="modal">
        <div class="modal-title">Add dependency</div>
        <p style="font-size:13px;color:var(--text-2);margin-bottom:12px">This task cannot start until the selected task is completed.</p>
        <input class="field-input" placeholder="Search tasks…" oninput="App.filterDepPicker(this.value)" style="margin-bottom:10px">
        <div id="dep-picker-list" style="display:flex;flex-direction:column;gap:6px;max-height:360px;overflow-y:auto">
          ${allTasks.map(t => {
            const proj = DB.getProjects().find(p => p.id === t.projectId);
            const already = task.dependencies.includes(t.id);
            return `
              <div class="dep-pick-row" data-title="${App.esc(t.title.toLowerCase())}" onclick="${already ? '' : `App.addDependency('${taskId}','${t.id}');App.closeModal()`}" style="display:flex;align-items:center;gap:8px;padding:9px 12px;border:0.5px solid var(--border);border-radius:var(--radius);cursor:${already?'default':'pointer'};opacity:${already?'0.5':'1'}">
                <span class="status-dot dot-${t.status}"></span>
                <span style="flex:1;font-size:13px">${App.esc(t.title)}</span>
                <span class="badge badge-p-${t.priority}" style="font-size:9px">${t.priority[0].toUpperCase()}</span>
                ${proj ? `<span style="font-size:10px;color:var(--text-3)">${App.esc(proj.name)}</span>` : ''}
                ${already ? `<span style="font-size:10px;color:var(--accent)">added</span>` : ''}
              </div>`;
          }).join('')}
        </div>
        <div class="modal-footer"><button class="btn" onclick="App.closeModal()">Cancel</button></div>
      </div>`;
    document.getElementById('modal-overlay').innerHTML = modal;
    document.getElementById('modal-overlay').classList.add('open');
  },

  filterDepPicker(query) {
    const q = query.toLowerCase();
    document.querySelectorAll('.dep-pick-row').forEach(row => {
      row.style.display = row.dataset.title.includes(q) ? '' : 'none';
    });
  },

  // Guard: warn if moving a blocked task to in-progress
  saveTaskField(id, field, value) {
    const task = DB.getTasks().find(t => t.id === id);
    if (!task) return;
    if (field === 'status' && value === 'in-progress' && this.isBlocked(task)) {
      const blockers = this.getBlockedBy(task).map(t => `"${t.title}"`).join(', ');
      if (!confirm(`This task is blocked by: ${blockers}.\n\nMove to In Progress anyway?`)) return;
    }
    task[field] = value;
    if (field === 'status' && value === 'completed') task.completedAt = DB.now();
    task.priorityScore = DB.computePriorityScore(task);
    DB.saveTask(task);
    this.renderSidebar();
    if (['status','priority','dueDate','tags'].includes(field)) this.renderMain();
  },

  toggleMIT(id, e) {
    e && e.stopPropagation();
    const task = DB.getTasks().find(t => t.id === id);
    if (!task) return;
    // Max 3 MITs for today
    const mitCount = DB.getTasks().filter(t => t.isMIT && t.status !== 'completed').length;
    if (!task.isMIT && mitCount >= 3) { this.toast('Max 3 MIT tasks allowed'); return; }
    task.isMIT = !task.isMIT;
    DB.saveTask(task);
    this.renderMain();
  },

  toggleTag(id, tag, e) {
    e && e.stopPropagation();
    const task = DB.getTasks().find(t => t.id === id);
    if (!task) return;
    task.tags = task.tags.includes(tag) ? task.tags.filter(t => t !== tag) : [...task.tags.filter(t => t !== tag), tag];
    DB.saveTask(task);
    this.renderMain();
    this.renderSidebar();
  },

  // ── Quick Add ─────────────────────────────────────────────────────────────
  showQuickAdd(projectId, status) {
    const existing = document.querySelector('.quick-add-inline.open');
    if (existing) existing.classList.remove('open');
    const el = document.getElementById(`qa-${projectId}-${status}`);
    if (el) { el.classList.add('open'); el.querySelector('input').focus(); }
  },

  submitQuickAdd(projectId, status, e) {
    if (e.key !== 'Enter' && e.type !== 'click') return;
    const input = document.getElementById(`qa-input-${projectId}-${status}`);
    const title = input?.value?.trim();
    if (!title) return;
    DB.createTask({ title, projectId, status, panel: this.state.panel });
    input.value = '';
    document.getElementById(`qa-${projectId}-${status}`)?.classList.remove('open');
    this.renderMain();
    this.renderSidebar();
  },

  // ── Project Actions ───────────────────────────────────────────────────────
  toggleProject(id) {
    const proj = DB.getProjects().find(p => p.id === id);
    if (!proj) return;
    proj.collapsed = !proj.collapsed;
    DB.saveProject(proj);
    this.renderMain();
  },

  toggleSection(projectId, status) {
    const proj = DB.getProjects().find(p => p.id === projectId);
    if (!proj) return;
    proj.sectionCollapsed[status] = !proj.sectionCollapsed[status];
    DB.saveProject(proj);
    this.renderMain();
  },

  openNewProject() {
    document.getElementById('modal-overlay').innerHTML = Modals.newProject();
    document.getElementById('modal-overlay').classList.add('open');
  },

  saveNewProject() {
    const name = document.getElementById('proj-name-input').value.trim();
    if (!name) return;
    const priority = document.getElementById('proj-priority-input').value;
    const color = document.getElementById('proj-color-input').value;
    const dueDate = document.getElementById('proj-due-input').value || null;
    DB.createProject({ name, panel: this.state.panel, priority, color, dueDate });
    this.closeModal();
    this.renderSidebar();
    this.renderMain();
  },

  deleteProject(id) {
    if (!confirm('Delete project and all its tasks?')) return;
    DB.getTasks().filter(t => t.projectId === id).forEach(t => DB.deleteTask(t.id));
    DB.deleteProject(id);
    this.state.activeProjectId = null;
    this.renderSidebar();
    this.renderMain();
  },

  // ── Subtasks ──────────────────────────────────────────────────────────────
  addSubtask(taskId) {
    const input = document.getElementById('new-subtask-input');
    const title = input?.value?.trim();
    if (!title) return;
    const task = DB.getTasks().find(t => t.id === taskId);
    if (!task) return;
    task.subtasks.push({ id: DB.uuid(), title, completed: false });
    DB.saveTask(task);
    input.value = '';
    this.refreshDetail();
  },

  toggleSubtask(taskId, subtaskId, e) {
    e && e.stopPropagation();
    const task = DB.getTasks().find(t => t.id === taskId);
    const sub = task?.subtasks.find(s => s.id === subtaskId);
    if (!sub) return;
    sub.completed = !sub.completed;
    DB.saveTask(task);
    this.refreshDetail();
    this.renderMain();
  },

  deleteSubtask(taskId, subtaskId) {
    const task = DB.getTasks().find(t => t.id === taskId);
    if (!task) return;
    task.subtasks = task.subtasks.filter(s => s.id !== subtaskId);
    DB.saveTask(task);
    this.refreshDetail();
  },

  // ── Comments ──────────────────────────────────────────────────────────────
  addComment(taskId) {
    const input = document.getElementById('comment-input');
    const text = input?.value?.trim();
    if (!text) return;
    const task = DB.getTasks().find(t => t.id === taskId);
    if (!task) return;
    const settings = DB.getSettings();
    task.comments.push({ id: DB.uuid(), author: settings.name || 'Me', text, createdAt: DB.now() });
    DB.saveTask(task);
    input.value = '';
    this.refreshDetail();
  },

  // ── Timer ─────────────────────────────────────────────────────────────────
  startTimer(taskId) {
    if (this.state.timerRunning) return;
    this.state.timerRunning = true;
    this.state.timerInterval = setInterval(() => {
      this.state.timerSeconds++;
      const task = DB.getTasks().find(t => t.id === taskId);
      if (task) { task.timeLogged = (task.timeLogged || 0) + (1/60); DB.saveTask(task); }
      const el = document.getElementById('timer-display');
      if (el) el.textContent = this.formatTime(this.state.timerSeconds);
    }, 1000);
    document.getElementById('timer-start-btn')?.setAttribute('disabled', 'true');
    document.getElementById('timer-stop-btn')?.removeAttribute('disabled');
  },

  stopTimer(taskId) {
    clearInterval(this.state.timerInterval);
    this.state.timerRunning = false;
    this.state.timerSeconds = 0;
    document.getElementById('timer-start-btn')?.removeAttribute('disabled');
    this.refreshDetail();
  },

  formatTime(s) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  },

  formatMins(mins) {
    if (!mins) return '—';
    const h = Math.floor(mins / 60), m = Math.round(mins % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  },

  // ── Focus Mode ────────────────────────────────────────────────────────────
  openFocusMode(taskId) {
    const tasks = DB.getTasks().filter(t => t.status !== 'completed');
    const task = taskId ? tasks.find(t => t.id === taskId) : tasks.sort((a,b) => b.priorityScore - a.priorityScore)[0];
    if (!task) { this.toast('No active tasks'); return; }
    this.state.focusTaskId = task.id;
    this.state.pomodoroSecondsLeft = 25 * 60;
    this.state.pomodoroPhase = 'work';
    document.getElementById('focus-overlay').classList.add('open');
    document.getElementById('focus-overlay').innerHTML = Views.focusMode(task);
    this.startPomodoroTimer();
  },

  closeFocusMode() {
    clearInterval(this.state.pomInterval);
    document.getElementById('focus-overlay').classList.remove('open');
  },

  startPomodoroTimer() {
    clearInterval(this.state.pomInterval);
    this.state.pomInterval = setInterval(() => {
      this.state.pomodoroSecondsLeft--;
      this.updatePomodoroDisplay();
      if (this.state.pomodoroSecondsLeft <= 0) {
        clearInterval(this.state.pomInterval);
        const task = DB.getTasks().find(t => t.id === this.state.focusTaskId);
        if (this.state.pomodoroPhase === 'work') {
          if (task) { task.pomodoroCount = (task.pomodoroCount || 0) + 1; DB.saveTask(task); }
          this.state.pomodoroPhase = 'break';
          this.state.pomodoroSecondsLeft = 5 * 60;
          this.toast('🍅 Pomodoro done! Take a 5-min break.');
        } else {
          this.state.pomodoroPhase = 'work';
          this.state.pomodoroSecondsLeft = 25 * 60;
          this.toast('Break over — back to work!');
        }
        this.startPomodoroTimer();
        if (task) document.getElementById('focus-overlay').innerHTML = Views.focusMode(task);
      }
    }, 1000);
  },

  updatePomodoroDisplay() {
    const s = this.state.pomodoroSecondsLeft;
    const m = Math.floor(s / 60), sec = s % 60;
    const timeStr = `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    const el = document.getElementById('focus-time-text');
    if (el) el.textContent = timeStr;
    const total = this.state.pomodoroPhase === 'work' ? 25 * 60 : 5 * 60;
    const pct = 1 - (s / total);
    const r = 88, circ = 2 * Math.PI * r;
    const fill = document.getElementById('focus-timer-fill');
    if (fill) { fill.style.strokeDasharray = circ; fill.style.strokeDashoffset = circ * (1 - pct); }
  },

  pausePomodoro() { clearInterval(this.state.pomInterval); this.state.pomInterval = null; },
  resumePomodoro() { if (!this.state.pomInterval) this.startPomodoroTimer(); },
  skipPomodoro() { this.state.pomodoroSecondsLeft = 0; },

  // ── Quick Capture ─────────────────────────────────────────────────────────
  openCapture() {
    document.getElementById('capture-overlay').classList.add('open');
    document.getElementById('capture-input')?.focus();
  },
  closeCapture() { document.getElementById('capture-overlay').classList.remove('open'); },
  submitCapture(e) {
    if (e.key !== 'Enter' && e.type !== 'click') return;
    const input = document.getElementById('capture-input');
    const title = input?.value?.trim();
    if (!title) { this.closeCapture(); return; }
    DB.createTask({ title, panel: this.state.panel, isInbox: true, status: 'not-ready' });
    input.value = '';
    this.closeCapture();
    this.renderSidebar();
    this.toast('Captured to inbox ✓');
  },

  // ── Brain Dump ────────────────────────────────────────────────────────────
  parseBrainDump() {
    const text = document.getElementById('brain-dump-area')?.value || '';
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const preview = document.getElementById('dump-preview');
    if (preview) {
      preview.innerHTML = lines.map((l, i) => `
        <div class="dump-task-preview">
          <div class="task-check"></div>
          <span style="flex:1">${this.esc(l)}</span>
          <span style="font-size:10px;color:var(--text-3)">#${i+1}</span>
        </div>`).join('');
    }
  },

  saveBrainDump() {
    const text = document.getElementById('brain-dump-area')?.value || '';
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    lines.forEach(title => DB.createTask({ title, panel: this.state.panel, isInbox: true, status: 'not-ready' }));
    document.getElementById('brain-dump-area').value = '';
    document.getElementById('dump-preview').innerHTML = '';
    this.renderSidebar();
    this.toast(`${lines.length} tasks captured to inbox ✓`);
  },

  // ── Sorting / Filtering ───────────────────────────────────────────────────
  setSortBy(field) {
    if (this.state.sortBy === field) this.state.sortDir = this.state.sortDir === 'asc' ? 'desc' : 'asc';
    else { this.state.sortBy = field; this.state.sortDir = field === 'priority' ? 'desc' : 'asc'; }
    this.renderMain();
  },

  sortTasks(tasks) {
    const priorityOrder = { highest: 4, high: 3, medium: 2, low: 1 };
    const statusOrder = { delayed: 6, 'in-progress': 5, ready: 4, 'not-ready': 3, 'on-hold': 2, completed: 1 };
    const sorted = [...tasks].sort((a, b) => {
      let va, vb;
      if (this.state.sortBy === 'priority') { va = a.priorityScore; vb = b.priorityScore; }
      else if (this.state.sortBy === 'status') { va = statusOrder[a.status]||0; vb = statusOrder[b.status]||0; }
      else if (this.state.sortBy === 'deadline') { va = a.dueDate || '9999'; vb = b.dueDate || '9999'; }
      else if (this.state.sortBy === 'title') { va = a.title.toLowerCase(); vb = b.title.toLowerCase(); }
      else { va = a.priorityScore; vb = b.priorityScore; }
      if (va < vb) return this.state.sortDir === 'asc' ? -1 : 1;
      if (va > vb) return this.state.sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  },

  // ── Calendar Actions ──────────────────────────────────────────────────────
  calPrev() {
    const d = new Date(this.state.calDate);
    if (this.state.calView === 'month') d.setMonth(d.getMonth() - 1);
    else if (this.state.calView === 'week') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    this.state.calDate = d;
    this.renderMain();
  },
  calNext() {
    const d = new Date(this.state.calDate);
    if (this.state.calView === 'month') d.setMonth(d.getMonth() + 1);
    else if (this.state.calView === 'week') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    this.state.calDate = d;
    this.renderMain();
  },
  calToday() { this.state.calDate = new Date(); this.renderMain(); },
  setCalView(v) { this.state.calView = v; this.renderMain(); },

  // ── Notifications ─────────────────────────────────────────────────────────
  async requestNotifications() {
    if (!('Notification' in window)) { this.toast('Notifications not supported'); return; }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      const settings = DB.getSettings();
      settings.notificationsEnabled = true;
      DB.saveSettings(settings);
      this.scheduleNotificationTimers();
      this.toast('Notifications enabled ✓');
      this.renderMain();
    }
  },

  scheduleNotificationTimers() {
    const settings = DB.getSettings();
    if (!settings.notificationsEnabled || Notification.permission !== 'granted') return;
    settings.notificationTimes.forEach(time => {
      const [h, m] = time.split(':').map(Number);
      const now = new Date();
      const next = new Date(); next.setHours(h, m, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      const ms = next - now;
      setTimeout(() => {
        this.fireNotification(time);
        setInterval(() => this.fireNotification(time), 24 * 60 * 60 * 1000);
      }, ms);
    });
  },

  fireNotification(time) {
    const tasks = DB.getTasks().filter(t => t.status !== 'completed');
    const delayed = tasks.filter(t => t.status === 'delayed').length;
    const today = tasks.filter(t => t.tags.includes('today')).length;
    const bodyMap = { '09:00': `Good morning! You have ${today} tasks for today.`, '13:00': `Midday check-in — ${delayed} delayed task${delayed!==1?'s':''}.`, '17:00': `End of day coming — wrap up what you can.`, '22:00': `Planning for tomorrow? ${tasks.length} tasks still open.` };
    new Notification('FlowTask', { body: bodyMap[time] || `You have ${tasks.length} open tasks.`, icon: '/icons/icon-192.png', tag: `flowtask-${time}` });
  },

  // ── Morning Ritual Check ──────────────────────────────────────────────────
  checkMorningRitual() {
    const plan = DB.getDailyPlan(DB.today());
    if (!plan.morningDone) {
      const hour = new Date().getHours();
      if (hour >= 7 && hour <= 11) {
        setTimeout(() => {
          if (this.state.view === 'dashboard') this.showRitualPrompt('morning');
        }, 1500);
      }
    }
  },

  showRitualPrompt(type) {
    const banner = document.createElement('div');
    banner.className = 'notif-banner';
    banner.innerHTML = `<i class="ti ti-sunrise" style="font-size:16px"></i> <span>Time for your morning planning ritual</span> <button class="btn btn-sm" style="margin-left:auto" onclick="App.navigate('planning')">Start planning →</button> <button class="btn btn-ghost btn-sm btn-icon" onclick="this.parentElement.remove()"><i class="ti ti-x"></i></button>`;
    document.getElementById('main-area').prepend(banner);
  },

  // ── ClickUp Integration ───────────────────────────────────────────────────
  async syncClickUp() {
    const settings = DB.getSettings();
    if (!settings.clickupToken) { this.toast('Add ClickUp API token in Settings first'); return; }
    this.toast('Syncing with ClickUp...');
    try {
      // Get workspaces/teams
      const resp = await fetch('https://api.clickup.com/api/v2/team', {
        headers: { 'Authorization': settings.clickupToken }
      });
      if (!resp.ok) throw new Error('Invalid token');
      const data = await resp.json();
      const teams = data.teams || [];
      if (!teams.length) { this.toast('No ClickUp workspaces found'); return; }
      const teamId = settings.clickupWorkspaceId || teams[0].id;

      // Get spaces
      const spacesResp = await fetch(`https://api.clickup.com/api/v2/team/${teamId}/space`, { headers: { 'Authorization': settings.clickupToken } });
      const spacesData = await spacesResp.json();
      const spaces = spacesData.spaces || [];

      let imported = 0;
      for (const space of spaces.slice(0, 3)) {
        const listResp = await fetch(`https://api.clickup.com/api/v2/space/${space.id}/list`, { headers: { 'Authorization': settings.clickupToken } });
        const listData = await listResp.json();
        for (const list of (listData.lists || []).slice(0, 5)) {
          const taskResp = await fetch(`https://api.clickup.com/api/v2/list/${list.id}/task?include_closed=false`, { headers: { 'Authorization': settings.clickupToken } });
          const taskData = await taskResp.json();
          for (const ct of (taskData.tasks || [])) {
            const existing = DB.getTasks().find(t => t.clickupId === ct.id);
            if (!existing) {
              const priorityMap = { urgent: 'highest', high: 'high', normal: 'medium', low: 'low' };
              DB.createTask({
                title: ct.name, description: ct.description || '',
                panel: 'work', clickupId: ct.id, status: 'not-ready',
                priority: priorityMap[ct.priority?.priority] || 'medium',
                dueDate: ct.due_date ? new Date(parseInt(ct.due_date)).toISOString().split('T')[0] : null,
                assignee: ct.assignees?.[0]?.username || '',
              });
              imported++;
            }
          }
        }
      }
      const s = DB.getSettings(); s.lastSync = DB.now(); DB.saveSettings(s);
      this.toast(`ClickUp sync done — ${imported} tasks imported`);
      this.renderMain(); this.renderSidebar();
    } catch(err) {
      this.toast(`ClickUp error: ${err.message}`);
    }
  },

  async pushTaskToClickUp(taskId) {
    const settings = DB.getSettings();
    if (!settings.clickupToken) { this.toast('Add ClickUp API token in Settings'); return; }
    const task = DB.getTasks().find(t => t.id === taskId);
    if (!task) return;
    this.toast('Pushing to ClickUp...');
    try {
      const listId = settings.clickupDefaultListId;
      if (!listId) { this.toast('Set default ClickUp list in Settings'); return; }
      const body = { name: task.title, description: task.description, due_date: task.dueDate ? new Date(task.dueDate).getTime() : undefined, priority: { highest:1,high:2,medium:3,low:4 }[task.priority] };
      const resp = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task`, { method: 'POST', headers: { 'Authorization': settings.clickupToken, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await resp.json();
      task.clickupId = data.id;
      DB.saveTask(task);
      this.toast('Pushed to ClickUp ✓');
      this.refreshDetail();
    } catch(e) { this.toast('ClickUp push failed'); }
  },

  // ── Global Keys ───────────────────────────────────────────────────────────
  bindGlobalKeys() {
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === ' ' || e.key === 'q') { e.preventDefault(); this.openCapture(); }
      if (e.key === 'Escape') { this.closeCapture(); this.closeFocusMode(); this.closeModal(); this.closeDetail(); }
      if (e.key === 'n' && !e.metaKey) this.openNewProject();
      if (e.key === 'f') this.openFocusMode();
      if (e.key === '1') this.navigate('dashboard');
      if (e.key === '2') this.navigate('all-tasks');
      if (e.key === '3') this.navigate('today');
      if (e.key === '4') this.navigate('calendar');
      if (e.key === '5') this.navigate('insights');
    });
  },

  // ── Modal ─────────────────────────────────────────────────────────────────
  closeModal() { document.getElementById('modal-overlay').classList.remove('open'); },

  // ── Theme ─────────────────────────────────────────────────────────────────
  toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', isDark ? 'light' : 'dark');
    const s = DB.getSettings(); s.theme = isDark ? 'light' : 'dark'; DB.saveSettings(s);
  },

  // ── Planning ──────────────────────────────────────────────────────────────
  saveDailyPlanField(field, value) {
    const plan = DB.getDailyPlan(DB.today());
    plan[field] = value;
    if (field === 'morningDone' || field === 'eveningDone') plan[field] = true;
    DB.saveDailyPlan(plan);
    if (field === 'morningDone' || field === 'eveningDone') { this.renderMain(); this.toast('Saved ✓'); }
  },

  saveWeeklyReview() {
    const weekKey = this.getWeekKey();
    const review = DB.getWeeklyReview(weekKey);
    review.wins = document.getElementById('wr-wins')?.value || '';
    review.slippage = document.getElementById('wr-slippage')?.value || '';
    review.nextWeekTop5 = document.getElementById('wr-next')?.value || '';
    review.done = true;
    DB.saveWeeklyReview(review);
    this.toast('Weekly review saved ✓');
    this.renderMain();
  },

  getWeekKey() {
    const d = new Date(); const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    return d.toISOString().split('T')[0];
  },

  setMIT(pos, taskId) {
    const plan = DB.getDailyPlan(DB.today());
    const mits = [...(plan.mit || [])];
    while (mits.length < 3) mits.push(null);
    mits[pos] = taskId;
    plan.mit = mits;
    DB.saveDailyPlan(plan);
    this.renderMain();
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  saveSettings() {
    const s = DB.getSettings();
    s.name = document.getElementById('s-name')?.value || s.name;
    s.clickupToken = document.getElementById('s-clickup-token')?.value || '';
    s.clickupWorkspaceId = document.getElementById('s-clickup-ws')?.value || '';
    s.clickupDefaultListId = document.getElementById('s-clickup-list')?.value || '';
    DB.saveSettings(s);
    this.toast('Settings saved ✓');
    this.renderSidebar();
  },

  // ── Goals ─────────────────────────────────────────────────────────────────
  saveGoal() {
    const title = document.getElementById('goal-title-input')?.value?.trim();
    if (!title) return;
    DB.createGoal({ title, quarter: document.getElementById('goal-quarter-input')?.value || '', panel: this.state.panel, targetDate: document.getElementById('goal-date-input')?.value || null });
    this.closeModal();
    this.renderMain();
    this.toast('Goal saved ✓');
  },

  // ── Commitments ───────────────────────────────────────────────────────────
  saveCommitment() {
    const title = document.getElementById('c-title')?.value?.trim();
    const committedTo = document.getElementById('c-to')?.value?.trim();
    const dueDate = document.getElementById('c-due')?.value || null;
    if (!title) return;
    DB.createCommitment({ title, committedTo, dueDate, panel: this.state.panel });
    this.closeModal();
    this.renderMain();
    this.toast('Commitment added ✓');
  },

  // ── Utilities ─────────────────────────────────────────────────────────────
  esc(str) { return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); },

  fmtDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date(); today.setHours(0,0,0,0);
    const diff = Math.round((d - today) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    if (diff < 0) return `${Math.abs(diff)}d overdue`;
    if (diff <= 7) return `${diff}d left`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  },

  priorityColors: { highest: '#F5C4B3', high: '#FAC775', medium: '#B5D4F4', low: '#C0DD97' },
  projectColor(projectId) { return DB.getProjects().find(p => p.id === projectId)?.color || '#888780'; },

  toast(msg) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--text);color:var(--bg);padding:8px 18px;border-radius:20px;font-size:13px;z-index:9999;animation:fadeIn 0.2s';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2800);
  },

  avatarInitials(name) { return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2); },
};

App.toggleMobileMenu = function() {
  const sb = document.getElementById('sidebar');
  if (sb) sb.classList.
// Mobile menu helpers (robust version)
App.toggleMobileMenu = function() {
  const sb = document.getElementById('sidebar');
  const bd = document.getElementById('sidebar-backdrop');
  if (!sb) return;
  const isOpen = sb.classList.toggle('open');
  if (bd) { isOpen ? bd.classList.add('visible') : bd.classList.remove('visible'); }
};
App.closeMobileMenu = function() {
  const sb = document.getElementById('sidebar');
  const bd = document.getElementById('sidebar-backdrop');
  if (sb) sb.classList.remove('open');
  if (bd) bd.classList.remove('visible');
};
