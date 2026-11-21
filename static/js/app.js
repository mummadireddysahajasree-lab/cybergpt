// ==========================================
// CYBERGPT FRONTEND APPLICATION LOGIC (JS)
// ==========================================

// Global Application State
const state = {
    user: null,
    isLoggedIn: false,
    activeView: 'dashboard',
    activeLearnTopic: 'sql_injection',
    quiz: {
        currentQuestion: null,
        sessionCorrect: 0,
        sessionTotal: 0
    }
};

// Initialize Application on Page Load
document.addEventListener('DOMContentLoaded', () => {
    // 1. Run live clock
    initClock();

    // 2. Setup Navigation Event Listeners
    initNavigation();

    // 3. Verify Session with Server
    checkSession();
});

// ==========================================
// UTILITIES: TIME, TOASTS, & TABS
// ==========================================

function initClock() {
    const clockElement = document.getElementById('live-time');
    setInterval(() => {
        const now = new Date();
        const timeStr = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
        if (clockElement) clockElement.textContent = timeStr;
    }, 1000);
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = 'toast'; // clear old types
    
    if (type === 'error') {
        toast.classList.add('toast-error');
    } else if (type === 'success') {
        toast.classList.add('toast-success');
    }
    
    toast.classList.remove('hidden');
    
    clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(() => {
        toast.classList.add('hidden');
    }, 4500);
}

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
}

// ==========================================
// NAVIGATION & VIEW CONTROLS
// ==========================================

function initNavigation() {
    // Sidebar nav clicks
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetView = item.getAttribute('data-view');
            navigateTo(targetView);
        });
    });
}

function navigateTo(viewId) {
    if (!state.isLoggedIn) {
        showToast('Please log in to access this section.', 'error');
        return;
    }

    // Toggle nav active classes
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    navItems.forEach(item => {
        if (item.getAttribute('data-view') === viewId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Toggle view elements
    const views = document.querySelectorAll('.app-view');
    views.forEach(view => {
        if (view.id === `view-${viewId}`) {
            view.classList.add('active');
        } else {
            view.classList.remove('active');
        }
    });

    // Update Breadcrumbs
    const currentBreadcrumb = document.getElementById('breadcrumb-current');
    if (currentBreadcrumb) {
        // Format view text beautifully
        const viewText = viewId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        currentBreadcrumb.textContent = viewText;
    }

    state.activeView = viewId;

    // View-specific initialization triggers
    if (viewId === 'dashboard') {
        fetchProgressData();
    } else if (viewId === 'progress') {
        fetchProgressData();
    }
}

function switchLearnTopic(topicId) {
    // Switch tabs in Learn Attacks
    const tabs = document.querySelectorAll('.learn-tab');
    tabs.forEach(tab => {
        if (tab.outerHTML.includes(`'${topicId}'`)) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Switch panels in Learn Attacks
    const views = document.querySelectorAll('.learn-topic-view');
    views.forEach(view => {
        if (view.id === `topic-${topicId}`) {
            view.classList.add('active');
        } else {
            view.classList.remove('active');
        }
    });

    state.activeLearnTopic = topicId;
}

function startQuizOnTopic(topicName) {
    const topicSelect = document.getElementById('quiz-topic-select');
    if (topicSelect) {
        // Select matching topic
        for (let i = 0; i < topicSelect.options.length; i++) {
            if (topicSelect.options[i].value === topicName) {
                topicSelect.selectedIndex = i;
                break;
            }
        }
    }
    navigateTo('quiz');
    generateQuiz();
}

// ==========================================
// SESSION & AUTHENTICATION ENDPOINTS
// ==========================================

function switchAuthTab(tab) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const errorMsg = document.getElementById('auth-error');

    errorMsg.classList.add('hidden');

    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        tabLogin.classList.remove('active');
        tabRegister.classList.add('active');
    }
}

async function checkSession() {
    try {
        const response = await fetch('/auth/session');
        const data = await response.json();
        
        if (data.authenticated) {
            setupAuthenticatedSession(data.user);
        } else {
            setupLoggedOutState();
        }
    } catch (e) {
        console.error('Session validation error:', e);
        setupLoggedOutState();
    }
}

async function handleAuth(event, type) {
    event.preventDefault();
    const errorMsg = document.getElementById('auth-error');
    errorMsg.classList.add('hidden');

    const emailInput = document.getElementById(`${type}-email`);
    const passwordInput = document.getElementById(`${type}-password`);

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    const endpoint = type === 'login' ? '/auth/login' : '/auth/register';

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (type === 'login') {
                showToast(data.message, 'success');
                setupAuthenticatedSession(data.user);
            } else {
                showToast(data.message, 'success');
                switchAuthTab('login');
                // Auto fill email for convenience
                document.getElementById('login-email').value = email;
            }
        } else {
            errorMsg.textContent = data.error || 'Authentication failed.';
            errorMsg.classList.remove('hidden');
            showToast(data.error || 'Authentication failed.', 'error');
        }
    } catch (e) {
        errorMsg.textContent = 'Network error. Please try again.';
        errorMsg.classList.remove('hidden');
        showToast('Network query failed.', 'error');
    }
}

function setupAuthenticatedSession(user) {
    state.user = user;
    state.isLoggedIn = true;
    
    // UI swaps
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    
    // User display details
    document.getElementById('user-email-display').textContent = user.email;
    
    // Redirect to operational dashboard
    navigateTo('dashboard');
}

async function handleLogout() {
    try {
        const response = await fetch('/auth/logout', { method: 'POST' });
        const data = await response.json();
        if (data.success) {
            showToast('Secure session terminated.', 'success');
            setupLoggedOutState();
        }
    } catch (e) {
        showToast('Logout query failed.', 'error');
    }
}

function setupLoggedOutState() {
    state.user = null;
    state.isLoggedIn = false;
    
    // UI resets
    document.getElementById('auth-container').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
    
    // Clear forms
    document.getElementById('login-form').reset();
    document.getElementById('register-form').reset();
}

// ==========================================
// ASK AI PAGE ENDPOINTS
// ==========================================

function prefillQuestion(text) {
    const textarea = document.getElementById('ai-question');
    if (textarea) {
        textarea.value = text;
        textarea.focus();
    }
}

async function handleAiQuery(event) {
    event.preventDefault();
    const questionTextarea = document.getElementById('ai-question');
    const question = questionTextarea.value.trim();
    
    const submitBtn = document.getElementById('ai-submit-btn');
    const btnText = document.getElementById('ai-btn-text');
    const btnSpinner = document.getElementById('ai-btn-spinner');
    const resultsPanel = document.getElementById('ai-results');

    if (!question) return;

    // Loading states
    submitBtn.disabled = true;
    btnText.textContent = 'PROBING ARTIFICIAL AGENT...';
    btnSpinner.classList.remove('hidden');
    resultsPanel.classList.add('hidden');

    try {
        const response = await fetch('/ai/ask-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question })
        });
        
        const resData = await response.json();

        if (resData.success) {
            const aiData = resData.data;
            
            // Populate output structures
            document.getElementById('ai-out-definition').textContent = aiData.definition;
            document.getElementById('ai-out-example').textContent = aiData.example;
            document.getElementById('ai-out-impact').textContent = aiData.impact;
            document.getElementById('ai-out-prevention').textContent = aiData.prevention;
            
            // Reveal output cards
            resultsPanel.classList.remove('hidden');
            showToast('Defense analysis generated successfully.', 'success');

            // Save question completion tag in local progress database matching topic keywords
            detectAndSaveTopicProgress(question);
        } else {
            showToast(resData.error || 'Agent returned error state.', 'error');
        }
    } catch (e) {
        showToast('Network error querying CyberGPT agent.', 'error');
    } finally {
        submitBtn.disabled = false;
        btnText.textContent = 'ASK SECURE AGENT';
        btnSpinner.classList.add('hidden');
    }
}

function detectAndSaveTopicProgress(question) {
    const q = question.toLowerCase();
    let topicToSave = null;

    if (q.includes('sql') || q.includes('query')) topicToSave = 'SQL Injection';
    else if (q.includes('xss') || q.includes('script')) topicToSave = 'XSS';
    else if (q.includes('csrf') || q.includes('forgery')) topicToSave = 'CSRF';
    else if (q.includes('password') || q.includes('credentials')) topicToSave = 'Password Security';
    else if (q.includes('network') || q.includes('mitm') || q.includes('port')) topicToSave = 'Networking';
    else if (q.includes('blockchain') || q.includes('reentrancy')) topicToSave = 'Blockchain';

    if (topicToSave) {
        // Initialize progress for learning concept (save with 100% just for completing reading)
        updateTopicGrade(topicToSave, 100);
    }
}

// ==========================================
// QUIZ PAGE MODULE
// ==========================================

async function generateQuiz() {
    const topicSelect = document.getElementById('quiz-topic-select');
    const topic = topicSelect.value;
    
    const quizCard = document.getElementById('quiz-card');
    const emptyState = document.getElementById('quiz-empty-state');
    const qText = document.getElementById('quiz-question-text');
    const optionsContainer = document.getElementById('quiz-options-list');
    const explanationPanel = document.getElementById('quiz-explanation');

    // Loading states
    emptyState.classList.add('hidden');
    quizCard.classList.remove('hidden');
    explanationPanel.classList.add('hidden');
    qText.textContent = 'Generating unique quiz scenario on ' + topic + '...';
    optionsContainer.innerHTML = '';

    document.getElementById('quiz-topic-tag').textContent = `TOPIC: ${topic.toUpperCase()}`;

    try {
        const response = await fetch('/ai/quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic })
        });
        const resData = await response.json();

        if (resData.success) {
            const data = resData.data;
            state.quiz.currentQuestion = data;
            
            // Render text
            qText.textContent = data.question;
            
            // Render dynamic multiple choice options
            data.options.forEach(option => {
                const optButton = document.createElement('button');
                optButton.className = 'option-btn';
                optButton.innerHTML = `
                    <span>${option}</span>
                    <span class="option-indicator-icon"></span>
                `;
                optButton.addEventListener('click', () => handleQuizAnswerSelection(optButton, option));
                optionsContainer.appendChild(optButton);
            });
        } else {
            showToast(resData.error || 'Failed to generate quiz.', 'error');
            resetQuizStateUI();
        }
    } catch (e) {
        showToast('Network error querying assessment systems.', 'error');
        resetQuizStateUI();
    }
}

function resetQuizStateUI() {
    document.getElementById('quiz-card').classList.add('hidden');
    document.getElementById('quiz-empty-state').classList.remove('hidden');
}

function handleQuizAnswerSelection(selectedBtn, selectedOption) {
    const currentQ = state.quiz.currentQuestion;
    if (!currentQ) return;

    const isCorrect = selectedOption === currentQ.correct_answer;
    
    // Increment local accuracy grade counts
    state.quiz.sessionTotal++;
    if (isCorrect) state.quiz.sessionCorrect++;

    // Update tracking element
    document.getElementById('quiz-session-score').textContent = `${state.quiz.sessionCorrect} / ${state.quiz.sessionTotal}`;

    // Highlight options & disable all
    const allOptionBtns = document.querySelectorAll('.option-btn');
    allOptionBtns.forEach(btn => {
        btn.classList.add('disabled');
        const text = btn.querySelector('span').textContent;
        const iconSpan = btn.querySelector('.option-indicator-icon');

        if (text === currentQ.correct_answer) {
            btn.classList.add('selected-correct');
            iconSpan.innerHTML = `<svg class="option-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
        } else if (text === selectedOption && !isCorrect) {
            btn.classList.add('selected-incorrect');
            iconSpan.innerHTML = `<svg class="option-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
        }
    });

    // Update Explanation Card Details
    const explanationPanel = document.getElementById('quiz-explanation');
    const statusText = document.getElementById('explanation-status');
    
    if (isCorrect) {
        statusText.textContent = 'CORRECT VERDICT';
        statusText.className = 'status-indicator indicator-correct';
        showToast('Assessment verified: Correct answer.', 'success');
    } else {
        statusText.textContent = 'INCORRECT DEVIATION';
        statusText.className = 'status-indicator indicator-incorrect';
        showToast('Assessment verified: Incorrect selection.', 'error');
    }

    document.getElementById('quiz-explanation-text').textContent = currentQ.explanation;
    explanationPanel.classList.remove('hidden');

    // Trigger score persistence to SQLite
    const currentScorePct = Math.round((state.quiz.sessionCorrect / state.quiz.sessionTotal) * 100);
    const selectedTopic = document.getElementById('quiz-topic-select').value;
    updateTopicGrade(selectedTopic, currentScorePct);
}

async function updateTopicGrade(topic, score) {
    if (!state.isLoggedIn) return;

    try {
        await fetch('/tools/progress/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: state.user.id,
                topic: topic,
                quiz_score: score
            })
        });
    } catch (e) {
        console.error('Failed to sync progress to database:', e);
    }
}

// ==========================================
// PASSWORD STRENGTH AUDITOR PAGE
// ==========================================

function checkPasswordLive() {
    const pwdInput = document.getElementById('analyzer-input');
    const password = pwdInput.value;

    const scoreMeter = document.getElementById('strength-score');
    const fillGauge = document.getElementById('gauge-bar');
    const levelLabel = document.getElementById('strength-label');
    const listSuggestions = document.getElementById('password-suggestions');

    if (!password) {
        scoreMeter.textContent = '0';
        fillGauge.style.strokeDashoffset = 264;
        fillGauge.style.stroke = 'rgba(255,255,255,0.05)';
        levelLabel.textContent = 'INSUFFICIENT DATA';
        levelLabel.className = 'badge-status label-weak';
        listSuggestions.innerHTML = '<li>Waiting for input to audit. Type credentials to retrieve feedback instantly.</li>';
        return;
    }

    // Client-side quick calculation for visual responsiveness
    let clientScore = 0;
    const tips = [];

    const len = password.length;
    if (len >= 16) clientScore += 35;
    else if (len >= 12) clientScore += 25;
    else if (len >= 8) clientScore += 15;
    else tips.push('Increase password length to at least 8 characters (12+ is recommended).');

    const lower = /[a-z]/.test(password);
    const upper = /[A-Z]/.test(password);
    const num = /\d/.test(password);
    const spec = /[^a-zA-Z\d]/.test(password);

    if (lower) clientScore += 15; else tips.push('Add lowercase letters.');
    if (upper) clientScore += 15; else tips.push('Add uppercase letters.');
    if (num) clientScore += 15; else tips.push('Add numeric digits.');
    if (spec) clientScore += 20; else tips.push('Add special characters or symbols (e.g. @, #, $, etc.).');

    // Penalties
    if (new Set(password).size < len / 2) {
        clientScore -= 20;
        tips.push('Avoid repeating characters too frequently.');
    }

    clientScore = Math.max(0, Math.min(100, clientScore));
    
    // Update gauge visuals
    updateGaugeUI(clientScore, tips, levelLabel, scoreMeter, fillGauge);
}

async function triggerPasswordCheck() {
    const password = document.getElementById('analyzer-input').value;
    
    if (!password) {
        showToast('Password box cannot be blank.', 'error');
        return;
    }

    const scoreMeter = document.getElementById('strength-score');
    const fillGauge = document.getElementById('gauge-bar');
    const levelLabel = document.getElementById('strength-label');

    try {
        const response = await fetch('/tools/password-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const data = await response.json();

        if (data.success) {
            updateGaugeUI(data.score, data.suggestions, levelLabel, scoreMeter, fillGauge);
            showToast('Backend security audit complete.', 'success');
        } else {
            showToast(data.error || 'Audit failure.', 'error');
        }
    } catch (e) {
        showToast('Network error querying password checker API.', 'error');
    }
}

function updateGaugeUI(score, suggestions, labelEl, textEl, barEl) {
    textEl.textContent = score;
    
    // Update ring fill (Stroke circumference is 264)
    const strokeOffset = 264 - (264 * score / 100);
    barEl.style.strokeDashoffset = strokeOffset;

    const listSuggestions = document.getElementById('password-suggestions');
    listSuggestions.innerHTML = '';

    // Color maps & recommendations bindings
    if (score < 40) {
        labelEl.textContent = 'WEAK DEFENSE';
        labelEl.className = 'badge-status label-weak';
        barEl.style.stroke = '#ef4444'; // Red
    } else if (score < 75) {
        labelEl.textContent = 'MODERATE STRENGTH';
        labelEl.className = 'badge-status label-moderate';
        barEl.style.stroke = '#f59e0b'; // Amber
    } else {
        labelEl.textContent = 'STRONG DEFENSE';
        labelEl.className = 'badge-status label-strong';
        barEl.style.stroke = '#10b981'; // Emerald
    }

    if (suggestions.length === 0) {
        listSuggestions.innerHTML = '<li>Excellent password structure detected! Highly secure.</li>';
    } else {
        suggestions.forEach(tip => {
            const li = document.createElement('li');
            li.textContent = tip;
            listSuggestions.appendChild(li);
        });
    }
}

// ==========================================
// PROGRESS TRACKER & CANVAS GRAPH VISUALS
// ==========================================

async function fetchProgressData() {
    if (!state.isLoggedIn) return;

    try {
        const response = await fetch(`/tools/progress/${state.user.id}`);
        const data = await response.json();

        if (data.success) {
            const stats = data.data;
            
            // Sync dashboard text summaries
            const compCountText = document.getElementById('dash-completed-count');
            const avgScoreText = document.getElementById('dash-average-score');
            const weakCountText = document.getElementById('dash-weak-count');

            if (compCountText) compCountText.textContent = stats.topics_completed.length;
            if (avgScoreText) avgScoreText.textContent = `${stats.average_score}%`;
            if (weakCountText) {
                weakCountText.textContent = stats.weak_areas.length > 0 ? stats.weak_areas.join(', ') : 'None';
            }

            // Sync progress report view structures
            const progCompEl = document.getElementById('prog-completed-count');
            const progAvgEl = document.getElementById('prog-average-score');
            const passedListEl = document.getElementById('prog-passed-list');
            const failedListEl = document.getElementById('prog-failed-list');

            if (progCompEl) progCompEl.textContent = stats.topics_completed.length;
            if (progAvgEl) progAvgEl.textContent = `${stats.average_score}%`;

            // Populate bullet details
            if (passedListEl) {
                passedListEl.innerHTML = '';
                if (stats.topics_completed.length === 0) {
                    passedListEl.innerHTML = '<li class="muted-li">No topics completed yet. Test your knowledge in quizzes to pass modules.</li>';
                } else {
                    stats.topics_completed.forEach(topic => {
                        const li = document.createElement('li');
                        li.textContent = topic;
                        passedListEl.appendChild(li);
                    });
                }
            }

            if (failedListEl) {
                failedListEl.innerHTML = '';
                if (stats.weak_areas.length === 0) {
                    failedListEl.innerHTML = '<li class="muted-li">No weaknesses discovered. Keep maintaining secure practices!</li>';
                } else {
                    stats.weak_areas.forEach(topic => {
                        const li = document.createElement('li');
                        li.textContent = topic;
                        failedListEl.appendChild(li);
                    });
                }
            }

            // Redraw glowing graph report
            drawProgressChart(stats.chart_data);
        }
    } catch (e) {
        console.error('Failed to load user metrics summary:', e);
    }
}

function drawProgressChart(chartData) {
    const canvas = document.getElementById('progress-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Scale canvas pixels dynamically for high DPI sharpness
    const width = 500;
    const height = 300;
    canvas.width = width;
    canvas.height = height;

    // Clear background
    ctx.clearRect(0, 0, width, height);

    // Padding dimensions
    const padding = 50;
    const graphWidth = width - (padding * 2);
    const graphHeight = height - (padding * 2);

    // 1. Draw Grid Lines and Y-Axis Marks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding + (graphHeight * i / 4);
        
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();

        // Draw percentage values (100%, 75%, 50%, 25%, 0%)
        ctx.fillStyle = '#64748b';
        ctx.font = '10px "Share Tech Mono"';
        ctx.textAlign = 'right';
        ctx.fillText(`${100 - i * 25}%`, padding - 10, y + 3);
    }

    // Check empty state
    if (!chartData || chartData.length === 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = '13px "Outfit"';
        ctx.textAlign = 'center';
        ctx.fillText('No evaluation scores found. Complete quizzes to populate graph.', width / 2, height / 2);
        return;
    }

    // 2. Plotting the Bars
    const barWidth = Math.min(42, (graphWidth / chartData.length) * 0.55);
    const spacing = (graphWidth - (barWidth * chartData.length)) / (chartData.length + 1);

    chartData.forEach((item, idx) => {
        const x = padding + spacing + idx * (barWidth + spacing);
        const score = item.score;
        const barHeight = graphHeight * (score / 100);
        const y = padding + graphHeight - barHeight;

        // Creating custom gradients
        const gradient = ctx.createLinearGradient(x, y, x, padding + graphHeight);
        if (score >= 70) {
            gradient.addColorStop(0, '#10b981'); // Emerald
            gradient.addColorStop(1, 'rgba(16, 185, 129, 0.05)');
            ctx.shadowColor = 'rgba(16, 185, 129, 0.3)';
        } else {
            gradient.addColorStop(0, '#ef4444'); // Red
            gradient.addColorStop(1, 'rgba(239, 68, 68, 0.05)');
            ctx.shadowColor = 'rgba(239, 68, 68, 0.3)';
        }

        // Draw Bar shape
        ctx.shadowBlur = 8;
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Draw bar top glowing line border
        ctx.shadowBlur = 0;
        ctx.strokeStyle = score >= 70 ? '#10b981' : '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + barWidth, y);
        ctx.stroke();

        // 3. Draw Labels
        // Topic abbreviation below X-Axis
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px "Outfit"';
        ctx.textAlign = 'center';
        
        let label = item.topic;
        if (label.length > 12) label = label.substring(0, 10) + '...';
        ctx.fillText(label, x + barWidth / 2, padding + graphHeight + 18);

        // Score value printed inside/above bar
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '10px "Share Tech Mono"';
        ctx.fillText(`${score}%`, x + barWidth / 2, y - 8);
    });
}
