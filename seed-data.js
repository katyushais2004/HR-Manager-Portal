const db = require('./database');

async function seedData() {
    try {
        console.log('Начало заполнения базы данных...');
        
        // Дадим время на создание таблиц
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Очищаем таблицы
        await db.run('DELETE FROM specialists');
        await db.run('DELETE FROM interviews');
        await db.run('DELETE FROM skills');

        // Добавляем навыки по умолчанию
        const defaultSkills = [
            'JavaScript', 'TypeScript', 'Node.js', 'React', 'Vue.js',
            'Python', 'Java', 'C#', 'SQL', 'NoSQL', 'Docker', 'AWS',
            'DevOps', 'Agile/Scrum', 'Git', 'REST API', 'GraphQL'
        ];

        for (const skill of defaultSkills) {
            try {
                await db.insert('skills', { name: skill });
                console.log(`Добавлен навык: ${skill}`);
            } catch (error) {
                console.log(`Навык ${skill} уже существует`);
            }
        }

        // Добавляем тестовых специалистов
        const specialists = [
            {
                id: 'SPEC-001',
                name: 'Иванов Иван Иванович',
                available_from: '09:00',
                available_to: '18:00',
                skills: JSON.stringify(['JavaScript', 'React', 'Node.js', 'TypeScript', 'Git'])
            },
            {
                id: 'SPEC-002',
                name: 'Петров Петр Петрович',
                available_from: '10:00',
                available_to: '19:00',
                skills: JSON.stringify(['Python', 'Docker', 'AWS', 'SQL', 'DevOps'])
            },
            {
                id: 'SPEC-003',
                name: 'Сидорова Анна Владимировна',
                available_from: '08:00',
                available_to: '17:00',
                skills: JSON.stringify(['Java', 'C#', 'SQL', 'NoSQL', 'Agile/Scrum'])
            }
        ];

        for (const specialist of specialists) {
            await db.insert('specialists', specialist);
            console.log(`Добавлен специалист: ${specialist.name}`);
        }

        // Добавляем тестовые собеседования
        const interviews = [
            {
                id: 'INT-001',
                candidate_name: 'Кузнецов Алексей',
                time: '14:00',
                skills: JSON.stringify(['JavaScript', 'React', 'Node.js', 'Git']),
                specialist_id: 'SPEC-001'
            },
            {
                id: 'INT-002',
                candidate_name: 'Морозова Екатерина',
                time: '11:00',
                skills: JSON.stringify(['Python', 'Docker', 'AWS']),
                specialist_id: 'SPEC-002'
            }
        ];

        for (const interview of interviews) {
            await db.insert('interviews', interview);
            console.log(`Добавлено собеседование для: ${interview.candidate_name}`);
        }

        console.log('Тестовые данные успешно добавлены!');
    } catch (error) {
        console.error('Ошибка при добавлении тестовых данных:', error);
    }
}

// Запускаем заполнение данных
seedData();