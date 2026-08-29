process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-jwt-secret-with-at-least-32-characters';
process.env.ADMIN_USER = 'test-admin';
process.env.ADMIN_PASSWORD =
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
process.env.ADMIN_PLAIN_PASSWORD = 'password';

const request = require('supertest');
const app = require('../js/server');
const fs = require('fs').promises;
const path = require('path');

const contactsFilePath = path.join(__dirname, '../data/contacts.json');
const reservationsFilePath = path.join(__dirname, '../data/reservations.json');

let server;
let originalContacts, originalReservations;
let token;

beforeAll(async () => {
  server = app.listen(5001);

  originalContacts = await fs
    .readFile(contactsFilePath, 'utf8')
    .catch(() => '[]');
  originalReservations = await fs
    .readFile(reservationsFilePath, 'utf8')
    .catch(() => '[]');

  await fs.writeFile(contactsFilePath, '[]', 'utf8');
  await fs.writeFile(reservationsFilePath, '[]', 'utf8');
});

afterAll(async () => {
  await fs.writeFile(contactsFilePath, originalContacts, 'utf8');
  await fs.writeFile(reservationsFilePath, originalReservations, 'utf8');

  await new Promise(resolve => server.close(resolve));
});

describe('API Endpoints', () => {
  describe('Admin Authentication', () => {
    it('deve retornar erro 401 para credenciais de login inválidas', async () => {
      const response = await request(app).post('/api/auth/login').send({
        username: process.env.ADMIN_USER,
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
          username: process.env.ADMIN_USER,
          password: process.env.ADMIN_PLAIN_PASSWORD,
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('token');
      token = response.body.token;
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

      const contacts = JSON.parse(await fs.readFile(contactsFilePath, 'utf8'));
      expect(contacts).toHaveLength(1);
      expect(contacts[0]).toMatchObject(newContact);
    });

    it('deve retornar erro 400 se campos obrigatórios estiverem faltando', async () => {
      const response = await request(app)
        .post('/api/contact')
        .send({ name: 'Incompleto' });

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

      const reservations = JSON.parse(
        await fs.readFile(reservationsFilePath, 'utf8')
      );
      expect(reservations).toHaveLength(1);
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
        .send({ name: 'Incompleto', email: 'email@teste.com' });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        'Todos os campos são obrigatórios para a reserva.'
      );
    });
  });

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
