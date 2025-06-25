const fs = require('fs').promises;
const path = require('path');

const logDir = path.join(__dirname, '../../logs');
const activityLogFile = path.join(logDir, 'activity.log');
const errorLogFile = path.join(logDir, 'error.log');

/**
 * Garante que o diretório de logs exista.
 */
async function ensureLogDir() {
  try {
    await fs.mkdir(logDir, { recursive: true });
  } catch (error) {
    console.error('Falha ao criar diretório de logs:', error);
  }
}

/**
 * Registra uma atividade geral da aplicação.
 * @param {string} action - A ação que está sendo registrada (ex: 'login_success').
 * @param {object|string} details - Detalhes sobre a ação.
 * @param {string} user - O usuário associado à ação.
 */
async function logActivity(action, details, user = 'system') {
  await ensureLogDir();
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      details,
      user,
    };
    await fs.appendFile(activityLogFile, JSON.stringify(logEntry) + '\n');
  } catch (error) {
    console.error('Falha ao escrever no log de atividade:', error);
  }
}

/**
 * Registra um erro da aplicação.
 * @param {string} context - Onde o erro ocorreu (ex: 'database_connection').
 * @param {object} errorInfo - Informações detalhadas do erro.
 * @param {string} user - O usuário associado ao erro.
 */
async function logError(context, errorInfo, user = 'system') {
  await ensureLogDir();
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      context,
      error: {
        message: errorInfo.message,
        stack: errorInfo.stack,
        url: errorInfo.url,
      },
      user,
    };
    await fs.appendFile(errorLogFile, JSON.stringify(logEntry) + '\n');
  } catch (error) {
    console.error('Falha ao escrever no log de erro:', error);
  }
}

module.exports = {
  logActivity,
  logError,
};
