// ─── FlowTask Views ───────────────────────────────────────────────────────

const Views = {

  // ── Helpers ───────────────────────────────────────────────────────────────
  priorityBadge(p) { return `<span class="badge badge-p-${p}">${p.charAt(0).toUpperCase()+p.slice(1)}</span>`; },
  statusBadge(s) {
    const map = { delayed:'s-delayed','in-progress':'s-inprog', ready:'s-ready','not-ready':'s-notready','on-hold':'s-onhold', completed:'s-done' };
    const labels = { delayed:'Delayed','in-progress':'In progress',ready:'Ready','not-ready':'Not ready','on-hold':'On hold',completed:'Completed' };
    return `<span class="badge badge-${map[s]||'s-notready'}">${labels[s]||s}</span>`;
  },
  statusDot(s) { return `<span class="status-dot dot-${s}"></span>`; },
  tagBadges(task) {
    let h = '';
    if (task.isMIT) h += `<span class="tag-mit">★ MIT</span>`;
    if (task.tags.includes('today')) h += `<span class="tag-today">Today</span>`;
    if (task.tags.includes('tomorrow')) h += `<span class="tag-tomorrow">Tomorrow</span>`;
    if (DB.isRisk(task)) h += `<span class="tag-risk">⚠ At risk</span>`;
    return h;
  },
  avatar(name, size='') { return `<div class="avatar ${size}">${App.avatarInitials(name)}</div>`; },
  dateHtml(task) {
    if (!task.dueDate) return '';
    const fmt = App.fmtDate(task.dueDate);
    const isOverdue = task.status !== 'completed' && task.dueDate < DB.today();
    const time = task.dueTime ? ` · ${task.dueTime}` : '';
    return `<span class="task-date${isOverdue?' overdue':''}"><i class="ti ti-calendar-event" style="font-size:10px" aria-hidden="true"></i> ${fmt}${time}</span>`;
  },
  statusOrder: ['delayed','in-progress','ready','not-ready','on-hold','completed'],
  statusLabels: { delayed:'Delayed','in-progress':'In progress',ready:'Ready','not-ready':'Not ready','on-hold':'On hold',completed:'Completed' },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  dashboard() {
    const projects = DB.getProjects().filter(p => p.panel === App.state.panel);
    const activeId = App.state.activeProjectId;
    const displayProjects = activeId ? projects.filter(p => p.id === activeId) : projects;

    if (!displayProjects.length) {
      return `<div class="topbar"><div class="topbar-left"><span class="topbar-title">${App.state.panel === 'work' ? 'Work' : 'Personal'} workspace</span></div><div class="topbar-right"><button class="btn btn-primary" onclick="App.openNewProject()"><i class="ti ti-plus"></i> New project</button></div></div><div class="view-content"><div class="empty-state"><div class="empty-icon"><i class="ti ti-layout-board"></i></div><div class="empty-title">No projects yet</div><div class="empty-sub">Create your first project to get started</div><button class="btn btn-primary" style="margin-top:16px" onclick="App.openNewProject()"><i class="ti ti-plus"></i> New project</button></div></div>`;
    }

    const allTasks = DB.getTasks();
    const delayedCount = allTasks.filter(t => t.status === 'delayed' && projects.some(p => p.id === t.projectId)).length;

    return `
      <div class="topbar">
        <div class="topbar-left">
          <span class="topbar-title">${App.state.panel === 'work' ? 'Work' : 'Personal'} workspace</span>
          ${delayedCount ? `<span class="badge badge-s-delayed">${delayedCount} delayed</span>` : ''}
        </div>
        <div class="topbar-right">
          <button class="btn" onclick="App.syncClickUp()"><i class="ti ti-refresh"></i> ClickUp sync</button>
          <button class="btn" onclick="App.openCapture()"><i class="ti ti-bolt"></i> Quick add</button>
          <button class="btn btn-primary" onclick="App.openNewProject()"><i class="ti ti-plus"></i> New project</button>
        </div>
      </div>
      <div class="view-content">
        ${displayProjects.map(p => this.projectCard(p, allTasks)).join('')}
      </div>`;
  },

  projectCard(proj, allTasks) {
    const tasks = allTasks.filter(t => t.projectId === proj.id);
    const delayed = tasks.filter(t => t.status === 'delayed').length;
    const completed = tasks.filter(t => t.status === 'completed').length;

    return `
      <div class="project-card" id="proj-${proj.id}">
        <div class="project-header" onclick="App.toggleProject('${proj.id}')">
          <div class="proj-meta">
            <i class="ti ti-chevron-down proj-chevron ${proj.collapsed?'collapsed':''}" aria-hidden="true"></i>
            <span class="proj-color" style="background:${proj.color}"></span>
            <span class="proj-name">${App.esc(proj.name)}</span>
            ${this.priorityBadge(proj.priority)}
          </div>
          <div class="proj-stats">
            <span class="proj-stat">${tasks.length} tasks</span>
            ${delayed ? `<span class="proj-stat warn">${delayed} delayed</span>` : ''}
            ${proj.dueDate ? `<span class="proj-stat">Due ${App.fmtDate(proj.dueDate)}</span>` : ''}
            <button class="btn btn-ghost btn-icon btn-sm" onclick="event.stopPropagation();App.deleteProject('${proj.id}')" title="Delete project"><i class="ti ti-dots"></i></button>
          </div>
        </div>
        ${proj.collapsed ? '' : `<div class="project-body">${this.statusOrder.map(s => this.statusSection(proj, s, tasks.filter(t => t.status === s))).join('')}</div>`}
      </div>`;
  },

  statusSection(proj, status, tasks) {
    const collapsed = proj.sectionCollapsed?.[status] ?? (status === 'completed' || status === 'not-ready' || status === 'on-hold');
    const dotClass = status.replace(/ /g,'-');
    const label = this.statusLabels[status];
    const dotColors = { delayed:'var(--s-delayed-dot)','in-progress':'var(--s-inprog-dot)',ready:'var(--s-ready-dot)','not-ready':'var(--s-notready-dot)','on-hold':'var(--s-onhold-dot)',completed:'var(--s-done-dot)' };
    const labelColors = { delayed:'color:var(--s-delayed-fg)' };

    return `
      <div class="status-section">
        <div class="status-label ${collapsed?'collapsed':''}" onclick="App.toggleSection('${proj.id}','${status}')">
          <i class="ti ti-chevron-down status-chev ${collapsed?'collapsed':''}" aria-hidden="true"></i>
          <span class="status-dot" style="background:${dotColors[status]||'var(--text-3)'}"></span>
          <span style="${labelColors[status]||''}">${label}</span>
          <span class="status-count">${tasks.length}</span>
          <button class="btn btn-ghost btn-icon btn-sm status-add-btn" onclick="event.stopPropagation();App.showQuickAdd('${proj.id}','${status}')" title="Add task"><i class="ti ti-plus"></i></button>
        </div>
        ${collapsed ? '' : `
          <div class="section-body">
            ${tasks.map(t => this.taskRow(t)).join('')}
            <div class="quick-add-inline" id="qa-${proj.id}-${status}">
              <div class="task-check"></div>
              <input class="quick-add-input" id="qa-input-${proj.id}-${status}" placeholder="Task name, press Enter" onkeydown="App.submitQuickAdd('${proj.id}','${status}',event)" />
              <button class="btn btn-sm" onclick="App.submitQuickAdd('${proj.id}','${status}',event)">Add</button>
              <button class="btn btn-ghost btn-sm btn-icon" onclick="document.getElementById('qa-${proj.id}-${status}').classList.remove('open')"><i class="ti ti-x"></i></button>
            </div>
            <div class="add-task-row" onclick="App.showQuickAdd('${proj.id}','${status}')"><i class="ti ti-plus" style="font-size:12px"></i> Add task</div>
          </div>`}
      </div>`;
  },

  taskRow(task) {
    const isDelayed = task.status === 'delayed';
    const isDone = task.status === 'completed';
    const isBlocked = App.isBlocked(task);
    const blockerCount = (task.dependencies || []).filter(id => {
      const dep = DB.getTasks().find(t => t.id === id);
      return dep && dep.status !== 'completed';
    }).length;
    return `
      <div class="task-row${isDone?' completed':''}" onclick="App.openDetail('${task.id}')">
        <div class="task-check${isDone?' done':isDelayed?' delayed':''}" onclick="App.toggleTaskComplete('${task.id}',event)" title="Mark complete">
          ${isDone ? '<i class="ti ti-check" style="font-size:9px;color:#fff"></i>' : ''}
        </div>
        <span class="task-name">${App.esc(task.title)}</span>
        <div class="task-tags">
          ${isBlocked ? `<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:600;padding:2px 7px;border-radius:10px;background:#F1EFE8;color:#5F5E5A"><i class="ti ti-lock" style="font-size:10px"></i> Blocked${blockerCount>1?' ('+blockerCount+')':''}</span>` : ''}
          ${this.tagBadges(task)}
          ${this.priorityBadge(task.priority)}
        </div>
        <div class="task-meta">
          ${this.dateHtml(task)}
          ${task.assignee ? this.avatar(task.assignee, 'avatar-sm') : ''}
        </div>
      </div>`;
  },

  // ── All Tasks ─────────────────────────────────────────────────────────────
  allTasks() {
    const allTasks = DB.getTasks();
    let tasks = this.applyFilters(allTasks);
    tasks = App.sortTasks(tasks);

    const sortIcon = (field) => App.state.sortBy === field ? (App.state.sortDir === 'asc' ? ' ↑' : ' ↓') : '';

    return `
      <div class="topbar">
        <div class="topbar-left">
          <span class="topbar-title">All tasks</span>
          <span style="font-size:12px;color:var(--text-3);background:var(--bg-2);padding:2px 8px;border-radius:8px">${tasks.length}</span>
        </div>
        <div class="topbar-right">
          <input type="search" placeholder="Search tasks…" value="${App.esc(App.state.searchQuery)}" oninput="App.state.searchQuery=this.value;App.renderMain()" style="padding:5px 10px;border:0.5px solid var(--border-mid);border-radius:6px;font-size:12px;background:var(--bg);color:var(--text);width:180px">
        </div>
      </div>
      <div class="filter-bar">
        ${['all','personal','work'].map(v => `<span class="filter-chip ${App.state.filterPanel===v?'active':''}" onclick="App.state.filterPanel='${v}';App.renderMain()">${v.charAt(0).toUpperCase()+v.slice(1)}</span>`).join('')}
        <span class="filter-sep"></span>
        ${['all','delayed','in-progress','ready','not-ready','on-hold','completed'].map(v => `<span class="filter-chip ${App.state.filterStatus===v?'active':''}" onclick="App.state.filterStatus='${v}';App.renderMain()">${this.statusLabels[v]||'All'}</span>`).join('')}
        <span class="filter-sep"></span>
        <span class="filter-chip" onclick="App.state.filterStatus='today-tag';App.renderMain()">Today</span>
        <span class="filter-chip" onclick="App.state.filterStatus='tomorrow-tag';App.renderMain()">Tomorrow</span>
        <span class="filter-chip" onclick="App.state.filterStatus='mit';App.renderMain()">MIT</span>
      </div>
      <div class="view-content" style="padding:0">
        <table class="tasks-table">
          <thead><tr>
            <th onclick="App.setSortBy('title')" class="${App.state.sortBy==='title'?'sorted':''}">Task${sortIcon('title')}</th>
            <th onclick="App.setSortBy('priority')" class="${App.state.sortBy==='priority'?'sorted':''}">Priority${sortIcon('priority')}</th>
            <th onclick="App.setSortBy('status')" class="${App.state.sortBy==='status'?'sorted':''}">Status${sortIcon('status')}</th>
            <th onclick="App.setSortBy('deadline')" class="${App.state.sortBy==='deadline'?'sorted':''}">Deadline${sortIcon('deadline')}</th>
            <th>Assigned</th>
            <th>Project</th>
          </tr></thead>
          <tbody>
            ${tasks.length ? tasks.map(t => {
              const proj = DB.getProjects().find(p => p.id === t.projectId);
              const isOverdue = t.dueDate && t.dueDate < DB.today() && t.status !== 'completed';
              return `
                <tr class="${t.status==='completed'?'completed':''}" onclick="App.openDetail('${t.id}')" style="cursor:pointer">
                  <td>
                    <div style="display:flex;align-items:center;gap:8px">
                      <div class="task-check${t.status==='completed'?' done':t.status==='delayed'?' delayed':''}" onclick="App.toggleTaskComplete('${t.id}',event)" style="flex-shrink:0">${t.status==='completed'?'<i class="ti ti-check" style="font-size:9px;color:#fff"></i>':''}</div>
                      <span class="task-name" style="white-space:normal">${App.esc(t.title)}</span>
                      ${this.tagBadges(t)}
                    </div>
                  </td>
                  <td>${this.priorityBadge(t.priority)}</td>
                  <td>${this.statusBadge(t.status)}</td>
                  <td><span class="${isOverdue?'task-date overdue':'task-date'}">${t.dueDate?App.fmtDate(t.dueDate)+(t.dueTime?' · '+t.dueTime:''):'—'}</span></td>
                  <td>${t.assignee ? `<div style="display:flex;align-items:center;gap:5px">${this.avatar(t.assignee,'avatar-sm')}<span style="font-size:12px">${App.esc(t.assignee)}</span></div>` : '<span style="color:var(--text-3)">—</span>'}</td>
                  <td>${proj ? `<div style="display:flex;align-items:center;gap:5px"><span style="width:8px;height:8px;border-radius:50%;background:${proj.color};flex-shrink:0"></span><span style="font-size:11px;color:var(--text-2)">${App.esc(proj.name)}</span></div>` : '<span style="color:var(--text-3)">—</span>'}</td>
                </tr>`;
            }).join('') : `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon"><i class="ti ti-checklist"></i></div><div class="empty-title">No tasks found</div></div></td></tr>`}
          </tbody>
        </table>
      </div>`;
  },

  applyFilters(tasks) {
    let t = tasks;
    if (App.state.filterPanel !== 'all') t = t.filter(x => x.panel === App.state.filterPanel);
    if (App.state.filterStatus === 'today-tag') t = t.filter(x => x.tags.includes('today'));
    else if (App.state.filterStatus === 'tomorrow-tag') t = t.filter(x => x.tags.includes('tomorrow'));
    else if (App.state.filterStatus === 'mit') t = t.filter(x => x.isMIT);
    else if (App.state.filterStatus !== 'all') t = t.filter(x => x.status === App.state.filterStatus);
    if (App.state.searchQuery) { const q = App.state.searchQuery.toLowerCase(); t = t.filter(x => x.title.toLowerCase().includes(q) || x.description?.toLowerCase().includes(q)); }
    return t;
  },

  // ── Today ─────────────────────────────────────────────────────────────────
  today() {
    const today = DB.today();
    const allTasks = DB.getTasks();
    const todayTasks = allTasks.filter(t => t.tags.includes('today') || t.dueDate === today).filter(t => t.status !== 'completed' || t.completedAt?.startsWith(today));
    const plan = DB.getDailyPlan(today);

    const total = todayTasks.length;
    const done = todayTasks.filter(t => t.status === 'completed').length;
    const delayed = todayTasks.filter(t => t.status === 'delayed').length;
    const inprog = todayTasks.filter(t => t.status === 'in-progress').length;
    const pct = total ? Math.round((done/total)*100) : 0;

    const mitTasks = allTasks.filter(t => plan.mit?.includes(t.id));
    const groupedTasks = {};
    this.statusOrder.forEach(s => { groupedTasks[s] = todayTasks.filter(t => t.status === s); });

    return `
      <div class="topbar">
        <div class="topbar-left">
          <span class="topbar-title">Today's focus</span>
          <span style="font-size:12px;color:var(--text-3)">${new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</span>
        </div>
        <div class="topbar-right">
          <button class="btn" onclick="App.navigate('planning')"><i class="ti ti-sunrise"></i> Morning plan</button>
          <button class="btn btn-primary" onclick="App.openCapture()"><i class="ti ti-plus"></i> Add task</button>
        </div>
      </div>
      <div class="view-content">
        <div class="today-summary">
          <div class="metric-card"><div class="metric-num">${total}</div><div class="metric-label">Total today</div></div>
          <div class="metric-card"><div class="metric-num" style="color:var(--s-delayed-fg)">${delayed}</div><div class="metric-label">Delayed</div></div>
          <div class="metric-card"><div class="metric-num" style="color:var(--s-inprog-fg)">${inprog}</div><div class="metric-label">In progress</div></div>
          <div class="metric-card"><div class="metric-num" style="color:var(--s-done-fg)">${done}</div><div class="metric-label">Completed</div></div>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
          <div class="progress-label">${done} of ${total} completed · ${pct}%</div>
        </div>

        <div class="mit-section">
          <div class="mit-header"><i class="ti ti-star" style="color:#BA7517;font-size:15px"></i> Most Important Tasks (MIT)</div>
          <div class="mit-slots">
            ${[0,1,2].map(i => {
              const mitTask = mitTasks[i];
              return `<div class="mit-slot${mitTask?' filled':''}" onclick="${mitTask?`App.openDetail('${mitTask?.id}')`:`App.openMITPicker(${i})`}">
                <div class="mit-num">${i+1}</div>
                ${mitTask ? `
                  <div class="task-check${mitTask.status==='completed'?' done':''}">
                    ${mitTask.status==='completed'?'<i class="ti ti-check" style="font-size:9px;color:#fff"></i>':''}
                  </div>
                  <span style="flex:1;font-size:13px">${App.esc(mitTask.title)}</span>
                  ${this.priorityBadge(mitTask.priority)}
                  ${this.statusBadge(mitTask.status)}
                ` : `<span>Click to set MIT #${i+1}</span>`}
              </div>`;
            }).join('')}
          </div>
        </div>

        ${this.statusOrder.map(s => {
          const sTasks = groupedTasks[s];
          if (!sTasks.length) return '';
          return `
            <div style="margin-bottom:16px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:12px;font-weight:600;color:var(--text-2)">
                ${this.statusDot(s)} ${this.statusLabels[s]} <span style="font-size:11px;font-weight:400;color:var(--text-3)">${sTasks.length}</span>
              </div>
              <div style="border:0.5px solid var(--border);border-radius:var(--radius-lg);overflow:hidden">
                ${sTasks.map(t => this.taskRow(t)).join('')}
              </div>
            </div>`;
        }).join('')}
      </div>`;
  },

  openMITPicker(pos) {
    const tasks = DB.getTasks().filter(t => t.status !== 'completed').sort((a,b) => b.priorityScore - a.priorityScore);
    const modal = `
      <div class="modal">
        <div class="modal-title">Set MIT #${pos+1}</div>
        <div style="display:flex;flex-direction:column;gap:6px;max-height:400px;overflow-y:auto">
          ${tasks.map(t => `
            <div onclick="App.setMIT(${pos},'${t.id}');App.closeModal()" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:0.5px solid var(--border);border-radius:var(--radius);cursor:pointer">
              ${this.priorityBadge(t.priority)}
              <span style="flex:1;font-size:13px">${App.esc(t.title)}</span>
              ${this.statusBadge(t.status)}
            </div>`).join('')}
        </div>
        <div class="modal-footer"><button class="btn" onclick="App.closeModal()">Cancel</button></div>
      </div>`;
    document.getElementById('modal-overlay').innerHTML = modal;
    document.getElementById('modal-overlay').classList.add('open');
  },

  // ── Tomorrow ──────────────────────────────────────────────────────────────
  tomorrow() {
    const tmrw = new Date(); tmrw.setDate(tmrw.getDate() + 1);
    const tmrwStr = tmrw.toISOString().split('T')[0];
    const tasks = DB.getTasks().filter(t => t.tags.includes('tomorrow') || t.dueDate === tmrwStr);
    return `
      <div class="topbar"><div class="topbar-left"><span class="topbar-title">Tomorrow</span></div></div>
      <div class="view-content">
        ${tasks.length ? `
          <div style="border:0.5px solid var(--border);border-radius:var(--radius-lg);overflow:hidden">
            ${tasks.map(t => this.taskRow(t)).join('')}
          </div>` : `<div class="empty-state"><div class="empty-icon"><i class="ti ti-calendar-due"></i></div><div class="empty-title">Nothing for tomorrow yet</div><div class="empty-sub">Tag tasks as "Tomorrow" or set tomorrow's date</div></div>`}
      </div>`;
  },

  // ── Assigned to Others ────────────────────────────────────────────────────
  assigned() {
    const settings = DB.getSettings();
    const myName = settings.name || 'Sumit';
    const tasks = DB.getTasks().filter(t => t.assignee && t.assignee !== myName && t.status !== 'completed');
    const byPerson = {};
    tasks.forEach(t => { if (!byPerson[t.assignee]) byPerson[t.assignee] = []; byPerson[t.assignee].push(t); });

    return `
      <div class="topbar">
        <div class="topbar-left"><span class="topbar-title">Assigned to others</span><span style="font-size:12px;color:var(--text-3);background:var(--bg-2);padding:2px 8px;border-radius:8px">${tasks.length} tasks</span></div>
      </div>
      <div class="view-content">
        ${Object.keys(byPerson).length ? Object.entries(byPerson).map(([name, personTasks]) => {
          const delayed = personTasks.filter(t => t.status === 'delayed').length;
          return `
            <div class="assignee-section">
              <div class="assignee-header">
                ${this.avatar(name, 'avatar-lg')}
                <div style="flex:1">
                  <div class="assignee-name">${App.esc(name)}</div>
                  <div class="assignee-stats">${personTasks.length} tasks ${delayed ? `· <span style="color:var(--s-delayed-fg)">${delayed} delayed</span>` : '· all on track'}</div>
                </div>
                <button class="nudge-btn" onclick="App.toast('Nudge sent to ${App.esc(name)} ✓')"><i class="ti ti-send"></i> Nudge all</button>
              </div>
              <div style="border:0.5px solid var(--border);border-radius:var(--radius-lg);overflow:hidden">
                ${personTasks.sort((a,b) => b.priorityScore - a.priorityScore).map(t => `
                  <div class="task-row" onclick="App.openDetail('${t.id}')">
                    <div class="task-check${t.status==='delayed'?' delayed':''}"></div>
                    <span class="task-name">${App.esc(t.title)}</span>
                    <div class="task-tags">${this.priorityBadge(t.priority)} ${this.statusBadge(t.status)}</div>
                    <div class="task-meta">${this.dateHtml(t)}</div>
                    <button class="nudge-btn" onclick="event.stopPropagation();App.toast('Nudge sent ✓')"><i class="ti ti-send" style="font-size:11px"></i> Nudge</button>
                  </div>`).join('')}
              </div>
            </div>`;
        }).join('') : `<div class="empty-state"><div class="empty-icon"><i class="ti ti-users"></i></div><div class="empty-title">No tasks assigned to others</div></div>`}
      </div>`;
  },

  // ── Commitments ───────────────────────────────────────────────────────────
  commitments() {
    const commitments = DB.getCommitments();
    const taskCommitments = DB.getTasks().filter(t => t.isCommitment);

    return `
      <div class="topbar">
        <div class="topbar-left"><span class="topbar-title">Commitments</span></div>
        <div class="topbar-right">
          <button class="btn btn-primary" onclick="App.openNewCommitment()"><i class="ti ti-plus"></i> Add commitment</button>
        </div>
      </div>
      <div class="view-content">
        <p style="font-size:13px;color:var(--text-2);margin-bottom:20px">Things you've explicitly promised someone. These are the commitments that protect your reputation.</p>
        ${taskCommitments.length ? `
          <div style="margin-bottom:24px">
            <div style="font-size:12px;font-weight:600;color:var(--text-2);margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">From tasks</div>
            <div style="border:0.5px solid var(--border);border-radius:var(--radius-lg);overflow:hidden">
              ${taskCommitments.map(t => {
                const isOverdue = t.dueDate && t.dueDate < DB.today() && t.status !== 'completed';
                return `
                  <div class="task-row" onclick="App.openDetail('${t.id}')">
                    <div class="task-check${t.status==='completed'?' done':''}"></div>
                    <div style="flex:1;min-width:0">
                      <div class="task-name">${App.esc(t.title)}</div>
                      ${t.committedTo ? `<div style="font-size:11px;color:var(--text-3)">Committed to: ${App.esc(t.committedTo)}</div>` : ''}
                    </div>
                    ${this.priorityBadge(t.priority)}
                    ${this.statusBadge(t.status)}
                    <span class="${isOverdue?'task-date overdue':'task-date'}">${t.dueDate?App.fmtDate(t.dueDate):'No date'}</span>
                  </div>`;
              }).join('')}
            </div>
          </div>` : ''}
        ${commitments.length ? `
          <div>
            <div style="font-size:12px;font-weight:600;color:var(--text-2);margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">Standalone commitments</div>
            ${commitments.map(c => {
              const isOverdue = c.dueDate && c.dueDate < DB.today();
              return `
                <div class="commitment-row">
                  <div class="task-check${c.status==='done'?' done':''}"></div>
                  <div style="flex:1"><div class="commitment-title">${App.esc(c.title)}</div><div class="commitment-to">To: ${App.esc(c.committedTo||'—')}</div></div>
                  <span class="commitment-due${isOverdue?' overdue':''}">${c.dueDate?App.fmtDate(c.dueDate):'—'}</span>
                </div>`;
            }).join('')}
          </div>` : ''}
        ${!commitments.length && !taskCommitments.length ? `<div class="empty-state"><div class="empty-icon"><i class="ti ti-shield-check"></i></div><div class="empty-title">No commitments tracked</div><div class="empty-sub">Add things you've promised others — never let them slip</div></div>` : ''}
      </div>`;
  },

  openNewCommitment() {
    document.getElementById('modal-overlay').innerHTML = `
      <div class="modal">
        <div class="modal-title">New commitment</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div class="field-group"><label class="field-label">What did you commit to?</label><input class="field-input" id="c-title" placeholder="e.g. Send the proposal draft"></div>
          <div class="field-group"><label class="field-label">Committed to (person / team)</label><input class="field-input" id="c-to" placeholder="e.g. Sarah, Product team"></div>
          <div class="field-group"><label class="field-label">By when</label><input class="field-input" type="date" id="c-due"></div>
        </div>
        <div class="modal-footer"><button class="btn" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" onclick="App.saveCommitment()">Save</button></div>
      </div>`;
    document.getElementById('modal-overlay').classList.add('open');
  },

  // ── Inbox ─────────────────────────────────────────────────────────────────
  inbox() {
    const tasks = DB.getTasks().filter(t => t.isInbox);
    return `
      <div class="topbar">
        <div class="topbar-left"><span class="topbar-title">Inbox</span><span style="font-size:12px;color:var(--text-3);background:var(--bg-2);padding:2px 8px;border-radius:8px">${tasks.length}</span></div>
        <div class="topbar-right">
          <button class="btn" onclick="App.openCapture()"><i class="ti ti-bolt"></i> Quick capture</button>
        </div>
      </div>
      <div class="view-content">
        <div style="margin-bottom:20px">
          <div style="font-size:13px;color:var(--text-2);margin-bottom:12px">Brain dump — paste anything on your mind, one item per line:</div>
          <textarea class="brain-dump-area" id="brain-dump-area" placeholder="Write everything on your mind...&#10;One task per line.&#10;&#10;e.g.&#10;Follow up with Sarah about proposal&#10;Review Q3 budget numbers&#10;Book team offsite venue" oninput="App.parseBrainDump()"></textarea>
          <div id="dump-preview" class="brain-dump-preview"></div>
          <div style="display:flex;gap:8px;margin-top:10px">
            <button class="btn btn-primary" onclick="App.saveBrainDump()"><i class="ti ti-inbox"></i> Add all to inbox</button>
            <button class="btn" onclick="document.getElementById('brain-dump-area').value='';document.getElementById('dump-preview').innerHTML=''">Clear</button>
          </div>
        </div>
        ${tasks.length ? `
          <div>
            <div style="font-size:12px;font-weight:600;color:var(--text-2);margin-bottom:8px">Process inbox (${tasks.length} items)</div>
            <div style="border:0.5px solid var(--border);border-radius:var(--radius-lg);overflow:hidden">
              ${tasks.map(t => `
                <div class="task-row" onclick="App.openDetail('${t.id}')">
                  <div class="task-check"></div>
                  <span class="task-name">${App.esc(t.title)}</span>
                  <button class="btn btn-sm" onclick="event.stopPropagation();App.processInboxTask('${t.id}')">Process →</button>
                </div>`).join('')}
            </div>
          </div>` : `<div class="empty-state"><div class="empty-icon"><i class="ti ti-inbox"></i></div><div class="empty-title">Inbox is clear</div><div class="empty-sub">Use brain dump above to capture anything on your mind</div></div>`}
      </div>`;
  },

  processInboxTask(id) {
    const task = DB.getTasks().find(t => t.id === id);
    if (!task) return;
    task.isInbox = false;
    DB.saveTask(task);
    App.openDetail(id);
    App.renderMain();
    App.renderSidebar();
  },

  // ── Calendar ──────────────────────────────────────────────────────────────
  calendar() {
    const header = `
      <div class="cal-topbar">
        <button class="cal-nav-btn" onclick="App.calPrev()"><i class="ti ti-chevron-left"></i></button>
        <span class="cal-title" id="cal-title"></span>
        <button class="cal-nav-btn" onclick="App.calNext()"><i class="ti ti-chevron-right"></i></button>
        <button class="cal-nav-btn" onclick="App.calToday()">Today</button>
        <div style="margin-left:auto;display:flex;gap:16px;align-items:center">
          <div style="display:flex;gap:6px;font-size:11px;color:var(--text-3)">
            ${DB.getProjects().slice(0,4).map(p => `<span style="display:flex;align-items:center;gap:3px"><span style="width:8px;height:8px;border-radius:50%;background:${p.color}"></span>${App.esc(p.name)}</span>`).join('')}
          </div>
          <div class="view-mode-tabs">
            <button class="vm-btn ${App.state.calView==='month'?'active':''}" onclick="App.setCalView('month')">Month</button>
            <button class="vm-btn ${App.state.calView==='week'?'active':''}" onclick="App.setCalView('week')">Week</button>
            <button class="vm-btn ${App.state.calView==='day'?'active':''}" onclick="App.setCalView('day')">Day</button>
          </div>
        </div>
      </div>`;

    let calBody = '';
    if (App.state.calView === 'month') calBody = this.calMonth();
    else if (App.state.calView === 'week') calBody = this.calWeek();
    else calBody = this.calDay();

    return `${header}<div class="view-content" style="padding:0;overflow:auto;display:flex;flex-direction:column">${calBody}</div>`;
  },

  calMonth() {
    const d = new Date(App.state.calDate);
    const year = d.getFullYear(), month = d.getMonth();
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    setTimeout(() => {
      const el = document.getElementById('cal-title');
      if (el) el.textContent = `${monthNames[month]} ${year}`;
    }, 0);

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startDow = firstDay.getDay() || 7; // Mon=1
    const cells = [];

    // Prev month fill
    for (let i = startDow - 1; i > 0; i--) {
      const pd = new Date(year, month, 1 - i);
      cells.push({ date: pd, otherMonth: true });
    }
    for (let i = 1; i <= lastDay.getDate(); i++) cells.push({ date: new Date(year, month, i), otherMonth: false });
    while (cells.length % 7 !== 0) { const nd = new Date(year, month + 1, cells.length - lastDay.getDate()); cells.push({ date: nd, otherMonth: true }); }

    const tasks = DB.getTasks().filter(t => t.dueDate);
    const workload = DB.getWorkloadByDay();
    const todayStr = DB.today();

    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    return `
      <div class="cal-grid">
        ${days.map(d => `<div class="cal-day-header">${d}</div>`).join('')}
        ${cells.map(cell => {
          const dateStr = cell.date.toISOString().split('T')[0];
          const dayTasks = tasks.filter(t => t.dueDate === dateStr).slice(0, 4);
          const more = tasks.filter(t => t.dueDate === dateStr).length - 3;
          const wl = workload[dateStr];
          const wlClass = wl ? (wl.count >= 5 ? 'workload-high' : wl.count >= 3 ? 'workload-med' : 'workload-low') : '';
          return `
            <div class="cal-cell${cell.otherMonth?' other-month':''}${dateStr===todayStr?' today':''}" onclick="App.setCalView('day');App.state.calDate=new Date('${dateStr}T12:00:00');App.renderMain()">
              <div class="cal-day-num">${cell.date.getDate()}</div>
              ${wlClass ? `<div class="workload-bar ${wlClass}" style="margin-bottom:3px"></div>` : ''}
              ${dayTasks.slice(0,3).map(t => {
                const proj = DB.getProjects().find(p => p.id === t.projectId);
                const color = t.status === 'delayed' ? '#FCEBEB' : (proj ? proj.color + '30' : 'var(--bg-2)');
                const textColor = t.status === 'delayed' ? 'var(--s-delayed-fg)' : (proj ? proj.color : 'var(--text-2)');
                return `<div class="cal-task-pill" style="background:${color};color:${textColor}" onclick="event.stopPropagation();App.openDetail('${t.id}')" title="${App.esc(t.title)}">${App.esc(t.title)}</div>`;
              }).join('')}
              ${more > 0 ? `<div class="cal-more">+${more} more</div>` : ''}
            </div>`;
        }).join('')}
      </div>`;
  },

  calWeek() {
    const d = new Date(App.state.calDate);
    const day = d.getDay() || 7;
    const monday = new Date(d); monday.setDate(d.getDate() - day + 1);
    const days = Array.from({length:7}, (_, i) => { const x = new Date(monday); x.setDate(monday.getDate() + i); return x; });
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    setTimeout(() => {
      const el = document.getElementById('cal-title');
      if (el) el.textContent = `${days[0].getDate()} ${monthNames[days[0].getMonth()]} – ${days[6].getDate()} ${monthNames[days[6].getMonth()]} ${days[6].getFullYear()}`;
    }, 0);

    const tasks = DB.getTasks().filter(t => t.dueDate);
    const todayStr = DB.today();
    const hours = Array.from({length:14}, (_,i) => i + 8); // 8am–9pm
    const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

    return `
      <div style="display:grid;grid-template-columns:48px repeat(7,1fr);overflow:auto;flex:1">
        <div style="border-right:0.5px solid var(--border)"></div>
        ${days.map((day, i) => {
          const dateStr = day.toISOString().split('T')[0];
          const isToday = dateStr === todayStr;
          return `<div class="cal-week-header${isToday?' today':''}">${dayNames[i]}<br><span style="font-size:13px;font-weight:${isToday?700:400}">${day.getDate()}</span></div>`;
        }).join('')}
        ${hours.map(h => `
          <div class="cal-time-slot" style="border-right:0.5px solid var(--border)">${h}:00</div>
          ${days.map(day => {
            const dateStr = day.toISOString().split('T')[0];
            const slotTasks = tasks.filter(t => t.dueDate === dateStr && t.dueTime && parseInt(t.dueTime.split(':')[0]) === h);
            return `<div class="cal-week-cell">
              ${slotTasks.map(t => {
                const proj = DB.getProjects().find(p => p.id === t.projectId);
                return `<div class="cal-week-task" style="background:${proj?.color||'var(--accent)'}20;color:${proj?.color||'var(--accent)'}" onclick="App.openDetail('${t.id}')" title="${App.esc(t.title)}">${App.esc(t.title)}</div>`;
              }).join('')}
            </div>`;
          }).join('')}
        `).join('')}
      </div>`;
  },

  calDay() {
    const d = App.state.calDate;
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-GB', {weekday:'long',day:'numeric',month:'long',year:'numeric'});

    setTimeout(() => { const el = document.getElementById('cal-title'); if (el) el.textContent = dayName; }, 0);

    const dayTasks = DB.getTasks().filter(t => t.dueDate === dateStr);
    const timed = dayTasks.filter(t => t.dueTime).sort((a,b) => a.dueTime.localeCompare(b.dueTime));
    const untimed = dayTasks.filter(t => !t.dueTime);
    const hours = Array.from({length:14}, (_,i) => i + 8);

    return `
      <div style="display:grid;grid-template-columns:48px 1fr;overflow:auto;flex:1">
        ${hours.map(h => {
          const slotTasks = timed.filter(t => parseInt(t.dueTime?.split(':')[0]) === h);
          return `
            <div class="cal-time-slot" style="border-right:0.5px solid var(--border)">${h}:00</div>
            <div class="cal-week-cell" style="padding:2px 6px;min-height:48px">
              ${slotTasks.map(t => {
                const proj = DB.getProjects().find(p => p.id === t.projectId);
                return `<div style="background:${proj?.color||'var(--accent)'}20;color:${proj?.color||'var(--accent)'};border-radius:4px;padding:3px 8px;font-size:12px;margin-bottom:2px;cursor:pointer" onclick="App.openDetail('${t.id}')">${t.dueTime} — ${App.esc(t.title)}</div>`;
              }).join('')}
            </div>`;
        }).join('')}
        ${untimed.length ? `
          <div style="grid-column:1/-1;padding:10px 16px;border-top:0.5px solid var(--border)">
            <div style="font-size:11px;font-weight:600;color:var(--text-3);margin-bottom:8px">NO SPECIFIC TIME</div>
            ${untimed.map(t => this.taskRow(t)).join('')}
          </div>` : ''}
      </div>`;
  },

  // ── Insights ──────────────────────────────────────────────────────────────
  insights() {
    const ins = DB.getInsights(30);
    return `
      <div class="topbar"><div class="topbar-left"><span class="topbar-title">Insights</span></div></div>
      <div class="view-content">
        <div class="metrics-grid">
          <div class="metric-card"><div class="metric-num">${ins.completed}</div><div class="metric-label">Tasks completed (30d)</div></div>
          <div class="metric-card"><div class="metric-num">${ins.onTimeRate}%</div><div class="metric-label">On-time completion</div></div>
          <div class="metric-card"><div class="metric-num" style="color:var(--s-delayed-fg)">${ins.overdue}</div><div class="metric-label">Currently delayed</div></div>
          <div class="metric-card"><div class="metric-num" style="color:var(--accent)">${ins.streak} 🔥</div><div class="metric-label">Day streak</div></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div class="chart-card">
            <div class="chart-title">Tasks completed — last 7 days</div>
            <div class="bar-chart">
              ${ins.days.map(d => {
                const max = Math.max(...ins.days.map(x => x.count), 1);
                return `<div class="bar-row"><div class="bar-label">${d.label}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(d.count/max*100)}%"></div></div><div class="bar-val">${d.count}</div></div>`;
              }).join('')}
            </div>
          </div>
          <div class="chart-card">
            <div class="chart-title">Project completion</div>
            ${ins.projectStats.map(p => `
              <div class="proj-bar-row">
                <div class="proj-bar-name"><span style="width:8px;height:8px;border-radius:50%;background:${p.color};flex-shrink:0"></span>${App.esc(p.name)}</div>
                <div class="proj-bar-track"><div class="proj-bar-fill" style="width:${p.pct}%;background:${p.color}"></div></div>
                <div class="proj-bar-pct">${p.pct}%</div>
              </div>`).join('')}
          </div>
        </div>
        <div class="chart-card" style="margin-bottom:12px">
          <div class="chart-title">Activity — last 14 days</div>
          <div class="heatmap-grid">
            ${ins.heatmap.map(d => `<div class="hm-cell hm-${d.level}" title="${d.date}: ${d.count} tasks"></div>`).join('')}
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:8px;font-size:11px;color:var(--text-3)">
            Less <div class="hm-cell hm-0" style="width:14px;height:14px"></div><div class="hm-cell hm-1" style="width:14px;height:14px"></div><div class="hm-cell hm-2" style="width:14px;height:14px"></div><div class="hm-cell hm-3" style="width:14px;height:14px"></div><div class="hm-cell hm-4" style="width:14px;height:14px"></div> More
          </div>
        </div>
        ${ins.estAccuracy !== null ? `
          <div class="chart-card">
            <div class="chart-title">Estimation accuracy</div>
            <p style="font-size:13px;color:var(--text-2)">You typically use <strong>${ins.estAccuracy}%</strong> of your time estimate. ${ins.estAccuracy > 110 ? 'You tend to underestimate — add a buffer.' : ins.estAccuracy < 80 ? 'You overestimate — your estimates are generous.' : 'Your estimates are accurate!'}</p>
          </div>` : ''}
      </div>`;
  },

  // ── Daily Planning ────────────────────────────────────────────────────────
  planning() {
    const today = DB.today();
    const plan = DB.getDailyPlan(today);
    const tasks = DB.getTasks().filter(t => t.status !== 'completed');
    const delayed = DB.getTasks().filter(t => t.status === 'delayed');
    const dateLabel = new Date().toLocaleDateString('en-GB', {weekday:'long',day:'numeric',month:'long'});

    return `
      <div class="topbar"><div class="topbar-left"><span class="topbar-title">Daily planning</span><span style="font-size:12px;color:var(--text-3)">${dateLabel}</span></div></div>
      <div class="view-content">
        ${!plan.morningDone ? `
          <div class="ritual-card">
            <div class="ritual-header">
              <div class="ritual-icon">🌅</div>
              <div><div class="ritual-title">Morning brief</div><div class="ritual-sub">5 minutes · Set yourself up for a great day</div></div>
            </div>
            <div class="ritual-body">
              <div class="ritual-step">
                <div class="ritual-step-num">1</div>
                <div class="ritual-step-body">
                  <div class="ritual-step-title">Yesterday's carry-over</div>
                  <div style="border:0.5px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;margin-top:6px">
                    ${delayed.length ? delayed.slice(0,3).map(t => `<div class="task-row" onclick="App.openDetail('${t.id}')"><div class="task-check delayed"></div><span class="task-name">${App.esc(t.title)}</span>${this.priorityBadge(t.priority)}<span class="task-date overdue">${App.fmtDate(t.dueDate)}</span></div>`).join('') : `<div style="padding:12px 16px;font-size:13px;color:var(--text-3)">✓ No delayed tasks. Great job!</div>`}
                  </div>
                </div>
              </div>
              <div class="ritual-step">
                <div class="ritual-step-num">2</div>
                <div class="ritual-step-body">
                  <div class="ritual-step-title">Set your MIT (Most Important Tasks)</div>
                  <div class="ritual-step-text">Pick up to 3 tasks that MUST get done today.</div>
                  <div class="mit-slots" style="margin-top:8px">
                    ${[0,1,2].map(i => {
                      const mitId = plan.mit?.[i];
                      const mitTask = mitId ? DB.getTasks().find(t => t.id === mitId) : null;
                      return `<div class="mit-slot${mitTask?' filled':''}" onclick="Views.openMITPicker(${i})">
                        <div class="mit-num">${i+1}</div>
                        ${mitTask ? `<span style="flex:1;font-size:13px">${App.esc(mitTask.title)}</span>${this.priorityBadge(mitTask.priority)}` : `<span>Click to select MIT #${i+1}</span>`}
                      </div>`;
                    }).join('')}
                  </div>
                </div>
              </div>
              <div class="ritual-step">
                <div class="ritual-step-num">3</div>
                <div class="ritual-step-body">
                  <div class="ritual-step-title">Today's task count</div>
                  <div class="ritual-step-text">${tasks.filter(t => t.tags.includes('today')).length} tasks tagged for today · ${tasks.filter(t => t.dueDate===today).length} due today</div>
                </div>
              </div>
              <button class="btn btn-primary" onclick="App.saveDailyPlanField('morningDone',true)"><i class="ti ti-check"></i> Morning brief done — start the day</button>
            </div>
          </div>` : `
          <div style="padding:14px 16px;background:var(--s-ready-bg);border-radius:var(--radius-lg);margin-bottom:16px;display:flex;align-items:center;gap:10px;color:var(--s-ready-fg);font-size:13px;font-weight:500">
            <i class="ti ti-check-circle" style="font-size:20px"></i> Morning brief completed
          </div>`}

        ${!plan.eveningDone ? `
          <div class="ritual-card">
            <div class="ritual-header">
              <div class="ritual-icon">🌇</div>
              <div><div class="ritual-title">End-of-day review</div><div class="ritual-sub">2 minutes · Reflect and prepare for tomorrow</div></div>
            </div>
            <div class="ritual-body">
              <div class="field-group">
                <label class="field-label">What did you accomplish today?</label>
                <textarea class="review-textarea" id="ed-done" placeholder="Even small wins count..." rows="3"></textarea>
              </div>
              <div class="field-group">
                <label class="field-label">What slipped and why?</label>
                <textarea class="review-textarea" id="ed-slipped" placeholder="Be honest — patterns matter..." rows="3"></textarea>
              </div>
              <div class="field-group">
                <label class="field-label">Tomorrow's top 3 (rough plan)</label>
                <textarea class="review-textarea" id="ed-tmrw" placeholder="1. &#10;2. &#10;3. " rows="4"></textarea>
              </div>
              <button class="btn btn-primary" onclick="App.saveEveningReview()"><i class="ti ti-moon"></i> Done for today</button>
            </div>
          </div>` : `
          <div style="padding:14px 16px;background:var(--s-ready-bg);border-radius:var(--radius-lg);margin-bottom:16px;display:flex;align-items:center;gap:10px;color:var(--s-ready-fg);font-size:13px;font-weight:500">
            <i class="ti ti-check-circle" style="font-size:20px"></i> Evening review completed
          </div>`}
      </div>`;
  },

  // ── Weekly Review ─────────────────────────────────────────────────────────
  weekly() {
    const weekKey = App.getWeekKey();
    const review = DB.getWeeklyReview(weekKey);
    const ins = DB.getInsights(7);

    return `
      <div class="topbar"><div class="topbar-left"><span class="topbar-title">Weekly review</span></div></div>
      <div class="view-content">
        <div class="metrics-grid" style="margin-bottom:20px">
          <div class="metric-card"><div class="metric-num">${ins.completed}</div><div class="metric-label">Completed this week</div></div>
          <div class="metric-card"><div class="metric-num">${ins.onTimeRate}%</div><div class="metric-label">On-time rate</div></div>
          <div class="metric-card"><div class="metric-num" style="color:var(--s-delayed-fg)">${ins.overdue}</div><div class="metric-label">Delayed</div></div>
          <div class="metric-card"><div class="metric-num">${ins.totalTasks}</div><div class="metric-label">Still open</div></div>
        </div>
        <div class="review-section">
          <div class="review-label">🏆 Wins this week — what went well?</div>
          <textarea class="review-textarea" id="wr-wins" placeholder="Celebrate your progress...">${App.esc(review.wins)}</textarea>
        </div>
        <div class="review-section">
          <div class="review-label">🔍 What slipped this week?</div>
          <textarea class="review-textarea" id="wr-slippage" placeholder="What patterns do you notice?">${App.esc(review.slippage)}</textarea>
        </div>
        <div class="review-section">
          <div class="review-label">🎯 Next week's big 5</div>
          <textarea class="review-textarea" id="wr-next" placeholder="1. &#10;2. &#10;3. &#10;4. &#10;5. " rows="7">${App.esc(review.nextWeekTop5)}</textarea>
        </div>
        <button class="btn btn-primary" onclick="App.saveWeeklyReview()"><i class="ti ti-check"></i> Save weekly review</button>
      </div>`;
  },

  // ── Goals ─────────────────────────────────────────────────────────────────
  goals() {
    const goals = DB.getGoals().filter(g => g.panel === App.state.panel);
    const allTasks = DB.getTasks();
    const projects = DB.getProjects();

    return `
      <div class="topbar">
        <div class="topbar-left"><span class="topbar-title">Goals</span></div>
        <div class="topbar-right"><button class="btn btn-primary" onclick="App.openNewGoal()"><i class="ti ti-plus"></i> New goal</button></div>
      </div>
      <div class="view-content">
        ${goals.length ? goals.map(g => {
          const goalProjects = projects.filter(p => p.goalId === g.id);
          const goalTasks = allTasks.filter(t => goalProjects.some(p => p.id === t.projectId));
          const done = goalTasks.filter(t => t.status === 'completed').length;
          const pct = goalTasks.length ? Math.round((done/goalTasks.length)*100) : 0;
          return `
            <div class="goal-card">
              <div class="goal-header">
                <div>
                  <div class="goal-title">${App.esc(g.title)}</div>
                  <div class="goal-quarter">${App.esc(g.quarter)} ${g.targetDate ? '· Target: ' + App.fmtDate(g.targetDate) : ''}</div>
                </div>
                <div style="font-size:22px;font-weight:700;color:var(--accent)">${pct}%</div>
              </div>
              <div class="goal-progress-bar"><div class="goal-progress-fill" style="width:${pct}%"></div></div>
              <div style="font-size:12px;color:var(--text-3);margin-bottom:8px">${done} of ${goalTasks.length} tasks completed</div>
              <div class="goal-projects">
                ${goalProjects.map(p => `<span class="goal-proj-chip"><span style="width:7px;height:7px;border-radius:50%;background:${p.color}"></span>${App.esc(p.name)}</span>`).join('')}
              </div>
            </div>`;
        }).join('') : `<div class="empty-state"><div class="empty-icon"><i class="ti ti-target"></i></div><div class="empty-title">No goals set</div><div class="empty-sub">Set quarterly goals and link projects to them</div></div>`}
      </div>`;
  },

  openNewGoal() {
    document.getElementById('modal-overlay').innerHTML = `
      <div class="modal">
        <div class="modal-title">New goal</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div class="field-group"><label class="field-label">Goal title</label><input class="field-input" id="goal-title-input" placeholder="e.g. Ship product v2"></div>
          <div class="field-group"><label class="field-label">Quarter</label><input class="field-input" id="goal-quarter-input" placeholder="e.g. Q3 2026"></div>
          <div class="field-group"><label class="field-label">Target date</label><input class="field-input" type="date" id="goal-date-input"></div>
        </div>
        <div class="modal-footer"><button class="btn" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" onclick="App.saveGoal()">Save goal</button></div>
      </div>`;
    document.getElementById('modal-overlay').classList.add('open');
  },

  // ── Focus Mode ────────────────────────────────────────────────────────────
  focusMode(task) {
    const proj = DB.getProjects().find(p => p.id === task.projectId);
    const poms = task.pomodoroCount || 0;
    const r = 88, circ = 2 * Math.PI * r;
    const phase = App.state.pomodoroPhase;

    return `
      <button class="btn focus-exit" onclick="App.closeFocusMode()"><i class="ti ti-x"></i> Exit focus</button>
      <div style="font-size:12px;color:var(--text-3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">${phase === 'work' ? '🍅 Focus session' : '☕ Break time'}</div>
      <div class="focus-task-title">${App.esc(task.title)}</div>
      <div class="focus-project">${proj ? proj.name : ''} · ${App.priorityColors[task.priority] ? task.priority : ''}</div>
      <div class="focus-timer-ring">
        <svg class="focus-timer-svg" width="200" height="200" viewBox="0 0 200 200">
          <circle class="focus-timer-bg" cx="100" cy="100" r="${r}"/>
          <circle class="focus-timer-fill" id="focus-timer-fill" cx="100" cy="100" r="${r}" style="stroke-dasharray:${circ};stroke-dashoffset:${circ}"/>
        </svg>
        <div class="focus-time-text" id="focus-time-text">25:00</div>
      </div>
      <div class="pom-session-dots">
        ${Array.from({length:Math.min(poms+4,8)},(_,i) => `<div class="pom-s-dot${i<poms?' done':i===poms?' current':''}"></div>`).join('')}
      </div>
      <div class="focus-controls">
        <button class="focus-btn" id="pom-pause-btn" onclick="App.pausePomodoro();this.style.display='none';document.getElementById('pom-resume-btn').style.display='inline-flex'">Pause</button>
        <button class="focus-btn" id="pom-resume-btn" style="display:none" onclick="App.resumePomodoro();this.style.display='none';document.getElementById('pom-pause-btn').style.display='inline-flex'">Resume</button>
        <button class="focus-btn primary" onclick="App.closeFocusMode();App.toggleTaskComplete('${task.id}')">Mark complete</button>
        <button class="focus-btn" onclick="App.skipPomodoro()">Skip →</button>
      </div>`;
  },

  // ── Task Detail ───────────────────────────────────────────────────────────
  taskDetail(taskId) {
    const task = DB.getTasks().find(t => t.id === taskId);
    if (!task) return '<div class="detail-header"><span class="detail-title">Task not found</span></div>';

    const proj = DB.getProjects().find(p => p.id === task.projectId);
    const settings = DB.getSettings();
    const timerDisplay = App.formatTime(App.state.timerSeconds);
    const estPct = task.timeEstimate ? Math.min(Math.round((task.timeLogged / task.timeEstimate) * 100), 100) : 0;
    const poms = task.pomodoroCount || 0;

    const statusOptions = ['not-ready','ready','in-progress','on-hold','delayed','completed'];
    const priorityOptions = ['highest','high','medium','low'];
    const energyOptions = [['deep','Deep work'],['quick','Quick win'],['waiting','Waiting'],['admin','Admin']];

    return `
      <div class="detail-header">
        <span class="detail-title">Task details</span>
        <div style="display:flex;gap:4px">
          <button class="btn btn-ghost btn-icon" onclick="App.openFocusMode('${task.id}')" title="Focus mode"><i class="ti ti-bolt"></i></button>
          <button class="btn btn-ghost btn-icon" onclick="App.pushTaskToClickUp('${task.id}')" title="Push to ClickUp"><i class="ti ti-brand-clickup"></i></button>
          <button class="btn btn-ghost btn-icon" onclick="App.closeDetail()"><i class="ti ti-x"></i></button>
        </div>
      </div>
      <div class="detail-body">
        <div>
          <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:4px">
            <div class="task-check${task.status==='completed'?' done':''}" onclick="App.toggleTaskComplete('${task.id}')" style="margin-top:3px;flex-shrink:0">${task.status==='completed'?'<i class="ti ti-check" style="font-size:9px;color:#fff"></i>':''}</div>
            <div style="flex:1">
              <div contenteditable="true" style="font-size:16px;font-weight:600;color:var(--text);outline:none;min-height:24px;${task.status==='completed'?'text-decoration:line-through;opacity:0.6':''}" onblur="App.saveTaskField('${task.id}','title',this.textContent.trim())">${App.esc(task.title)}</div>
              <div style="font-size:11px;color:var(--text-3);margin-top:3px">${proj?App.esc(proj.name)+' · ':''} Created ${App.fmtDate(task.createdAt?.split('T')[0])}</div>
            </div>
          </div>
          <textarea class="field-input field-textarea" placeholder="Add description…" onblur="App.saveTaskField('${task.id}','description',this.value)">${App.esc(task.description||'')}</textarea>
        </div>

        <div class="detail-divider"></div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="field-group">
            <label class="field-label">Status</label>
            <select class="field-input field-select" onchange="App.saveTaskField('${task.id}','status',this.value)">
              ${statusOptions.map(s => `<option value="${s}" ${task.status===s?'selected':''}>${this.statusLabels[s]}</option>`).join('')}
            </select>
          </div>
          <div class="field-group">
            <label class="field-label">Priority</label>
            <select class="field-input field-select" onchange="App.saveTaskField('${task.id}','priority',this.value)">
              ${priorityOptions.map(p => `<option value="${p}" ${task.priority===p?'selected':''}>${p.charAt(0).toUpperCase()+p.slice(1)}</option>`).join('')}
            </select>
          </div>
          <div class="field-group">
            <label class="field-label">Due date</label>
            <input class="field-input" type="date" value="${task.dueDate||''}" onchange="App.saveTaskField('${task.id}','dueDate',this.value)">
          </div>
          <div class="field-group">
            <label class="field-label">Due time</label>
            <input class="field-input" type="time" value="${task.dueTime||''}" onchange="App.saveTaskField('${task.id}','dueTime',this.value)">
          </div>
          <div class="field-group">
            <label class="field-label">Assigned to</label>
            <input class="field-input" value="${App.esc(task.assignee||'')}" placeholder="Name" onblur="App.saveTaskField('${task.id}','assignee',this.value)">
          </div>
          <div class="field-group">
            <label class="field-label">Energy type</label>
            <select class="field-input field-select" onchange="App.saveTaskField('${task.id}','energy',this.value)">
              ${energyOptions.map(([v,l]) => `<option value="${v}" ${task.energy===v?'selected':''}>${l}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="field-group">
          <label class="field-label">Tags</label>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <span onclick="App.toggleMIT('${task.id}')" style="cursor:pointer;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:600;${task.isMIT?'background:var(--accent-light);color:var(--accent-dark);border:1.5px solid var(--accent)':'background:var(--bg-2);color:var(--text-3);border:0.5px solid var(--border-mid)'}">★ MIT</span>
            <span onclick="App.toggleTag('${task.id}','today')" style="cursor:pointer;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:600;${task.tags.includes('today')?'background:#FAECE7;color:#993C1D;border:1.5px solid #D85A30':'background:var(--bg-2);color:var(--text-3);border:0.5px solid var(--border-mid)'}">Today</span>
            <span onclick="App.toggleTag('${task.id}','tomorrow')" style="cursor:pointer;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:600;${task.tags.includes('tomorrow')?'background:#FAEEDA;color:#854F0B;border:1.5px solid #EF9F27':'background:var(--bg-2);color:var(--text-3);border:0.5px solid var(--border-mid)'}">Tomorrow</span>
            <span onclick="App.saveTaskField('${task.id}','isCommitment',${!task.isCommitment})" style="cursor:pointer;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:600;${task.isCommitment?'background:#E6F1FB;color:#185FA5;border:1.5px solid #378ADD':'background:var(--bg-2);color:var(--text-3);border:0.5px solid var(--border-mid)'}">Commitment</span>
          </div>
        </div>

        ${task.isCommitment ? `<div class="field-group"><label class="field-label">Committed to</label><input class="field-input" value="${App.esc(task.committedTo||'')}" placeholder="Person / team" onblur="App.saveTaskField('${task.id}','committedTo',this.value)"></div>` : ''}

        <div class="detail-divider"></div>

        <div class="field-group">
          <label class="field-label">Subtasks (${task.subtasks.filter(s=>s.completed).length}/${task.subtasks.length})</label>
          <div class="subtask-list">
            ${task.subtasks.map(s => `
              <div class="subtask-row">
                <div class="subtask-check${s.completed?' done':''}" onclick="App.toggleSubtask('${task.id}','${s.id}',event)">${s.completed?'<i class="ti ti-check" style="font-size:8px;color:#fff"></i>':''}</div>
                <input class="subtask-name${s.completed?' done':''}" value="${App.esc(s.title)}" onblur="App.updateSubtask('${task.id}','${s.id}',this.value)">
                <button class="btn btn-ghost btn-icon subtask-delete btn-sm" onclick="App.deleteSubtask('${task.id}','${s.id}')"><i class="ti ti-x"></i></button>
              </div>`).join('')}
            <div class="subtask-row">
              <div class="subtask-check"></div>
              <input class="subtask-name" id="new-subtask-input" placeholder="Add subtask, press Enter" onkeydown="if(event.key==='Enter')App.addSubtask('${task.id}')">
            </div>
          </div>
        </div>

        <div class="detail-divider"></div>

        <div class="field-group">
          <label class="field-label">Time tracking</label>
          <div class="timer-card">
            <i class="ti ti-clock" style="font-size:16px;color:var(--text-3)"></i>
            <span class="timer-display" id="timer-display">${timerDisplay}</span>
            <button class="btn btn-sm" id="timer-start-btn" onclick="App.startTimer('${task.id}')"><i class="ti ti-player-play"></i> Start</button>
            <button class="btn btn-sm" id="timer-stop-btn" onclick="App.stopTimer('${task.id}')" disabled><i class="ti ti-player-stop"></i> Stop</button>
            <span style="font-size:11px;color:var(--text-3);margin-left:auto">${App.formatMins(task.timeLogged)} logged</span>
          </div>
          <div style="display:flex;gap:12px;margin-top:8px;align-items:center">
            <div class="field-group" style="flex:1">
              <label class="field-label">Estimate</label>
              <input class="field-input" type="number" min="0" placeholder="Minutes" value="${task.timeEstimate||''}" onblur="App.saveTaskField('${task.id}','timeEstimate',+this.value)">
            </div>
            ${task.timeEstimate ? `<div style="flex:1"><div style="font-size:11px;color:var(--text-3);margin-bottom:4px">${estPct}% used</div><div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${estPct}%;background:${estPct>100?'var(--s-delayed-dot)':'var(--accent)'}"></div></div></div>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:8px">
            <span style="font-size:11px;color:var(--text-3)">Pomodoros: ${poms}</span>
            <div class="pom-dots">${Array.from({length:Math.max(poms,5)},(_,i)=>`<div class="pom-dot${i<poms?' done':''}"></div>`).join('')}</div>
          </div>
        </div>

        <div class="detail-divider"></div>

        <div class="field-group">
          <label class="field-label">Comments</label>
          ${task.comments.map(c => `
            <div class="comment">
              ${this.avatar(c.author)}
              <div class="comment-bubble">
                <div class="comment-author">${App.esc(c.author)} · ${new Date(c.createdAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</div>
                <div class="comment-text">${App.esc(c.text)}</div>
              </div>
            </div>`).join('')}
          <div class="comment-input-row">
            ${this.avatar(settings.name || 'Me')}
            <input class="comment-input" id="comment-input" placeholder="Add a comment…" onkeydown="if(event.key==='Enter')App.addComment('${task.id}')">
            <button class="btn btn-sm" onclick="App.addComment('${task.id}')">Send</button>
          </div>
        </div>

        <div class="detail-divider"></div>

        <div class="field-group">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
            <label class="field-label">Dependencies</label>
            <button class="btn btn-sm" onclick="App.openDependencyPicker('${task.id}')"><i class="ti ti-plus" style="font-size:11px"></i> Add</button>
          </div>
          ${App.isBlocked(task) ? `
            <div style="background:var(--s-delayed-bg);border:0.5px solid var(--s-delayed-dot);border-radius:var(--radius);padding:8px 12px;margin-bottom:8px;display:flex;align-items:center;gap:8px;font-size:12px;color:var(--s-delayed-fg)">
              <i class="ti ti-lock" style="font-size:14px;flex-shrink:0"></i>
              <span><strong>Blocked</strong> — complete dependencies first before starting this task</span>
            </div>` : ''}
          ${(() => {
            const allTasks = DB.getTasks();
            const blockedBy = (task.dependencies || []).map(id => allTasks.find(t => t.id === id)).filter(Boolean);
            const blocks = App.getBlocks(task.id);
            if (!blockedBy.length && !blocks.length) return `<div style="font-size:12px;color:var(--text-3);padding:4px 0">No dependencies set</div>`;
            let html = '';
            if (blockedBy.length) {
              html += `<div style="font-size:10px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px">Blocked by</div>`;
              html += blockedBy.map(dep => `
                <div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border:0.5px solid var(--border);border-radius:var(--radius);margin-bottom:4px;background:var(--bg-2)">
                  <span class="status-dot dot-${dep.status}"></span>
                  <span style="flex:1;font-size:12px;color:var(--text)${dep.status==='completed'?';text-decoration:line-through;opacity:0.6':''}">${App.esc(dep.title)}</span>
                  <span class="badge badge-s-${dep.status==='in-progress'?'inprog':dep.status==='not-ready'?'notready':dep.status==='on-hold'?'onhold':dep.status}" style="font-size:9px">${dep.status==='completed'?'Done':dep.status==='in-progress'?'In prog':dep.status}</span>
                  <button class="btn btn-ghost btn-icon btn-sm" onclick="App.removeDependency('${task.id}','${dep.id}')" title="Remove"><i class="ti ti-x" style="font-size:11px"></i></button>
                </div>`).join('');
            }
            if (blocks.length) {
              html += `<div style="font-size:10px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px;margin-top:${blockedBy.length?'10px':'0'}">Blocks</div>`;
              html += blocks.map(b => `
                <div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border:0.5px solid var(--border);border-radius:var(--radius);margin-bottom:4px;background:var(--bg-2)" onclick="App.openDetail('${b.id}')">
                  <span class="status-dot dot-${b.status}"></span>
                  <span style="flex:1;font-size:12px;color:var(--text)">${App.esc(b.title)}</span>
                  <i class="ti ti-arrow-right" style="font-size:12px;color:var(--text-3)"></i>
                </div>`).join('');
            }
            return html;
          })()}
        </div>

        <div class="detail-divider"></div>

        <div class="field-group">
          <label class="field-label">ClickUp</label>
          ${task.clickupId ? `
            <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-2)">
              <span style="width:8px;height:8px;border-radius:50%;background:var(--s-ready-dot)"></span> Synced · ID: ${task.clickupId}
              <button class="btn btn-sm" onclick="App.pushTaskToClickUp('${task.id}')" style="margin-left:auto"><i class="ti ti-refresh"></i> Sync</button>
            </div>` : `
            <button class="btn btn-sm" onclick="App.pushTaskToClickUp('${task.id}')"><i class="ti ti-upload"></i> Push to ClickUp</button>`}
        </div>
      </div>
      <div class="detail-footer">
        <button class="btn btn-danger btn-sm" onclick="App.deleteTask('${task.id}')"><i class="ti ti-trash"></i> Delete</button>
        <button class="btn btn-primary" style="flex:1" onclick="App.toggleTaskComplete('${task.id}')">
          ${task.status==='completed' ? '<i class="ti ti-rotate-clockwise"></i> Reopen' : '<i class="ti ti-check"></i> Mark complete'}
        </button>
      </div>`;
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  settings() {
    const s = DB.getSettings();
    return `
      <div class="topbar"><div class="topbar-left"><span class="topbar-title">Settings</span></div></div>
      <div class="view-content" style="max-width:600px">
        <div class="settings-section">
          <div class="settings-title">Profile</div>
          <div class="setting-row"><div><div class="setting-label">Your name</div><div class="setting-sub">Used in comments and assignments</div></div><input class="field-input" id="s-name" value="${App.esc(s.name||'')}" style="width:180px"></div>
          <div class="setting-row">
            <div><div class="setting-label">Theme</div></div>
            <div style="display:flex;gap:6px">
              <button class="btn${s.theme!=='dark'?' btn-primary':''}" onclick="document.documentElement.setAttribute('data-theme','light');App.saveSettings()">Light</button>
              <button class="btn${s.theme==='dark'?' btn-primary':''}" onclick="document.documentElement.setAttribute('data-theme','dark');App.saveSettings()">Dark</button>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-title">Push notifications</div>
          <div class="setting-row">
            <div><div class="setting-label">Enable notifications</div><div class="setting-sub">Daily reminders at 9am, 1pm, 5pm, 10pm</div></div>
            <label class="toggle"><input type="checkbox" ${s.notificationsEnabled?'checked':''} onchange="App.requestNotifications()"><span class="toggle-slider"></span></label>
          </div>
          ${s.notificationsEnabled && Notification.permission === 'granted' ? `<div style="font-size:12px;color:var(--s-ready-fg);padding:6px 0"><i class="ti ti-check-circle"></i> Notifications active</div>` : `<div style="font-size:12px;color:var(--text-3);padding:6px 0">Click the toggle to request permission from your browser</div>`}
        </div>

        <div class="settings-section">
          <div class="settings-title">ClickUp integration</div>
          <div class="setting-row"><div><div class="setting-label">API token</div><div class="setting-sub">Found in ClickUp → Settings → Apps</div></div><input class="field-input" id="s-clickup-token" type="password" value="${App.esc(s.clickupToken||'')}" placeholder="pk_xxxxxxxx" style="width:200px"></div>
          <div class="setting-row"><div><div class="setting-label">Workspace ID</div><div class="setting-sub">Optional — auto-detected on first sync</div></div><input class="field-input" id="s-clickup-ws" value="${App.esc(s.clickupWorkspaceId||'')}" placeholder="Team/workspace ID" style="width:200px"></div>
          <div class="setting-row"><div><div class="setting-label">Default list ID</div><div class="setting-sub">List where new tasks are pushed</div></div><input class="field-input" id="s-clickup-list" value="${App.esc(s.clickupDefaultListId||'')}" placeholder="List ID" style="width:200px"></div>
          <div style="display:flex;gap:8px;padding:8px 0">
            <button class="btn btn-primary" onclick="App.saveSettings();App.syncClickUp()"><i class="ti ti-refresh"></i> Test & sync ClickUp</button>
            ${s.lastSync ? `<span style="font-size:12px;color:var(--text-3);align-self:center">Last sync: ${new Date(s.lastSync).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span>` : ''}
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-title">Keyboard shortcuts</div>
          ${[['Space / Q','Quick capture'],['F','Focus mode'],['N','New project'],['Esc','Close panels'],['1-5','Navigate views']].map(([k,l]) => `<div class="setting-row"><div class="setting-label">${l}</div><kbd style="background:var(--bg-2);border:0.5px solid var(--border-mid);border-radius:4px;padding:2px 7px;font-size:11px;font-family:monospace">${k}</kbd></div>`).join('')}
        </div>

        <div class="settings-section">
          <div class="settings-title">Data</div>
          <div class="setting-row"><div><div class="setting-label">Export data</div><div class="setting-sub">Download all tasks as JSON</div></div><button class="btn" onclick="App.exportData()"><i class="ti ti-download"></i> Export</button></div>
          <div class="setting-row"><div><div class="setting-label">Reset app</div><div class="setting-sub">Clear all data and start fresh</div></div><button class="btn btn-danger" onclick="App.resetData()"><i class="ti ti-trash"></i> Reset</button></div>
        </div>

        <button class="btn btn-primary" onclick="App.saveSettings()"><i class="ti ti-check"></i> Save settings</button>
      </div>`;
  },
};

// Extra App methods that reference Views
App.openMITPicker = Views.openMITPicker.bind(Views);

App.saveEveningReview = function() {
  const plan = DB.getDailyPlan(DB.today());
  plan.eveningNotes = document.getElementById('ed-done')?.value || '';
  plan.slippageNotes = document.getElementById('ed-slipped')?.value || '';
  plan.tomorrowTop3 = document.getElementById('ed-tmrw')?.value || '';
  plan.eveningDone = true;
  DB.saveDailyPlan(plan);
  App.toast('Evening review saved. Rest well!');
  App.renderMain();
};

App.updateSubtask = function(taskId, subtaskId, value) {
  const task = DB.getTasks().find(t => t.id === taskId);
  const sub = task?.subtasks.find(s => s.id === subtaskId);
  if (!sub) return;
  sub.title = value;
  DB.saveTask(task);
};

App.openNewGoal = Views.openNewGoal.bind(Views);
App.openMITPicker = Views.openMITPicker.bind(Views);

App.exportData = function() {
  const data = { tasks: DB.getTasks(), projects: DB.getProjects(), goals: DB.getGoals(), exported: DB.now() };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `flowtask-export-${DB.today()}.json`; a.click();
};

App.resetData = function() {
  if (!confirm('Reset ALL data? This cannot be undone.')) return;
  Object.values(DB.KEYS).forEach(k => localStorage.removeItem(k));
  location.reload();
};
