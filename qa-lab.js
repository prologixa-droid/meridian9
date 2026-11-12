(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const PATCH_KEY = 'meridian-qa-patches-pt100-v2';
  const RUN_KEY = 'meridian-qa-runs-pt100-v2';
  const patchDefaults = { discountSubtotal: false, confirmationEvent: false };
  const readJson = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  };
  let patches = { ...patchDefaults, ...readJson(PATCH_KEY, {}) };
  let running = false;

  $('#todayLabel').textContent = new Intl.DateTimeFormat(undefined, {
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric'
  }).format(new Date()).toUpperCase();

  const testView = $('#testing-view');
  testView.innerHTML = `
    <div class="eyebrow"><span class="live-dot"></span> CHECKOUT REGRESSION <span class="tag tag-dark demo-tag">BROWSER QA LAB</span></div>
    <div class="work-title"><div><h1>Checkout regression suite</h1><p class="subhead">Training storefront fixture · build 184 · browser-executed UI checks</p></div><button class="button button-dark" id="runTests">▶ &nbsp;Run 8 browser checks</button></div>
    <div class="qa-callout"><b>Assigned workflow</b><span>Inspect a failing assertion → apply a focused patch → rerun the same browser journey → review the run record.</span><small>This isolated storefront is a training fixture. It sends no orders and does not connect to production.</small></div>
    <div class="test-summary"><div><span class="summary-label">LATEST RUN</span><b id="runTime">No run yet</b></div><div><span class="summary-label">DURATION</span><b id="duration">—</b></div><div><span class="summary-label">RESULT</span><b class="summary-result" id="resultLabel">Not run</b></div><div class="run-status" id="runStatus">●&nbsp; Ready</div></div>
    <div class="qa-workspace"><section class="test-console"><div class="console-header"><div><h2>Regression checks</h2><p>Each check acts on the storefront preview and asserts the resulting page state.</p></div><span class="qa-build-tag">BUILD 184</span></div><div class="test-table"><div class="table-head"><span>CHECK / ASSERTION</span><span>RESULT</span><span>TIME</span><span></span></div><div id="testRows"></div></div><div class="console-footer"><span id="passedCount">0 passed</span><span id="failedCount">0 failed</span><button class="text-button" id="resetTests">Reset run results</button></div><section class="run-history"><h3>Recent runs</h3><div id="runHistory"><p>No runs recorded in this browser yet.</p></div></section></section>
      <aside class="qa-side"><section class="fixture-card"><div class="fixture-heading"><div><span class="detail-label">ISOLATED TARGET</span><h2>Meridian Skin · Storefront</h2></div><span class="fixture-live">LOCAL FIXTURE</span></div><iframe id="checkoutFixture" title="Isolated cosmetic checkout training fixture"></iframe></section>
      <section class="patch-card"><span class="detail-label">CHANGE REVIEW</span><h2>Checkout patch set</h2><p>Apply the two scoped implementation changes, then verify them through the UI suite.</p><label class="patch-choice"><input type="checkbox" id="discountPatch"><span><b>Use the discounted subtotal</b><small>Calculate the 10% offer against the $48.00 item subtotal.</small><code>total = subtotal - (subtotal * 0.10)</code></span></label><label class="patch-choice"><input type="checkbox" id="confirmationPatch"><span><b>Wait for the order-created event</b><small>Show confirmation after the fixture creates the order record.</small><code>await orderCreated; renderConfirmation()</code></span></label><div class="patch-actions"><button class="button button-dark" id="applyPatch">Apply patch set</button><button class="button button-quiet" id="resetPatch">Restore build 184</button></div><p class="patch-state" id="patchState" role="status"></p></section></aside>
    </div><footer>QA workbench · Browser-run checks against a local fixture · No live systems connected</footer>`;

  const inspectionCheck = document.createElement('label');
  inspectionCheck.className = 'inspection-check';
  inspectionCheck.innerHTML = '<input id="inspectionConfirmed" type="checkbox"><span><b>Evidence reviewed</b><small>I inspected the image and product details before choosing a category.</small></span>';
  $('#labelOptions').before(inspectionCheck);

  const fixtureMarkup = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    *{box-sizing:border-box}body{margin:0;padding:22px;background:#f7f8f5;color:#26352e;font:14px/1.45 Arial,sans-serif}.top{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e1e6e0;padding-bottom:12px}.brand{font-weight:700;letter-spacing:.12em;font-size:12px}.cart{border:1px solid #dfe5df;border-radius:20px;padding:6px 10px;font-size:12px}.product{display:grid;grid-template-columns:75px 1fr;gap:14px;align-items:center;padding:18px 0}.pack{height:92px;border-radius:16px 16px 12px 12px;background:linear-gradient(90deg,#8ea99a,#d9e2d5 46%,#91aa99);position:relative;box-shadow:0 10px 14px #283c2d20}.pack:before{content:'';position:absolute;top:-13px;left:23px;width:30px;height:17px;border-radius:5px 5px 2px 2px;background:#445c4e}.muted{color:#77847c;font-size:12px}.price{font-weight:700}.field{display:block;margin:10px 0 5px;font-size:12px;font-weight:600}input,select{width:100%;padding:9px;border:1px solid #d8e0d9;border-radius:5px;background:white;font:13px Arial}.row{display:flex;gap:8px}.row button,button{border:0;border-radius:5px;background:#234b39;color:#fff;padding:9px 12px;font-weight:600;cursor:pointer}.row>*{flex:1}.box{margin-top:12px;padding-top:12px;border-top:1px solid #e1e6e0}.total{display:flex;justify-content:space-between;font-weight:700;padding:10px 0}.message{min-height:22px;margin-top:8px;color:#8b573c;font-size:12px}.success{color:#35744a}.email{color:#64806c;font-size:12px;min-height:18px}.guest{display:flex;align-items:center;justify-content:space-between;gap:8px}.guest button{white-space:nowrap}.hidden{display:none!important}h1{font-size:17px;margin:0 0 3px}h2{font-size:14px;margin:0}p{margin:4px 0}.secure{font-size:11px;color:#869189}
    </style></head><body><div class="top"><span class="brand">MERIDIAN SKIN</span><span class="cart">Bag <b id="cartCount">0</b></span></div><main><div class="product"><div class="pack" aria-hidden="true"></div><div><p class="muted">BARRIER SUPPORT · 50 ML</p><h1 id="productTitle">Daily Barrier Cream</h1><p class="price">$48.00</p><button id="addToCart">Add to bag</button></div></div><section class="box"><label class="field" for="promoCode">Promotion code</label><div class="row"><input id="promoCode" value="" placeholder="Enter code"><button id="applyPromo">Apply code</button></div><p class="message" id="promoMessage" aria-live="polite"></p><label class="field" for="shippingOption">Delivery</label><select id="shippingOption"><option value="standard">Standard · Free</option><option value="express">Express · $8.00</option></select><div class="total"><span>Subtotal</span><span id="subtotal">$48.00</span></div></section><section class="box"><div class="guest"><div><b>Guest checkout</b><p class="muted">No account required</p></div><button id="guestCheckout">Continue as guest</button></div><div id="checkoutForm" class="hidden"><label class="field" for="guestEmail">Email for order updates</label><input id="guestEmail" type="email" value="training@example.test"><label class="field" for="paymentMethod">Payment method</label><select id="paymentMethod"><option>Training card ending 4242</option></select><button id="placeOrder">Place training order</button></div><p id="confirmationMessage" class="message" aria-live="polite"></p><p id="emailStatus" class="email"></p></section><p class="secure">Training fixture · no payment is processed</p></main><script>
    (()=>{const state={count:0,subtotal:48,discount:false,guest:false,order:false,email:false,confirmed:false};let patches={discountSubtotal:false,confirmationEvent:false};const money=n=>'$'+n.toFixed(2);function render(){document.querySelector('#cartCount').textContent=state.count;document.querySelector('#subtotal').textContent=money(state.subtotal);document.querySelector('#emailStatus').textContent=state.email?'Confirmation email queued in fixture':' ';document.querySelector('#emailStatus').className='email'+(state.email?' success':'');document.querySelector('#confirmationMessage').textContent=state.confirmed?'':state.order?'Confirmation timed out waiting for the order-created event':'';document.querySelector('#confirmationMessage').className='message'+(state.confirmed?' success':'');let h=document.querySelector('#confirmationHeading');if(state.confirmed&&!h){h=document.createElement('h2');h.id='confirmationHeading';h.textContent='Order placed';document.querySelector('#confirmationMessage').before(h)}else if(!state.confirmed&&h)h.remove()}document.querySelector('#addToCart').onclick=()=>{state.count+=1;render()};document.querySelector('#applyPromo').onclick=()=>{const code=document.querySelector('#promoCode').value.trim().toUpperCase();if(code!=='SAVE10'){document.querySelector('#promoMessage').textContent='Code not recognized';return}state.discount=true;state.subtotal=patches.discountSubtotal?48-(48*0.10):48;document.querySelector('#promoMessage').textContent='SAVE10 applied';render()};document.querySelector('#shippingOption').onchange=e=>{state.shipping=e.target.value};document.querySelector('#guestCheckout').onclick=()=>{state.guest=true;document.querySelector('#checkoutForm').classList.remove('hidden')};document.querySelector('#placeOrder').onclick=()=>{state.order=true;state.email=true;state.count=0;render();if(patches.confirmationEvent){setTimeout(()=>{state.confirmed=true;render()},20)}};window.MeridianCheckout={state,patches,reset(){Object.assign(state,{count:0,subtotal:48,discount:false,guest:false,order:false,email:false,confirmed:false});document.querySelector('#promoCode').value='';document.querySelector('#promoMessage').textContent='';document.querySelector('#checkoutForm').classList.add('hidden');document.querySelector('#confirmationHeading')?.remove();render()},setPatches(p){patches={...p};this.patches=patches;this.reset()}};render()})();
    <\/script></body></html>`;
  const frame = $('#checkoutFixture');
  frame.srcdoc = fixtureMarkup;

  const cases = [
    { name: 'Product detail loads', source: 'Browser journey · product overview', run: d => { if ($('#productTitle', d)?.textContent.trim() !== 'Daily Barrier Cream') throw Error(`Expected product title; received ${$('#productTitle', d)?.textContent || 'missing'}`); } },
    { name: 'Item can be added to cart', source: 'Browser journey · add item', run: d => { $('#addToCart', d).click(); if ($('#cartCount', d).textContent !== '1') throw Error(`Expected cart count 1; received ${$('#cartCount', d).textContent}`); } },
    { name: 'SAVE10 reduces the subtotal to $43.20', source: 'Browser journey · promotion total', run: d => { $('#promoCode', d).value = 'SAVE10'; $('#applyPromo', d).click(); if ($('#subtotal', d).textContent !== '$43.20') throw Error(`Expected $43.20; received ${$('#subtotal', d).textContent}`); } },
    { name: 'Delivery methods are selectable', source: 'Browser journey · shipping choices', run: d => { const select = $('#shippingOption', d); if (select.options.length < 2) throw Error(`Expected at least 2 delivery options; received ${select.options.length}`); select.value = 'express'; select.dispatchEvent(new frame.contentWindow.Event('change', { bubbles: true })); if (select.value !== 'express') throw Error('Express delivery could not be selected'); } },
    { name: 'Guest checkout opens without account sign-in', source: 'Browser journey · guest flow', run: d => { $('#guestCheckout', d).click(); if ($('#checkoutForm', d).classList.contains('hidden')) throw Error('Guest checkout form remained hidden'); } },
    { name: 'Order confirmation appears after submission', source: 'Browser journey · order-created event', run: async d => { if ($('#checkoutForm', d).classList.contains('hidden')) $('#guestCheckout', d).click(); $('#placeOrder', d).click(); await new Promise(resolve => setTimeout(resolve, 35)); if ($('#confirmationHeading', d)?.textContent !== 'Order placed') throw Error($('#confirmationMessage', d).textContent || 'Confirmation heading was not rendered'); } },
    { name: 'Confirmation email is queued', source: 'Browser journey · order notification', run: d => { if (!$('#emailStatus', d).textContent.includes('queued')) throw Error(`Expected queued email status; received ${$('#emailStatus', d).textContent || 'empty'}`); } },
    { name: 'Cart clears after order creation', source: 'Browser journey · post-order cleanup', run: d => { if ($('#cartCount', d).textContent !== '0') throw Error(`Expected cart count 0; received ${$('#cartCount', d).textContent}`); } }
  ];

  const rowHost = $('#testRows');
  cases.forEach((test, index) => {
    const row = document.createElement('div');
    row.className = 'test-row qa-test-row';
    row.dataset.index = index;
    row.innerHTML = `<span><i class="row-icon">${index + 1}</i><b>${test.name}</b><small>${test.source}</small></span><span class="status-pill not-run">Not run</span><span class="qa-duration">—</span><button class="row-more" type="button" aria-label="Show assertion details">⌄</button><div class="failure-detail" aria-live="polite">Run the suite to execute this assertion against the storefront fixture.</div>`;
    rowHost.appendChild(row);
    row.querySelector('.row-more').addEventListener('click', () => row.classList.toggle('expanded'));
  });

  frame.addEventListener('load', () => frame.contentWindow.MeridianCheckout?.setPatches(patches));

  function patchStatus() {
    $('#discountPatch').checked = patches.discountSubtotal;
    $('#confirmationPatch').checked = patches.confirmationEvent;
    $('#patchState').textContent = Object.values(patches).every(Boolean)
      ? 'Both changes are active in the local storefront fixture.'
      : Object.values(patches).some(Boolean)
        ? 'Partial patch applied. Rerun to see which assertion is still failing.'
        : 'Build 184 defects are active. Apply and verify each focused change.';
  }
  patchStatus();

  $('#applyPatch').addEventListener('click', () => {
    patches = { discountSubtotal: $('#discountPatch').checked, confirmationEvent: $('#confirmationPatch').checked };
    try { localStorage.setItem(PATCH_KEY, JSON.stringify(patches)); } catch { /* Session-only patch remains active in the fixture. */ }
    frame.contentWindow.MeridianCheckout?.setPatches(patches);
    patchStatus();
  });

  $('#resetPatch').addEventListener('click', () => {
    patches = { ...patchDefaults };
    try { localStorage.removeItem(PATCH_KEY); } catch { /* Defaults apply for this page. */ }
    frame.contentWindow.MeridianCheckout?.setPatches(patches);
    patchStatus();
  });

  function updateOverview(run) {
    $('#overviewQaResult').textContent = run ? (run.failed ? 'Action needed' : 'Passed') : 'Not run';
    $('#overviewQaFraction').textContent = run ? `${run.passed} / ${run.total} passed` : '';
    $('#overviewQaFoot').textContent = run ? `${run.failed} failed · ${run.id} · ${run.time}` : 'Run the browser checks to establish a baseline.';
    $('#overviewQaDots').innerHTML = run ? run.results.map(result => `<i class="${result.status === 'passed' ? 'pass' : 'fail'}"></i>`).join('') : '';
    const goalValue=$('#goalQaValue'),goalNote=$('#goalQaNote'),goalBar=$('#goalQaBar');
    if(goalValue)goalValue.textContent=run?`${run.passed} / ${run.total} checks`: '0 / 8 checks';
    if(goalNote)goalNote.textContent=run?`${run.failed?`${run.failed} checks need attention`:'All checks passed'} · most recent run ${run.id}.`:'Resolve both seeded defects, rerun all eight browser checks, and review every result.';
    if(goalBar)goalBar.style.width=`${run?Math.round(run.passed/run.total*100):0}%`;
    const moduleRun=$('#qaModuleRun'),moduleCount=$('#qaModuleCount'),moduleBar=$('#qaModuleBar');
    if(moduleRun)moduleRun.textContent=run?`Latest · ${run.time}`:'Baseline not run';
    if(moduleCount)moduleCount.textContent=run?`${run.passed} / ${run.total}`:'0 / 8';
    if(moduleBar)moduleBar.style.width=`${run?Math.round(run.passed/run.total*100):0}%`;
  }

  function renderHistory() {
    const runs = readJson(RUN_KEY, []);
    $('#runHistory').innerHTML = runs.length ? runs.slice(0, 5).map(run => `<div class="run-history-row"><b>${run.id}</b><span>${run.passed}/${run.total} passed</span><time>${run.time}</time></div>`).join('') : '<p>No runs recorded in this browser yet.</p>';
    updateOverview(runs[0] || null);
    if (runs[0]) {
      $('#runTime').textContent = runs[0].time;
      $('#duration').textContent = runs[0].duration;
      $('#resultLabel').textContent = `${runs[0].passed} passed · ${runs[0].failed} failed`;
      $('#runStatus').textContent = runs[0].failed ? '● Needs review' : '● All checks passed';
      paintRows(runs[0].results);
    }
  }

  function paintRows(results) {
    results.forEach((result, index) => {
      const row = $(`.qa-test-row[data-index="${index}"]`);
      if (!row) return;
      const pill = $('.status-pill', row);
      pill.className = `status-pill ${result.status}`;
      pill.textContent = result.status === 'passed' ? '✓ Passed' : result.status === 'failed' ? '× Failed' : 'Waiting';
      $('.qa-duration', row).textContent = result.duration;
      $('.failure-detail', row).textContent = result.detail;
    });
    const finished = results.filter(result => result.status === 'passed' || result.status === 'failed');
    const passed = finished.filter(result => result.status === 'passed').length;
    const failed = finished.length - passed;
    $('#passedCount').textContent = `${passed} passed`;
    $('#failedCount').textContent = `${failed} failed`;
    $('#resultLabel').className = `summary-result ${failed ? 'has-failures' : 'all-passed'}`;
    $('#resultLabel').textContent = `${passed} passed · ${failed} failed`;
  }

  function recordWorkspaceEvent(run) {
    const feed = $('#activityList');
    const row = document.createElement('div');
    row.className = 'activity-row';
    row.innerHTML = `<span class="activity-icon peach-bg">⌘</span><div class="activity-copy"><b>Checkout QA run ${run.id} completed</b><small>Browser fixture · ${run.passed} passed, ${run.failed} failed</small></div><span class="activity-score ${run.failed ? 'warn-score' : ''}">${run.failed ? 'Action needed' : 'Passed'}</span><time>${run.time}</time>`;
    feed.querySelector('.activity-empty')?.remove();
    feed.prepend(row);
  }

  async function runSuite() {
    if (running) return;
    if (!frame.contentDocument?.body) {
      $('#runStatus').textContent = '● Fixture unavailable';
      return;
    }
    running = true;
    const runButton = $('#runTests');
    runButton.disabled = true;
    runButton.textContent = '◌ Running browser checks…';
    $('#runStatus').textContent = '● Executing';
    const started = performance.now();
    const results = [];
    const d = frame.contentDocument;
    const w = frame.contentWindow;
    w.MeridianCheckout.reset();
    for (const test of cases) {
      const caseStarted = performance.now();
      try {
        await test.run(d);
        results.push({ name: test.name, status: 'passed', detail: 'Assertion passed against the rendered storefront DOM.', duration: `${Math.max(1, Math.round(performance.now() - caseStarted))} ms` });
      } catch (error) {
        results.push({ name: test.name, status: 'failed', detail: error.message, duration: `${Math.max(1, Math.round(performance.now() - caseStarted))} ms` });
      }
      paintRows([...results, ...cases.slice(results.length).map(() => ({ status: 'not-run', detail: 'Waiting for this check.', duration: '—' }))]);
      await new Promise(resolve => setTimeout(resolve, 35));
    }
    const passed = results.filter(result => result.status === 'passed').length;
    const failed = results.length - passed;
    const elapsed = Math.round(performance.now() - started);
    const stamp = new Date();
    const date = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(stamp);
    const runs = readJson(RUN_KEY, []);
    const run = { id: `QA-${String(Date.now()).slice(-6)}`, total: results.length, passed, failed, duration: `${(elapsed / 1000).toFixed(2)} sec`, time: date, results };
    try { localStorage.setItem(RUN_KEY, JSON.stringify([run, ...runs].slice(0, 10))); } catch { /* Results remain visible for this session. */ }
    $('#runTime').textContent = date;
    $('#duration').textContent = run.duration;
    $('#runStatus').textContent = failed ? '● Needs review' : '● All checks passed';
    runButton.disabled = false;
    runButton.innerHTML = '▶ &nbsp;Run 8 browser checks';
    renderHistory();
    paintRows(results);
    recordWorkspaceEvent(run);
  }

  $('#runTests').addEventListener('click', runSuite);
  $('#resetTests').addEventListener('click', () => {
    frame.contentWindow.MeridianCheckout?.reset();
    $$('.qa-test-row').forEach(row => {
      $('.status-pill', row).className = 'status-pill not-run';
      $('.status-pill', row).textContent = 'Not run';
      $('.qa-duration', row).textContent = '—';
      $('.failure-detail', row).textContent = 'Run the suite to execute this assertion against the storefront fixture.';
      row.classList.remove('expanded');
    });
    $('#passedCount').textContent = '0 passed';
    $('#failedCount').textContent = '0 failed';
    $('#runTime').textContent = 'No run yet';
    $('#duration').textContent = '—';
    $('#resultLabel').textContent = 'Not run';
    $('#runStatus').textContent = '● Ready';
  });

  // Replace the immediate queue wipe with a confirm/cancel flow in the shared modal.
  $('#modal').addEventListener('click', event => {
    if (!event.target.closest('#confirmResetQueue')) return;
    reviews = {};
    currentIndex = 0;
    persist();
    closeModal();
    renderQueue();
    renderWorkItem();
    syncRationale();
    toast(`All ${cosmeticProducts.length} demo items reset to Needs review.`);
  });

  // Require traceable evidence when a trainee changes or escalates a label.
  const baseValidate = updateValidation;
  updateValidation = function () {
    baseValidate();
    const inspected = $('#inspectionConfirmed').checked;
    const required = ['change', 'escalate'].includes(selectedAction);
    const rationale = $('#decisionRationale').value.trim();
    const actionReady = selectedAction === 'confirm' || selectedAction === 'escalate' || (selectedAction === 'change' && Boolean(chosenCategory));
    const valid = actionReady && Boolean(confidence) && (!required || rationale.length >= 20);
    const completed = reviews[currentIndex] && reviews[currentIndex].status !== 'skipped';
    $('#submitLabel').disabled = Boolean(completed) || $('#submitLabel').disabled || !valid || !inspected;
    $('#rationaleRequired').textContent = required ? 'Required · 20 characters minimum' : 'Optional for confirmation';
    $('#rationaleHelp').textContent = required && !valid ? 'Add at least 20 characters describing the image or catalog evidence.' : 'Required for a category change or escalation. Include the product evidence you used.';
    $('#rationaleHelp').classList.toggle('rationale-error', required && !valid);
  };
  const baseRecordReview = recordReview;
  recordReview = function (skipped = false) {
    const itemIndex = currentIndex;
    const rationale = $('#decisionRationale').value.trim();
    const inspected = $('#inspectionConfirmed').checked;
    baseRecordReview(skipped);
    if (!skipped && reviews[itemIndex]) {
      reviews[itemIndex].rationale = rationale;
      reviews[itemIndex].inspected = inspected;
      persist();
      renderGoalProgress();
    }
  };
  function syncRationale() {
    const review = reviews[currentIndex];
    const completed = review && review.status !== 'skipped';
    $('#inspectionConfirmed').checked = completed ? Boolean(review.inspected) : false;
    $('#inspectionConfirmed').disabled = Boolean(completed);
    $('#decisionRationale').value = completed ? review.rationale || '' : '';
    $('#decisionRationale').disabled = Boolean(completed);
    updateValidation();
  }
  $('#inspectionConfirmed').addEventListener('change', updateValidation);
  $('#decisionRationale').addEventListener('input', updateValidation);
  $('#queueItems').addEventListener('click', event => { if (event.target.closest('.queue-item')) requestAnimationFrame(syncRationale); });
  $('#submitLabel').addEventListener('click', () => requestAnimationFrame(syncRationale));
  $('#skipTask').addEventListener('click', () => requestAnimationFrame(syncRationale));
  document.addEventListener('click', event => { if (event.target.closest('#openLinkedItem')) requestAnimationFrame(syncRationale); });
  syncRationale();

  renderHistory();
})();

