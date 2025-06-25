require('dotenv').config();
const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const config = require('./config');
const {
  helmetConfig,
  cors,
  generalLimiter,
  formLimiter,
  apiLimiter,
} = require('./config/security');

const app = express();
const port = config.port;

// Configurações de segurança
app.use(helmetConfig);
app.use(cors);

// Aplicar rate limiting apenas se não estiver em ambiente de teste
if (process.env.NODE_ENV !== 'test') {
  app.use(generalLimiter);
  app.use('/api', apiLimiter);
  app.use('/contact', formLimiter);
  app.use('/reservation', formLimiter);
}

// Servir arquivos estáticos da raiz do projeto
const staticPath = path.join(__dirname, '../');
app.use(express.static(staticPath));

// Middleware para validação de entrada
const validateInput = (req, res, next) => {
  const sanitizeString = str => {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>]/g, '').trim().substring(0, 1000);
  };

  const sanitizeEmail = email => {
    if (typeof email !== 'string') return '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? email.trim() : '';
  };

  const sanitizePhone = phone => {
    if (typeof phone !== 'string') return '';
    return phone
      .replace(/[^\d+\-()\s]/g, '')
      .trim()
      .substring(0, 20);
  };

  // Sanitizar dados do corpo da requisição
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        if (key.includes('email')) {
          req.body[key] = sanitizeEmail(req.body[key]);
        } else if (key.includes('phone') || key.includes('telefone')) {
          req.body[key] = sanitizePhone(req.body[key]);
        } else {
          req.body[key] = sanitizeString(req.body[key]);
        }
      }
    });
  }

  next();
};

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(validateInput);

// Middleware para logging de segurança
const securityLogger = (req, res, next) => {
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /union\s+select/i,
    /drop\s+table/i,
    /insert\s+into/i,
  ];

  const requestString = JSON.stringify(req.body) + req.url + req.query;
  const isSuspicious = suspiciousPatterns.some(pattern =>
    pattern.test(requestString)
  );

  if (isSuspicious) {
    console.warn(
      `🚨 Tentativa suspeita detectada: ${req.ip} - ${req.method} ${req.url}`
    );
  }

  next();
};

app.use(securityLogger);

// Sistema de logs avançados
const logActivity = async (action, details, user = 'system') => {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      details,
      user,
      ip: 'system',
    };

    const logFile = path.join(__dirname, '../logs/activity.log');
    const logDir = path.dirname(logFile);

    // Criar diretório de logs se não existir
    try {
      await fs.mkdir(logDir, { recursive: true });
    } catch (error) {
      // Diretório já existe
    }

    // Adicionar log ao arquivo
    await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');

    // Log no console em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log(`📝 LOG: ${action} - ${details} (${user})`);
    }
  } catch (error) {
    console.error('❌ Erro ao salvar log:', error);
  }
};

// Middleware para capturar IP do usuário
const captureIP = (req, res, next) => {
  req.userIP =
    req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  next();
};

app.use(captureIP);

// Rota pública para obter os 5 contatos mais recentes
app.get('/api/public/recent-contacts', async (req, res) => {
  try {
    const contacts = await readData('contacts');
    if (!contacts) {
      return res
        .status(500)
        .json({ error: 'Não foi possível ler os dados de contatos.' });
    }

    // Ordena os contatos por data de recebimento (mais recentes primeiro)
    const sortedContacts = contacts.sort(
      (a, b) => new Date(b.receivedAt) - new Date(a.receivedAt)
    );

    // Pega os 5 contatos mais recentes
    const recentContacts = sortedContacts.slice(0, 5);

    res.json(recentContacts);
  } catch (error) {
    console.error('Erro ao buscar contatos recentes:', error);
    logActivity(
      'get_recent_contacts_error',
      { error: error.message },
      'system'
    );
    res
      .status(500)
      .json({ error: 'Erro interno do servidor ao buscar contatos recentes.' });
  }
});

// Middleware para servir arquivos estáticos
app.use(express.static(path.join(__dirname, '..')));

// Cache em memória simples para dados
const dataCache = {
  data: {},
  timestamp: {},
  get(key) {
    const isCacheValid =
      this.timestamp[key] &&
      new Date() - this.timestamp[key] < config.cache.duration;
    if (isCacheValid) {
      return this.data[key];
    }
    return null;
  },
  set(key, value) {
    this.data[key] = value;
    this.timestamp[key] = new Date();
  },
  invalidate(key) {
    delete this.data[key];
    delete this.timestamp[key];
  },
};

// Função auxiliar para ler dados (com cache)
async function readData(fileName) {
  const cachedData = dataCache.get(fileName);
  if (cachedData) {
    return cachedData;
  }

  try {
    const filePath = path.join(__dirname, '../data', `${fileName}.json`);
    const data = await fs.readFile(filePath, 'utf8');
    const jsonData = JSON.parse(data);
    dataCache.set(fileName, jsonData);
    return jsonData;
  } catch (error) {
    console.error(`Erro ao ler o arquivo de dados ${fileName}.json:`, error);
    // Em caso de erro, retorna um array vazio para não quebrar a aplicação
    return [];
  }
}

// Função auxiliar para salvar dados
async function saveData(fileName, data) {
  try {
    const filePath = path.join(__dirname, '../data', `${fileName}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    dataCache.invalidate(fileName); // Invalida o cache após salvar
    return true;
  } catch (error) {
    console.error(`Erro ao salvar o arquivo de dados ${fileName}.json:`, error);
    return false;
  }
}

// Configuração do transporter de email (usando Gmail como exemplo)
const transporter = nodemailer.createTransport({
  service: config.email.service,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

// Configuração JWT
const JWT_SECRET = config.jwt.secret;
const JWT_EXPIRES_IN = config.jwt.expiresIn;

// Usuário admin padrão (em produção, usar banco de dados)
const ADMIN_USER = {
  username: config.admin.username,
  password: config.admin.password,
  role: 'admin',
};

// Middleware para verificar JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token de acesso necessário',
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Token inválido ou expirado',
      });
    }
    req.user = user;
    next();
  });
};

// Middleware para verificar se é admin
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Acesso negado. Apenas administradores.',
    });
  }
};

// Função para salvar contatos em arquivo JSON
async function saveContact(contactData) {
  try {
    // Garante que o contato tenha um id único e timestamp
    contactData.id = Date.now();
    contactData.timestamp = new Date().toISOString();
    const contacts = await readData('contacts');
    contacts.push(contactData);
    const contactsFile = path.join(__dirname, '../data/contacts.json');
    await fs.writeFile(contactsFile, JSON.stringify(contacts, null, 2));
    dataCache.set('contacts', contacts); // Atualiza o cache
    return contactData;
  } catch (error) {
    console.error('Erro ao salvar contato:', error);
    throw error;
  }
}

// Função para enviar email
async function sendEmail(contactData) {
  const mailOptions = {
    from: config.email.user,
    to: config.email.defaultRecipient,
    subject: 'Novo contato via site - Dash Boat Tour',
    html: `
            <h2>Novo contato recebido via site</h2>
            <p><strong>Nome:</strong> ${contactData.name || 'Não informado'}</p>
            <p><strong>Email:</strong> ${contactData.email || 'Não informado'}</p>
            <p><strong>Telefone:</strong> ${contactData.phone || 'Não informado'}</p>
            <p><strong>Mensagem:</strong></p>
            <p>${contactData.message || 'Não informado'}</p>
            <hr>
            <p><small>Enviado em: ${new Date().toLocaleString('pt-BR')}</small></p>
        `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email enviado com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return false;
  }
}

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// Rota para página sobre
app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, '../about.html'));
});

// Rota para página de contato
app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, '../contact.html'));
});

// Rota para página de serviços
app.get('/services', (req, res) => {
  res.sendFile(path.join(__dirname, '../services.html'));
});

// Rota para página admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin.html'));
});

// API para formulário de contato
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Nome, email e mensagem são obrigatórios.',
      });
    }

    const contactData = { name, email, phone, message };

    // Salva o contato
    const savedContact = await saveContact(contactData);

    /*
    // Enviar email de notificação
    if (
      config.email.user &&
      config.email.pass &&
      process.env.NODE_ENV !== 'test'
    ) {
      try {
        const mailOptions = {
          from: config.email.user,
          to: config.email.user, // Envia para o próprio email configurado
          subject: 'Novo contato - Dash Boat Tour',
          html: `...`,
        };
        await transporter.sendMail(mailOptions);
        console.log('✅ Email de notificação enviado com sucesso');
      } catch (emailError) {
        console.warn('⚠️ Erro ao enviar email de notificação:', emailError.message);
      }
    } else {
      console.log('ℹ️ Email não configurado - pulando envio de notificação');
    }
    */

    console.log('>> Antes do res.json de sucesso (contato)');
    res.json({
      success: true,
      message: 'Mensagem recebida com sucesso! Entraremos em contato em breve.',
      contactId: savedContact.id,
    });
    console.log('>> Depois do res.json de sucesso (contato)');
  } catch (error) {
    console.error('Erro no formulário de contato:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor. Tente novamente.',
    });
  }
});

// API para buscar contatos (protegida)
app.get('/api/contacts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const contacts = await readData('contacts');
    res.json({
      success: true,
      contacts: contacts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar contatos.',
    });
  }
});

// API para buscar reservas (protegida)
app.get(
  '/api/reservations',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      let reservations = await readData('reservations');
      const { status, destination } = req.query;
      if (status && typeof status === 'string') {
        reservations = reservations.filter(r => (r.status || '').toString().trim().toLowerCase() === status.trim().toLowerCase());
      }
      if (destination && typeof destination === 'string') {
        reservations = reservations.filter(r => (r.destination || '').toString().trim().toLowerCase() === destination.trim().toLowerCase());
      }
      res.json({
        success: true,
        reservations: reservations,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar reservas.',
      });
    }
  }
);

// API para reservas (estrutura básica)
app.post('/api/reservations', async (req, res) => {
  try {
    const { name, email, phone, destination, date, guests } = req.body;

    if (!name || !email || !destination || !date || !guests) {
      return res.status(400).json({
        success: false,
        message: 'Todos os campos são obrigatórios para a reserva.',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email inválido.',
      });
    }

    const reservationData = {
      name,
      email,
      phone,
      destination,
      date,
      guests: parseInt(guests, 10),
      status: 'Pendente',
    };

    const savedReservation = await saveReservation(reservationData);

    // Enviar email de notificação para o admin
    /*
    if (
      config.email.user &&
      config.email.pass &&
      process.env.NODE_ENV !== 'test'
    ) {
      try {
        const mailOptionsAdmin = {
          from: config.email.user,
          to: config.email.user,
          subject: 'Nova Reserva - Dash Boat Tour',
          html: `...`,
        };
        await transporter.sendMail(mailOptionsAdmin);
        const mailOptionsClient = {
          from: config.email.user,
          to: email,
          subject: 'Confirmação de Reserva - Dash Boat Tour',
          html: `...`,
        };
        await transporter.sendMail(mailOptionsClient);
        console.log('✅ Email de confirmação enviado com sucesso');
      } catch (emailError) {
        console.warn('⚠️ Erro ao enviar email de confirmação:', emailError.message);
      }
    } else {
      console.log('ℹ️ Email não configurado - pulando envio de confirmação');
    }
    */

    console.log('>> Antes do res.json de sucesso');
    res.json({
      success: true,
      message:
        'Reserva recebida com sucesso! Entraremos em contato para confirmação.',
      reservationId: savedReservation.id,
    });
    console.log('>> Depois do res.json de sucesso');
  } catch (error) {
    console.error('Erro na reserva:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar reserva. Tente novamente.',
    });
  }
});

// API para atualizar o status da reserva
app.put(
  '/api/reservations/:id/status',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res
          .status(400)
          .json({ success: false, message: 'Status é obrigatório.' });
      }

      const reservations = await readData('reservations');
      const reservationIndex = reservations.findIndex(
        r => r.id.toString() === id
      );

      if (reservationIndex === -1) {
        return res
          .status(404)
          .json({ success: false, message: 'Reserva não encontrada.' });
      }

      reservations[reservationIndex].status = status;
      await saveData('reservations', reservations);

      logActivity(
        'update_reservation_status',
        { id, status },
        req.user.username
      );
      res.json({
        success: true,
        message: 'Status da reserva atualizado com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao atualizar status da reserva:', error);
      logActivity(
        'update_reservation_status_error',
        { id: req.params.id, error: error.message },
        req.user.username
      );
      res
        .status(500)
        .json({
          success: false,
          message: 'Erro ao atualizar o status da reserva.',
        });
    }
  }
);

// API para deletar reserva
app.delete(
  '/api/reservations/:id',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const reservations = await readData('reservations');
      const updatedReservations = reservations.filter(
        r => r.id.toString() !== id
      );

      if (reservations.length === updatedReservations.length) {
        return res
          .status(404)
          .json({ success: false, message: 'Reserva não encontrada.' });
      }

      await saveData('reservations', updatedReservations);

      logActivity('delete_reservation', { id }, req.user.username);
      res.json({ success: true, message: 'Reserva deletada com sucesso.' });
    } catch (error) {
      console.error('Erro ao deletar reserva:', error);
      logActivity(
        'delete_reservation_error',
        { id: req.params.id, error: error.message },
        req.user.username
      );
      res
        .status(500)
        .json({ success: false, message: 'Erro ao deletar a reserva.' });
    }
  }
);

// Rota para obter um contato específico
app.get(
  '/api/contacts/:id',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const contacts = await readData('contacts');
      const contact = contacts.find(c => String(c.id) === String(id));

      if (!contact) {
        return res
          .status(404)
          .json({ success: false, message: 'Contato não encontrado.' });
      }

      res.json({ success: true, contact });
    } catch (error) {
      console.error('Erro ao buscar contato:', error);
      res
        .status(500)
        .json({ success: false, message: 'Erro ao buscar contato.' });
    }
  }
);

// Rota para obter uma reserva específica
app.get(
  '/api/reservations/:id',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const reservations = await readData('reservations');
      const reservation = reservations.find(r => String(r.id) === String(id));

      if (!reservation) {
        return res
          .status(404)
          .json({ success: false, message: 'Reserva não encontrada.' });
      }

      res.json({ success: true, reservation });
    } catch (error) {
      console.error('Erro ao buscar reserva:', error);
      res
        .status(500)
        .json({ success: false, message: 'Erro ao buscar reserva.' });
    }
  }
);

// Rota para excluir contato
app.delete(
  '/api/contacts/:id',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      let contacts = await readData('contacts');
      const initialLength = contacts.length;

      contacts = contacts.filter(c => c.id != id);

      if (contacts.length === initialLength) {
        return res
          .status(404)
          .json({ success: false, message: 'Contato não encontrado' });
      }

      await saveData('contacts', contacts);
      logActivity(
        'CONTACT_DELETE',
        `Contato ${id} excluído`,
        req.user.username
      );
      res.json({ success: true, message: 'Contato excluído com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir contato:', error);
      logActivity(
        'CONTACT_DELETE_ERROR',
        `Erro ao excluir contato: ${error.message}`,
        req.user.username
      );
      res
        .status(500)
        .json({ success: false, message: 'Erro interno do servidor' });
    }
  }
);

// Rota para health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
  });
});

function calculateStats(contacts, reservations) {
  const totalReservations = reservations.length;
  const totalContacts = contacts.length;

  const confirmedReservations = reservations.filter(
    r => r.status === 'confirmada'
  ).length;

  // Taxa de conversão: % de contatos que resultaram em reservas confirmadas
  const conversionRate =
    totalContacts > 0 ? (confirmedReservations / totalContacts) * 100 : 0;
  // Taxa de efetivação: % de reservas solicitadas que foram confirmadas
  const effectivenessRate =
    totalReservations > 0
      ? (confirmedReservations / totalReservations) * 100
      : 0;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newContactsLast30Days = contacts.filter(
    c => new Date(c.receivedAt || c.timestamp) > thirtyDaysAgo
  ).length;
  const newReservationsLast30Days = reservations.filter(
    r => new Date(r.timestamp) > thirtyDaysAgo
  ).length;

  return {
    totalContacts,
    totalReservations,
    confirmedReservations,
    conversionRate: parseFloat(conversionRate.toFixed(1)),
    effectivenessRate: parseFloat(effectivenessRate.toFixed(1)),
    newContactsLast30Days,
    newReservationsLast30Days,
    pendingReservations: reservations.filter(r => (r.status || '').toLowerCase() === 'pendente').length,
  };
}

// Rota para obter estatísticas
app.get('/api/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const contacts = await readData('contacts');
    const reservations = await readData('reservations');

    const stats = calculateStats(contacts, reservations);

    const destinationDistribution = reservations.reduce((acc, r) => {
      // Filtra destinos inválidos
      if (r.destination && typeof r.destination === 'string' && r.destination.trim() !== '') {
        const dest = r.destination.trim();
        acc[dest] = (acc[dest] || 0) + 1;
      }
      return acc;
    }, {});

    // Adiciona distribuição mensal de reservas
    const monthlyDistribution = { reservations: Array(12).fill(0) };
    const currentYear = new Date().getFullYear();
    reservations.forEach(reservation => {
      const date = new Date(reservation.date);
      if (!isNaN(date) && date.getFullYear() === currentYear) {
        const month = date.getMonth();
        monthlyDistribution.reservations[month]++;
      }
    });

    // Cálculo de clientes fiéis (ranking)
    const customerMap = {};
    reservations.forEach(r => {
      // Usa e-mail como chave principal, se existir, senão nome
      const key = (r.email && r.email.trim()) || (r.name && r.name.trim());
      if (!key) return;
      if (!customerMap[key]) {
        customerMap[key] = {
          name: r.name || '',
          email: r.email || '',
          count: 0,
          lastDate: null,
        };
      }
      customerMap[key].count++;
      const date = new Date(r.date);
      if (!customerMap[key].lastDate || (date > new Date(customerMap[key].lastDate))) {
        customerMap[key].lastDate = r.date;
      }
    });
    const loyalCustomers = Object.values(customerMap)
      .sort((a, b) => b.count - a.count || new Date(b.lastDate) - new Date(a.lastDate));

    // Adiciona contagem de status das reservas
    const reservationStatusCount = reservations.reduce((acc, r) => {
      const status = (r.status || '').toLowerCase();
      if (!status) return acc;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      stats: {
        ...stats,
        destinationDistribution,
        monthlyDistribution,
        loyalCustomers,
        reservationStatusCount,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar estatísticas.',
    });
  }
});

// Rota para relatórios detalhados
app.get('/api/reports', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const contacts = await readData('contacts');
    const reservations = await readData('reservations');

    // Análise temporal
    const monthlyAnalysis = {};
    const currentYear = new Date().getFullYear();

    reservations.forEach(reservation => {
      const date = new Date(reservation.date);
      if (date.getFullYear() === currentYear) {
        const month = date.getMonth();
        if (!monthlyAnalysis[month]) {
          monthlyAnalysis[month] = {
            reservations: 0,
            revenue: 0,
            guests: 0,
          };
        }
        monthlyAnalysis[month].reservations++;
        monthlyAnalysis[month].guests += parseInt(reservation.guests) || 0;
        if (reservation.status === 'confirmada') {
          monthlyAnalysis[month].revenue +=
            (parseInt(reservation.guests) || 0) * 500; // R$ 500 por pessoa
        }
      }
    });

    // Análise de performance
    const performanceMetrics = {
      totalRevenue: reservations
        .filter(r => r.status === 'confirmada')
        .reduce((total, r) => total + parseInt(r.guests) * 500, 0),
      averageBookingValue:
        reservations.length > 0
          ? (
              reservations.reduce(
                (sum, r) => sum + parseInt(r.guests) * 500,
                0
              ) / reservations.length
            ).toFixed(2)
          : 0,
      conversionRate:
        contacts.length > 0
          ? ((reservations.length / contacts.length) * 100).toFixed(1)
          : 0,
      topDestinations: Object.entries(
        reservations.reduce((acc, r) => {
          acc[r.destination] = (acc[r.destination] || 0) + 1;
          return acc;
        }, {})
      )
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5),
    };

    res.json({
      success: true,
      reports: {
        monthlyAnalysis,
        performanceMetrics,
        summary: {
          totalReservations: reservations.length,
          totalContacts: contacts.length,
          confirmedReservations: reservations.filter(
            r => r.status === 'confirmada'
          ).length,
          pendingReservations: reservations.filter(r => r.status === 'pendente')
            .length,
          cancelledReservations: reservations.filter(
            r => r.status === 'cancelada'
          ).length,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar relatórios.',
    });
  }
});

// Rota de login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Usuário e senha são obrigatórios',
      });
    }

    // Verificar credenciais
    if (username === ADMIN_USER.username) {
      const isValidPassword = await bcrypt.compare(
        password,
        ADMIN_USER.password
      );

      if (isValidPassword) {
        const token = jwt.sign(
          {
            username: ADMIN_USER.username,
            role: ADMIN_USER.role,
          },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN }
        );

        res.json({
          success: true,
          message: 'Login realizado com sucesso',
          token,
          user: {
            username: ADMIN_USER.username,
            role: ADMIN_USER.role,
          },
        });

        // Log de login bem-sucedido
        await logActivity(
          'LOGIN_SUCCESS',
          `Usuário ${username} fez login`,
          username
        );
      } else {
        res.status(401).json({
          success: false,
          message: 'Credenciais inválidas',
        });

        // Log de tentativa de login falhada
        await logActivity(
          'LOGIN_FAILED',
          `Tentativa de login falhada para ${username}`,
          username
        );
      }
    } else {
      res.status(401).json({
        success: false,
        message: 'Credenciais inválidas',
      });
    }
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
    });
  }
});

// Rota para verificar token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

// Rota para logout (cliente deve remover o token)
app.post('/api/auth/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout realizado com sucesso',
  });
});

// Middleware para tratamento de erros 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '../index.html'));
});

// Middleware para tratamento de erros gerais
app.use((err, req, res) => {
  console.error('Erro:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message:
      process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado',
  });
});

// Sistema de backup automático
const backupData = async () => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '../backups');
    await fs.mkdir(backupDir, { recursive: true }).catch(() => {}); // Ignora erro se dir já existe
    const filesToBackup = ['contacts.json', 'reservations.json'];
    for (const file of filesToBackup) {
      const sourcePath = path.join(__dirname, '../data', file);
      const data = await fs.readFile(sourcePath, 'utf8');
      // Verificar último backup existente
      const baseName = file.replace('.json', '');
      const backups = (await fs.readdir(backupDir))
        .filter(f => f.startsWith(baseName + '_'))
        .sort();
      let lastBackupContent = null;
      if (backups.length > 0) {
        const lastBackupPath = path.join(
          backupDir,
          backups[backups.length - 1]
        );
        lastBackupContent = await fs.readFile(lastBackupPath, 'utf8');
      }
      if (lastBackupContent !== data) {
        const backupPath = path.join(
          backupDir,
          `${baseName}_${timestamp}.json`
        );
        await fs.writeFile(backupPath, data);
        console.log(`✅ Backup criado: ${file}`);
      } else {
        console.log(`⏩ Backup ignorado (sem mudanças): ${file}`);
      }
    }
    // Limpar backups antigos (manter apenas os últimos 7 dias)
    const files = await fs.readdir(backupDir);
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const file of files) {
      const filePath = path.join(backupDir, file);
      const stats = await fs.stat(filePath);
      if (stats.mtime.getTime() < oneWeekAgo) {
        await fs.unlink(filePath);
        console.log(`🗑️ Backup antigo removido: ${file}`);
      }
    }
  } catch (error) {
    console.error('❌ Erro no sistema de backup:', error);
  }
};

// Iniciar o servidor apenas se este arquivo for executado diretamente
if (require.main === module) {
  app.listen(port, () => {
    console.log(`🚀 Servidor rodando na porta ${port}`);
    logActivity('server_start', { port }, 'system');

    // Realizar backup na inicialização
    logActivity('initial_backup', {}, 'system');
    backupData();

    // Iniciar backup automático agendado
    setInterval(
      () => {
        logActivity('auto_backup_scheduled', {}, 'system');
        backupData();
      },
      6 * 60 * 60 * 1000
    );
  });
}

module.exports = app;

// Tratamento de erros global (middleware)
app.use((err, req, res, next) => {
  console.error('❌ Erro não tratado:', err.stack);

  // Loga o erro
  logActivity(
    'unhandled_error',
    {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
    },
    'system'
  );

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    success: false,
    message: 'Ocorreu um erro inesperado no servidor.',
  });
});

// Tratamento de promessas não tratadas
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Rejeição de promessa não tratada:', reason);
  logActivity('unhandled_rejection', { reason: reason.toString() }, 'system');
});

// Captura de exceções não tratadas
process.on('uncaughtException', error => {
  console.error('💥 Exceção não capturada:', error);
  logActivity(
    'uncaught_exception',
    { message: error.message, stack: error.stack },
    'system'
  );

  // É crucial encerrar o processo após uma exceção não capturada
  process.exit(1);
});

// Função para salvar reservas em arquivo JSON
async function saveReservation(reservationData) {
  try {
    reservationData.id = Date.now();
    reservationData.timestamp = new Date().toISOString();
    const reservations = await readData('reservations');
    reservations.push(reservationData);
    const reservationsFile = path.join(__dirname, '../data/reservations.json');
    await fs.writeFile(reservationsFile, JSON.stringify(reservations, null, 2));
    dataCache.set('reservations', reservations); // Atualiza o cache
    return reservationData;
  } catch (error) {
    console.error('Erro ao salvar reserva:', error);
    throw error;
  }
}
