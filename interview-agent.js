(() => {
  const $ = (selector) => document.querySelector(selector);
  const config = window.MERIDIAN_INTERVIEW_CONFIG || {};
  const AUTH_KEY = "meridian-mock-interview-auth-v1";
  const HISTORY_KEY = "meridian-mock-interview-history-v1";
  const QUESTION_COUNT = 30;
  const questions = [
    { topic: "Purpose of the assignment", text: "Describe the purpose of the PT-100 assignment and the responsibilities of an annotator working through its product queue." },
    { topic: "Product identity", text: "When you open a cosmetic product record, which image and catalog details do you inspect first to establish what the product is?" },
    { topic: "Primary use", text: "Explain how you distinguish a product’s primary use from a marketing claim or ingredient mentioned on its packaging." },
    { topic: "Taxonomy decision", text: "The model suggests a category that appears plausible but may not match the product directions. Describe the checks you would make before confirming or changing it." },
    { topic: "Evidence rationale", text: "What information should a clear annotation rationale contain when you change a proposed category?" },
    { topic: "Confidence", text: "Explain the difference between model confidence and your own confidence. How should each affect your decision?" },
    { topic: "Ambiguity and escalation", text: "A product image is unclear and the description conflicts with the visible label. When would you escalate the record, and what evidence would you include?" },
    { topic: "Guideline interpretation", text: "A guideline does not clearly cover a product variant. Describe how you would proceed without creating an inconsistent label." },
    { topic: "Consistency", text: "Why does consistent use of taxonomy guidelines matter across a large product dataset? Give an example of the risk caused by inconsistent labels." },
    { topic: "Quality review", text: "Describe a practical quality-control check you would perform before submitting a batch of product annotations." },
    { topic: "Progress tracking", text: "In the queue, some records are submitted, escalated, skipped, or still remaining. Explain what these states mean for completion and handoff." },
    { topic: "Ticket creation", text: "You find the same packaging-to-metadata mismatch on several products. Explain what you would put in a workflow ticket so another team can investigate it." },
    { topic: "Impact and priority", text: "How do business impact and ticket priority differ? Describe how you would use both when reporting a catalog issue." },
    { topic: "Ticket lifecycle", text: "Explain the difference between a ticket being resolved and being closed. What should a reviewer verify before closure?" },
    { topic: "Ownership and handoff", text: "A ticket is blocked because another team must confirm a source record. Describe how you would assign, track, and communicate the blocker." },
    { topic: "QA test interpretation", text: "The checkout lab runs browser checks against an embedded fixture. What can a passing result demonstrate, and what does it not prove about a production application?" },
    { topic: "Failure investigation", text: "A checkout regression check fails. Give a step-by-step description of how you would inspect the failure and communicate useful evidence." },
    { topic: "Team communication", text: "Write the key points you would share in a short team handoff when some records are complete and others remain uncertain or blocked." },
    { topic: "Feedback and correction", text: "A reviewer identifies a repeated error pattern in your submitted work. How would you respond, correct affected records, and reduce the chance of repeating the error?" },
    { topic: "Reflection and improvement", text: "After completing the assignment, how would you judge whether your work was both accurate and complete? Name one improvement you would make to your next review." },
    { topic: "Image inspection", text: "A package image looks polished but the product name is partly hidden by a reflection. What would you inspect or zoom before deciding whether the image supports a reliable label?" },
    { topic: "Taxonomy depth", text: "Two taxonomy paths seem plausible, but one is more specific. Explain how you would decide whether the narrower category is truly supported by the product evidence." },
    { topic: "Conflicting evidence", text: "The product title says face cream while the directions describe a rinse-off cleanser. Which evidence would you compare, and how would you document the conflict?" },
    { topic: "Skipped work", text: "You have skipped several uncertain records near the end of the batch. How would you revisit them, resolve what you can, and make the remaining blockers visible?" },
    { topic: "Escalation quality", text: "What makes an escalation useful to the next reviewer? Describe the evidence, uncertainty, and specific question you would include." },
    { topic: "Audit trail", text: "Why should a submitted decision preserve both the inspection attestation and the rationale? Give an example of how that record helps a later reviewer." },
    { topic: "Practice score limits", text: "The demo shows a high accuracy score against bundled reference labels. What does that score tell you, and what can it not establish about real-world quality?" },
    { topic: "Ticket evidence", text: "A ticket is about an image mismatch. How would you make its evidence reference precise enough that another team can find and reproduce the issue?" },
    { topic: "Resolution review", text: "A ticket has a detailed resolution summary, but the linked catalog item still looks wrong. What would you do before closing it?" },
    { topic: "Checkout patch validation", text: "After applying the SAVE10 fix, what specific observed result would you check, and why should the remaining checkout assertions still be rerun?" },
  ];
  let session = null;
  let timer = null;
  let startedAt = 0;
  let initialized = false;
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const savedSessions = () => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; } };

  function renderHistory() {
    const history = savedSessions();
    $("#interviewHistoryList").innerHTML = history.length
      ? history.slice(0, 8).map((item) => { const count = item.questionCount || (item.transcript || []).filter((turn) => turn.role === "user").length || QUESTION_COUNT; return `<div class="interview-history-item"><b>${count}-question assessment · ${escapeHtml(item.level)}</b><span>${escapeHtml(item.date)} · ${item.score === null ? "Score unavailable" : `${escapeHtml(item.score)}%`}</span></div>`; }).join("")
      : '<p class="interview-history-empty">Completed assessments will be listed here on this device.</p>';
  }

  function setConnection(kind, message) {
    const el = $("#interviewConnection");
    el.className = `interview-connection ${kind}`;
    el.querySelector("span").textContent = message;
  }

  async function authSession() {
    if (!config.supabaseUrl || !config.publishableKey) throw new Error("Supabase assessment configuration is missing.");
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(AUTH_KEY) || "null"); } catch { saved = null; }
    const now = Math.floor(Date.now() / 1000);
    if (saved?.access_token && saved.expires_at > now + 45) return saved.access_token;
    if (saved?.refresh_token) {
      const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST", headers: { apikey: config.publishableKey, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: saved.refresh_token }),
      });
      if (response.ok) {
        const refreshed = await response.json();
        refreshed.expires_at ||= now + (refreshed.expires_in || 3600);
        localStorage.setItem(AUTH_KEY, JSON.stringify(refreshed));
        return refreshed.access_token;
      }
    }
    const response = await fetch(`${config.supabaseUrl}/auth/v1/signup`, {
      method: "POST", headers: { apikey: config.publishableKey, "Content-Type": "application/json" }, body: "{}",
    });
    const created = await response.json().catch(() => ({}));
    if (!response.ok || !created.access_token) throw new Error(created.msg || created.message || created.error_description || "Enable anonymous sign-ins in Supabase Auth.");
    created.expires_at ||= now + (created.expires_in || 3600);
    localStorage.setItem(AUTH_KEY, JSON.stringify(created));
    return created.access_token;
  }

  async function callInterview(action, extras = {}) {
    const token = await authSession();
    const response = await fetch(`${config.supabaseUrl}/functions/v1/${config.functionName || "mock-interview"}`, {
      method: "POST",
      headers: { apikey: config.publishableKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extras }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `Assessment service returned ${response.status}.`);
    return result;
  }

  async function checkService() {
    setConnection("", "Checking assessment service…");
    try {
      const status = await callInterview("status");
      if (status.aiReady) {
        setConnection("ready", `Server-side scoring ready · ${status.model || "configured model"}`);
        $("#interviewModeBadge").textContent = "Written assessment ready";
      } else {
        setConnection("guided", "Questions available · server scoring needs setup");
        $("#interviewModeBadge").textContent = "Scoring setup required";
      }
    } catch (error) {
      setConnection("guided", "Questions available · scoring service not connected");
      $("#interviewModeBadge").textContent = "Scoring service unavailable";
      $("#interviewConnection").title = error.message;
    }
  }

  function setControls(active) {
    $("#interviewDifficulty").disabled = active;
    $("#startInterviewBtn").disabled = active;
    $("#candidateResponse").disabled = !active;
    $("#submitInterviewAnswer").disabled = !active;
  }

  function progress() {
    if (!session) return;
    const count = session.answerCount;
    $("#interviewProgressBar").style.width = `${Math.min(100, count / QUESTION_COUNT * 100)}%`;
    $("#interviewTurnCount").textContent = count < QUESTION_COUNT ? `Question ${count + 1} of ${QUESTION_COUNT} · ${count} submitted` : `All ${QUESTION_COUNT} answers submitted`;
  }

  function renderCurrentQuestion() {
    const index = session.answerCount;
    const question = questions[index];
    $("#currentQuestion").hidden = !question;
    $("#interviewConversation").hidden = Boolean(question);
    if (!question) return;
    $("#currentQuestionNumber").textContent = `QUESTION ${index + 1} OF ${QUESTION_COUNT}`;
    $("#currentQuestionTopic").textContent = question.topic.toUpperCase();
    $("#currentQuestionText").textContent = question.text;
    $("#interviewStageTitle").textContent = `Question ${index + 1}`;
    $("#candidateResponse").value = "";
    $("#candidateResponse").focus();
  }

  function archiveQuestionAnswer(questionIndex, answer) {
    const question = questions[questionIndex];
    const transcript = $("#interviewConversation");
    if (transcript.querySelector(".interview-welcome")) transcript.innerHTML = "";
    const block = document.createElement("article");
    block.className = "interview-answer-record";
    const number = document.createElement("small");
    number.textContent = `QUESTION ${questionIndex + 1} · ${question.topic.toUpperCase()}`;
    const prompt = document.createElement("h3");
    prompt.textContent = question.text;
    const response = document.createElement("p");
    response.textContent = answer;
    block.append(number, prompt, response);
    transcript.append(block);
    transcript.scrollTop = transcript.scrollHeight;
    session.transcript.push({ role: "assistant", text: `Question ${questionIndex + 1} — ${question.text}` });
    session.transcript.push({ role: "user", text: answer });
  }

  function renderAssessment(assessment) {
    const host = $("#interviewReport");
    const rubric = Array.isArray(assessment?.rubric) ? assessment.rubric : [];
    host.innerHTML = `<h3>Interview assessment</h3><div class="interview-report-score">${escapeHtml(assessment?.overallScore ?? "—")}%</div><p>${escapeHtml(assessment?.summary || "Review the written answers with your supervisor.")}</p><div class="interview-report-grid">${rubric.map((item) => `<div class="interview-rubric-item"><b><span>${escapeHtml(item.category)}</span><span>${escapeHtml(item.score)}%</span></b><p>${escapeHtml(item.evidence)}</p></div>`).join("")}</div><div class="interview-report-grid"><div><b>Strengths</b><ul>${(assessment?.strengths || []).map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul></div><div><b>Practice next</b><ul>${(assessment?.development || []).map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul></div></div><div class="interview-report-actions"><button class="button button-quiet" id="downloadTranscriptBtn">Download answers and score</button><button class="button button-quiet" id="newInterviewBtn">Start another assessment</button></div>`;
    host.hidden = false;
    session.assessment = assessment;
    $("#downloadTranscriptBtn").addEventListener("click", downloadTranscript);
    $("#newInterviewBtn").addEventListener("click", resetRoom);
  }

  function finishSession(assessment) {
    if (!session) return;
    session.active = false;
    session.grading = false;
    clearInterval(timer);
    setControls(false);
    $("#interviewStageTitle").textContent = "Assessment complete";
    $("#currentQuestion").hidden = true;
    $("#interviewConversation").hidden = false;
    $("#interviewProgressBar").style.width = "100%";
    $("#interviewModeBadge").textContent = "Scored written assessment";
    $("#interviewLiveStatus").textContent = `All ${QUESTION_COUNT} responses were sent for server-side review.`;
    renderAssessment(assessment);
    saveCompletedSession();
  }

  function saveCompletedSession() {
    const history = savedSessions();
    history.unshift({ date: new Date().toLocaleString(), level: session.level, questionCount: QUESTION_COUNT, score: session.assessment?.overallScore ?? null, transcript: session.transcript, assessment: session.assessment });
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 8))); } catch { /* Answers remain visible for this page session. */ }
    renderHistory();
  }

  async function gradeInterview() {
    if (!session || session.answerCount !== QUESTION_COUNT || session.grading) return;
    session.grading = true;
    $("#submitInterviewAnswer").disabled = true;
    $("#candidateResponse").disabled = true;
    $("#interviewModeBadge").textContent = "Scoring responses…";
    $("#interviewLiveStatus").textContent = `The server is reviewing all ${QUESTION_COUNT} answers against the interview rubric.`;
    $("#interviewStageTitle").textContent = "Review in progress";
    $("#interviewReport").hidden = false;
    $("#interviewReport").innerHTML = `<h3>Scoring in progress</h3><p>Your ${QUESTION_COUNT} written answers are being reviewed against the same evidence-based interview criteria.</p>`;
    try {
      const result = await callInterview("finish", {
        track: "full", level: session.level, duration: Math.max(1, Math.round((Date.now() - startedAt) / 60000)),
        answerCount: QUESTION_COUNT, questionCount: QUESTION_COUNT, structuredQuestionnaire: true, transcript: session.transcript,
      });
      if (!result.assessment) throw new Error("The scoring service did not return a completed assessment. Retry to keep your answers and request the score again.");
      finishSession(result.assessment);
    } catch (error) {
      session.grading = false;
      $("#interviewModeBadge").textContent = "Score not available yet";
      $("#interviewStageTitle").textContent = "Answers saved · scoring needs retry";
      $("#interviewLiveStatus").textContent = error.message;
      $("#interviewReport").innerHTML = `<h3>Could not score this attempt</h3><p>${escapeHtml(error.message)} Your ${QUESTION_COUNT} answers are still available in this page. Retry grading after the server is configured or connected.</p><div class="interview-report-actions"><button class="button button-dark" id="retryInterviewGrade">Retry grading</button></div>`;
      $("#retryInterviewGrade").addEventListener("click", gradeInterview);
    }
  }

  async function submitAnswer() {
    if (!session?.active || session.grading) return;
    const answer = $("#candidateResponse").value.trim();
    if (answer.length < 20) { $("#interviewLiveStatus").textContent = "Please write at least 20 characters so the reviewer can assess your reasoning."; $("#candidateResponse").focus(); return; }
    const questionIndex = session.answerCount;
    archiveQuestionAnswer(questionIndex, answer);
    session.answerCount += 1;
    progress();
    if (session.answerCount === QUESTION_COUNT) {
      $("#currentQuestion").hidden = true;
      $("#interviewConversation").hidden = false;
      await gradeInterview();
      return;
    }
    renderCurrentQuestion();
    $("#interviewLiveStatus").textContent = "Answer submitted. Read the next question and continue.";
  }

  function downloadTranscript() {
    if (!session) return;
    const lines = ["MERIDIAN MOCK INTERVIEW — TRAINEE11", `Date: ${new Date().toLocaleString()}`, `Format: ${QUESTION_COUNT}-question written English assessment`, `Level: ${session.level}`, "", ...session.transcript.map((turn) => `${turn.role === "assistant" ? "INTERVIEWER" : "TRAINEE11"}: ${turn.text}`)];
    if (session.assessment) lines.push("", `OVERALL SCORE: ${session.assessment.overallScore}%`, session.assessment.summary || "");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }));
    link.download = "trainee11-written-mock-interview.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function resetRoom() {
    if (session?.active || session?.grading) return;
    clearInterval(timer);
    session = null;
    $("#interviewConversation").hidden = false;
    $("#interviewConversation").innerHTML = `<div class="interview-welcome"><span>${QUESTION_COUNT}</span><h3>One question at a time</h3><p>Read each prompt carefully, write a complete response, and submit it before moving forward. Your final score appears after the final answer is graded.</p><small>English responses only · ${QUESTION_COUNT} questions · final server-side review</small></div>`;
    $("#currentQuestion").hidden = true;
    $("#interviewReport").hidden = true;
    $("#interviewElapsed").textContent = "00:00";
    $("#interviewProgressBar").style.width = "0%";
    $("#interviewTurnCount").textContent = `${QUESTION_COUNT} questions · no session started`;
    $("#interviewStageTitle").textContent = "Your assessment starts here";
    $("#interviewModeBadge").textContent = "Preparing assessment";
    $("#interviewLiveStatus").textContent = "Your answers will be reviewed after completion.";
    $("#candidateResponse").value = "";
    setControls(false);
    checkService();
  }

  function startInterview() {
    if (session?.active || session?.grading) return;
    clearInterval(timer);
    session = { active: true, grading: false, level: $("#interviewDifficulty").value, answerCount: 0, transcript: [], assessment: null };
    startedAt = Date.now();
    $("#interviewReport").hidden = true;
    $("#interviewConversation").innerHTML = "";
    $("#interviewConversation").hidden = true;
    $("#interviewElapsed").textContent = "00:00";
    $("#interviewProgressBar").style.width = "0%";
    $("#interviewModeBadge").textContent = "Written assessment in progress";
    setControls(true);
    progress();
    renderCurrentQuestion();
    $("#interviewLiveStatus").textContent = "Read the question, write your answer, and submit to continue.";
    timer = setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAt) / 1000);
      $("#interviewElapsed").textContent = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    }, 1000);
  }

  function initInterviewView() {
    if (!initialized) {
      initialized = true;
      $("#startInterviewBtn").addEventListener("click", startInterview);
      $("#submitInterviewAnswer").addEventListener("click", submitAnswer);
      $("#candidateResponse").addEventListener("keydown", (event) => { if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) submitAnswer(); });
      $("#clearInterviewHistory").addEventListener("click", () => {
        if (confirm("Clear saved written interview sessions from this browser?")) { localStorage.removeItem(HISTORY_KEY); renderHistory(); }
      });
      renderHistory();
    }
    checkService();
  }

  window.initInterviewView = initInterviewView;
})();

