// ==================== API 配置 ====================
// DeepSeek
const DEEPSEEK_API_KEY = '填写key';
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';

// 智谱AI (ChatGLM)
const ZHIPU_API_KEY = '填写key';
const ZHIPU_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
// =================================================

let currentModel = 'deepseek';
let messages = [];
let historyList = [];

// DOM 元素
const chatContainer = document.getElementById('chatContainer');
const inputBox = document.getElementById('inputBox');
const sendBtn = document.getElementById('sendBtn');
const clearBtn = document.getElementById('clearBtn');
const voiceBtn = document.getElementById('voiceBtn');
const modelOptions = document.querySelectorAll('.model-option');
const darkModeBtn = document.getElementById('darkModeBtn');
const historyBtn = document.getElementById('historyBtn');
const aboutBtn = document.getElementById('aboutBtn');
const modelNameSpan = document.getElementById('modelName');

// ========== 关于按钮 ==========
if (aboutBtn) {
    aboutBtn.addEventListener('click', () => {
        alert('📢 作品声明\n\n本软件仅供比赛演示，严禁商业用途。\nAPI Key为本人个人账号，调用费用由本人承担。\n请勿对本应用进行破解、逆向等操作。\n开发工具：WebToApp\n设计风格：FlClash 莫奈');
    });
}

// ========== 深色模式 ==========
function initDarkMode() {
    const saved = localStorage.getItem('darkMode');
    if (saved === 'true') {
        document.body.classList.add('dark');
        darkModeBtn.textContent = '☀️';
    }
}
darkModeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('darkMode', isDark);
    darkModeBtn.textContent = isDark ? '☀️' : '🌙';
});

// ========== 提示框 ==========
function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1500);
}

// ========== 复制 ==========
async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('已复制');
    } catch (err) {
        showToast('复制失败');
    }
}

// ========== 历史记录 ==========
function saveToHistory(question, answer, model) {
    historyList.unshift({
        id: Date.now(),
        question: question.substring(0, 50) + (question.length > 50 ? '...' : ''),
        answer: answer.substring(0, 100) + (answer.length > 100 ? '...' : ''),
        model: model,
        time: new Date().toLocaleString()
    });
    if (historyList.length > 30) historyList.pop();
    localStorage.setItem('chatHistory', JSON.stringify(historyList));
}

function showHistory() {
    const saved = localStorage.getItem('chatHistory');
    if (saved) historyList = JSON.parse(saved);
    if (historyList.length === 0) {
        showToast('暂无历史记录');
        return;
    }
    let html = '<div style="max-height:70vh;overflow:auto;padding:12px;">';
    html += '<h3 style="margin-bottom:12px;">📋 历史对话</h3>';
    historyList.forEach(h => {
        html += `<div style="border-bottom:1px solid #ddd;padding:10px 0;margin-bottom:8px;">
                    <div style="font-size:12px;color:#888;">${escapeHtml(h.time)} | ${h.model === 'deepseek' ? 'DeepSeek' : '智谱GLM'}</div>
                    <div style="font-weight:bold;margin:4px 0;">问: ${escapeHtml(h.question)}</div>
                    <div style="font-size:13px;color:#555;">答: ${escapeHtml(h.answer)}</div>
                 </div>`;
    });
    html += '</div>';
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:10000;';
    const content = document.createElement('div');
    content.style.cssText = 'background:rgba(255,255,255,0.9);backdrop-filter:blur(20px);border-radius:28px;max-width:90%;max-height:80%;overflow:auto;padding:20px;';
    if (document.body.classList.contains('dark')) {
        content.style.background = 'rgba(26,26,46,0.9)';
        content.style.color = '#e0e0e0';
    }
    content.innerHTML = html + '<button id="closeHistoryBtn" style="margin-top:12px;padding:10px 20px;border:none;border-radius:40px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;font-weight:600;">关闭</button>';
    modal.appendChild(content);
    document.body.appendChild(modal);
    document.getElementById('closeHistoryBtn').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

// ========== 语音输入 ==========
function initVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        voiceBtn.style.display = 'none';
        return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'zh-CN';
    voiceBtn.addEventListener('click', () => {
        recognition.start();
        showToast('🎤 请说话...');
    });
    recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        inputBox.innerText = text;
        showToast(`识别: ${text}`);
    };
    recognition.onerror = () => {
        showToast('语音识别失败');
    };
}

// ========== 辅助函数 ==========
function escapeHtml(str) {
    if (!str) return '';
    let escaped = str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
    escaped = escaped.replace(/\n/g, '<br>');
    escaped = escaped.replace(/(\d+)\s*\^\s*(\d+)/g, '$1<sup>$2</sup>');
    return escaped;
}

function getCurrentTime() {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

function updateModelUI() {
    modelOptions.forEach(opt => {
        if (opt.dataset.model === currentModel) {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });
    modelNameSpan.innerText = currentModel === 'deepseek' ? 'DeepSeek' : '智谱GLM';
}

function renderMessages() {
    if (messages.length === 0) {
        if (!chatContainer.querySelector('.welcome')) {
            const welcome = document.createElement('div');
            welcome.className = 'welcome';
            welcome.innerHTML = `
                <div class="welcome-icon">🤖</div>
                <div class="welcome-text">你好！我是AI助手</div>
                <div class="welcome-desc">支持 DeepSeek 和 智谱GLM<br>点击下方麦克风可以语音输入</div>
            `;
            chatContainer.innerHTML = '';
            chatContainer.appendChild(welcome);
        }
        return;
    }
    chatContainer.innerHTML = '';
    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (msg.role === 'user') {
            const div = document.createElement('div');
            div.className = 'message user-message';
            div.innerHTML = `
                <div class="message-content">
                    <div class="bubble user-bubble">${escapeHtml(msg.content)}</div>
                    <div class="message-meta">${getCurrentTime()}</div>
                </div>
                <div class="avatar">👤</div>
            `;
            chatContainer.appendChild(div);
        } else if (msg.role === 'assistant') {
            const div = document.createElement('div');
            div.className = 'message ai-message';
            div.innerHTML = `
                <div class="avatar">🤖</div>
                <div class="message-content">
                    <div class="bubble ai-bubble">${escapeHtml(msg.content)}</div>
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <div class="message-meta">${currentModel === 'deepseek' ? 'DeepSeek' : '智谱GLM'} · ${getCurrentTime()}</div>
                        <button class="copy-btn">📋 复制</button>
                    </div>
                </div>
            `;
            chatContainer.appendChild(div);
        }
    }
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const bubble = btn.closest('.message-content').querySelector('.bubble');
            if (bubble) copyText(bubble.innerText);
        });
    });
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addMessage(role, content) {
    messages.push({ role, content });
    renderMessages();
}

function showLoading() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message ai-message';
    loadingDiv.id = 'loadingMessage';
    loadingDiv.innerHTML = `<div class="avatar">🤖</div><div class="loading"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>`;
    chatContainer.appendChild(loadingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function hideLoading() {
    const loading = document.getElementById('loadingMessage');
    if (loading) loading.remove();
}

// ========== API 调用 ==========
async function callDeepSeek(userQuestion) {
    const requestBody = {
        model: 'deepseek-chat',
        messages: [
            { role: 'system', content: '你是一个有用的AI助手。用简洁清晰的中文回答。数学推导用箭头→或步骤列表。质因数分解用=连接，指数用^表示。重要结论用>开头。每个步骤单独一行。' },
            ...messages.slice(-10),
            { role: 'user', content: userQuestion }
        ],
        stream: false
    };
    const response = await fetch(DEEPSEEK_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify(requestBody)
    });
    if (!response.ok) throw new Error(`API错误 ${response.status}`);
    const data = await response.json();
    return data.choices[0].message.content;
}

async function callZhipu(userQuestion) {
    const requestBody = {
        model: 'glm-4-flash',
        messages: [
            { role: 'system', content: '你是一个有用的AI助手。用简洁清晰的中文回答。数学推导用箭头→或步骤列表。质因数分解用=连接，指数用^表示。重要结论用>开头。每个步骤单独一行。' },
            ...messages.slice(-10),
            { role: 'user', content: userQuestion }
        ],
        stream: false
    };
    const response = await fetch(ZHIPU_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ZHIPU_API_KEY}`
        },
        body: JSON.stringify(requestBody)
    });
    if (!response.ok) throw new Error(`智谱API错误 ${response.status}`);
    const data = await response.json();
    return data.choices[0].message.content;
}

// ========== 发送消息 ==========
async function sendMessage() {
    const question = inputBox.innerText.trim();
    if (!question) {
        showToast('请输入问题');
        return;
    }
    addMessage('user', question);
    inputBox.innerText = '';
    showLoading();
    try {
        let answer = '';
        if (currentModel === 'deepseek') {
            answer = await callDeepSeek(question);
        } else {
            answer = await callZhipu(question);
        }
        hideLoading();
        addMessage('assistant', answer);
        saveToHistory(question, answer, currentModel);
    } catch (error) {
        hideLoading();
        let errorMsg = `调用失败: ${error.message}`;
        if (error.message.includes('401')) {
            errorMsg = 'API Key 无效，请检查配置';
        } else if (error.message.includes('network')) {
            errorMsg = '网络错误，请检查联网状态';
        }
        addMessage('assistant', `❌ ${errorMsg}`);
    }
}

function clearChat() {
    messages = [];
    renderMessages();
    showToast('对话已清空');
}

function setModel(model) {
    currentModel = model;
    updateModelUI();
    showToast(`已切换到 ${model === 'deepseek' ? 'DeepSeek' : '智谱GLM'}`);
}

// ========== 事件绑定 ==========
sendBtn.addEventListener('click', sendMessage);
clearBtn.addEventListener('click', clearChat);
historyBtn.addEventListener('click', showHistory);
modelOptions.forEach(opt => {
    opt.addEventListener('click', () => {
        if (opt.dataset.model !== currentModel) {
            setModel(opt.dataset.model);
        }
    });
});
inputBox.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// 初始化
initDarkMode();
initVoiceInput();
updateModelUI();
renderMessages();

// API Key 提醒
if (DEEPSEEK_API_KEY === 'sk-你的DeepSeekKey' || ZHIPU_API_KEY === '你的智谱Key') {
    setTimeout(() => {
        showToast('⚠️ 请先配置 API Key');
    }, 1000);
}