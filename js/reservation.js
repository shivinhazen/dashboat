/**
 * Gerenciamento do Formulário de Reserva
 * Funcionalidade completa para reservas de passeios
 */

class ReservationManager {
  constructor() {
    this.form = document.getElementById('reservationForm');
    this.submitBtn = document.getElementById('submitBtn');
    this.init();
  }

  init() {
    if (this.form) {
      this.setupForm();
      this.setupDateValidation();
      this.setupPhoneMask();
    }
  }

  setupForm() {
    this.form.addEventListener('submit', e => this.handleSubmit(e));

    // Validação em tempo real
    const inputs = this.form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.addEventListener('blur', () => this.validateField(input));
      input.addEventListener('input', () => this.clearError(input));
    });
  }

  setupDateValidation() {
    const dateInput = document.getElementById('date');
    if (dateInput) {
      // Define data mínima como hoje
      const today = new Date().toISOString().split('T')[0];
      dateInput.min = today;

      // Define data máxima como 1 ano a partir de hoje
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 1);
      dateInput.max = maxDate.toISOString().split('T')[0];
    }
  }

  setupPhoneMask() {
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
      phoneInput.addEventListener('input', e => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length <= 11) {
          value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
          e.target.value = value;
        }
      });
    }
  }

  validateField(field) {
    const value = field.value.trim();
    const type = field.type;
    const name = field.name;

    this.clearError(field);

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

      case 'date':
        if (value) {
          const selectedDate = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (selectedDate < today) {
            isValid = false;
            errorMessage = 'A data não pode ser no passado.';
          }
        }
        break;

      case 'text':
        if (name === 'name' && value.length < 2) {
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
    const phoneRegex = /^\([0-9]{2}\) [0-9]{5}-[0-9]{4}$/;
    return phoneRegex.test(phone);
  }

  showError(field, message) {
    field.classList.add('is-invalid');

    const errorDiv = document.createElement('div');
    errorDiv.className = 'invalid-feedback';
    errorDiv.textContent = message;
    errorDiv.id = `${field.id}-error`;

    field.parentNode.appendChild(errorDiv);
  }

  clearError(field) {
    field.classList.remove('is-invalid');
    const errorDiv = field.parentNode.querySelector('.invalid-feedback');
    if (errorDiv) {
      errorDiv.remove();
    }
  }

  async handleSubmit(e) {
    e.preventDefault();

    const formData = new FormData(this.form);
    const inputs = this.form.querySelectorAll('input, select, textarea');
    let isValid = true;

    // Valida todos os campos
    inputs.forEach(input => {
      if (!this.validateField(input)) {
        isValid = false;
      }
    });

    if (!isValid) {
      const firstError = this.form.querySelector('.is-invalid');
      if (firstError) {
        firstError.focus();
      }
      return;
    }

    // Desabilita o botão durante o envio
    this.submitBtn.disabled = true;
    this.submitBtn.textContent = 'Enviando...';

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(Object.fromEntries(formData)),
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccess(result.message);
        this.form.reset();
        this.scrollToTop();
      } else {
        this.showError(
          this.form,
          result.message || 'Erro ao processar reserva.'
        );
      }
    } catch (error) {
      console.error('Erro:', error);
      this.showError(this.form, 'Erro de conexão. Tente novamente.');
    } finally {
      // Reabilita o botão
      this.submitBtn.disabled = false;
      this.submitBtn.textContent = 'Fazer Reserva';
    }
  }

  showSuccess(message) {
    if (window.messageSystem) {
      window.messageSystem.showSuccess(
        'Reserva Enviada!',
        'Recebemos sua reserva! Entraremos em contato em breve para confirmar os detalhes.'
      );
      window.messageSystem.showFormMessage(
        this.form,
        'success',
        'Reserva enviada com sucesso!'
      );
    } else {
      // Fallback para sistema antigo
      const successDiv = document.createElement('div');
      successDiv.className = 'alert alert-success mt-3';
      successDiv.textContent = message;
      this.form.appendChild(successDiv);

      setTimeout(() => {
        successDiv.remove();
      }, 5000);
    }
  }

  scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  // Função para calcular preço estimado
  calculatePrice(destination, guests) {
    const prices = {
      'Armação de Búzios': 150,
      'Cabo Frio': 120,
      'Arraial do Cabo': 180,
    };

    const basePrice = prices[destination] || 150;
    const guestCount = parseInt(guests) || 1;

    return basePrice * guestCount;
  }

  // Função para mostrar preço em tempo real
  updatePrice() {
    const destination = document.getElementById('destination').value;
    const guests = document.getElementById('guests').value;

    if (destination && guests) {
      const price = this.calculatePrice(destination, guests);
      const priceDisplay = document.getElementById('priceDisplay');

      if (priceDisplay) {
        priceDisplay.textContent = `Preço estimado: R$ ${price.toFixed(2)}`;
      }
    }
  }
}

// Inicializa o gerenciador de reservas quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function () {
  new ReservationManager();
});
