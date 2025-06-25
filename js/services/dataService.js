const path = require('path');
const fs = require('fs').promises;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const emailService = require('./emailService');
const logActivity = require('./logService');

// Funções utilitárias para ler e salvar dados
async function readData(fileName) {
  try {
    const filePath = path.join(__dirname, '../../data', `${fileName}.json`);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function saveData(fileName, data) {
  const filePath = path.join(__dirname, '../../data', `${fileName}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// Contatos
exports.getContacts = async (req, res) => {
  const contacts = await readData('contacts');
  res.json({ success: true, contacts });
};

exports.createContact = async (req, res) => {
  const { name, email, phone, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      message: 'Nome, email e mensagem são obrigatórios.',
    });
  }
  const contact = {
    id: Date.now(),
    name,
    email,
    phone,
    message,
    timestamp: new Date().toISOString(),
  };
  const contacts = await readData('contacts');
  contacts.push(contact);
  await saveData('contacts', contacts);
  await emailService.notifyContact(contact);
  res.json({
    success: true,
    message: 'Mensagem recebida com sucesso!',
    contactId: contact.id,
  });
};

// Reservas
exports.getReservations = async (req, res) => {
  const reservations = await readData('reservations');
  res.json({ success: true, reservations });
};

exports.createReservation = async (req, res) => {
  const { name, email, phone, destination, date, guests } = req.body;
  if (!name || !email || !destination || !date || !guests) {
    return res
      .status(400)
      .json({ success: false, message: 'Todos os campos são obrigatórios.' });
  }
  const reservation = {
    id: Date.now(),
    name,
    email,
    phone,
    destination,
    date,
    guests,
    status: 'Pendente',
    timestamp: new Date().toISOString(),
  };
  const reservations = await readData('reservations');
  reservations.push(reservation);
  await saveData('reservations', reservations);
  await emailService.notifyReservation(reservation);
  res.json({
    success: true,
    message: 'Reserva recebida com sucesso!',
    reservationId: reservation.id,
  });
};

exports.updateReservationStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status)
    return res
      .status(400)
      .json({ success: false, message: 'Status é obrigatório.' });
  const reservations = await readData('reservations');
  const idx = reservations.findIndex(r => r.id.toString() === id);
  if (idx === -1)
    return res
      .status(404)
      .json({ success: false, message: 'Reserva não encontrada.' });
  reservations[idx].status = status;
  await saveData('reservations', reservations);
  logActivity('update_reservation_status', { id, status }, req.user.username);
  res.json({ success: true, message: 'Status atualizado.' });
};

exports.deleteReservation = async (req, res) => {
  const { id } = req.params;
  const reservations = await readData('reservations');
  const updated = reservations.filter(r => r.id.toString() !== id);
  if (updated.length === reservations.length)
    return res
      .status(404)
      .json({ success: false, message: 'Reserva não encontrada.' });
  await saveData('reservations', updated);
  logActivity('delete_reservation', { id }, req.user.username);
  res.json({ success: true, message: 'Reserva deletada.' });
};

// Login
exports.login = async (req, res) => {
  const { username, password } = req.body;
  if (
    username === config.admin.username &&
    (await bcrypt.compare(password, config.admin.password))
  ) {
    const token = jwt.sign({ username, role: 'admin' }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
    return res.json({ success: true, token });
  }
  res.status(401).json({ success: false, message: 'Credenciais inválidas.' });
};

// Backup
exports.restoreBackup = async (req, res) => {
  const { filename } = req.body;
  if (!filename || !/^[a-zA-Z0-9_\-.]+\.json$/.test(filename)) {
    return res
      .status(400)
      .json({ success: false, message: 'Nome de arquivo inválido.' });
  }
  const backupDir = path.join(__dirname, '../../backups');
  const filePath = path.join(backupDir, filename);
  try {
    const backupData = await fs.readFile(filePath, 'utf-8');
    const { contacts, reservations } = JSON.parse(backupData);
    await saveData('contacts', contacts);
    await saveData('reservations', reservations);
    logActivity('restore_backup_success', { filename }, req.user.username);
    res.json({
      success: true,
      message: `Backup ${filename} restaurado com sucesso.`,
    });
  } catch (error) {
    logActivity(
      'restore_backup_error',
      { filename, error: error.message },
      req.user.username
    );
    res
      .status(500)
      .json({ success: false, message: 'Erro ao restaurar o backup.' });
  }
};
