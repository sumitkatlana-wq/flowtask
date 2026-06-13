// ─── FlowTask Modals ──────────────────────────────────────────────────────

const Modals = {
  newProject() {
    const colors = ['#7F77DD','#1D9E75','#D85A30','#378ADD','#EF9F27','#E24B4A','#888780','#D4537E'];
    return `
      <div class="modal">
        <div class="modal-title">New project</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div class="field-group">
            <label class="field-label">Project name</label>
            <input class="field-input" id="proj-name-input" placeholder="e.g. Website redesign" autofocus>
          </div>
          <div class="field-group">
            <label class="field-label">Priority</label>
            <select class="field-input field-select" id="proj-priority-input">
              <option value="highest">Highest</option>
              <option value="high">High</option>
              <option value="medium" selected>Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div class="field-group">
            <label class="field-label">Due date</label>
            <input class="field-input" type="date" id="proj-due-input">
          </div>
          <div class="field-group">
            <label class="field-label">Color</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              ${colors.map((c,i) => `<label style="cursor:pointer"><input type="radio" name="proj-color" value="${c}" ${i===0?'checked':''} style="display:none"><span style="display:block;width:26px;height:26px;border-radius:50%;background:${c};outline:2px solid transparent;transition:outline .1s" onclick="document.getElementById('proj-color-input').value='${c}';this.style.outline='2px solid var(--text)'"></span></label>`).join('')}
            </div>
            <input type="hidden" id="proj-color-input" value="${colors[0]}">
          </div>
          <div class="field-group">
            <label class="field-label">Link to goal (optional)</label>
            <select class="field-input field-select" id="proj-goal-input">
              <option value="">No goal</option>
              ${DB.getGoals().map(g => `<option value="${g.id}">${App.esc(g.title)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" onclick="App.closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="App.saveNewProject()">Create project</button>
        </div>
      </div>`;
  },
};
