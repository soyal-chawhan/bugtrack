/*
  app.js — BugTrack main app
  Redirects to index.html if not logged in.
*/

const API = 'http://localhost:5000/api';

const _token = localStorage.getItem('bt_token');
const _user  = localStorage.getItem('bt_user');
if (!_token || !_user) window.location.href = 'index.html';

// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  user:           JSON.parse(_user  || '{}'),
  token:          _token,
  tickets:        JSON.parse(localStorage.getItem('bt_tickets')  || '[]'),
  projects:       JSON.parse(localStorage.getItem('bt_projects') || '[]'),
  comments:       JSON.parse(localStorage.getItem('bt_comments') || '{}'),
  activeView:     'dashboard',
  activeTicketId: null,
  activeProjectId: null,
  nextTicketNum:  parseInt(localStorage.getItem('bt_ticket_num') || '1'),
};

function save() {
  localStorage.setItem('bt_tickets',    JSON.stringify(state.tickets));
  localStorage.setItem('bt_projects',   JSON.stringify(state.projects));
  localStorage.setItem('bt_comments',   JSON.stringify(state.comments));
  localStorage.setItem('bt_ticket_num', String(state.nextTicketNum));
}

function uid() { return Math.random().toString(36).slice(2, 10); }

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}

function authHeaders() {
  return { 'Content-Type':'application/json', 'Authorization':`Bearer ${state.token}` };
}

async function apiPost(path, body) {
  try { const r = await fetch(API+path,{method:'POST',headers:authHeaders(),body:JSON.stringify(body)}); return r.json(); } catch { return null; }
}
async function apiPatch(path, body) {
  try { const r = await fetch(API+path,{method:'PATCH',headers:authHeaders(),body:JSON.stringify(body)}); return r.json(); } catch { return null; }
}
async function apiDelete(path) {
  try { const r = await fetch(API+path,{method:'DELETE',headers:authHeaders()}); return r.json(); } catch { return null; }
}

// ── Demo seed ─────────────────────────────────────────────────────────────────

function seedDemoData() {
  if (state.projects.length) return;
  const ago = n => new Date(Date.now()-n*86400000).toISOString();

  state.projects = [
    { id:'p1', name:'Alpha App',   description:'Main web application', members:['Aarav','Sneha','Mihir'], createdAt: ago(20) },
    { id:'p2', name:'Mobile v2',   description:'React Native rewrite',  members:['Sneha','Priya'],         createdAt: ago(15) },
    { id:'p3', name:'Backend API', description:'Node.js REST service',   members:['Aarav','Mihir'],         createdAt: ago(10) },
  ];

  state.tickets = [
    { id:'BUG-001', title:'Login page crashes on Safari 16',         description:'Steps: open Safari 16, go to /login, click Sign In. Page crashes.',    priority:'high',   status:'todo',       projectId:'p1', assignee:'Aarav', createdAt:ago(5) },
    { id:'BUG-002', title:'Profile image upload fails over 5MB',     description:'File picker accepts it but upload silently fails.',                      priority:'medium', status:'inprogress', projectId:'p1', assignee:'Sneha', createdAt:ago(4) },
    { id:'BUG-003', title:'Dashboard charts blank on Firefox',        description:'Canvas stays empty after data loads. Works on Chrome.',                  priority:'high',   status:'inprogress', projectId:'p1', assignee:'Mihir', createdAt:ago(3) },
    { id:'BUG-004', title:'Notification emails landing in spam',      description:'SPF record may be misconfigured.',                                       priority:'low',    status:'todo',       projectId:'p1', assignee:'Priya', createdAt:ago(2) },
    { id:'BUG-005', title:'Password reset token expires too quickly', description:'Token window is 5 min. Should be 30.',                                   priority:'medium', status:'done',       projectId:'p1', assignee:'Aarav', createdAt:ago(6) },
    { id:'BUG-006', title:'Push notifications delayed 10 minutes',   description:'Firebase FCM delivery lag in production.',                                priority:'high',   status:'todo',       projectId:'p2', assignee:'Mihir', createdAt:ago(1) },
    { id:'BUG-007', title:'Swipe-to-delete triggers on scroll',      description:'Horizontal swipe conflicts with scroll on Android.',                      priority:'medium', status:'inprogress', projectId:'p2', assignee:'Sneha', createdAt:ago(3) },
    { id:'BUG-008', title:'JWT refresh fails silently on mobile',     description:'After 1hr token expires, user logged out silently.',                     priority:'high',   status:'done',       projectId:'p2', assignee:'Priya', createdAt:ago(7) },
    { id:'BUG-009', title:'Rate limit returns 500 instead of 429',   description:'Wrong HTTP status code returned.',                                        priority:'medium', status:'todo',       projectId:'p3', assignee:'Aarav', createdAt:ago(2) },
    { id:'BUG-010', title:'Webhook retry skips second attempt',       description:'Retry fires only once instead of 3 times.',                              priority:'low',    status:'done',       projectId:'p3', assignee:'Mihir', createdAt:ago(5) },
  ];

  state.comments = {
    'BUG-001': [
      { id:uid(), author:'Sneha', text:'Reproduced on Safari 16.3 — WebGL context issue.', createdAt:ago(4) },
      { id:uid(), author:'Aarav', text:'Investigating — might be the canvas polyfill.', createdAt:ago(3) },
    ],
  };

  state.nextTicketNum = 11;
  save();
}

// ── Theme ─────────────────────────────────────────────────────────────────────

function loadTheme() {
  document.documentElement.setAttribute('data-theme', localStorage.getItem('bt_theme') || 'light');
}

function changeTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('bt_theme', theme);
  closeModal('themeOverlayInapp');
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function toast(msg, type='default') {
  const el = document.createElement('div');
  el.className = 'toast'+(type==='error'?' toast-error':type==='success'?' toast-success':'');
  el.textContent = msg;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(()=>el.remove(), 3200);
}

// ── Modal helpers ─────────────────────────────────────────────────────────────

function openModal(id)  { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

function backdropClose(modalId) {
  document.getElementById(modalId).addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal(modalId);
  });
}

// ── Navigation ────────────────────────────────────────────────────────────────

function switchView(view) {
  state.activeView = view;
  const titles = { dashboard:'Dashboard', kanban:'Kanban Board', tickets:'All Tickets' };
  document.getElementById('pageTitle').textContent = titles[view] || view;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-'+view).classList.add('active');
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.querySelector(`.nav-link[data-view="${view}"]`)?.classList.add('active');
  renderAll();
}

function setupNav() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => { e.preventDefault(); switchView(link.dataset.view); });
  });
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function setupSidebar() {
  document.getElementById('sidebarCollapseBtn').addEventListener('click', () => {
    document.getElementById('appShell').classList.toggle('sidebar-collapsed');
  });
  document.getElementById('mobileMenuBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('bt_token');
    localStorage.removeItem('bt_user');
    window.location.href = 'index.html';
  });
  document.getElementById('themePickerBtn').addEventListener('click', () => openModal('themeOverlayInapp'));
  document.getElementById('closeThemePicker').addEventListener('click', () => closeModal('themeOverlayInapp'));
  backdropClose('themeOverlayInapp');

  document.getElementById('accountSettingsBtn').addEventListener('click', openAccountModal);
}

// ── Projects sidebar list ─────────────────────────────────────────────────────

function renderProjects() {
  const list   = document.getElementById('projectList');
  const colors = ['#6bc87a','#e8934a','#c0405a','#4050c8','#b85c2a','#8060c0'];

  list.innerHTML = state.projects.map((p, i) => `
    <li class="project-item" onclick="ProjectManager.openDetail('${p.id}')">
      <span class="project-pip" style="background:${colors[i%colors.length]}"></span>
      <span class="project-item-name">${p.name}</span>
      <span class="project-item-count">${state.tickets.filter(t=>t.projectId===p.id).length}</span>
    </li>
  `).join('') || '<li class="project-item" style="opacity:0.45;font-size:0.8rem;padding:6px 10px">No projects yet</li>';

  renderProjectSelects();
}

function renderProjectSelects() {
  ['ticketProject','filterProject','kanbanProjectFilter'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const val = el.value;
    const def = id==='ticketProject' ? '<option value="">Select project</option>' : '<option value="">All Projects</option>';
    el.innerHTML = def + state.projects.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
    if (val) el.value = val;
  });
}

// ── Project Manager ───────────────────────────────────────────────────────────

const ProjectManager = {

  openDetail(projectId) {
    const p = state.projects.find(x => x.id === projectId);
    if (!p) return;
    state.activeProjectId = projectId;

    document.getElementById('projectDetailName').textContent    = p.name;
    document.getElementById('projectDetailDesc').textContent    = p.description || 'No description.';
    document.getElementById('projectDetailCreated').textContent = fmt(p.createdAt);

    const projectTickets = state.tickets.filter(t => t.projectId === projectId);
    document.getElementById('projectDetailTicketCount').textContent = projectTickets.length;
    document.getElementById('projectDetailOpen').textContent        = projectTickets.filter(t=>t.status==='todo').length;

    // members list
    ProjectManager.renderMembers(p);

    // tickets in project
    const tickList = document.getElementById('projectTicketsList');
    tickList.innerHTML = projectTickets.slice(0,8).map(t => `
      <li class="recent-item" onclick="closeModal('projectDetailModal');openDetail('${t.id}')">
        <span class="recent-id">${t.id}</span>
        <span class="recent-title">${t.title}</span>
        <span class="badge badge-${t.status}">${{todo:'To Do',inprogress:'In Progress',done:'Done'}[t.status]}</span>
      </li>
    `).join('') || '<li style="padding:12px 0;color:var(--text-muted);font-size:0.85rem">No tickets yet.</li>';

    openModal('projectDetailModal');
  },

  renderMembers(p) {
    const members = p.members || [];
    document.getElementById('membersList').innerHTML = members.map(m => `
      <li class="member-item">
        <div class="member-avatar">${m.charAt(0).toUpperCase()}</div>
        <span class="member-name">${m}</span>
        <button class="member-remove-btn" onclick="ProjectManager.removeMember('${m}')" title="Remove member">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </li>
    `).join('') || '<li style="color:var(--text-muted);font-size:0.85rem;padding:8px 0">No members yet. Add one below.</li>';
  },

  addMember() {
    const input = document.getElementById('addMemberInput');
    const name  = input.value.trim();
    if (!name) return;

    const p = state.projects.find(x => x.id === state.activeProjectId);
    if (!p) return;
    if (!p.members) p.members = [];
    if (p.members.includes(name)) { toast('Already a member', 'error'); return; }

    p.members.push(name);
    save();
    input.value = '';
    ProjectManager.renderMembers(p);
    renderProjects();
    toast(name + ' added to project');
  },

  removeMember(name) {
    const p = state.projects.find(x => x.id === state.activeProjectId);
    if (!p) return;
    p.members = (p.members || []).filter(m => m !== name);
    save();
    ProjectManager.renderMembers(p);
    toast(name + ' removed');
  },

  deleteProject() {
    const id = state.activeProjectId;
    if (!id) return;
    const p = state.projects.find(x => x.id === id);
    if (!confirm(`Delete project "${p?.name}"? All tickets in this project will also be deleted.`)) return;

    state.projects = state.projects.filter(x => x.id !== id);
    state.tickets  = state.tickets.filter(t => t.projectId !== id);
    save();
    closeModal('projectDetailModal');
    renderProjects();
    renderAll();
    toast('Project deleted');
  },

  openEdit() {
    const p = state.projects.find(x => x.id === state.activeProjectId);
    if (!p) return;
    closeModal('projectDetailModal');
    document.getElementById('projectModalTitle').textContent   = 'Edit Project';
    document.getElementById('projectSubmitBtn').textContent    = 'Save Changes';
    document.getElementById('projectEditId').value            = p.id;
    document.getElementById('projectName').value              = p.name;
    document.getElementById('projectDesc').value              = p.description || '';
    openModal('projectModal');
  },
};

// ── Project create/edit modal ─────────────────────────────────────────────────

function setupProjectModal() {
  document.getElementById('newProjectBtn').addEventListener('click', () => {
    document.getElementById('projectModalTitle').textContent = 'New Project';
    document.getElementById('projectSubmitBtn').textContent  = 'Create Project';
    document.getElementById('projectEditId').value           = '';
    document.getElementById('projectForm').reset();
    openModal('projectModal');
  });

  document.getElementById('closeProjectModal').addEventListener('click',       () => closeModal('projectModal'));
  document.getElementById('cancelProjectBtn').addEventListener('click',        () => closeModal('projectModal'));
  document.getElementById('closeProjectDetailModal').addEventListener('click', () => closeModal('projectDetailModal'));
  document.getElementById('editProjectBtn').addEventListener('click',          () => ProjectManager.openEdit());
  document.getElementById('deleteProjectBtn').addEventListener('click',        () => ProjectManager.deleteProject());
  backdropClose('projectModal');
  backdropClose('projectDetailModal');

  document.getElementById('projectForm').addEventListener('submit', e => {
    e.preventDefault();
    const editId = document.getElementById('projectEditId').value;
    const name   = document.getElementById('projectName').value.trim();
    const desc   = document.getElementById('projectDesc').value.trim();
    if (!name) return;

    if (editId) {
      const p = state.projects.find(x => x.id === editId);
      if (p) { p.name = name; p.description = desc; }
      toast('Project updated');
    } else {
      state.projects.push({ id: uid(), name, description: desc, members: [state.user?.name || 'You'], createdAt: new Date().toISOString() });
      toast('Project "' + name + '" created');
    }

    save();
    document.getElementById('projectForm').reset();
    closeModal('projectModal');
    renderProjects();
    renderAll();
  });
}

// ── Account modal ─────────────────────────────────────────────────────────────

function openAccountModal() {
  const u    = state.user;
  const name = u?.name || u?.email || 'User';
  document.getElementById('accountAvatar').textContent = name.charAt(0).toUpperCase();
  document.getElementById('accountName').textContent   = name;
  document.getElementById('accountEmail').textContent  = u?.email || '';
  openModal('accountModal');
}

function setupAccountModal() {
  document.getElementById('closeAccountModal').addEventListener('click', () => closeModal('accountModal'));
  backdropClose('accountModal');

  document.getElementById('deleteAccountBtn').addEventListener('click', () => {
    if (!confirm('Are you absolutely sure? This will permanently delete your account and all your data. This cannot be undone.')) return;
    if (!confirm('Last chance — really delete your account?')) return;

    // clear everything
    localStorage.clear();
    toast('Account deleted. Redirecting...', 'success');
    setTimeout(() => window.location.href = 'index.html', 1500);
  });
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function renderDashboard() {
  const t = state.tickets;
  document.getElementById('stat-total').textContent    = t.length;
  document.getElementById('stat-open').textContent     = t.filter(x=>x.status==='todo').length;
  document.getElementById('stat-progress').textContent = t.filter(x=>x.status==='inprogress').length;
  document.getElementById('stat-done').textContent     = t.filter(x=>x.status==='done').length;

  const recent = [...t].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,8);
  document.getElementById('recentTickets').innerHTML = recent.map(ticket=>`
    <li class="recent-item" onclick="openDetail('${ticket.id}')">
      <span class="recent-id">${ticket.id}</span>
      <span class="recent-title">${ticket.title}</span>
      <span class="badge badge-${ticket.priority}">${ticket.priority}</span>
    </li>
  `).join('') || '<li style="padding:16px 20px;color:var(--text-muted);font-size:0.85rem">No tickets yet.</li>';

  const total  = t.length || 1;
  const counts = { high:t.filter(x=>x.priority==='high').length, medium:t.filter(x=>x.priority==='medium').length, low:t.filter(x=>x.priority==='low').length };
  document.getElementById('priorityBars').innerHTML = [
    {label:'High',   key:'high',   cls:'fill-high'},
    {label:'Medium', key:'medium', cls:'fill-medium'},
    {label:'Low',    key:'low',    cls:'fill-low'},
  ].map(row=>`
    <div class="pbar-row">
      <div class="pbar-meta"><span class="pbar-label">${row.label}</span><span class="pbar-count">${counts[row.key]} tickets</span></div>
      <div class="pbar-track"><div class="pbar-fill ${row.cls}" style="width:${Math.round(counts[row.key]/total*100)}%"></div></div>
    </div>
  `).join('');
}

// ── Kanban ────────────────────────────────────────────────────────────────────

const Kanban = {
  draggingId: null,

  render(tickets) {
    ['todo','inprogress','done'].forEach(status => {
      const col   = document.getElementById('cards-'+status);
      const badge = document.getElementById('badge-'+status);
      if (!col) return;
      const cards = tickets.filter(t=>t.status===status);
      badge.textContent = cards.length;
      col.innerHTML = cards.map(t=>`
        <div class="kanban-card" draggable="true" data-id="${t.id}"
          ondragstart="Kanban.onDragStart(event,'${t.id}')"
          ondragend="Kanban.onDragEnd(event)"
          onclick="openDetail('${t.id}')">
          <div class="card-title">${t.title}</div>
          <div class="card-footer">
            <span class="card-id">${t.id}</span>
            <span class="badge badge-${t.priority}">${t.priority}</span>
            ${t.assignee?`<span class="card-assignee">${t.assignee}</span>`:''}
          </div>
        </div>
      `).join('') || `<div class="col-empty">Drop tickets here</div>`;
    });
  },

  onDragStart(e,id){ Kanban.draggingId=id; e.currentTarget.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; },
  onDragEnd(e)     { e.currentTarget.classList.remove('dragging'); },

  onDrop(e, status) {
    e.preventDefault();
    if (!Kanban.draggingId) return;
    const ticket = state.tickets.find(t=>t.id===Kanban.draggingId);
    if (!ticket||ticket.status===status) return;
    ticket.status = status;
    save();
    apiPatch('/tickets/'+ticket.id, {status});
    renderKanban();
    renderDashboard();
    toast('Moved to '+{todo:'To Do',inprogress:'In Progress',done:'Done'}[status]);
    Kanban.draggingId = null;
  },
};

function renderKanban() {
  let tickets = [...state.tickets];
  const proj = document.getElementById('kanbanProjectFilter')?.value;
  const prio = document.getElementById('kanbanPriorityFilter')?.value;
  if (proj) tickets = tickets.filter(t=>t.projectId===proj);
  if (prio) tickets = tickets.filter(t=>t.priority===prio);
  Kanban.render(tickets);
}

// ── Tickets table ─────────────────────────────────────────────────────────────

function renderTicketsTable(searchStr='') {
  let tickets = [...state.tickets];
  const status   = document.getElementById('filterStatus')?.value   || '';
  const priority = document.getElementById('filterPriority')?.value || '';
  const project  = document.getElementById('filterProject')?.value  || '';
  if (status)   tickets = tickets.filter(t=>t.status===status);
  if (priority) tickets = tickets.filter(t=>t.priority===priority);
  if (project)  tickets = tickets.filter(t=>t.projectId===project);
  if (searchStr) {
    const q = searchStr.toLowerCase();
    tickets = tickets.filter(t=>t.title.toLowerCase().includes(q)||t.id.toLowerCase().includes(q)||(t.assignee||'').toLowerCase().includes(q));
  }

  const tbody   = document.getElementById('ticketsTableBody');
  const emptyEl = document.getElementById('ticketsEmpty');
  const label   = {todo:'To Do',inprogress:'In Progress',done:'Done'};

  if (!tickets.length) { tbody.innerHTML=''; emptyEl.classList.remove('hidden'); return; }
  emptyEl.classList.add('hidden');

  tbody.innerHTML = tickets.map(t => {
    const proj = state.projects.find(p=>p.id===t.projectId);
    return `
      <tr onclick="openDetail('${t.id}')">
        <td class="td-id">${t.id}</td>
        <td class="td-title">${t.title}</td>
        <td>${proj?proj.name:'—'}</td>
        <td><span class="badge badge-${t.priority}">${t.priority}</span></td>
        <td><span class="badge badge-${t.status}">${label[t.status]||t.status}</span></td>
        <td>${t.assignee||'—'}</td>
        <td class="td-date">${fmt(t.createdAt)}</td>
        <td class="td-actions"><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openEdit('${t.id}')">Edit</button></td>
      </tr>
    `;
  }).join('');
}

// ── Ticket modal (create / edit) ──────────────────────────────────────────────

function setupTicketModal() {
  document.getElementById('newTicketBtn').addEventListener('click', openCreateTicket);
  document.getElementById('closeTicketModal').addEventListener('click', ()=>closeModal('ticketModal'));
  document.getElementById('cancelTicketBtn').addEventListener('click', ()=>closeModal('ticketModal'));
  backdropClose('ticketModal');

  document.getElementById('ticketForm').addEventListener('submit', async e => {
    e.preventDefault();
    const id          = document.getElementById('ticketId').value;
    const title       = document.getElementById('ticketTitle').value.trim();
    const description = document.getElementById('ticketDesc').value.trim();
    const projectId   = document.getElementById('ticketProject').value;
    const priority    = document.getElementById('ticketPriority').value;
    const status      = document.getElementById('ticketStatus').value;
    const assignee    = document.getElementById('ticketAssignee').value.trim();

    if (!title||!projectId) { toast('Title and project are required.','error'); return; }

    if (id) {
      const ticket = state.tickets.find(t=>t.id===id);
      Object.assign(ticket, {title,description,projectId,priority,status,assignee});
      apiPatch('/tickets/'+id, {title,description,projectId,priority,status,assignee});
      toast('Ticket updated');
    } else {
      const newId  = 'BUG-'+String(state.nextTicketNum++).padStart(3,'0');
      const ticket = {id:newId,title,description,projectId,priority,status,assignee,createdAt:new Date().toISOString()};
      state.tickets.unshift(ticket);
      apiPost('/tickets', ticket);
      toast(newId+' created');
    }
    save();
    closeModal('ticketModal');
    renderAll();
  });
}

function openCreateTicket() {
  document.getElementById('modalTitle').textContent      = 'New Ticket';
  document.getElementById('ticketSubmitBtn').textContent = 'Create Ticket';
  document.getElementById('ticketId').value              = '';
  document.getElementById('ticketForm').reset();
  renderProjectSelects();
  openModal('ticketModal');
}

function openEdit(id) {
  const t = state.tickets.find(x=>x.id===id);
  if (!t) return;
  document.getElementById('modalTitle').textContent      = 'Edit Ticket';
  document.getElementById('ticketSubmitBtn').textContent = 'Save Changes';
  document.getElementById('ticketId').value              = t.id;
  document.getElementById('ticketTitle').value           = t.title;
  document.getElementById('ticketDesc').value            = t.description||'';
  document.getElementById('ticketPriority').value        = t.priority;
  document.getElementById('ticketStatus').value          = t.status;
  document.getElementById('ticketAssignee').value        = t.assignee||'';
  renderProjectSelects();
  document.getElementById('ticketProject').value = t.projectId||'';
  openModal('ticketModal');
}

// ── Ticket detail modal ───────────────────────────────────────────────────────

function openDetail(id) {
  const t = state.tickets.find(x=>x.id===id);
  if (!t) return;
  state.activeTicketId = id;
  const proj  = state.projects.find(p=>p.id===t.projectId);
  const label = {todo:'To Do',inprogress:'In Progress',done:'Done'};

  document.getElementById('detailId').textContent       = t.id;
  document.getElementById('detailTitle').textContent    = t.title;
  document.getElementById('detailDesc').textContent     = t.description||'No description provided.';
  document.getElementById('detailProject').textContent  = proj?proj.name:'—';
  document.getElementById('detailAssignee').textContent = t.assignee||'Unassigned';
  document.getElementById('detailCreated').textContent  = fmt(t.createdAt);

  const sEl = document.getElementById('detailStatus');
  sEl.textContent = label[t.status]||t.status; sEl.className='badge badge-'+t.status;

  const pEl = document.getElementById('detailPriority');
  pEl.textContent = t.priority; pEl.className='badge badge-'+t.priority;

  renderComments(id);
  openModal('detailModal');
}

function renderComments(ticketId) {
  const comments = state.comments[ticketId]||[];
  document.getElementById('commentsList').innerHTML = comments.map(c=>`
    <li class="comment-item">
      <div class="comment-author">${c.author}</div>
      <div class="comment-text">${c.text}</div>
      <div class="comment-time">${fmt(c.createdAt)}</div>
    </li>
  `).join('') || '<li style="padding:8px 0;font-size:0.82rem;color:var(--text-muted)">No comments yet.</li>';
}

function setupDetailModal() {
  document.getElementById('closeDetailModal').addEventListener('click', ()=>closeModal('detailModal'));
  backdropClose('detailModal');

  document.getElementById('editTicketBtn').addEventListener('click', ()=>{
    closeModal('detailModal');
    openEdit(state.activeTicketId);
  });

  document.getElementById('deleteTicketBtn').addEventListener('click', async ()=>{
    if (!confirm('Delete this ticket? This cannot be undone.')) return;
    state.tickets = state.tickets.filter(t=>t.id!==state.activeTicketId);
    delete state.comments[state.activeTicketId];
    save();
    apiDelete('/tickets/'+state.activeTicketId);
    closeModal('detailModal');
    renderAll();
    toast('Ticket deleted');
  });

  document.getElementById('commentForm').addEventListener('submit', e=>{
    e.preventDefault();
    const text = document.getElementById('commentInput').value.trim();
    if (!text) return;
    const id = state.activeTicketId;
    if (!state.comments[id]) state.comments[id]=[];
    state.comments[id].push({id:uid(), author:state.user?.name||'You', text, createdAt:new Date().toISOString()});
    save();
    document.getElementById('commentInput').value='';
    renderComments(id);
    toast('Comment posted');
  });
}

// ── Filters + Search ──────────────────────────────────────────────────────────

function setupFilters() {
  ['filterStatus','filterPriority','filterProject'].forEach(id=>{
    document.getElementById(id)?.addEventListener('change', ()=>renderTicketsTable(document.getElementById('searchInput').value));
  });
  ['kanbanProjectFilter','kanbanPriorityFilter'].forEach(id=>{
    document.getElementById(id)?.addEventListener('change', renderKanban);
  });
}

function setupSearch() {
  let timer;
  document.getElementById('searchInput').addEventListener('input', e=>{
    clearTimeout(timer);
    timer = setTimeout(()=>renderTicketsTable(e.target.value), 220);
  });
}

// ── Render all ────────────────────────────────────────────────────────────────

function renderAll() {
  renderDashboard();
  renderKanban();
  renderTicketsTable(document.getElementById('searchInput')?.value||'');
  renderProjectSelects();
}

// ── Boot ──────────────────────────────────────────────────────────────────────

loadTheme();
seedDemoData();

document.getElementById('sidebarUser').textContent = state.user?.name || state.user?.email || '';

setupNav();
setupSidebar();
setupTicketModal();
setupProjectModal();
setupDetailModal();
setupAccountModal();
setupFilters();
setupSearch();
renderProjects();
renderAll();
