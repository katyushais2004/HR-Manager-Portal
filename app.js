// Базовый URL API сервера
const API_BASE_URL = 'http://localhost:3000/api';

// Глобальные переменные состояния
let specialists = [];
let interviews = [];
let skills = [];
let selectedSpecialistId = null;
let currentSpecialistIdForInterview = null;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    loadInitialData();
    setupEventListeners();
});

// Загрузка начальных данных
async function loadInitialData() {
    try {
        await Promise.all([
            loadSpecialists(),
            loadSkills()
        ]);
        updateUI();
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showNotification('Ошибка загрузки данных', 'error');
    }
}

// Загрузка специалистов
async function loadSpecialists() {
    try {
        const response = await fetch(`${API_BASE_URL}/specialists`);
        if (!response.ok) throw new Error('Ошибка загрузки специалистов');
        specialists = await response.json();
    } catch (error) {
        console.error('Ошибка загрузки специалистов:', error);
        throw error;
    }
}

// Загрузка собеседований
async function loadInterviews() {
    try {
        const response = await fetch(`${API_BASE_URL}/interviews`);
        if (!response.ok) throw new Error('Ошибка загрузки собеседований');
        interviews = await response.json();
    } catch (error) {
        console.error('Ошибка загрузки собеседований:', error);
        throw error;
    }
}

// Загрузка навыков
async function loadSkills() {
    try {
        const response = await fetch(`${API_BASE_URL}/skills`);
        if (!response.ok) throw new Error('Ошибка загрузки навыков');
        skills = await response.json();
    } catch (error) {
        console.error('Ошибка загрузки навыков:', error);
        throw error;
    }
}
// Функция удаления навыка из списка
// Функция удаления навыка из списка
function deleteSkill(skillName, event) {
    if (event) event.stopPropagation();
    
    // Проверяем, используется ли навык
    if (isSkillUsed(skillName)) {
        showNotification(`Навык "${skillName}" используется и не может быть удален`, 'warning');
        return;
    }
    
    showConfirmModal(
        'Удалить навык?',
        `Вы уверены, что хотите удалить навык "${skillName}"?`,
        async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/skills/${encodeURIComponent(skillName)}`, {
                    method: 'DELETE'
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Ошибка удаления');
                }
                
                // Обновляем списки
                await loadSkills();
                updateSkillsSelectors();
                showNotification(`Навык "${skillName}" удален`, 'success');
                
            } catch (error) {
                console.error('Ошибка удаления навыка:', error);
                showNotification(error.message || 'Ошибка удаления навыка', 'error');
            }
        }
    );
}

// Обновляем рендеринг навыков с кнопками удаления
function renderSkills() {
    const container = document.getElementById('skillsList');
    
    if (!skills || skills.length === 0) {
        container.innerHTML = '<div class="no-selection"><i class="fas fa-tools"></i><p>Нет навыков</p></div>';
        return;
    }
    
    container.innerHTML = skills.map(skill => `
        <div class="skill-tag skill-item" title="Навык: ${escapeHtml(skill)}">
            <i class="fas fa-tag"></i>
            <span class="skill-name">${escapeHtml(skill)}</span>
            <button class="skill-delete-btn" onclick="deleteSkill('${escapeHtml(skill)}', event)" 
                    title="Удалить навык ${escapeHtml(skill)}">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
    
    updateSkillsSelectors();
}

// Обновление UI
function updateUI() {
    renderSpecialists();
    renderSkills();
    updateSelectedSpecialistInfo();
    renderInterviews();
    updateAddInterviewButton();
}
// Функция для рендеринга тегов навыков
function renderSkillTags(skillArray, type = 'specialist') {
    if (!skillArray || !Array.isArray(skillArray) || skillArray.length === 0) {
        return '<span class="text-muted">Нет навыков</span>';
    }
    
    return skillArray.map(skill => `
        <div class="skill-tag ${type}">
            <i class="fas fa-tag"></i>${escapeHtml(skill)}
        </div>
    `).join('');
}
// Рендеринг списка специалистов
function renderSpecialists() {
    const container = document.getElementById('specialistsList');
    const searchTerm = document.getElementById('searchSpecialist')?.value.toLowerCase() || '';
    
    if (!specialists || specialists.length === 0) {
        container.innerHTML = '<div class="no-selection"><i class="fas fa-user-slash"></i><p>Нет специалистов</p></div>';
        return;
    }
    
    const filteredSpecialists = specialists.filter(specialist => 
        specialist.name.toLowerCase().includes(searchTerm) ||
        specialist.id.toLowerCase().includes(searchTerm)
    );
    
    if (filteredSpecialists.length === 0) {
        container.innerHTML = '<div class="no-selection"><i class="fas fa-search"></i><p>Специалисты не найдены</p></div>';
        return;
    }
    
    container.innerHTML = filteredSpecialists.map(specialist => `
        <div class="specialist-item ${selectedSpecialistId === specialist.id ? 'selected' : ''}" 
             onclick="selectSpecialist('${specialist.id}')">
            <div class="specialist-header">
                <div>
                    <div class="specialist-name">${escapeHtml(specialist.name)}</div>
                    <div class="specialist-id">${escapeHtml(specialist.id)}</div>
                </div>
                <div class="specialist-availability">
                    <i class="fas fa-clock"></i>
                    ${formatTime(specialist.available_from)} - ${formatTime(specialist.available_to)}
                </div>
            </div>
            <div class="specialist-skills">
                ${renderSkillTags(specialist.skills)}
            </div>
            <div class="actions">
                <button class="btn btn-edit btn-sm" onclick="editSpecialist('${specialist.id}', event)">
                    <i class="fas fa-edit"></i> Редактировать
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteSpecialist('${specialist.id}', event)">
                    <i class="fas fa-trash"></i> Удалить
                </button>
            </div>
        </div>
    `).join('');
}

// Рендеринг списка навыков
function renderSkills() {
    const container = document.getElementById('skillsList');
    
    if (!skills || skills.length === 0) {
        container.innerHTML = '<div class="no-selection"><i class="fas fa-tools"></i><p>Нет навыков</p></div>';
        return;
    }
    
    container.innerHTML = skills.map(skill => `
        <div class="skill-tag">
            <i class="fas fa-tag"></i>${escapeHtml(skill)}
        </div>
    `).join('');
    
    // Также обновляем селекторы навыков в формах
    updateSkillsSelectors();
}

// Обновление селекторов навыков в формах
function updateSkillsSelectors() {
    // Для формы специалиста
    const specialistSkillsContainer = document.getElementById('specialistSkillsSelector');
    if (specialistSkillsContainer) {
        specialistSkillsContainer.innerHTML = skills.map(skill => `
            <label class="skill-checkbox">
                <input type="checkbox" value="${escapeHtml(skill)}">
                ${escapeHtml(skill)}
            </label>
        `).join('');
    }
    
    // Для формы собеседования
    const interviewSkillsContainer = document.getElementById('interviewSkillsSelector');
    if (interviewSkillsContainer) {
        interviewSkillsContainer.innerHTML = skills.map(skill => `
            <label class="skill-checkbox">
                <input type="checkbox" value="${escapeHtml(skill)}">
                ${escapeHtml(skill)}
            </label>
        `).join('');
    }
    
    // Для формы выбора специалиста
    const specialistSelect = document.getElementById('interviewSpecialist');
    if (specialistSelect) {
        specialistSelect.innerHTML = '<option value="">Выберите специалиста</option>' +
            specialists.map(s => `<option value="${s.id}">${escapeHtml(s.name)} (${s.id})</option>`).join('');
    }
}

// Рендеринг собеседований
function renderInterviews() {
    const container = document.getElementById('interviewsList');
    
    if (!selectedSpecialistId) {
        container.innerHTML = '<div class="no-selection"><i class="fas fa-calendar-alt"></i><p>Выберите специалиста для просмотра собеседований</p></div>';
        return;
    }
    
    const specialist = specialists.find(s => s.id === selectedSpecialistId);
    if (!specialist || !specialist.interviews || specialist.interviews.length === 0) {
        container.innerHTML = '<div class="no-selection"><i class="fas fa-calendar-times"></i><p>У специалиста нет назначенных собеседований</p></div>';
        return;
    }
    
    container.innerHTML = specialist.interviews.map(interview => `
        <div class="interview-item">
            <div class="interview-header">
                <div>
                    <div class="interview-candidate">${escapeHtml(interview.candidate_name)}</div>
                    <div class="interview-id">${escapeHtml(interview.id)}</div>
                </div>
                <div class="interview-time">
                    <i class="fas fa-clock"></i>
                    ${formatTime(interview.time)}
                </div>
            </div>
            <div class="interview-skills">
                ${renderSkillTags(interview.skills, 'interview')}
            </div>
            <div class="actions">
                <button class="btn btn-edit btn-sm" onclick="editInterview('${interview.id}', event)">
                    <i class="fas fa-edit"></i> Редактировать
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteInterview('${interview.id}', event)">
                    <i class="fas fa-trash"></i> Удалить
                </button>
                <button class="btn btn-secondary btn-sm" onclick="transferInterview('${interview.id}', event)">
                    <i class="fas fa-exchange-alt"></i> Перевести
                </button>
            </div>
        </div>
    `).join('');
}

// Обновление информации о выбранном специалисте
function updateSelectedSpecialistInfo() {
    const container = document.getElementById('selectedSpecialistInfo');
    
    if (!selectedSpecialistId) {
        container.innerHTML = `
            <div class="no-selection">
                <i class="fas fa-mouse-pointer"></i>
                <p>Выберите специалиста для просмотра собеседований</p>
            </div>
        `;
        return;
    }
    
    const specialist = specialists.find(s => s.id === selectedSpecialistId);
    if (!specialist) return;
    
    container.innerHTML = `
        <div class="selected-specialist-info">
            <h3><i class="fas fa-user-tie"></i> ${escapeHtml(specialist.name)}</h3>
            <div class="specialist-details">
                <div><i class="fas fa-id-badge"></i> <strong>ID:</strong> ${escapeHtml(specialist.id)}</div>
                <div><i class="fas fa-clock"></i> <strong>Доступен:</strong> ${formatTime(specialist.available_from)} - ${formatTime(specialist.available_to)}</div>
                <div><i class="fas fa-tools"></i> <strong>Навыки:</strong> ${specialist.skills.join(', ')}</div>
                <div><i class="fas fa-calendar-check"></i> <strong>Собеседований:</strong> ${specialist.interviews ? specialist.interviews.length : 0}</div>
            </div>
        </div>
    `;
}

// Обновление состояния кнопки добавления собеседования
function updateAddInterviewButton() {
    const btn = document.getElementById('addInterviewBtn');
    if (btn) {
        btn.disabled = !selectedSpecialistId;
    }
}

// Выбор специалиста
function selectSpecialist(id) {
    if (selectedSpecialistId === id) {
        selectedSpecialistId = null;
    } else {
        selectedSpecialistId = id;
    }
    updateUI();
}

// Функции для работы с модальными окнами

function openSpecialistModal(specialistId = null) {
    const modal = document.getElementById('specialistModal');
    const title = document.getElementById('specialistModalTitle');
    const form = document.getElementById('specialistForm');
    
    if (specialistId) {
        // Режим редактирования
        const specialist = specialists.find(s => s.id === specialistId);
        if (!specialist) return;
        
        title.textContent = 'Редактировать специалиста';
        document.getElementById('specialistId').value = specialist.id;
        document.getElementById('specialistName').value = specialist.name;
        document.getElementById('availableFrom').value = specialist.available_from;
        document.getElementById('availableTo').value = specialist.available_to;
        
        // Установка чекбоксов навыков
        setTimeout(() => {
            const checkboxes = document.querySelectorAll('#specialistSkillsSelector input[type="checkbox"]');
            checkboxes.forEach(cb => {
                cb.checked = specialist.skills.includes(cb.value);
                cb.parentElement.classList.toggle('checked', cb.checked);
            });
        }, 100);
    } else {
        // Режим добавления
        title.textContent = 'Добавить специалиста';
        form.reset();
        document.getElementById('specialistId').value = '';
        
        // Сброс чекбоксов
        setTimeout(() => {
            const checkboxes = document.querySelectorAll('#specialistSkillsSelector input[type="checkbox"]');
            checkboxes.forEach(cb => {
                cb.checked = false;
                cb.parentElement.classList.remove('checked');
            });
        }, 100);
    }
    
    modal.style.display = 'block';
}

function openInterviewModal(interviewId = null) {
    if (!selectedSpecialistId && !interviewId) {
        showNotification('Сначала выберите специалиста', 'warning');
        return;
    }
    
    const modal = document.getElementById('interviewModal');
    const title = document.getElementById('interviewModalTitle');
    const form = document.getElementById('interviewForm');
    
    if (interviewId) {
        // Режим редактирования
        const interview = interviews.find(i => i.id === interviewId) || 
                         specialists.flatMap(s => s.interviews || []).find(i => i.id === interviewId);
        if (!interview) return;
        
        title.textContent = 'Редактировать собеседование';
        document.getElementById('interviewId').value = interview.id;
        document.getElementById('candidateName').value = interview.candidate_name;
        document.getElementById('interviewTime').value = interview.time;
        document.getElementById('interviewSpecialistId').value = interview.specialist_id;
        
        // Установка выбранного специалиста
        setTimeout(() => {
            const specialistSelect = document.getElementById('interviewSpecialist');
            if (specialistSelect) {
                specialistSelect.value = interview.specialist_id;
            }
            
            // Установка чекбоксов навыков
            const checkboxes = document.querySelectorAll('#interviewSkillsSelector input[type="checkbox"]');
            checkboxes.forEach(cb => {
                cb.checked = interview.skills.includes(cb.value);
                cb.parentElement.classList.toggle('checked', cb.checked);
            });
        }, 100);
    } else {
        // Режим добавления
        title.textContent = 'Добавить собеседование';
        form.reset();
        document.getElementById('interviewId').value = '';
        document.getElementById('interviewSpecialistId').value = selectedSpecialistId;
        
        // Установка специалиста по умолчанию
        setTimeout(() => {
            const specialistSelect = document.getElementById('interviewSpecialist');
            if (specialistSelect && selectedSpecialistId) {
                specialistSelect.value = selectedSpecialistId;
            }
            
            // Сброс чекбоксов
            const checkboxes = document.querySelectorAll('#interviewSkillsSelector input[type="checkbox"]');
            checkboxes.forEach(cb => {
                cb.checked = false;
                cb.parentElement.classList.remove('checked');
            });
        }, 100);
    }
    
    modal.style.display = 'block';
}

function openSkillModal() {
    const modal = document.getElementById('skillModal');
    const form = document.getElementById('skillForm');
    form.reset();
    modal.style.display = 'block';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Закрытие модальных окон по клику вне контента
    window.onclick = function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    };
    
    // Обработчик формы специалиста
    const specialistForm = document.getElementById('specialistForm');
    if (specialistForm) {
        specialistForm.addEventListener('submit', handleSpecialistSubmit);
    }
    
    // Обработчик формы собеседования
    const interviewForm = document.getElementById('interviewForm');
    if (interviewForm) {
        interviewForm.addEventListener('submit', handleInterviewSubmit);
    }
    
    // Обработчик формы навыка
    const skillForm = document.getElementById('skillForm');
    if (skillForm) {
        skillForm.addEventListener('submit', handleSkillSubmit);
    }
    
    // Обработчики для чекбоксов навыков
    document.addEventListener('click', function(e) {
        if (e.target.type === 'checkbox' && e.target.closest('.skill-checkbox')) {
            const label = e.target.closest('.skill-checkbox');
            label.classList.toggle('checked', e.target.checked);
        }
    });
}

// Обработчики форм

async function handleSpecialistSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('specialistId').value;
    const name = document.getElementById('specialistName').value.trim();
    const availableFrom = document.getElementById('availableFrom').value;
    const availableTo = document.getElementById('availableTo').value;
    
    // Сбор выбранных навыков
    const skillCheckboxes = document.querySelectorAll('#specialistSkillsSelector input[type="checkbox"]:checked');
    const selectedSkills = Array.from(skillCheckboxes).map(cb => cb.value);
    
    if (!name || !availableFrom || !availableTo) {
        showNotification('Заполните все обязательные поля', 'warning');
        return;
    }
    
    try {
        const specialistData = {
            name,
            available_from: availableFrom,
            available_to: availableTo,
            skills: selectedSkills
        };
        
        let response;
        if (id) {
            // Обновление существующего специалиста
            response = await fetch(`${API_BASE_URL}/specialists/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(specialistData)
            });
        } else {
            // Создание нового специалиста
            response = await fetch(`${API_BASE_URL}/specialists`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(specialistData)
            });
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Ошибка сохранения');
        }
        
        await loadSpecialists();
        updateUI();
        closeModal('specialistModal');
        showNotification(id ? 'Специалист обновлен' : 'Специалист добавлен', 'success');
        
    } catch (error) {
        console.error('Ошибка сохранения специалиста:', error);
        showNotification(error.message || 'Ошибка сохранения', 'error');
    }
}

// Функция для показа деталей использования навыка
function showSkillUsage(skillName) {
    // Можно добавить модальное окно с подробной информацией
    const specialistsUsingSkill = specialists.filter(s => 
        s.skills && s.skills.includes(skillName)
    );
    
    const interviewsUsingSkill = interviews.filter(i =>
        i.skills && i.skills.includes(skillName)
    );
    
    if (specialistsUsingSkill.length === 0 && interviewsUsingSkill.length === 0) {
        return null;
    }
    
    let message = `Навык "${skillName}" используется в:\n\n`;
    
    if (specialistsUsingSkill.length > 0) {
        message += `Специалисты (${specialistsUsingSkill.length}):\n`;
        specialistsUsingSkill.slice(0, 5).forEach(s => {
            message += `• ${s.name}\n`;
        });
        if (specialistsUsingSkill.length > 5) {
            message += `• ...и еще ${specialistsUsingSkill.length - 5}\n`;
        }
        message += '\n';
    }
    
    if (interviewsUsingSkill.length > 0) {
        message += `Собеседования (${interviewsUsingSkill.length}):\n`;
        interviewsUsingSkill.slice(0, 5).forEach(i => {
            message += `• ${i.candidate_name}\n`;
        });
        if (interviewsUsingSkill.length > 5) {
            message += `• ...и еще ${interviewsUsingSkill.length - 5}\n`;
        }
    }
    
    return message;
}
async function handleInterviewSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('interviewId').value;
    const candidateName = document.getElementById('candidateName').value.trim();
    const time = document.getElementById('interviewTime').value;
    const specialistId = document.getElementById('interviewSpecialist').value;
    
    // Сбор выбранных навыков
    const skillCheckboxes = document.querySelectorAll('#interviewSkillsSelector input[type="checkbox"]:checked');
    const selectedSkills = Array.from(skillCheckboxes).map(cb => cb.value);
    
    if (!candidateName || !time || !specialistId) {
        showNotification('Заполните все обязательные поля', 'warning');
        return;
    }
    
    if (selectedSkills.length === 0) {
        showNotification('Выберите хотя бы один навык', 'warning');
        return;
    }
    
    try {
        const interviewData = {
            candidate_name: candidateName,
            time,
            skills: selectedSkills,
            specialist_id: specialistId
        };
        
        let response;
        if (id) {
            // Обновление существующего собеседования
            response = await fetch(`${API_BASE_URL}/interviews/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(interviewData)
            });
        } else {
            // Создание нового собеседования
            response = await fetch(`${API_BASE_URL}/interviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(interviewData)
            });
        }
        
        if (!response.ok) {
            const error = await response.json();
            if (error.compatibility) {
                showNotification(`Совместимость навыков: ${error.compatibility}% (< 80%)`, 'warning');
            } else {
                throw new Error(error.error || 'Ошибка сохранения');
            }
            return;
        }
        
        await loadSpecialists();
        updateUI();
        closeModal('interviewModal');
        showNotification(id ? 'Собеседование обновлено' : 'Собеседование добавлено', 'success');
        
    } catch (error) {
        console.error('Ошибка сохранения собеседования:', error);
        showNotification(error.message || 'Ошибка сохранения', 'error');
    }
}

async function handleSkillSubmit(e) {
    e.preventDefault();
    
    const skillName = document.getElementById('skillName').value.trim();
    
    if (!skillName) {
        showNotification('Введите название навыка', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/skills`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: skillName })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Ошибка добавления навыка');
        }
        
        await loadSkills();
        updateSkillsSelectors();
        closeModal('skillModal');
        showNotification('Навык добавлен', 'success');
        
    } catch (error) {
        console.error('Ошибка добавления навыка:', error);
        showNotification(error.message || 'Ошибка добавления навыка', 'error');
    }
}

// Функции для редактирования

function editSpecialist(id, event) {
    event.stopPropagation();
    openSpecialistModal(id);
}

function editInterview(id, event) {
    event.stopPropagation();
    openInterviewModal(id);
}

// Функции для удаления

function deleteSpecialist(id, event) {
    event.stopPropagation();
    
    const specialist = specialists.find(s => s.id === id);
    if (!specialist) return;
    
    showConfirmModal(
        `Удалить специалиста "${specialist.name}"?`,
        `Все собеседования специалиста также будут удалены.`,
        async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/specialists/${id}`, {
                    method: 'DELETE'
                });
                
                if (!response.ok) throw new Error('Ошибка удаления');
                
                await loadSpecialists();
                if (selectedSpecialistId === id) {
                    selectedSpecialistId = null;
                }
                updateUI();
                showNotification('Специалист удален', 'success');
                
            } catch (error) {
                console.error('Ошибка удаления специалиста:', error);
                showNotification('Ошибка удаления', 'error');
            }
        }
    );
}

function deleteInterview(id, event) {
    event.stopPropagation();
    
    showConfirmModal(
        'Удалить собеседование?',
        'Это действие нельзя отменить.',
        async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/interviews/${id}`, {
                    method: 'DELETE'
                });
                
                if (!response.ok) throw new Error('Ошибка удаления');
                
                await loadSpecialists();
                updateUI();
                showNotification('Собеседование удалено', 'success');
                
            } catch (error) {
                console.error('Ошибка удаления собеседования:', error);
                showNotification('Ошибка удаления', 'error');
            }
        }
    );
}

// Функция перевода собеседования
function transferInterview(id, event) {
    event.stopPropagation();
    
    const interview = interviews.find(i => i.id === id) || 
                     specialists.flatMap(s => s.interviews || []).find(i => i.id === id);
    if (!interview) return;
    
    currentSpecialistIdForInterview = id;
    openInterviewModal(id);
}

// Функция подтверждения действия
function showConfirmModal(title, message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    const titleEl = document.getElementById('confirmModalTitle');
    const messageEl = document.getElementById('confirmModalMessage');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    // Удаляем старые обработчики
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    // Добавляем новый обработчик
    newConfirmBtn.addEventListener('click', () => {
        onConfirm();
        closeModal('confirmModal');
    });
    
    modal.style.display = 'block';
}

// Вспомогательные функции

function renderSkills() {
    const container = document.getElementById('skillsList');
    
    if (!skills || skills.length === 0) {
        container.innerHTML = '<div class="no-selection"><i class="fas fa-tools"></i><p>Нет навыков</p></div>';
        return;
    }
    
    container.innerHTML = skills.map(skill => {
        // Проверяем, используется ли навык
        const isUsed = isSkillUsed(skill);
        const skillClass = isUsed ? 'skill-tag skill-with-btn skill-in-use' : 'skill-tag skill-with-btn';
        
        return `
        <div class="${skillClass}" title="Навык: ${escapeHtml(skill)}">
            <i class="fas fa-tag"></i>
            <span class="skill-text">${escapeHtml(skill)}</span>
            <button class="skill-delete-btn" onclick="deleteSkill('${escapeHtml(skill)}', event)" 
                    title="${isUsed ? 'Навык используется - нельзя удалить' : 'Удалить навык'}">
                <i class="fas fa-times"></i>
            </button>
        </div>
        `;
    }).join('');
    
    updateSkillsSelectors();
}

// Добавьте эту вспомогательную функцию тоже:
function isSkillUsed(skillName) {
    if (!specialists || !interviews) return false;
    
    // Проверяем у специалистов
    const usedInSpecialists = specialists.some(s => 
        s.skills && Array.isArray(s.skills) && s.skills.includes(skillName)
    );
    
    // Проверяем в собеседованиях
    const usedInInterviews = interviews.some(i =>
        i.skills && Array.isArray(i.skills) && i.skills.includes(skillName)
    );
    
    return usedInSpecialists || usedInInterviews;
}

function formatTime(timeString) {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Показ уведомлений
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    const formattedMessage = message.replace(/\n/g, '<br>');
    notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        <span>${escapeHtml(message)}</span>
    `;
    
    container.appendChild(notification);
    
    // Автоматическое удаление уведомления
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 5000);
}

function getNotificationIcon(type) {
    switch(type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

// Фильтрация специалистов
function filterSpecialists() {
    renderSpecialists();
}

// Глобальное экспортирование функций для использования в HTML
window.openSpecialistModal = openSpecialistModal;
window.openInterviewModal = openInterviewModal;
window.openSkillModal = openSkillModal;
window.closeModal = closeModal;
window.selectSpecialist = selectSpecialist;
window.editSpecialist = editSpecialist;
window.editInterview = editInterview;
window.deleteSpecialist = deleteSpecialist;
window.deleteInterview = deleteInterview;
window.transferInterview = transferInterview;
window.filterSpecialists = filterSpecialists;