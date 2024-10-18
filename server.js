const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt'); // Importa o bcrypt para criptografia de senhas
const { v4: uuidv4 } = require('uuid'); // Certifique-se de ter importado o uuid
const path = require('path'); // Importa o módulo path

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Configuração do banco de dados
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Jack123456@',
    database: 'trabaio'
});

// Conecta ao banco
db.connect(err => {
    if (err) {
        console.log('Erro ao conectar ao banco:', err);
        return;
    }
    console.log('Conectado ao banco MySQL');
});

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Configurações adicionais para gerenciar produtos
const items = [];

// Adiciona um item
app.post('/addItem', (req, res) => {
    const { name, value, expiration_date, quantity } = req.body;
    
    if (!name || !value || !expiration_date || !quantity) {
        return res.status(400).send('Todos os campos são obrigatórios');
    }

    // Inserir no banco de dados (substitua pela sua lógica de inserção)
    const newItem = { id: items.length + 1, name, value, expiration_date, quantity };
    items.push(newItem);
    
    // Aqui você também deve inserir o item no banco de dados, se estiver usando um
    res.status(201).json(newItem);
});

// Obtém todos os itens
app.get('/items', (req, res) => {
    res.json(items); // Aqui você deve buscar os itens do banco de dados
});

// Exclui um item
app.delete('/items/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const index = items.findIndex(item => item.id === id);
    
    if (index !== -1) {
        items.splice(index, 1);
        // Aqui você deve excluir o item do banco de dados, se estiver usando um
        res.send('Produto excluído com sucesso!');
    } else {
        res.status(404).send('Produto não encontrado');
    }
});

// Rota para obter os totais
app.get('/total', (req, res) => {
    // Aqui você deve calcular os totais a partir do banco de dados
    const totalSalaries = 10000; // Substitua pela sua lógica para obter total de salários
    const totalItems = items.length * 100; // Substitua pela sua lógica para obter total de itens

    res.json({ totalSalaries, totalItems });
});

// ... [código existente]


// Função para calcular a data de lembrete
function calculateReminderDate(hire_date, payment_frequency) {
    const hireDate = new Date(hire_date);
    let reminderDate;

    switch (payment_frequency) {
        case 'mensal':
            reminderDate = new Date(hireDate.setMonth(hireDate.getMonth() + 1));
            break;
        case 'quinzenal':
            reminderDate = new Date(hireDate.setDate(hireDate.getDate() + 15));
            break;
        case 'semanal':
            reminderDate = new Date(hireDate.setDate(hireDate.getDate() + 7));
            break;
        default:
            reminderDate = hireDate; // Fallback
            break;
    }
    return reminderDate.toISOString().split('T')[0]; // Formata para YYYY-MM-DD
}

// Adiciona um funcionário
app.post('/addEmployee', (req, res) => {
    const { name, role, hire_date, salary, payment_frequency } = req.body;

    if (!name || !role || !hire_date || !salary || !payment_frequency) {
        return res.status(400).send('Todos os campos são obrigatórios');
    }

    const query = 'INSERT INTO employees (name, role, hire_date) VALUES (?, ?, ?)';
    db.query(query, [name, role, hire_date], (err, result) => {
        if (err) {
            console.error('Erro ao adicionar funcionário:', err);
            return res.status(500).send('Erro ao adicionar funcionário');
        }

        const employeeId = result.insertId;
        const reminder_date = calculateReminderDate(hire_date, payment_frequency);
        const salaryQuery = 'INSERT INTO salaries (employee_id, amount, payment_frequency, reminder_date) VALUES (?, ?, ?, ?)';
        db.query(salaryQuery, [employeeId, salary, payment_frequency, reminder_date], (err) => {
            if (err) {
                console.error('Erro ao adicionar salário:', err);
                return res.status(500).send('Erro ao adicionar salário');
            }
            res.send('Funcionário e salário adicionados com sucesso!');
        });
    });
});

// Obtém todos os funcionários
app.get('/employees', (req, res) => {
    const query = `
        SELECT e.id, e.name, e.role, e.hire_date, s.amount AS salary, s.payment_frequency 
        FROM employees e 
        JOIN salaries s ON e.id = s.employee_id
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Erro ao obter funcionários:', err);
            return res.status(500).send('Erro ao obter funcionários');
        }
        res.json(results);
    });
});

// Função para calcular a data de expiração de um token
function calculateTokenExpiry() {
    const now = new Date();
    now.setDate(now.getDate() + 15); // Token válido por 15 dias
    return now.toISOString().split('T')[0];
}

// Criação de um token
app.post('/createToken', (req, res) => {
    const { username, password } = req.body;

    // Verifica se o login é do admin
    if (username === 'daicher' && password === 'Jack123456@') {
        const token = uuidv4();
        const expiryDate = calculateTokenExpiry();

        const query = 'INSERT INTO tokens (token, expiry_date) VALUES (?, ?)';
        db.query(query, [token, expiryDate], (err) => {
            if (err) {
                console.error('Erro ao criar token:', err);
                return res.status(500).send('Erro ao criar token');
            }
            res.send({ token, expiryDate });
        });
    } else {
        res.status(403).send('Acesso negado');
    }
});
app.get('/account/:username', (req, res) => {
    const { username } = req.params;
    console.log(`Consultando informações da conta para: ${username}`);

    const query = `
        SELECT u.username, ut.token, t.expiry_date
        FROM users u
        JOIN user_tokens ut ON u.username = ut.username
        JOIN tokens t ON ut.token = t.token
        WHERE u.username = ? AND t.expiry_date > NOW()
    `;
    db.query(query, [username], (err, results) => {
        if (err) {
            console.error('Erro na consulta da conta:', err);
            return res.status(500).send('Erro ao consultar a conta');
        }
        if (results.length === 0) {
            return res.status(404).send('Usuário ou token não encontrados ou expirados');
        }
        res.json(results[0]);
    });
});

// Registro de usuário com token
app.post('/register', (req, res) => {
    const { username, password, token } = req.body;

    if (!username || !password || !token) {
        return res.status(400).send('Todos os campos são obrigatórios');
    }

    // Verifica se o token é válido
    const tokenQuery = 'SELECT * FROM tokens WHERE token = ? AND expiry_date > NOW()';
    db.query(tokenQuery, [token], (err, results) => {
        if (err || results.length === 0) {
            return res.status(401).send('Token inválido ou expirado');
        }

        // Criptografa a senha antes de armazená-la
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) {
                console.error('Erro ao criptografar a senha:', err);
                return res.status(500).send('Erro ao registrar usuário');
            }

            // Adiciona o usuário
            const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
            db.query(query, [username, hash], (err) => {
                if (err) {
                    console.error('Erro ao registrar usuário:', err);
                    return res.status(500).send('Erro ao registrar usuário');
                }

                // Adiciona o token associado ao usuário
                const insertTokenQuery = 'INSERT INTO user_tokens (username, token) VALUES (?, ?)';
                db.query(insertTokenQuery, [username, token], (err) => {
                    if (err) {
                        console.error('Erro ao adicionar token ao usuário:', err);
                        return res.status(500).send('Erro ao adicionar token ao usuário');
                    }

                    res.send('Usuário registrado com sucesso!');
                });
            });
        });
    });
});

// Exclui um funcionário
app.delete('/employees/:id', (req, res) => {
    const id = req.params.id;

    const deleteSalaryQuery = 'DELETE FROM salaries WHERE employee_id = ?';
    db.query(deleteSalaryQuery, [id], (err) => {
        if (err) {
            console.error('Erro ao excluir salário:', err);
            return res.status(500).send('Erro ao excluir salário');
        }

        const deleteEmployeeQuery = 'DELETE FROM employees WHERE id = ?';
        db.query(deleteEmployeeQuery, [id], (err) => {
            if (err) {
                console.error('Erro ao excluir funcionário:', err);
                return res.status(500).send('Erro ao excluir funcionário');
            }
            res.send('Funcionário excluído com sucesso!');
        });
    });
});

// Login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Todos os campos são obrigatórios');
    }

    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], (err, results) => {
        if (err || results.length === 0) {
            return res.status(401).send('Usuário ou senha incorretos');
        }

        const user = results[0];
        bcrypt.compare(password, user.password, (err, match) => {
            if (err || !match) {
                return res.status(401).send('Usuário ou senha incorretos');
            }
            res.send({ success: true, message: 'Login bem-sucedido!' });
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});