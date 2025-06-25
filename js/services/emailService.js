const nodemailer = require('nodemailer');
const config = require('../config');

const transporter = nodemailer.createTransport({
  service: config.email.service,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

exports.notifyContact = async contact => {
  if (!config.email.user || !config.email.pass) return;
  const mailOptions = {
    from: config.email.user,
    to: config.email.defaultRecipient,
    subject: 'Novo contato via site - Dash Boat Tour',
    html: `<h2>Novo contato recebido</h2><p><strong>Nome:</strong> ${contact.name}</p><p><strong>Email:</strong> ${contact.email}</p><p><strong>Telefone:</strong> ${contact.phone}</p><p><strong>Mensagem:</strong> ${contact.message}</p>`,
  };
  await transporter.sendMail(mailOptions);
};

exports.notifyReservation = async reservation => {
  if (!config.email.user || !config.email.pass) return;
  const mailOptionsAdmin = {
    from: config.email.user,
    to: config.email.user,
    subject: 'Nova Reserva - Dash Boat Tour',
    html: `<h2>Nova Reserva Recebida!</h2><ul><li><strong>Nome:</strong> ${reservation.name}</li><li><strong>Email:</strong> ${reservation.email}</li><li><strong>Destino:</strong> ${reservation.destination}</li><li><strong>Data:</strong> ${reservation.date}</li><li><strong>Pessoas:</strong> ${reservation.guests}</li></ul>`,
  };
  await transporter.sendMail(mailOptionsAdmin);
  // Email para o cliente
  const mailOptionsClient = {
    from: config.email.user,
    to: reservation.email,
    subject: 'Confirmação de Reserva - Dash Boat Tour',
    html: `<h2>Reserva Recebida com Sucesso!</h2><p>Olá ${reservation.name}, sua reserva foi recebida e está sendo processada.</p>`,
  };
  await transporter.sendMail(mailOptionsClient);
};
