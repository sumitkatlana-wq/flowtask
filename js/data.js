// ─── FlowTask Data Layer ───────────────────────────────────────────────────
// All models, CRUD, localStorage persistence, and smart computations

const DB = {
  // ── Keys ────────────────────────────────────────────────────────────────
  KEYS: {
    tasks: 'ft_tasks',
    projects: 'ft_projects',
    goals: 'ft_goals',
    dailyPlans: 'ft_daily_plans',
    weeklyReviews: 'ft_weekly_reviews',
    settings: 'ft_settings',
    inbox: 'ft_inbox',
    commitments: 'ft_commitments',
    milestones: 'ft_milestones',
  },

  // ── Helpers ─────────────────────────────────────────────────────────────
  uuid() {
    return 'ft_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },
  now() { return new Date().toISOString(); },
  today() { return new Date().toISOString().split('T')[0]; },

  load(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
  },
  loadObj(key, def = {}) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(def)); } catch { return def; }
  },
  save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  },

  // ── TASKS ────────────────────────────────────────────────────────────────
  getTasks() { return this.load(this.KEYS.tasks); },
  saveTask(task) {
    const tasks = this.getTasks();
    const idx = tasks.findIndex(t => t.id === task.id);
    task.updatedAt = this.now();
    if (idx >= 0) tasks[idx] = task; else tasks.push(task);
    this.save(this.KEYS.tasks, tasks);
    return task;
  },
  deleteTask(id) {
    const tasks = this.getTasks().filter(t => t.id !== id);
    this.save(this.KEYS.tasks, tasks);
  },
  createTask(data) {
    const task = {
      id: this.uuid(),
      title: '',
      description: '',
      projectId: null,
      panel: 'work',
      status: 'not-ready',
      priority: 'medium',
      dueDate: null,
      dueTime: null,
      assignee: '',
      assignedBy: '',
      tags: [],         // ['today','tomorrow']
      subtasks: [],
      timeEstimate: 0,  // minutes
      timeLogged: 0,
      pomodoroCount: 0,
      energy: 'deep',   // 'deep'|'quick'|'waiting'|'admin'
      isMIT: false,
      isCommitment: false,
      isRecurring: false,
      recurringRule: null,
      dependencies: [],
      goalId: null,
      milestoneId: null,
      comments: [],
      attachments: [],
      clickupId: null,
      priorityScore: 0,
      isInbox: false,
      createdAt: this.now(),
      updatedAt: this.now(),
      completedAt: null,
      ...data
    };
    return this.saveTask(task);
  },

  // ── PROJECTS ─────────────────────────────────────────────────────────────
  getProjects() { return this.load(this.KEYS.projects); },
  saveProject(proj) {
    const projects = this.getProjects();
    const idx = projects.findIndex(p => p.id === proj.id);
    if (idx >= 0) projects[idx] = proj; else projects.push(proj);
    this.save(this.KEYS.projects, projects);
    return proj;
  },
  deleteProject(id) {
    this.save(this.KEYS.projects, this.getProjects().filter(p => p.id !== id));
  },
  createProject(data) {
    const proj = {
      id: this.uuid(),
      name: 'New project',
      panel: 'work',
      priority: 'medium',
      color: '#7F77DD',
      goalId: null,
      dueDate: null,
      collapsed: false,
      sectionCollapsed: { delayed: false, 'in-progress': false, ready: false, 'not-ready': true, 'on-hold': true, completed: true },
      clickupId: null,
      createdAt: this.now(),
      ...data
    };
    return this.saveProject(proj);
  },

  // ── GOALS ────────────────────────────────────────────────────────────────
  getGoals() { return this.load(this.KEYS.goals); },
  saveGoal(goal) {
    const goals = this.getGoals();
    const idx = goals.findIndex(g => g.id === goal.id);
    if (idx >= 0) goals[idx] = goal; else goals.push(goal);
    this.save(this.KEYS.goals, goals);
    return goal;
  },
  createGoal(data) {
    const goal = {
      id: this.uuid(),
      title: '',
      quarter: '',
      panel: 'work',
      targetDate: null,
      description: '',
      createdAt: this.now(),
      ...data
    };
    return this.saveGoal(goal);
  },

  // ── MILESTONES ───────────────────────────────────────────────────────────
  getMilestones() { return this.load(this.KEYS.milestones); },
  saveMilestone(m) {
    const list = this.getMilestones();
    const idx = list.findIndex(x => x.id === m.id);
    if (idx >= 0) list[idx] = m; else list.push(m);
    this.save(this.KEYS.milestones, list);
    return m;
  },
  createMilestone(data) {
    const m = { id: this.uuid(), name: '', projectId: null, dueDate: null, createdAt: this.now(), ...data };
    return this.saveMilestone(m);
  },

  // ── DAILY PLANS ──────────────────────────────────────────────────────────
  getDailyPlan(date) {
    const plans = this.load(this.KEYS.dailyPlans);
    return plans.find(p => p.date === date) || { date, mit: [], morningDone: false, eveningDone: false, eveningNotes: '', tomorrowTop3: '' };
  },
  saveDailyPlan(plan) {
    const plans = this.load(this.KEYS.dailyPlans);
    const idx = plans.findIndex(p => p.date === plan.date);
    if (idx >= 0) plans[idx] = plan; else plans.push(plan);
    this.save(this.KEYS.dailyPlans, plans);
    return plan;
  },

  // ── WEEKLY REVIEWS ───────────────────────────────────────────────────────
  getWeeklyReview(weekKey) {
    const reviews = this.load(this.KEYS.weeklyReviews);
    return reviews.find(r => r.weekKey === weekKey) || { weekKey, wins: '', slippage: '', nextWeekTop5: '', done: false };
  },
  saveWeeklyReview(review) {
    const reviews = this.load(this.KEYS.weeklyReviews);
    const idx = reviews.findIndex(r => r.weekKey === review.weekKey);
    if (idx >= 0) reviews[idx] = review; else reviews.push(review);
    this.save(this.KEYS.weeklyReviews, reviews);
    return review;
  },

  // ── COMMITMENTS ──────────────────────────────────────────────────────────
  getCommitments() { return this.load(this.KEYS.commitments); },
  saveCommitment(c) {
    const list = this.getCommitments();
    const idx = list.findIndex(x => x.id === c.id);
    if (idx >= 0) list[idx] = c; else list.push(c);
    this.save(this.KEYS.commitments, list);
    return c;
  },
  createCommitment(data) {
    const c = { id: this.uuid(), title: '', committedTo: '', dueDate: null, taskId: null, status: 'pending', createdAt: this.now(), ...data };
    return this.saveCommitment(c);
  },

  // ── SETTINGS ─────────────────────────────────────────────────────────────
  getSettings() {
    return this.loadObj(this.KEYS.settings, {
      name: 'Sumit',
      clickupToken: '',
      clickupWorkspaceId: '',
      notificationsEnabled: false,
      notificationTimes: ['09:00', '13:00', '17:00', '22:00'],
      theme: 'light',
      weekStartsMonday: true,
      defaultPanel: 'work',
      defaultPriority: 'medium',
      lastSync: null,
    });
  },
  saveSettings(s) { this.save(this.KEYS.settings, s); },

  // ── SMART COMPUTATIONS ───────────────────────────────────────────────────
  computePriorityScore(task) {
    const priorityMap = { highest: 40, high: 30, medium: 20, low: 10 };
    let score = priorityMap[task.priority] || 20;

    // Deadline proximity
    if (task.dueDate) {
      const daysLeft = Math.ceil((new Date(task.dueDate) - new Date()) / 86400000);
      if (daysLeft < 0) score += 50;       // overdue
      else if (daysLeft === 0) score += 35; // today
      else if (daysLeft === 1) score += 25; // tomorrow
      else if (daysLeft <= 3) score += 15;
      else if (daysLeft <= 7) score += 8;
    }

    // Age (sitting too long)
    const ageDays = Math.floor((new Date() - new Date(task.createdAt)) / 86400000);
    if (ageDays > 14) score += 10;
    else if (ageDays > 7) score += 5;

    // MIT boost
    if (task.isMIT) score += 20;
    if (task.isCommitment) score += 15;
    if (task.tags.includes('today')) score += 20;

    return score;
  },

  autoUpdateDelayed(tasks) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tasks.map(t => {
      if (['completed', 'on-hold', 'delayed'].includes(t.status)) return t;
      if (t.dueDate) {
        const due = new Date(t.dueDate);
        due.setHours(23, 59, 59, 0);
        if (due < today && t.status !== 'completed') {
          return { ...t, status: 'delayed', updatedAt: this.now() };
        }
      }
      return t;
    });
  },

  isRisk(task) {
    if (!task.dueDate || task.status === 'completed' || task.status === 'delayed') return false;
    const daysLeft = Math.ceil((new Date(task.dueDate) - new Date()) / 86400000);
    return daysLeft <= 3 && ['not-ready', 'ready'].includes(task.status);
  },

  // ── ANALYTICS ────────────────────────────────────────────────────────────
  getInsights(period = 30) {
    const cutoff = new Date(Date.now() - period * 86400000);
    const allTasks = this.getTasks();
    const recent = allTasks.filter(t => new Date(t.createdAt) >= cutoff);
    const completed = recent.filter(t => t.status === 'completed');
    const overdue = allTasks.filter(t => t.status === 'delayed');

    // On-time rate
    const completedWithDue = completed.filter(t => t.dueDate && t.completedAt);
    const onTime = completedWithDue.filter(t => new Date(t.completedAt) <= new Date(t.dueDate));
    const onTimeRate = completedWithDue.length ? Math.round((onTime.length / completedWithDue.length) * 100) : 0;

    // Per-day completions (last 7 days)
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = allTasks.filter(t => t.completedAt && t.completedAt.startsWith(dateStr)).length;
      days.push({ date: dateStr, count, label: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()] });
    }

    // Streak
    let streak = 0;
    for (let i = 0; i <= 365; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const done = allTasks.filter(t => t.completedAt && t.completedAt.startsWith(dateStr)).length;
      if (done > 0) streak++;
      else if (i > 0) break;
    }

    // Project completion rates
    const projects = this.getProjects();
    const projectStats = projects.map(p => {
      const pTasks = allTasks.filter(t => t.projectId === p.id);
      const pDone = pTasks.filter(t => t.status === 'completed').length;
      return { id: p.id, name: p.name, color: p.color, total: pTasks.length, done: pDone, pct: pTasks.length ? Math.round((pDone / pTasks.length) * 100) : 0 };
    });

    // Estimation accuracy (avg ratio)
    const withEstimates = completed.filter(t => t.timeEstimate > 0 && t.timeLogged > 0);
    const estAccuracy = withEstimates.length
      ? Math.round(withEstimates.reduce((s, t) => s + Math.min(t.timeLogged / t.timeEstimate, 3), 0) / withEstimates.length * 100)
      : null;

    // Activity heatmap (last 14 days)
    const heatmap = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = allTasks.filter(t => t.completedAt && t.completedAt.startsWith(dateStr)).length;
      heatmap.push({ date: dateStr, count, level: count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 8 ? 3 : 4 });
    }

    return { completed: completed.length, overdue: overdue.length, onTimeRate, days, streak, projectStats, estAccuracy, heatmap, totalTasks: allTasks.filter(t => t.status !== 'completed').length };
  },

  getWorkloadByDay() {
    const tasks = this.getTasks().filter(t => t.dueDate && t.status !== 'completed');
    const map = {};
    tasks.forEach(t => {
      const d = t.dueDate;
      if (!map[d]) map[d] = { count: 0, highPriority: 0 };
      map[d].count++;
      if (['highest', 'high'].includes(t.priority)) map[d].highPriority++;
    });
    return map;
  },

  // ── SEED DATA ─────────────────────────────────────────────────────────────
  seedIfEmpty() {
    if (this.getProjects().length > 0) return;
    const today = this.today();
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 3);
    const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
    const nextMonth = new Date(); nextMonth.setDate(nextMonth.getDate() + 20);

    const fmt = d => d.toISOString().split('T')[0];

    // Goals
    const g1 = this.createGoal({ title: 'Ship product v2 by Q3', quarter: 'Q3 2026', panel: 'work', targetDate: '2026-09-30' });
    const g2 = this.createGoal({ title: 'Grow personal brand', quarter: 'Q3 2026', panel: 'personal', targetDate: '2026-09-30' });

    // Work projects
    const p1 = this.createProject({ name: 'Website redesign', panel: 'work', priority: 'high', color: '#7F77DD', goalId: g1.id, dueDate: fmt(nextWeek) });
    const p2 = this.createProject({ name: 'Q3 planning', panel: 'work', priority: 'medium', color: '#1D9E75', goalId: g1.id, dueDate: '2026-07-01' });
    const p3 = this.createProject({ name: 'Hiring pipeline', panel: 'work', priority: 'medium', color: '#D85A30', dueDate: '2026-07-15' });

    // Personal projects
    const p4 = this.createProject({ name: 'Portfolio', panel: 'personal', priority: 'low', color: '#888780', goalId: g2.id, dueDate: fmt(nextMonth) });

    // Milestones
    const m1 = this.createMilestone({ name: 'Phase 1 — Design', projectId: p1.id, dueDate: fmt(nextWeek) });

    // Work tasks
    this.createTask({ title: 'Finalise homepage wireframes', projectId: p1.id, panel: 'work', status: 'in-progress', priority: 'highest', dueDate: today, dueTime: '15:00', assignee: 'Sumit', tags: ['today'], isMIT: true, milestoneId: m1.id, timeEstimate: 180, timeLogged: 84, pomodoroCount: 3, isCommitment: true, committedTo: 'Product team' });
    this.createTask({ title: 'Stakeholder presentation deck', projectId: p1.id, panel: 'work', status: 'delayed', priority: 'highest', dueDate: fmt(yesterday), assignee: 'Sumit', tags: ['today'], isMIT: true });
    this.createTask({ title: 'Review competitor analysis', projectId: p1.id, panel: 'work', status: 'in-progress', priority: 'high', dueDate: fmt(nextWeek), assignee: 'Amit M.', energy: 'deep' });
    this.createTask({ title: 'Design system tokens', projectId: p1.id, panel: 'work', status: 'in-progress', priority: 'medium', dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], assignee: 'Rahul K.', tags: ['tomorrow'], energy: 'deep', milestoneId: m1.id });
    this.createTask({ title: 'Content audit spreadsheet', projectId: p1.id, panel: 'work', status: 'ready', priority: 'medium', dueDate: '2026-06-20', assignee: 'Amit M.', energy: 'admin' });
    this.createTask({ title: 'Mobile responsive audit', projectId: p1.id, panel: 'work', status: 'ready', priority: 'low', dueDate: '2026-06-22', assignee: 'Sumit', energy: 'quick' });
    this.createTask({ title: 'SEO metadata pass', projectId: p1.id, panel: 'work', status: 'not-ready', priority: 'low', dueDate: '2026-06-26', assignee: 'Sumit' });
    this.createTask({ title: 'Animation library integration', projectId: p1.id, panel: 'work', status: 'on-hold', priority: 'medium', assignee: 'Rahul K.' });

    this.createTask({ title: 'Q3 budget proposal', projectId: p2.id, panel: 'work', status: 'ready', priority: 'high', dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], assignee: 'Sumit', tags: ['tomorrow'], isCommitment: true, committedTo: 'CFO', energy: 'deep' });
    this.createTask({ title: 'Headcount planning spreadsheet', projectId: p2.id, panel: 'work', status: 'in-progress', priority: 'high', dueDate: '2026-06-18', assignee: 'Sumit', energy: 'admin' });
    this.createTask({ title: 'Vendor contract review', projectId: p2.id, panel: 'work', status: 'not-ready', priority: 'medium', dueDate: '2026-06-25', assignee: 'Sumit' });

    this.createTask({ title: 'Interview candidates — round 2', projectId: p3.id, panel: 'work', status: 'on-hold', priority: 'medium', dueDate: '2026-06-20', assignee: 'Amit M.', energy: 'deep' });
    this.createTask({ title: 'JD review for senior engineer role', projectId: p3.id, panel: 'work', status: 'ready', priority: 'high', dueDate: '2026-06-16', assignee: 'Sumit', tags: ['today'] });

    // Personal tasks
    this.createTask({ title: 'Update personal portfolio site', projectId: p4.id, panel: 'personal', status: 'ready', priority: 'low', dueDate: fmt(nextMonth), assignee: 'Sumit', energy: 'deep' });
    this.createTask({ title: 'Write case study — product launch', projectId: p4.id, panel: 'personal', status: 'not-ready', priority: 'medium', dueDate: fmt(nextMonth), assignee: 'Sumit', energy: 'deep' });

    // Mark some completed with history
    const c1 = this.createTask({ title: 'Initial project brief', projectId: p1.id, panel: 'work', status: 'completed', priority: 'high', dueDate: '2026-06-05', assignee: 'Sumit', completedAt: '2026-06-05T10:00:00.000Z', timeEstimate: 60, timeLogged: 55 });

    // Generate some completed tasks for streak/insights
    for (let i = 1; i <= 11; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      this.createTask({ title: `Daily task ${i}`, projectId: p2.id, panel: 'work', status: 'completed', priority: 'medium', dueDate: fmt(d), assignee: 'Sumit', completedAt: d.toISOString(), timeEstimate: 30, timeLogged: 35 });
    }

    // Today's daily plan
    this.saveDailyPlan({ date: today, mit: [], morningDone: false, eveningDone: false, eveningNotes: '', tomorrowTop3: '' });

    console.log('FlowTask: seed data loaded');
  }
};

// Auto-update delayed tasks on every load
(function() {
  const tasks = DB.getTasks();
  const updated = DB.autoUpdateDelayed(tasks);
  const changed = updated.filter((t, i) => t.status !== tasks[i].status);
  if (changed.length) {
    DB.save(DB.KEYS.tasks, updated);
    changed.forEach(t => DB.saveTask(t));
  }
  // Recompute priority scores
  const rescored = updated.map(t => ({ ...t, priorityScore: DB.computePriorityScore(t) }));
  DB.save(DB.KEYS.tasks, rescored);
})();
