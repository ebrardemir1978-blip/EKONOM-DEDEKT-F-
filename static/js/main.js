/* main.js */
let currentMode = 'login'; // login or register
let userConfig = null;
let currentGameData = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
});

async function checkAuthStatus() {
    try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
            const data = await res.json();
            userConfig = data;
            updateDashboard();
            switchView('dashboard-view');
        } else {
            switchView('auth-view');
        }
    } catch (e) {
        switchView('auth-view');
    }
}

function switchAuthTab(mode) {
    currentMode = mode;
    document.getElementById('tab-login').classList.remove('active');
    document.getElementById('tab-register').classList.remove('active');
    document.getElementById(`tab-${mode}`).classList.add('active');
    document.getElementById('auth-submit-btn').innerText = mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol';
}

async function handleAuth(e) {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const errorEl = document.getElementById('auth-error');
    errorEl.innerText = "";

    const url = currentMode === 'login' ? '/api/auth/login' : '/api/auth/register';

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });
        const data = await res.json();
        
        if (res.ok) {
            userConfig = data.user;
            updateDashboard();
            switchView('dashboard-view');
        } else {
            errorEl.innerText = data.error || "Bir hata oluştu.";
        }
    } catch (err) {
        errorEl.innerText = "Sunucu bağlantı hatası.";
    }
}

async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    userConfig = null;
    switchView('auth-view');
    document.getElementById('username').value = "";
    document.getElementById('password').value = "";
}

function updateDashboard() {
    if (!userConfig) return;
    document.getElementById('dash-username').innerText = userConfig.username;
    document.getElementById('dash-score').innerText = userConfig.score;
    document.getElementById('dash-level').innerText = userConfig.level;
}

function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => {
        v.classList.remove('active');
    });
    document.getElementById(viewId).classList.add('active');
}

function showDashboard() {
    updateDashboard(); // refresh scores
    switchView('dashboard-view');
}

function startGame() {
    // Generate random economic data based on level or just random
    currentGameData = {
        inflation: (Math.random() * 80).toFixed(1), // 0 to 80%
        unemployment: (Math.random() * 20).toFixed(1), // 0 to 20%
        interest_rate: (Math.random() * 50).toFixed(1), // 0 to 50%
        growth: ((Math.random() * 15) - 5).toFixed(1), // -5 to 10%
        exchange_rate: (Math.random() * 30 + 10).toFixed(1) // 10 to 40
    };

    document.getElementById('random-case').innerText = Math.floor(Math.random() * 1000) + 1;
    
    // Inject to grid
    const grid = document.getElementById('data-grid');
    grid.innerHTML = `
        <div class="data-item"><div class="label">Enflasyon</div><div class="value">%${currentGameData.inflation}</div></div>
        <div class="data-item"><div class="label">İşsizlik</div><div class="value">%${currentGameData.unemployment}</div></div>
        <div class="data-item"><div class="label">Faiz Oranı</div><div class="value">%${currentGameData.interest_rate}</div></div>
        <div class="data-item"><div class="label">Büyüme</div><div class="value">%${currentGameData.growth}</div></div>
        <div class="data-item"><div class="label">Döviz Kuru</div><div class="value">₺${currentGameData.exchange_rate}</div></div>
    `;

    switchView('game-view');
}

async function submitPrediction(prediction) {
    if (!currentGameData) return;

    const payload = {
        prediction: prediction,
        ...currentGameData
    };

    try {
        const res = await fetch('/api/game/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (res.ok) {
            const data = await res.json();
            userConfig.score = data.new_score;
            userConfig.level = data.new_level;
            
            showResultModal(data);
        }
    } catch(e) {
        alert("Bir hata oluştu. Lütfen tekrar dene.");
    }
}

function showResultModal(resultData) {
    const modal = document.getElementById('result-modal');
    const title = document.getElementById('result-title');
    const msg = document.getElementById('result-message');
    const exp = document.getElementById('result-explanation');

    if (resultData.is_correct) {
        title.innerText = "Tebrikler Detektif! 🕵️‍♂️";
        title.style.color = "var(--success)";
    } else {
        title.innerText = "Maalesef Yanlış! 🚨";
        title.style.color = "var(--danger)";
    }

    msg.innerText = resultData.message;
    exp.innerText = resultData.explanation + `\n\nYeni Puanın: ${resultData.new_score} | Seviye: ${resultData.new_level}`;

    modal.classList.add('active');
}

function closeResultAndDashboard() {
    document.getElementById('result-modal').classList.remove('active');
    showDashboard();
}
