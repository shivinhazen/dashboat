/**
 * Sistema de Validação de Formulários - Dash Boat Tour
 * Validação robusta e sanitização de entrada
 */

class FormValidator {
  constructor() {
    this.sanitizePatterns = {
      // Padrões suspeitos para detectar ataques
      xss: /<script|javascript:|on\w+\s*=|vbscript:|expression\(|<iframe|<object|<embed/gi,
      sql: /union\s+select|drop\s+table|insert\s+into|delete\s+from|update\s+set/gi,
      path: /\.\.\/|\.\.\\|\/etc\/|\/var\/|c:\\windows/gi,
    };

    this.maxLengths = {
      name: 100,
      email: 254,
      phone: 20,
      message: 1000,
      destination: 50,
      guests: 3,
      date: 10,
    };

    this.forms = document.querySelectorAll('form');
    this.init();
  }

  init() {
    this.forms.forEach(form => {
      this.setupForm(form);
    });
  }

  setupForm(form) {
    const inputs = form.querySelectorAll('input, textarea, select');

    inputs.forEach(input => {
      // Validação em tempo real
      input.addEventListener('blur', () => this.validateField(input));
      input.addEventListener('input', () => this.clearError(input));

      // Máscara para telefone
      if (input.type === 'tel') {
        input.addEventListener('input', e => this.applyPhoneMask(e.target));
      }

      // Validação no envio
      form.addEventListener('submit', e => this.handleSubmit(e, form));
    });
  }

  validateField(field) {
    const value = field.value.trim();
    const type = field.type;
    const name = field.name || field.id;

    // Remove erros anteriores
    this.clearError(field);

    // Validações específicas
    let isValid = true;
    let errorMessage = '';

    switch (type) {
      case 'email':
        if (value && !this.isValidEmail(value)) {
          isValid = false;
          errorMessage = 'Por favor, insira um email válido.';
        }
        break;

      case 'tel':
        if (value && !this.isValidPhone(value)) {
          isValid = false;
          errorMessage = 'Por favor, insira um telefone válido.';
        }
        break;

      case 'text':
        if (name.includes('name') && value.length < 2) {
          isValid = false;
          errorMessage = 'O nome deve ter pelo menos 2 caracteres.';
        }
        break;

      default:
        if (field.required && !value) {
          isValid = false;
          errorMessage = 'Este campo é obrigatório.';
        }
    }

    if (!isValid) {
      this.showError(field, errorMessage);
    }

    return isValid;
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPhone(phone) {
    // Remove todos os caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');

    // Valida telefones brasileiros (10 ou 11 dígitos)
    // 10 dígitos: (00) 0000-0000
    // 11 dígitos: (00) 00000-0000
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      return true;
    }

    // Se o telefone estiver vazio, é válido (campo opcional)
    if (!phone.trim()) {
      return true;
    }

    return false;
  }

  showError(field, message) {
    field.classList.add('is-invalid');

    const errorDiv = document.createElement('div');
    errorDiv.className = 'invalid-feedback';
    errorDiv.textContent = message;
    errorDiv.id = `${field.id || field.name}-error`;

    field.parentNode.appendChild(errorDiv);
  }

  clearError(field) {
    field.classList.remove('is-invalid');
    const errorDiv = field.parentNode.querySelector('.invalid-feedback');
    if (errorDiv) {
      errorDiv.remove();
    }
  }

  handleSubmit(e, form) {
    e.preventDefault();

    const inputs = form.querySelectorAll('input, textarea, select');
    let isValid = true;

    inputs.forEach(input => {
      if (!this.validateField(input)) {
        isValid = false;
      }
    });

    if (isValid) {
      this.submitForm(form);
    } else {
      // Foca no primeiro campo com erro
      const firstError = form.querySelector('.is-invalid');
      if (firstError) {
        firstError.focus();
      }
    }
  }

  async submitForm(form) {
    const formData = new FormData(form);
    const submitButton = form.querySelector(
      'button[type="submit"], input[type="submit"]'
    );

    // Previne envios duplicados
    if (form.dataset.submitting === 'true') {
      return;
    }

    // Marca o formulário como sendo enviado
    form.dataset.submitting = 'true';

    // Desabilita o botão durante o envio
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Enviando...';
    }

    try {
      // Determinar endpoint baseado no formulário
      const endpoint = form.classList.contains('reservation-form')
        ? '/api/reservation'
        : '/api/contact';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(Object.fromEntries(formData)),
      });

      const result = await response.json();

      if (result.success) {
        // Usar novo sistema de mensagens
        if (window.messageSystem) {
          const title = form.classList.contains('reservation-form')
            ? 'Reserva Enviada!'
            : 'Mensagem Enviada!';
          const message = form.classList.contains('reservation-form')
            ? 'Recebemos sua reserva! Entraremos em contato em breve para confirmar os detalhes.'
            : 'Obrigado pelo contato! Responderemos em breve.';

          window.messageSystem.showSuccess(title, message);
          window.messageSystem.showFormMessage(
            form,
            'success',
            'Formulário enviado com sucesso!'
          );
        } else {
          this.showSuccess(form, result.message);
        }
        form.reset();
      } else {
        if (window.messageSystem) {
          window.messageSystem.showError(
            'Erro',
            result.message || 'Erro ao enviar formulário.'
          );
          window.messageSystem.showFormMessage(
            form,
            'error',
            result.message || 'Erro ao enviar formulário.'
          );
        } else {
          this.showError(form, result.message || 'Erro ao enviar mensagem.');
        }
      }
    } catch (error) {
      console.error('Erro:', error);
      if (window.messageSystem) {
        window.messageSystem.showError(
          'Erro de Conexão',
          'Erro de conexão. Tente novamente.'
        );
        window.messageSystem.showFormMessage(
          form,
          'error',
          'Erro de conexão. Tente novamente.'
        );
      } else {
        this.showError(form, 'Erro de conexão. Tente novamente.');
      }
    } finally {
      // Reabilita o botão e permite novos envios
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent =
          submitButton.dataset.originalText || 'Enviar';
      }
      form.dataset.submitting = 'false';
    }
  }

  showSuccess(form, message) {
    // Fallback para sistema antigo
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success mt-3';
    successDiv.textContent = message;

    form.appendChild(successDiv);

    // Remove a mensagem após 5 segundos
    setTimeout(() => {
      successDiv.remove();
    }, 5000);
  }

  showError(form, message) {
    // Fallback para sistema antigo
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger mt-3';
    errorDiv.textContent = message;

    form.appendChild(errorDiv);

    // Remove a mensagem após 5 segundos
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }

  applyPhoneMask(input) {
    let value = input.value.replace(/\D/g, '');

    if (value.length <= 11) {
      if (value.length <= 2) {
        value = `(${value}`;
      } else if (value.length <= 6) {
        value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
      } else if (value.length <= 10) {
        value = `(${value.slice(0, 2)}) ${value.slice(2, 6)}-${value.slice(6)}`;
      } else {
        value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
      }
    }

    input.value = value;
  }

  // Sanitizar string removendo caracteres perigosos
  sanitizeString(input, maxLength = 100) {
    if (typeof input !== 'string') return '';

    // Remover caracteres perigosos
    let sanitized = input
      .replace(/[<>]/g, '') // Remove < e >
      .replace(/&/g, '&amp;') // Escapar &
      .replace(/"/g, '&quot;') // Escapar aspas
      .replace(/'/g, '&#x27;') // Escapar apóstrofo
      .trim();

    // Verificar padrões suspeitos
    Object.values(this.sanitizePatterns).forEach(pattern => {
      if (pattern.test(sanitized)) {
        console.warn('🚨 Padrão suspeito detectado na entrada:', input);
        sanitized = sanitized.replace(pattern, '');
      }
    });

    // Limitar tamanho
    return sanitized.substring(0, maxLength);
  }

  // Validar email com regex robusto
  validateEmail(email) {
    if (typeof email !== 'string') return false;

    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    return (
      emailRegex.test(email.trim()) && email.length <= this.maxLengths.email
    );
  }

  // Validar telefone
  validatePhone(phone) {
    if (typeof phone !== 'string') return false;

    const cleanPhone = phone.replace(/[^\d+\-()\s]/g, '');
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,20}$/;

    return (
      phoneRegex.test(cleanPhone) && cleanPhone.length <= this.maxLengths.phone
    );
  }

  // Validar número de pessoas
  validateGuests(guests) {
    const num = parseInt(guests);
    return !isNaN(num) && num > 0 && num <= 50;
  }

  // Validar data
  validateDate(date) {
    if (typeof date !== 'string') return false;

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) return false;

    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return selectedDate >= today;
  }

  // Validar formulário de contato
  validateContactForm(formData) {
    const errors = {};

    // Nome
    const name = this.sanitizeString(formData.name, this.maxLengths.name);
    if (!name || name.length < 2) {
      errors.name = 'Nome deve ter pelo menos 2 caracteres';
    }

    // Email
    if (!this.validateEmail(formData.email)) {
      errors.email = 'Email inválido';
    }

    // Telefone
    if (!this.validatePhone(formData.phone)) {
      errors.phone = 'Telefone inválido';
    }

    // Mensagem
    const message = this.sanitizeString(
      formData.message,
      this.maxLengths.message
    );
    if (!message || message.length < 10) {
      errors.message = 'Mensagem deve ter pelo menos 10 caracteres';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      sanitizedData: {
        name,
        email: formData.email.trim(),
        phone: formData.phone.replace(/[^\d+\-()\s]/g, ''),
        message,
      },
    };
  }

  // Validar formulário de reserva
  validateReservationForm(formData) {
    const errors = {};

    // Nome
    const name = this.sanitizeString(formData.name, this.maxLengths.name);
    if (!name || name.length < 2) {
      errors.name = 'Nome deve ter pelo menos 2 caracteres';
    }

    // Email
    if (!this.validateEmail(formData.email)) {
      errors.email = 'Email inválido';
    }

    // Telefone
    if (!this.validatePhone(formData.phone)) {
      errors.phone = 'Telefone inválido';
    }

    // Destino
    const destination = this.sanitizeString(
      formData.destination,
      this.maxLengths.destination
    );
    if (!destination) {
      errors.destination = 'Destino é obrigatório';
    }

    // Número de pessoas
    if (!this.validateGuests(formData.guests)) {
      errors.guests = 'Número de pessoas deve ser entre 1 e 50';
    }

    // Data
    if (!this.validateDate(formData.date)) {
      errors.date = 'Data deve ser hoje ou uma data futura';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      sanitizedData: {
        name,
        email: formData.email.trim(),
        phone: formData.phone.replace(/[^\d+\-()\s]/g, ''),
        destination,
        guests: parseInt(formData.guests),
        date: formData.date,
      },
    };
  }

  // Mostrar erros de validação
  showErrors(errors, formId) {
    // Limpar erros anteriores
    const form = document.getElementById(formId);
    if (!form) return;

    form.querySelectorAll('.error-message').forEach(el => el.remove());
    form
      .querySelectorAll('.is-invalid')
      .forEach(el => el.classList.remove('is-invalid'));

    // Mostrar novos erros
    Object.keys(errors).forEach(field => {
      const input = form.querySelector(`[name="${field}"]`);
      if (input) {
        input.classList.add('is-invalid');

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message text-danger mt-1';
        errorDiv.textContent = errors[field];
        input.parentNode.appendChild(errorDiv);
      }
    });
  }

  // Limpar erros
  clearErrors(formId) {
    const form = document.getElementById(formId);
    if (!form) return;

    form.querySelectorAll('.error-message').forEach(el => el.remove());
    form
      .querySelectorAll('.is-invalid')
      .forEach(el => el.classList.remove('is-invalid'));
  }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  new FormValidator();
});
