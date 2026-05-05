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
    document.getElementById('dash-level').innerText = userConfig.level_name + (" ("+userConfig.stage_id+"/5)");
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

async function startGame() {
    try {
        const res = await fetch('/api/game/case');
        const data = await res.json();
        
        if (data.game_over) {
            alert(data.message);
            return;
        }
        
        if (res.ok) {
            currentGameData = data.data; // Now comes from Backend
            
            document.getElementById('level-display').innerText = "Seviye: " + data.level_name;
            document.getElementById('stage-display').innerText = "Bölüm: " + data.stage_id + "/5";
            
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
        } else {
            alert(data.error || "Erişim reddedildi.");
        }
    } catch(err) {
        alert("Bağlantı hatası.");
    }
}

async function submitPrediction(prediction) {
    if (!currentGameData) return;

    try {
        const res = await fetch('/api/game/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prediction: prediction }) // no need to send other data as backend tracks user state
        });
        
        if (res.ok) {
            const data = await res.json();
            
            // Sync with backend state
            userConfig = data.user_data;
            
            showResultModal(data);
        } else {
             const data = await res.json();
             alert(data.error || "Beklenmeyen Hata");
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
    const country = document.getElementById('result-country');

    if (resultData.is_correct) {
        title.innerText = "Tebrikler Detektif! 🕵️‍♂️";
        title.style.color = "var(--success)";
    } else {
        title.innerText = "Maalesef Yanlış! 🚨";
        title.style.color = "var(--danger)";
    }

    msg.innerText = resultData.msg_title + ` (Bu ülke durumu: ${resultData.true_state})`;
    country.innerText = resultData.country;
    
    let bonusText = `\n\nYeni Puanın: ${userConfig.score} | Yeni Seviye: ${userConfig.level_name}`;
    if(resultData.level_up) {
        bonusText = `\n\n🎉 SEVİYE ATLADINIZ! 🎉\nYeni Puanın: ${userConfig.score} | Yeni Seviye: ${userConfig.level_name}`;
    }
    if(resultData.game_finished) {
        bonusText = `\n\n🏆 OYUNU BİTİRDİNİZ! 🏆\nTüm görevleri tamamladınız.`;
    }
    
    exp.innerText = resultData.explanation + bonusText;

    modal.classList.add('active');
}

function closeResultAndCheckProgress() {
    document.getElementById('result-modal').classList.remove('active');
    // After continuing, if game finished show dashboard else show next level? 
    // Simply return to dashboard is cleaner, they can click "Yeni Tahmin Yap"
    showDashboard();
}
