const ALGOS = {
  fcfs: { name: 'FCFS', title: 'First Come First Serve', desc: 'Processes run strictly in the order they arrive. Simple and fair by arrival, but one long job can hold up everything behind it.' },
  sjf: { name: 'SJF', title: 'Shortest Job First', desc: 'Among the processes that have arrived, the one with the smallest burst time runs next, and it is never interrupted.' },
  srtf: { name: 'SRTF', title: 'Shortest Remaining Time First', desc: 'The preemptive version of SJF. A newly arrived process takes the CPU if its burst is shorter than what the running process has left.' },
  ljf: { name: 'LJF', title: 'Longest Job First', desc: 'Among the processes that have arrived, the one with the largest burst time runs next, and it is never interrupted.' },
  lrtf: { name: 'LRTF', title: 'Longest Remaining Time First', desc: 'The preemptive version of LJF. At every time unit the process with the most remaining time runs, so a newly arrived longer job takes the CPU.' },
  prio: { name: 'Priority', title: 'Priority Scheduling (Non-Preemptive)', desc: 'The waiting process with the highest priority runs next, and it keeps the CPU until it finishes. A lower number means a higher priority.', pr: true },
  prioP: { name: 'Priority (Preemptive)', title: 'Priority Scheduling (Preemptive)', desc: 'A newly arrived process with a higher priority takes the CPU from the running one. A lower number means a higher priority.', pr: true },
  rr: { name: 'Round Robin', title: 'Round Robin', desc: 'Each process gets the CPU for a fixed time quantum, then goes to the back of the queue if it is not finished.', rr: true },
  hrrn: { name: 'HRRN', title: 'Highest Response Ratio Next', desc: 'The next process is the one with the highest ratio of (waiting time + burst time) / burst time, so long-waiting jobs eventually get their turn. Response time is shown for every process.', rt: true },
  compare: { name: 'Compare all', title: 'Compare All Algorithms', desc: 'Run every algorithm on the same processes and see which gives the lowest average waiting time.', pr: true, rr: true, cmp: true }
};
const SAMPLE = [['P1', 0, 5, 2], ['P2', 1, 3, 1], ['P3', 2, 8, 4], ['P4', 3, 6, 3]];
let procs = SAMPLE.map(([id, at, bt, pr]) => ({ id, at, bt, pr }));
let cur = 'fcfs';
const $ = id => document.getElementById(id);
const f = x => Number.isInteger(x) ? x : x.toFixed(2);

function buildNav() {
  $('nav').innerHTML = Object.entries(ALGOS).map(([k, a]) =>
    (k === 'compare' ? '<hr>' : '') + `<a href="#${k}" data-k="${k}">${a.name}</a>`).join('');
}

function renderInputs() {
  const a = ALGOS[cur];
  $('inHead').innerHTML = `<tr><th>Process ID</th><th>Arrival time</th><th>Burst time</th>${a.pr ? '<th>Priority</th>' : ''}<th></th></tr>`;
  $('inBody').innerHTML = procs.map((p, i) => `<tr>
    <td><input data-i="${i}" data-f="id" value="${p.id}" aria-label="Process ID"></td>
    <td><input type="number" min="0" step="1" data-i="${i}" data-f="at" value="${p.at}" aria-label="Arrival time"></td>
    <td><input type="number" min="1" step="1" data-i="${i}" data-f="bt" value="${p.bt}" aria-label="Burst time"></td>
    ${a.pr ? `<td><input type="number" step="1" data-i="${i}" data-f="pr" value="${p.pr}" aria-label="Priority"></td>` : ''}
    <td><button class="ghost del" data-del="${i}" aria-label="Remove ${p.id}">Remove</button></td></tr>`).join('');
  $('qWrap').classList.toggle('hidden', !a.rr);
}

function route() {
  const k = location.hash.slice(1);
  cur = ALGOS[k] ? k : 'fcfs';
  const a = ALGOS[cur];
  $('title').textContent = a.title;
  $('desc').textContent = a.desc;
  document.title = a.title + ' | CPU Scheduling Simulator';
  document.querySelectorAll('nav a').forEach(l => l.classList.toggle('on', l.dataset.k === cur));
  $('runBtn').textContent = a.cmp ? 'Compare algorithms' : 'Run simulation';
  $('error').textContent = '';
  $('result').classList.add('hidden');
  $('compare').classList.add('hidden');
  renderInputs();
}

function validate() {
  if (!procs.length) throw new Error('Add at least one process.');
  const seen = new Set();
  return procs.map((p, i) => {
    const o = { id: String(p.id).trim() || 'P' + (i + 1), at: parseInt(p.at), bt: parseInt(p.bt), pr: parseInt(p.pr) || 0 };
    if (seen.has(o.id)) throw new Error(`Process ID "${o.id}" is used twice. Give each process a unique ID.`);
    seen.add(o.id);
    if (isNaN(o.at) || o.at < 0) throw new Error(`${o.id}: arrival time must be 0 or more.`);
    if (isNaN(o.bt) || o.bt < 1) throw new Error(`${o.id}: burst time must be at least 1.`);
    return o;
  });
}

function simulate(algo, input, q) {
  const ps = input.map(p => ({ ...p, rem: p.bt, ct: 0 }));
  const n = ps.length, g = [];
  let t = 0, done = 0;
  const push = (id, s, e) => {
    const l = g[g.length - 1];
    if (l && l.id === id && l.end === s) l.end = e; else g.push({ id, start: s, end: e });
  };
  const idleTo = () => {
    const nx = Math.min(...ps.filter(p => p.rem > 0).map(p => p.at));
    push('Idle', t, nx); t = nx;
  };

  if (algo === 'rr') {
    const order = [...ps].sort((a, b) => a.at - b.at), queue = [];
    let i = 0;
    const admit = () => { while (i < n && order[i].at <= t) queue.push(order[i++]); };
    while (done < n) {
      admit();
      if (!queue.length) { push('Idle', t, order[i].at); t = order[i].at; continue; }
      const p = queue.shift(), r = Math.min(q, p.rem);
      push(p.id, t, t + r); t += r; p.rem -= r;
      admit();
      if (p.rem > 0) queue.push(p); else { p.ct = t; done++; }
    }
  } else if (algo === 'srtf' || algo === 'lrtf' || algo === 'prioP') {
    const cmp = {
      srtf: (a, b) => a.rem - b.rem || a.at - b.at,
      lrtf: (a, b) => b.rem - a.rem || a.at - b.at,
      prioP: (a, b) => a.pr - b.pr || a.at - b.at
    }[algo];
    while (done < n) {
      const ready = ps.filter(p => p.rem > 0 && p.at <= t);
      if (!ready.length) { idleTo(); continue; }
      const p = ready.sort(cmp)[0];
      push(p.id, t, t + 1); p.rem--; t++;
      if (p.rem === 0) { p.ct = t; done++; }
    }
  } else {
    const cmp = {
      fcfs: (a, b) => a.at - b.at,
      sjf: (a, b) => a.bt - b.bt || a.at - b.at,
      ljf: (a, b) => b.bt - a.bt || a.at - b.at,
      prio: (a, b) => a.pr - b.pr || a.at - b.at,
      hrrn: (a, b) => ((t - b.at + b.bt) / b.bt) - ((t - a.at + a.bt) / a.bt) || a.at - b.at
    }[algo];
    while (done < n) {
      const ready = ps.filter(p => p.rem > 0 && p.at <= t);
      if (!ready.length) { idleTo(); continue; }
      const p = ready.sort(cmp)[0];
      push(p.id, t, t + p.bt); t += p.bt; p.rem = 0; p.ct = t; done++;
    }
  }
  // Response time = time of first CPU allocation - arrival time
  const firstRun = {};
  g.forEach(b => { if (b.id !== 'Idle' && !(b.id in firstRun)) firstRun[b.id] = b.start; });
  const rows = ps.map(p => ({ id: p.id, at: p.at, bt: p.bt, ct: p.ct, tat: p.ct - p.at, wt: p.ct - p.at - p.bt, rt: firstRun[p.id] - p.at }));
  const avg = k => rows.reduce((s, r) => s + r[k], 0) / n;
  return { rows, gantt: g, avgCT: avg('ct'), avgTAT: avg('tat'), avgWT: avg('wt'), avgRT: avg('rt') };
}

function getQ() {
  const q = parseInt($('quantum').value);
  if (isNaN(q) || q < 1) throw new Error('Time quantum must be at least 1.');
  return q;
}

function showOne(input) {
  const a = ALGOS[cur];
  const r = simulate(cur, input, a.rr ? getQ() : 1);
  const ids = [...new Set(r.rows.map(x => x.id))];
  const hue = id => 175 + (ids.indexOf(id) * 47) % 200;   // cyan -> violet -> magenta range
  $('gantt').innerHTML = r.gantt.map((b, i) => {
    const d = b.end - b.start;
    const style = b.id === 'Idle' ? '' : `--h:${hue(b.id)};`;
    return `<div class="blk ${b.id === 'Idle' ? 'idle' : ''}" style="${style}min-width:${Math.max(54, d * 30)}px;animation-delay:${Math.min(i * 70, 1400)}ms">${b.id}<span class="s">${b.start}</span><span class="e">${b.end}</span></div>`;
  }).join('');
  $('resHead').innerHTML = `<tr><th>Process</th><th>Arrival</th><th>Burst</th><th>Completion (CT)</th><th>Turnaround (TAT)</th><th>Waiting (WT)</th>${a.rt ? '<th>Response (RT)</th>' : ''}</tr>`;
  $('resBody').innerHTML = r.rows.map(x =>
    `<tr><td>${x.id}</td><td>${x.at}</td><td>${x.bt}</td><td>${x.ct}</td><td>${x.tat}</td><td>${x.wt}</td>${a.rt ? `<td>${x.rt}</td>` : ''}</tr>`).join('');
  const cards = [['Average completion time', r.avgCT], ['Average turnaround time', r.avgTAT], ['Average waiting time', r.avgWT]];
  if (a.rt) cards.push(['Average response time', r.avgRT]);
  $('avgs').innerHTML = cards.map(([l, v]) => `<div class="avg"><b>${f(v)}</b><span>${l}</span></div>`).join('');
  $('resNote').textContent = 'TAT = CT - Arrival, WT = TAT - Burst' + (a.rt ? ', RT = first CPU time - Arrival.' : '.');
  $('result').classList.remove('hidden');
}

function showAll(input) {
  const q = getQ();
  const res = Object.keys(ALGOS).filter(k => k !== 'compare').map(k => ({ k, ...simulate(k, input, q) }));
  const best = Math.min(...res.map(r => r.avgWT));
  $('cmpBody').innerHTML = res.map(r =>
    `<tr class="${r.avgWT === best ? 'best' : ''}"><td>${ALGOS[r.k].title}${r.k === 'rr' ? ' (q=' + q + ')' : ''}</td><td>${f(r.avgCT)}</td><td>${f(r.avgTAT)}</td><td>${f(r.avgWT)}</td><td>${f(r.avgRT)}</td></tr>`).join('');
  $('compare').classList.remove('hidden');
}

$('inBody').addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.i) procs[t.dataset.i][t.dataset.f] = t.value;
});
$('inBody').addEventListener('click', e => {
  if (e.target.dataset.del !== undefined) { procs.splice(e.target.dataset.del, 1); renderInputs(); }
});
$('addBtn').onclick = () => { procs.push({ id: 'P' + (procs.length + 1), at: 0, bt: 1, pr: 1 }); renderInputs(); };
$('resetBtn').onclick = () => { procs = SAMPLE.map(([id, at, bt, pr]) => ({ id, at, bt, pr })); renderInputs(); };
$('runBtn').onclick = () => {
  $('error').textContent = '';
  try {
    const input = validate();
    ALGOS[cur].cmp ? showAll(input) : showOne(input);
  } catch (e) { $('error').textContent = e.message; }
};
window.addEventListener('hashchange', route);
buildNav();
route();
