const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Фиксированная длительность собеседования (2 часа 30 минут)
const INTERVIEW_DURATION = { hours: 2, minutes: 30 };

// Навыки по умолчанию
const DEFAULT_SKILLS = [
    'JavaScript', 'TypeScript', 'Node.js', 'React', 'Vue.js',
    'Python', 'Java', 'C#', 'SQL', 'NoSQL', 'Docker', 'AWS',
    'DevOps', 'Agile/Scrum', 'Git', 'REST API', 'GraphQL'
];

// API для удаления навыков (добавить после GET и POST для skills)
app.delete('/api/skills/:name', async (req, res) => {
    try {
        const { name } = req.params;
        
        // Проверяем, используется ли навык у специалистов
        const specialists = await db.getAll('specialists');
        let isUsed = false;
        let usedBy = [];
        
        for (let specialist of specialists) {
            if (specialist.skills) {
                const skills = JSON.parse(specialist.skills);
                if (skills.includes(name)) {
                    isUsed = true;
                    usedBy.push(`специалист: ${specialist.name}`);
                }
            }
        }
        
        // Проверяем, используется ли навык в собеседованиях
        const interviews = await db.getAll('interviews');
        for (let interview of interviews) {
            if (interview.skills) {
                const skills = JSON.parse(interview.skills);
                if (skills.includes(name)) {
                    isUsed = true;
                    usedBy.push(`собеседование: ${interview.candidate_name}`);
                }
            }
        }
        
        // Если навык используется, нельзя удалить
        if (isUsed) {
            return res.status(400).json({ 
                error: 'Навык используется и не может быть удален',
                details: `Навык "${name}" используется в:`,
                usedBy: usedBy.slice(0, 3) // показываем первые 3 использования
            });
        }
        
        // Удаляем навык из таблицы skills
        await db.query('DELETE FROM skills WHERE name = ?', [name]);
        res.status(204).send();
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// API для специалистов
app.get('/api/specialists', async (req, res) => {
    try {
        const specialists = await db.getAll('specialists');
        // Получаем собеседования для каждого специалиста
        for (let specialist of specialists) {
            const interviews = await db.query(
                'SELECT * FROM interviews WHERE specialist_id = ?',
                [specialist.id]
            );
            specialist.interviews = interviews;
            // Преобразуем навыки из строки в массив
            if (specialist.skills) {
                specialist.skills = JSON.parse(specialist.skills);
            }
        }
        res.json(specialists);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/specialists', async (req, res) => {
    try {
        const { name, available_from, available_to, skills } = req.body;
        const id = `SPEC-${Date.now()}`;
        
        const specialist = {
            id,
            name,
            available_from,
            available_to,
            skills: JSON.stringify(skills || [])
        };
        
        await db.insert('specialists', specialist);
        specialist.skills = skills || [];
        res.status(201).json(specialist);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/specialists/:id', async (req, res) => {
    try {
        const { name, available_from, available_to, skills } = req.body;
        const updates = {
            name,
            available_from,
            available_to,
            skills: JSON.stringify(skills || [])
        };
        
        await db.update('specialists', updates, { id: req.params.id });
        updates.skills = skills || [];
        updates.id = req.params.id;
        res.json(updates);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/specialists/:id', async (req, res) => {
    try {
        // Удаляем все собеседования специалиста
        await db.query('DELETE FROM interviews WHERE specialist_id = ?', [req.params.id]);
        // Удаляем специалиста
        await db.deleteRow('specialists', { id: req.params.id });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API для собеседований
app.get('/api/interviews', async (req, res) => {
    try {
        const interviews = await db.getAll('interviews');
        // Преобразуем навыки из строки в массив
        for (let interview of interviews) {
            if (interview.skills) {
                interview.skills = JSON.parse(interview.skills);
            }
        }
        res.json(interviews);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/interviews', async (req, res) => {
    try {
        const { candidate_name, time, skills, specialist_id } = req.body;
        
        // Проверяем доступность специалиста и совместимость навыков
        const specialist = await db.getById('specialists', specialist_id);
        if (!specialist) {
            return res.status(404).json({ error: 'Специалист не найден' });
        }
        
        // Проверяем совместимость навыков (минимум 80%)
        const specialistSkills = JSON.parse(specialist.skills);
        const interviewSkills = skills || [];
        const commonSkills = specialistSkills.filter(s => interviewSkills.includes(s));
        const compatibility = (commonSkills.length / interviewSkills.length) * 100;
        
        if (compatibility < 80) {
            return res.status(400).json({ 
                error: 'Совместимость навыков менее 80%',
                compatibility: Math.round(compatibility)
            });
        }
        
        // Проверяем доступность времени у специалиста
        const interviewTime = new Date(`1970-01-01T${time}`);
        const availableFrom = new Date(`1970-01-01T${specialist.available_from}`);
        const availableTo = new Date(`1970-01-01T${specialist.available_to}`);
        
        if (interviewTime < availableFrom || interviewTime > availableTo) {
            return res.status(400).json({ 
                error: 'Специалист недоступен в это время'
            });
        }
        
        // Проверяем пересечение по времени с другими собеседованиями
        const existingInterviews = await db.query(
            'SELECT * FROM interviews WHERE specialist_id = ?',
            [specialist_id]
        );
        
        const interviewEnd = new Date(interviewTime.getTime() + 
            INTERVIEW_DURATION.hours * 60 * 60 * 1000 + 
            INTERVIEW_DURATION.minutes * 60 * 1000);
        
        for (let existing of existingInterviews) {
            const existingTime = new Date(`1970-01-01T${existing.time}`);
            const existingEnd = new Date(existingTime.getTime() + 
                INTERVIEW_DURATION.hours * 60 * 60 * 1000 + 
                INTERVIEW_DURATION.minutes * 60 * 1000);
            
            if ((interviewTime >= existingTime && interviewTime < existingEnd) ||
                (interviewEnd > existingTime && interviewEnd <= existingEnd) ||
                (interviewTime <= existingTime && interviewEnd >= existingEnd)) {
                return res.status(400).json({ 
                    error: 'Пересечение по времени с другим собеседованием'
                });
            }
        }
        
        // Создаем собеседование
        const id = `INT-${Date.now()}`;
        const interview = {
            id,
            candidate_name,
            time,
            skills: JSON.stringify(skills || []),
            specialist_id
        };
        
        await db.insert('interviews', interview);
        interview.skills = skills || [];
        res.status(201).json(interview);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/interviews/:id', async (req, res) => {
    try {
        const { candidate_name, time, skills, specialist_id } = req.body;
        
        // Получаем текущее собеседование
        const currentInterview = await db.getById('interviews', req.params.id);
        if (!currentInterview) {
            return res.status(404).json({ error: 'Собеседование не найдено' });
        }
        
        // Проверяем доступность специалиста и совместимость навыков
        const specialist = await db.getById('specialists', specialist_id);
        if (!specialist) {
            return res.status(404).json({ error: 'Специалист не найден' });
        }
        
        // Проверяем совместимость навыков
        const specialistSkills = JSON.parse(specialist.skills);
        const interviewSkills = skills || [];
        const commonSkills = specialistSkills.filter(s => interviewSkills.includes(s));
        const compatibility = (commonSkills.length / interviewSkills.length) * 100;
        
        if (compatibility < 80) {
            return res.status(400).json({ 
                error: 'Совместимость навыков менее 80%',
                compatibility: Math.round(compatibility)
            });
        }
        
        // Проверяем доступность времени
        const interviewTime = new Date(`1970-01-01T${time}`);
        const availableFrom = new Date(`1970-01-01T${specialist.available_from}`);
        const availableTo = new Date(`1970-01-01T${specialist.available_to}`);
        
        if (interviewTime < availableFrom || interviewTime > availableTo) {
            return res.status(400).json({ 
                error: 'Специалист недоступен в это время'
            });
        }
        
        // Проверяем пересечение по времени (исключая текущее собеседование)
        const existingInterviews = await db.query(
            'SELECT * FROM interviews WHERE specialist_id = ? AND id != ?',
            [specialist_id, req.params.id]
        );
        
        const interviewEnd = new Date(interviewTime.getTime() + 
            INTERVIEW_DURATION.hours * 60 * 60 * 1000 + 
            INTERVIEW_DURATION.minutes * 60 * 1000);
        
        for (let existing of existingInterviews) {
            const existingTime = new Date(`1970-01-01T${existing.time}`);
            const existingEnd = new Date(existingTime.getTime() + 
                INTERVIEW_DURATION.hours * 60 * 60 * 1000 + 
                INTERVIEW_DURATION.minutes * 60 * 1000);
            
            if ((interviewTime >= existingTime && interviewTime < existingEnd) ||
                (interviewEnd > existingTime && interviewEnd <= existingEnd) ||
                (interviewTime <= existingTime && interviewEnd >= existingEnd)) {
                return res.status(400).json({ 
                    error: 'Пересечение по времени с другим собеседованием'
                });
            }
        }
        
        // Обновляем собеседование
        const updates = {
            candidate_name,
            time,
            skills: JSON.stringify(skills || []),
            specialist_id
        };
        
        await db.update('interviews', updates, { id: req.params.id });
        updates.skills = skills || [];
        updates.id = req.params.id;
        res.json(updates);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/interviews/:id', async (req, res) => {
    try {
        await db.deleteRow('interviews', { id: req.params.id });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API для навыков
app.get('/api/skills', async (req, res) => {
    try {
        const skills = await db.getAll('skills');
        res.json(skills.map(s => s.name));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/skills', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Название навыка обязательно' });
        }
        
        // Проверяем, существует ли уже такой навык
        const existing = await db.query('SELECT * FROM skills WHERE name = ?', [name]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Навык уже существует' });
        }
        
        await db.insert('skills', { name });
        res.status(201).json({ name });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});