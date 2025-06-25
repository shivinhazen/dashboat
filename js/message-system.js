// Sistema de Mensagens Padronizado - Dash Boat Tour
class MessageSystem {
  constructor() {
    this.messageContainer = null;
    this.init();
  }

  init() {
    // Criar container para mensagens se não existir
    if (!document.getElementById('message-container')) {
      this.messageContainer = document.createElement('div');
      this.messageContainer.id = 'message-container';
      document.body.appendChild(this.messageContainer);
    } else {
      this.messageContainer = document.getElementById('message-container');
    }
  }

  // Mostrar mensagem de sucesso
  showSuccess(title, message, duration = 5000) {
    this.showMessage('success', title, message, duration);
  }

  // Mostrar mensagem de erro
  showError(title, message, duration = 5000) {
    this.showMessage('error', title, message, duration);
  }

  // Mostrar mensagem de informação
  showInfo(title, message, duration = 5000) {
    this.showMessage('info', title, message, duration);
  }

  // Método principal para mostrar mensagens
  showMessage(type, title, message, duration) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert-message ${type}`;

    const icon = this.getIcon(type);

    alertDiv.innerHTML = `
      <span class="alert-icon">${icon}</span>
      <div style="flex: 1;">
        <span class="alert-title">${title}</span>
        <p class="alert-text">${message}</p>
      </div>
      <button class="alert-close" aria-label="Close">
        <span aria-hidden="true">&times;</span>
      </button>
    `;

    // Adicionar event listener para fechar
    const closeBtn = alertDiv.querySelector('.alert-close');
    closeBtn.addEventListener('click', () => {
      this.hideMessage(alertDiv);
    });

    this.messageContainer.appendChild(alertDiv);

    // Animar entrada
    setTimeout(() => {
      alertDiv.classList.add('show');
    }, 100);

    // Auto-remover após duração
    if (duration > 0) {
      setTimeout(() => {
        this.hideMessage(alertDiv);
      }, duration);
    }
  }

  // Esconder mensagem
  hideMessage(alertDiv) {
    alertDiv.classList.remove('show');
    setTimeout(() => {
      if (alertDiv.parentElement) {
        alertDiv.remove();
      }
    }, 300);
  }

  // Obter ícone baseado no tipo
  getIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      info: 'ℹ',
    };
    return icons[type] || 'ℹ';
  }

  // Mostrar mensagem no formulário
  showFormMessage(formElement, type, message) {
    // Remover mensagens anteriores
    const existingMessage = formElement.querySelector('.form-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `form-message ${type}`;

    const icon = this.getIcon(type);
    messageDiv.innerHTML = `
      <span class="message-icon">${icon}</span>
      <span>${message}</span>
    `;

    formElement.appendChild(messageDiv);

    // Auto-remover após 5 segundos
    setTimeout(() => {
      if (messageDiv.parentElement) {
        messageDiv.remove();
      }
    }, 5000);
  }

  // Mostrar mensagem de carregamento
  showLoading(container, message = 'Carregando...') {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-message';
    loadingDiv.innerHTML = `
      <span class="spinner"></span>
      <span>${message}</span>
    `;

    container.appendChild(loadingDiv);
    return loadingDiv;
  }

  // Limpar todas as mensagens
  clearAll() {
    if (this.messageContainer) {
      this.messageContainer.innerHTML = '';
    }

    // Limpar mensagens de formulário
    document.querySelectorAll('.form-message').forEach(msg => msg.remove());

    // Limpar mensagens do dashboard
    document.querySelectorAll('.dashboard-alert').forEach(msg => msg.remove());
  }
}

// Instância global
window.messageSystem = new MessageSystem();

// Funções de conveniência para uso global
window.showSuccessMessage = (title, message) =>
  window.messageSystem.showSuccess(title, message);
window.showErrorMessage = (title, message) =>
  window.messageSystem.showError(title, message);
window.showInfoMessage = (title, message) =>
  window.messageSystem.showInfo(title, message);
window.showFormMessage = (form, type, message) =>
  window.messageSystem.showFormMessage(form, type, message);
window.clearAllMessages = () => window.messageSystem.clearAll();
