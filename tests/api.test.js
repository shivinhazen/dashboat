const request = require('supertest');
const app = require('../js/server'); // Importa a aplicação Express
const fs = require('fs').promises;
const path = require('path');

const contactsFilePath = path.join(__dirname, '../data/contacts.json');
const reservationsFilePath = path.join(__dirname, '../data/reservations.json');

let server;
let originalContacts, originalReservations;
let token; // Mover token para o escopo global do describe

beforeAll(async () => {
  // Inicia o servidor em uma porta de teste
  server = app.listen(5001);

  // Salva o estado original dos arquivos
  originalContacts = await fs
    .readFile(contactsFilePath, 'utf8')
    .catch(() => '[]');
  originalReservations = await fs
    .readFile(reservationsFilePath, 'utf8')
    .catch(() => '[]');

  // Garante que os arquivos comecem vazios para os testes
  await fs.writeFile(contactsFilePath, '[]', 'utf8');
  await fs.writeFile(reservationsFilePath, '[]', 'utf8');
});

afterAll(async () => {
  // Restaura o conteúdo original dos arquivos
  await fs.writeFile(contactsFilePath, originalContacts, 'utf8');
  await fs.writeFile(reservationsFilePath, originalReservations, 'utf8');

  // Fecha o servidor e aguarda o encerramento para evitar processos abertos
  await new Promise(resolve => server.close(resolve));
});

describe('API Endpoints', () => {
  // Os testes de autenticação são executados primeiro para obter o token
  describe('Admin Authentication', () => {
    it('deve retornar erro 401 para credenciais de login inválidas', async () => {
      const response = await request(app).post('/api/auth/login').send({
        username: 'admin',
        password: 'senhaincorreta',
      });

      expect(response.statusCode).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Credenciais inválidas');
    });

    it('deve retornar um token JWT para credenciais de login válidas', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: process.env.ADMIN_USER || 'admin',
          password: process.env.ADMIN_PLAIN_PASSWORD || 'password',
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('token');
      token = response.body.token; // Salva o token para outros testes
    });
  });

  describe('POST /api/contact', () => {
    it('deve criar um novo contato e salvá-lo no arquivo', async () => {
      const newContact = {
        name: 'Teste Contato Jest',
        email: 'jest.contato@teste.com',
        phone: '11999999999',
        message: 'Mensagem de teste de contato.',
      };

      const response = await request(app).post('/api/contact').send(newContact);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      // Validação da persistência
      const contacts = JSON.parse(await fs.readFile(contactsFilePath, 'utf8'));
      expect(contacts).toHaveLength(1);
      expect(contacts[0]).toMatchObject(newContact);
    });

    it('deve retornar erro 400 se campos obrigatórios estiverem faltando', async () => {
      const response = await request(app)
        .post('/api/contact')
        .send({ name: 'Incompleto' }); // Email e mensagem faltando

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        'Nome, email e mensagem são obrigatórios.'
      );
    });

    it('deve retornar erro 400 para email inválido', async () => {
      const response = await request(app).post('/api/contact').send({
        name: 'Teste Email Inválido',
        email: 'email-invalido',
        message: 'Mensagem válida para testar o email',
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        'Nome, email e mensagem são obrigatórios.'
      );
    });
  });

  describe('POST /api/reservations', () => {
    it('deve criar uma nova reserva e salvá-la no arquivo', async () => {
      const newReservation = {
        name: 'Teste Reserva Jest',
        email: 'jest.reserva@teste.com',
        phone: '11888888888',
        destination: 'Cabo Frio',
        date: '2026-01-01',
        guests: 4,
        message: 'Mensagem de teste de reserva.',
        terms: 'on',
      };

      const response = await request(app)
        .post('/api/reservations')
        .send(newReservation);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      // Validação da persistência
      const reservations = JSON.parse(
        await fs.readFile(reservationsFilePath, 'utf8')
      );
      expect(reservations).toHaveLength(1);
      // Apenas os campos que o servidor realmente salva são verificados
      expect(reservations[0]).toMatchObject({
        name: newReservation.name,
        email: newReservation.email,
        phone: newReservation.phone,
        destination: newReservation.destination,
        date: newReservation.date,
        guests: newReservation.guests,
        status: 'Pendente',
      });
    });

    it('deve retornar erro 400 se campos obrigatórios estiverem faltando', async () => {
      const response = await request(app)
        .post('/api/reservations')
        .send({ name: 'Incompleto', email: 'email@teste.com' }); // Faltando destino, data, etc.

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        'Todos os campos são obrigatórios para a reserva.'
      );
    });
  });

  // Testes para rotas protegidas da área de admin
  describe('Admin Area', () => {
    it('deve retornar erro 401 ao tentar acessar rota protegida sem token', async () => {
      const response = await request(app).get('/api/contacts');
      expect(response.statusCode).toBe(401);
    });

    it('deve permitir o acesso a uma rota protegida com um token válido', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${token}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('contacts');
    });

    it('deve retornar as estatísticas corretas', async () => {
      // O estado inicial deve ser 1 contato e 1 reserva dos testes anteriores
      const response = await request(app)
        .get('/api/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stats.totalContacts).toBe(1);
      expect(response.body.stats.totalReservations).toBe(1);
      expect(response.body.stats.confirmedReservations).toBe(0);
    });
  });
});
