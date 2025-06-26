/* global Chart */
/**
 * Painel Administrativo - Dash Boat Tour
 * Gerenciamento completo de reservas, contatos e estatísticas
 */

class AdminPanel {
  constructor() {
    this.authToken = localStorage.getItem('adminToken');
    this.isAuthenticated = false;
    this.currentTab = 'dashboard';
    this.token = null;
    this.charts = {}; // Para armazenar instâncias dos gráficos
    this.listenersAttached = false; // GUARDA: Impede que os listeners sejam adicionados mais de uma vez
    this.currentFilters = {};
  }

  addAuthHeaders(headers = {}) {
    const token = this.authToken || localStorage.getItem('adminToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    headers['Content-Type'] = 'application/json';
    return headers;
  }

  async login(username, password) {
    try {
      // CORREÇÃO: URL da API de login ajustada
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        this.authToken = data.token;
        this.isAuthenticated = true;
        localStorage.setItem('adminToken', data.token);
        return { success: true, token: data.token };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Erro no login:', error);
      return { success: false, message: 'Erro de conexão' };
    }
  }

  async logout() {
    try {
      if (this.authToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: this.addAuthHeaders(),
        });
      }
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      // Limpar completamente o estado
      this.authToken = null;
      this.isAuthenticated = false;
      localStorage.removeItem('adminToken');

      // Limpar formulário de login
      const usernameInput = document.getElementById('username');
      const passwordInput = document.getElementById('password');
      if (usernameInput) usernameInput.value = 'admin';
      if (passwordInput) passwordInput.value = 'password';

      // Limpar mensagens de erro
      this.clearLoginMessages();

      // Mostrar tela de login
      this.showLoginScreen();

      // Forçar reconfiguração do formulário
      setTimeout(() => {
        this.setupLoginForm();
      }, 100);

      // Recarregar a página para garantir estado limpo
      window.location.reload();
    }
  }

  async verifyToken() {
    if (!this.authToken) return false;

    try {
      const response = await fetch('/api/auth/verify', {
        headers: this.addAuthHeaders(),
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      return false;
    }
  }

  showLoginScreen() {
    document.querySelector('.login-container').style.display = 'flex';
    document.querySelector('.admin-panel').style.display = 'none';
  }

  showAdminPanel() {
    document.querySelector('.login-container').style.display = 'none';
    document.querySelector('.admin-panel').style.display = 'block';
  }

  async initAuth() {
    try {
      this.isAuthenticated = false;
      this.authToken = null;

      const savedToken = localStorage.getItem('adminToken');
      if (savedToken) {
        this.authToken = savedToken;
        const isTokenValid = await this.verifyToken();

        if (isTokenValid) {
          this.isAuthenticated = true;
          this.showAdminPanel();
          this.init();
          return;
        } else {
          localStorage.removeItem('adminToken');
          this.authToken = null;
        }
      }

      this.showLoginScreen();
      this.setupLoginForm();
    } catch (error) {
      console.error('Erro na inicialização da autenticação:', error);
      this.showLoginScreen();
      this.setupLoginForm();
    }
  }

  setupLoginForm() {
    const loginForm = document.querySelector('.login-form');
    if (!loginForm) return;

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginBtn = loginForm.querySelector('.login-btn');

    loginForm.addEventListener('submit', async e => {
      e.preventDefault();

      const username = usernameInput.value.trim();
      const password = passwordInput.value;

      if (!username || !password) {
        this.showLoginError('Preencha todos os campos');
        return;
      }

      loginBtn.disabled = true;
      loginBtn.innerHTML = '<span class="spinner"></span> Entrando...';

      const result = await this.login(username, password);

      if (result.success) {
        this.isAuthenticated = true;
        this.authToken = result.token;
        localStorage.setItem('adminToken', result.token);
        this.showAdminPanel();
        this.init();
      } else {
        this.showLoginError(result.message || 'Erro no login');
        loginBtn.disabled = false;
        loginBtn.textContent = 'Entrar';
      }
    });
  }

  showLoginError(message) {
    this.clearLoginMessages();
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.querySelector('.login-form').appendChild(errorDiv);
  }

  clearLoginMessages() {
    document
      .querySelectorAll('.error-message, .success-message')
      .forEach(el => el.remove());
  }

  init() {
    if (!this.isAuthenticated || !this.authToken) {
      return;
    }

    this.setupTabs();
    this.setupEventListeners();
    this.loadDashboard();
  }

  setupTabs() {
    const navLinks = document.querySelectorAll('[data-tab]');
    navLinks.forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const targetTab = link.getAttribute('data-tab');
        this.showTab(targetTab);

        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      });
    });
  }

  showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
      tab.style.display = 'none';
    });

    const targetTab = document.getElementById(tabName);
    if (targetTab) {
      targetTab.style.display = 'block';
      this.currentTab = tabName;

      // Adicionado para garantir que o dashboard carregue ao clicar na aba
      if (tabName === 'dashboard') {
        this.loadDashboard();
      }

      setTimeout(() => {
        switch (tabName) {
          case 'reservations':
            this.loadReservations();
            break;
          case 'contacts':
            this.loadContacts();
            break;
          case 'stats':
            this.loadStats();
            break;
        }
      }, 100);
    }
  }

  // CORREÇÃO: Listeners de eventos unificados para evitar duplicidade
  setupEventListeners() {
    if (this.listenersAttached) return;

    // Listener de clique unificado para todas as ações
    document.body.addEventListener('click', e => {
      // Fechar modal ao clicar fora do conteúdo (na overlay)
      const overlay = e.target.closest('.modal-overlay');
      if (overlay && e.target === overlay) {
        overlay.style.display = 'none';
        overlay.classList.remove('active');
        document.body.classList.remove('modal-open');
        return;
      }
      // Se clicar no botão 'Ver', prioriza o botão
      if (e.target.closest('.view-recent-contact-btn')) {
        const activityItem = e.target.closest('.activity-item');
        if (activityItem) {
          const contactId = activityItem.dataset.contactId;
          if (contactId) this.viewMessage(contactId);
        }
        return;
      }
      // Se clicar no card, mas não no botão
      const card = e.target.closest('.activity-item');
      if (card && !e.target.closest('button')) {
        const contactId = card.dataset.contactId;
        if (contactId) this.viewMessage(contactId);
        return;
      }
      // Para outros botões e links
      const target = e.target.closest('button, a');
      if (!target) return;

      // Ações de visualização
      if (target.matches('.view-reservation-details')) {
        this.viewReservationDetails(target.dataset.id);
        return;
      }
      if (target.matches('.view-message')) {
        this.viewMessage(target.dataset.id);
        return;
      }

      // Ação de exclusão
      if (target.matches('.delete-item')) {
        this.deleteItem(target.dataset.id, target.dataset.type);
        return;
      }

      // Logout
      if (target.matches('.logout-btn')) {
        e.preventDefault();
        this.logout();
        return;
      }

      // Fechar modal
      if (target.matches('.modal-close')) {
        const modal = target.closest('.modal-overlay');
        if (modal) this.closeModal(modal.id);
        return;
      }

      // Confirmar exclusão
      if (target.matches('.btn-confirm')) {
        const modal = target.closest('.modal-overlay');
        if (modal) {
          const { id, type } = modal.dataset;
          if (id && type) this.performDelete(id, type);
        }
        return;
      }
    });

    // Listener de mudança para dropdown de status
    document.body.addEventListener('change', e => {
      if (e.target.classList.contains('status-select')) {
        const id = e.target.dataset.id;
        const newStatus = e.target.value;
        this.updateReservationStatus(id, newStatus);
      }
    });

    this.listenersAttached = true;
  }

  async loadDashboard() {
    if (!this.isAuthenticated || !this.authToken) return;

    try {
      const response = await fetch('/api/stats', {
        headers: this.addAuthHeaders(),
      });
      const data = await response.json();

      if (data.success) {
        this.updateDashboardStats(data.stats);
        await this.loadRecentActivity();
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    }
  }

  updateDashboardStats(stats) {
    const elements = {
      totalReservations: document.getElementById('totalReservations'),
      pendingReservations: document.getElementById('pendingReservations'),
      totalContacts: document.getElementById('totalContacts'),
      monthlyRevenue: document.getElementById('monthlyRevenue'),
    };

    if (elements.totalReservations)
      elements.totalReservations.textContent = stats.totalReservations || 0;
    if (elements.pendingReservations)
      elements.pendingReservations.textContent = stats.pendingReservations || 0;
    if (elements.totalContacts)
      elements.totalContacts.textContent = stats.totalContacts || 0;
    if (elements.monthlyRevenue)
      elements.monthlyRevenue.textContent = stats.confirmedReservations || 0;

    // Função utilitária para aplicar cor e mensagem
    function setTrendDashboard(elementSelector, value, thresholds, messages) {
      const el = document.querySelector(elementSelector);
      if (!el) return;
      el.parentElement.classList.remove(
        'trend-green',
        'trend-yellow',
        'trend-red'
      );
      let colorClass = 'trend-green';
      let msg = '';
      if (value >= thresholds.green) {
        colorClass = 'trend-green';
        msg = messages.green;
      } else if (value >= thresholds.yellow) {
        colorClass = 'trend-yellow';
        msg = messages.yellow;
      } else {
        colorClass = 'trend-red';
        msg = messages.red;
      }
      el.parentElement.classList.add(colorClass);
      el.textContent = msg;
    }

    // Total de Reservas (novas no mês)
    if (typeof stats.newReservationsLast30Days === 'number') {
      setTrendDashboard(
        '#totalReservations ~ .label + .trend span:last-child',
        stats.newReservationsLast30Days,
        { green: 10, yellow: 1 },
        {
          green: `Crescimento (+${stats.newReservationsLast30Days} este mês)`,
          yellow: `Estável (+${stats.newReservationsLast30Days} este mês)`,
          red: 'Sem novas reservas',
        }
      );
    }

    // Total de Contatos (novos no mês)
    if (typeof stats.newContactsLast30Days === 'number') {
      setTrendDashboard(
        '#totalContacts ~ .label + .trend span:last-child',
        stats.newContactsLast30Days,
        { green: 10, yellow: 1 },
        {
          green: `Ótima procura (+${stats.newContactsLast30Days} este mês)`,
          yellow: `Procura moderada (+${stats.newContactsLast30Days} este mês)`,
          red: 'Sem novos contatos',
        }
      );
    }

    // Reservas Confirmadas (taxa de efetivação)
    if (typeof stats.effectivenessRate === 'number') {
      setTrendDashboard(
        '#monthlyRevenue ~ .label + .trend span:last-child',
        stats.effectivenessRate,
        { green: 70, yellow: 40 },
        {
          green: 'Alta efetivação',
          yellow: 'Pode melhorar',
          red: 'Baixa efetivação',
        }
      );
    }

    // Reservas Pendentes: cor e mensagem dinâmica + clique para redirecionar
    const pendingCard = elements.pendingReservations?.closest('.stats-card');
    const pendingTrend = pendingCard?.querySelector('.trend span:last-child');
    if (pendingCard && pendingTrend) {
      // Remove classes antigas
      pendingCard.classList.remove('trend-green', 'trend-yellow', 'trend-red');
      let cor = 'trend-green';
      let msg = 'Nenhuma pendência!';
      const pendentes = stats.pendingReservations || 0;
      if (pendentes === 0) {
        cor = 'trend-green';
        msg = 'Nenhuma pendência!';
      } else if (pendentes < 5) {
        cor = 'trend-yellow';
        msg = 'Poucas pendências';
      } else {
        cor = 'trend-red';
        msg = 'Atenção: muitas pendências!';
      }
      pendingCard.classList.add(cor);
      pendingTrend.textContent = msg;
      // Torna o card clicável
      pendingCard.style.cursor = 'pointer';
      pendingCard.onclick = () => {
        document.querySelector('.nav-link[data-tab="reservations"]').click();
      };
    }

    // Taxa de Cancelamento
    const cancellationIndicator = document.getElementById(
      'cancellation-rate-indicator'
    );
    if (cancellationIndicator && stats.reservationStatusCount) {
      const total = Object.values(stats.reservationStatusCount).reduce(
        (a, b) => a + b,
        0
      );
      const cancelled = stats.reservationStatusCount.cancelada || 0;
      if (total > 0 && cancelled > 0) {
        const percent = ((cancelled / total) * 100).toFixed(1);
        cancellationIndicator.innerHTML = `
          <div class="data-list-item" style="display: flex; align-items: center; gap: 0.7rem;">
            <span style="font-weight: 800; font-size: 2.7rem; color: var(--danger-color); line-height: 1;">${percent}%</span>
            <span style="color: #64748b; font-size: 1.05rem; font-weight: 600;">${cancelled} cancelamentos</span>
          </div>
        `;
      } else {
        cancellationIndicator.innerHTML = `<div class='empty-state'><i class='fas fa-ban' style='font-size: 1.2rem;'></i><p style='font-size: 0.98rem;'>Nenhum cancelamento registrado.</p></div>`;
      }
    }
  }

  async loadRecentActivity() {
    try {
      const reservationsResponse = await fetch('/api/reservations', {
        headers: this.addAuthHeaders(),
        cache: 'no-store',
      });
      const reservationsData = await reservationsResponse.json();

      if (reservationsData.success) {
        this.displayRecentReservations(
          reservationsData.reservations.slice(0, 5)
        );
        setTimeout(() => {
          document
            .querySelectorAll('.reservation-activity-item')
            .forEach(card => {
              card.addEventListener('click', e => {
                const id = card.getAttribute('data-reservation-id');
                if (id) this.viewReservationDetails(id);
              });
            });
        }, 100);
      }

      const contactsResponse = await fetch('/api/contacts', {
        headers: this.addAuthHeaders(),
        cache: 'no-store',
      });
      const contactsData = await contactsResponse.json();

      if (contactsData.success) {
        this.displayRecentContacts(contactsData.contacts.slice(0, 5));
      }
    } catch (error) {
      console.error('Erro ao carregar atividade recente:', error);
    }
  }

  displayRecentReservations(reservations) {
    const container = document.getElementById('recentReservations');
    if (!container) return;

    if (!reservations || reservations.length === 0) {
      container.innerHTML =
        '<div class="empty-state">Nenhuma reserva recente.</div>';
      return;
    }

    container.innerHTML = reservations
      .map(normalizeGuests)
      .map(reservation => {
        const guests = reservation.guests || 0;
        const guestsLabel = `${guests} ${guests == 1 ? 'pessoa' : 'pessoas'}`;
        return `
      <div class="activity-item reservation-activity-item" data-reservation-id="${reservation.id}" style="display: flex; align-items: stretch;">
        <div class="activity-icon"><i class="fas fa-ship"></i></div>
        <div class="activity-content" style="flex:1; display: flex; flex-direction: column; justify-content: center;">
          <div class="reservation-row-top" style="font-weight: 600; color: #1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${this.escapeHtml(reservation.name)}</div>
          <div class="reservation-row-bottom" style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.95em; margin-top: 2px;">
            <span class="text-muted"><i class="fas fa-calendar-alt"></i> ${reservation.date ? new Date(reservation.date).toLocaleDateString('pt-BR') : '-'}</span>
            <span class="text-muted"><i class="fas fa-map-marker-alt"></i> ${this.escapeHtml(reservation.destination)}</span>
            <span class="text-muted"><i class="fas fa-user-friends"></i> ${guestsLabel}</span>
          </div>
        </div>
        <div class="reservation-status-col" style="display: flex; align-items: center; justify-content: flex-end; min-width: 90px;">
          <span class="status-badge status-${reservation.status}">${this.getStatusText(reservation.status)}</span>
        </div>
      </div>
    `;
      })
      .join('');
  }

  displayRecentContacts(contacts) {
    const container = document.getElementById('recentContacts');
    if (!container) return;

    if (!contacts || contacts.length === 0) {
      container.innerHTML =
        '<div class="empty-state">Nenhum contato recente.</div>';
      return;
    }

    container.innerHTML = contacts
      .slice(0, 5)
      .map(
        contact => `
      <div class="activity-item" data-contact-id="${contact.id}">
        <div class="activity-icon"><i class="fas fa-envelope"></i></div>
        <div class="activity-content">
          <strong>${this.escapeHtml(contact.name)}</strong>
          <span>${this.escapeHtml(contact.email)}</span>
        </div>
        <div class="activity-actions">
          <button class="btn-modern btn-primary-modern btn-sm view-recent-contact-btn">Ver</button>
        </div>
      </div>
    `
      )
      .join('');
  }

  showLoading(selector) {
    const element =
      typeof selector === 'string'
        ? document.querySelector(selector)
        : selector;
    if (element) {
      element.innerHTML = `
        <div class="loading">
          <div class="spinner"></div>
          <span>Carregando...</span>
        </div>
      `;
    }
  }

  async loadReservations(filters) {
    if (!this.isAuthenticated || !this.authToken) return;
    if (!filters) filters = this.currentFilters || {};
    this.currentFilters = { ...filters };
    try {
      let url = '/api/reservations';
      const params = [];
      if (filters.status)
        params.push(`status=${encodeURIComponent(filters.status)}`);
      if (filters.destination)
        params.push(`destination=${encodeURIComponent(filters.destination)}`);
      if (params.length) url += '?' + params.join('&');
      // Mostra loading apenas na tabela
      this.showLoading('#reservationsList .table-responsive');
      const response = await fetch(url, {
        headers: this.addAuthHeaders(),
        cache: 'no-store',
      });
      const data = await response.json();
      if (data.success) {
        this.displayReservations(data.reservations);
      } else {
        this.showError('Erro ao carregar reservas');
      }
    } catch (error) {
      console.error('Erro ao carregar reservas:', error);
      this.showError('Erro ao carregar reservas');
    }
  }

  displayReservations(reservations) {
    const reservationsList = document.getElementById('reservationsList');
    if (!reservationsList) {
      console.error('Elemento #reservationsList não encontrado.');
      return;
    }

    // Montar tabela com cabeçalho sempre visível
    let tableHTML = `
      <div class="table-responsive">
        <table class="table-modern" id="reservations-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Destino</th>
              <th>Data</th>
              <th>Pessoas</th>
              <th>Status</th>
              <th class="text-right" style="position: relative; white-space: nowrap;">
                Ações
                <button id="filterDropdownBtn" type="button" style="background: none; border: none; box-shadow: none; padding: 0; margin: 0; cursor: pointer;">
                  <i class="fas fa-sliders-h" style="font-size: 1.2em;"></i>
                </button>
                <div id="filterDropdown" class="dropdown-menu" style="display: none; padding: 18px 12px 12px 12px; position: absolute; right: 0; left: auto; top: 100%; z-index: 1000;">
                  <form id="filterForm" autocomplete="off">
                    <div class="form-group">
                      <label for="filterStatus">Status</label>
                      <select id="filterStatus" class="form-control">
                        <option value="">Todos</option>
                        <option value="pendente">Pendente</option>
                        <option value="confirmada">Confirmada</option>
                        <option value="cancelada">Cancelada</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label for="filterDestination">Destino</label>
                      <select id="filterDestination" class="form-control">
                        <option value="">Todos</option>
                        <option value="Cabo Frio">Cabo Frio</option>
                        <option value="Arraial do Cabo">Arraial do Cabo</option>
                        <option value="Armação de Búzios">Armação de Búzios</option>
                      </select>
                    </div>
                    <div class="d-flex justify-content-between mt-3">
                      <button type="submit" class="btn-modern btn-primary-modern">Aplicar</button>
                      <button type="button" id="clearFiltersBtn" class="btn-modern btn-secondary-modern">Limpar</button>
                    </div>
                  </form>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
    `;
    if (!reservations || reservations.length === 0) {
      tableHTML += `<tr><td colspan="6" class="text-center">Nenhuma reserva encontrada.</td></tr>`;
    } else {
      tableHTML += reservations
        .map(normalizeGuests)
        .map(
          reservation => `
          <tr data-id="${reservation.id}">
              <td>${this.escapeHtml(reservation.name)}</td>
              <td>${this.escapeHtml(reservation.destination)}</td>
              <td>${new Date(reservation.date).toLocaleDateString()}</td>
              <td>${reservation.guests}</td>
              <td>
                  ${this.createStatusDropdown(reservation.id, reservation.status)}
              </td>
              <td class="text-right">
                  <button class="btn-modern btn-primary-modern btn-sm view-reservation-details" data-id="${reservation.id}">
                      <i class="fas fa-eye"></i> Detalhes
                  </button>
                  <button class="btn-modern btn-danger-modern btn-sm delete-item" data-id="${reservation.id}" data-type="reservation">
                      <i class="fas fa-trash"></i> Excluir
                  </button>
              </td>
          </tr>
      `
        )
        .join('');
    }
    tableHTML += `</tbody></table></div>`;

    // Reatribuir eventos do filtro
    const filterBtn = document.getElementById('filterDropdownBtn');
    const filterDropdown = document.getElementById('filterDropdown');
    const filterForm = document.getElementById('filterForm');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const filterStatus = document.getElementById('filterStatus');
    const filterDestination = document.getElementById('filterDestination');

    // Setar valores dos selects conforme filtros atuais
    if (filterStatus && this.currentFilters && this.currentFilters.status) {
      filterStatus.value = this.currentFilters.status;
    }
    if (
      filterDestination &&
      this.currentFilters &&
      this.currentFilters.destination
    ) {
      filterDestination.value = this.currentFilters.destination;
    }

    if (filterBtn && filterDropdown) {
      filterBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        filterDropdown.style.display =
          filterDropdown.style.display === 'block' ? 'none' : 'block';
      });
      document.addEventListener('click', function handler(e) {
        if (!filterDropdown.contains(e.target) && e.target !== filterBtn) {
          filterDropdown.style.display = 'none';
          document.removeEventListener('click', handler);
        }
      });
    }
    if (filterForm) {
      filterForm.addEventListener('submit', e => {
        e.preventDefault();
        filterDropdown.style.display = 'none';
        const status = filterStatus.value;
        const destination = filterDestination.value;
        window.adminPanel.loadReservations({ status, destination });
      });
    }
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', function () {
        filterStatus.value = '';
        filterDestination.value = '';
        filterDropdown.style.display = 'none';
        window.adminPanel.currentFilters = {};
        window.adminPanel.loadReservations({});
      });
    }

    // Preencher tabela (desktop)
    const tableContainer = document.querySelector(
      '#reservationsList .table-responsive'
    );
    if (tableContainer) {
      tableContainer.innerHTML = tableHTML;
    }
    // Preencher cards responsivos (mobile)
    const cardsContainer = document.querySelector(
      '#reservationsList .reservation-cards-list'
    );
    if (cardsContainer) {
      if (!reservations || reservations.length === 0) {
        cardsContainer.innerHTML = `<div class="reservation-card">Nenhuma reserva encontrada.</div>`;
      } else {
        cardsContainer.innerHTML = reservations
          .map(normalizeGuests)
          .map(reservation => {
            const guests = reservation.guests || 0;
            const guestsLabel = `${guests} ${guests == 1 ? 'pessoa' : 'pessoas'}`;
            return `
              <div class="activity-item reservation-activity-item" data-reservation-id="${reservation.id}" style="display: flex; align-items: stretch;">
                <div class="activity-icon"><i class="fas fa-ship"></i></div>
                <div class="activity-content" style="flex:1; display: flex; flex-direction: column; justify-content: center;">
                  <div class="reservation-row-top" style="font-weight: 600; color: #1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${this.escapeHtml(reservation.name)}</div>
                  <div class="reservation-row-bottom" style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.95em; margin-top: 2px;">
                    <span class="text-muted"><i class="fas fa-calendar-alt"></i> ${reservation.date ? new Date(reservation.date).toLocaleDateString('pt-BR') : '-'}</span>
                    <span class="text-muted"><i class="fas fa-map-marker-alt"></i> ${this.escapeHtml(reservation.destination)}</span>
                    <span class="text-muted"><i class="fas fa-user-friends"></i> ${guestsLabel}</span>
                  </div>
                </div>
                <div class="reservation-status-col" style="display: flex; align-items: center; justify-content: flex-end; min-width: 90px;">
                  <span class="status-badge status-${reservation.status}">${this.getStatusText(reservation.status)}</span>
                </div>
              </div>
            `;
          })
          .join('');
      }
    }
  }

  createStatusDropdown(id, currentStatus) {
    const statuses = {
      pendente: 'Pendente',
      confirmada: 'Confirmada',
      cancelada: 'Cancelada',
    };
    const normalizedCurrentStatus = (currentStatus || '').toLowerCase();
    const options = Object.entries(statuses)
      .map(([value, text]) => {
        const selected = value === normalizedCurrentStatus ? 'selected' : '';
        return `<option value="${value}" ${selected}>${text}</option>`;
      })
      .join('');
    return `
        <select class="status-select" data-id="${id}" data-status="${normalizedCurrentStatus}">
            ${options}
        </select>
    `;
  }

  createStatusButtons(currentStatus) {
    const statuses = ['Pendente', 'Confirmada', 'Cancelada'];
    let buttonsHtml = '';

    buttonsHtml += `<span class="badge badge-info">${this.escapeHtml(currentStatus)}</span>`;

    statuses.forEach(status => {
      if (status.toLowerCase() !== currentStatus.toLowerCase()) {
        buttonsHtml += `<button class="btn btn-sm btn-outline-secondary change-status-btn ml-1" data-status="${status}">${status}</button>`;
      }
    });

    return buttonsHtml;
  }

  async updateReservationStatus(id, status) {
    try {
      // CORREÇÃO: URL da API de atualização de status ajustada
      const response = await fetch(`/api/reservations/${id}/status`, {
        method: 'PUT',
        headers: this.addAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status: status }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        this.showSuccess(`Status atualizado para ${status}.`);
        setTimeout(async () => {
          await this.loadReservations();
          await this.loadDashboard();
        }, 200);
      } else {
        this.showError(data.message || 'Falha ao atualizar status.');
      }
    } catch (error) {
      console.error('Erro ao atualizar status da reserva:', error);
      this.showError('Erro de rede ao atualizar status.');
    }
  }

  async loadContacts() {
    this.showLoading('contactsList');
    try {
      const response = await fetch('/api/contacts', {
        headers: this.addAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(`Erro na rede: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.success) {
        this.displayContacts(data.contacts);
      } else {
        throw new Error(data.message || 'Falha ao obter dados de contatos');
      }
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
      this.showError('Não foi possível carregar os contatos.');
      const contactsList = document.getElementById('contactsList');
      if (contactsList) {
        contactsList.innerHTML =
          '<div class="alert alert-danger">Erro ao carregar contatos.</div>';
      }
    }
  }

  displayContacts(contacts) {
    const contactsList = document.getElementById('contactsList');
    if (!contactsList) {
      console.error('Elemento #contactsList não encontrado.');
      return;
    }

    // Seletores dos containers
    const tableContainer = contactsList.querySelector('.table-responsive');
    const cardsContainer = contactsList.querySelector('.contacts-cards-list');

    if (!contacts || contacts.length === 0) {
      if (tableContainer)
        tableContainer.innerHTML =
          '<div class="alert alert-info">Nenhum contato encontrado.</div>';
      if (cardsContainer)
        cardsContainer.innerHTML =
          '<div class="empty-state">Nenhum contato encontrado.</div>';
      return;
    }

    // Montar tabela
    const tableHTML = `
      <table class="table-modern" id="contacts-table">
          <thead>
              <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Telefone</th>
                  <th>Data</th>
                  <th class="text-right">Ações</th>
              </tr>
          </thead>
          <tbody>
              ${contacts
                .map(
                  contact => `
                  <tr data-id="${contact.id}">
                      <td>${this.escapeHtml(contact.name)}</td>
                      <td>${this.escapeHtml(contact.email)}</td>
                      <td>${this.escapeHtml(contact.phone || 'N/A')}</td>
                      <td>${new Date(
                        contact.createdAt || contact.timestamp
                      ).toLocaleDateString()}</td>
                      <td class="text-right">
                          <button class="btn-modern btn-primary-modern btn-sm view-message" data-id="${
                            contact.id
                          }">
                              <i class="fas fa-eye"></i> Visualizar
                          </button>
                          <button class="btn-modern btn-danger-modern btn-sm delete-item" data-id="${
                            contact.id
                          }" data-type="contact">
                              <i class="fas fa-trash"></i> Excluir
                          </button>
                      </td>
                  </tr>
              `
                )
                .join('')}
          </tbody>
      </table>
    `;
    if (tableContainer) tableContainer.innerHTML = tableHTML;

    // Montar cards (reutilizando o visual de displayRecentContacts)
    const cardsHTML = contacts
      .map(
        contact => `
          <div class="activity-item" data-contact-id="${contact.id}">
            <div class="activity-icon"><i class="fas fa-envelope"></i></div>
            <div class="activity-content">
              <strong>${this.escapeHtml(contact.name)}</strong>
              <span>${this.escapeHtml(contact.email)}</span>
            </div>
            <div class="activity-actions">
              <button class="btn-modern btn-primary-modern btn-sm view-message" data-id="${contact.id}">Ver</button>
            </div>
          </div>
        `
      )
      .join('');
    if (cardsContainer) cardsContainer.innerHTML = cardsHTML;
  }

  async loadStats() {
    if (!this.isAuthenticated || !this.authToken) return;

    try {
      const response = await fetch('/api/stats', {
        headers: this.addAuthHeaders(),
      });
      const data = await response.json();

      if (data.success) {
        console.log('DEBUG displayStats stats:', data.stats);
        this.displayStats(data.stats);
      } else {
        this.showError('Erro ao carregar estatísticas');
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      this.showError('Erro ao carregar estatísticas');
    }
  }

  displayStats(stats) {
    if (!stats) return;

    // Preenche os KPIs
    document.getElementById('stats-total-reservations').textContent =
      stats.totalReservations || 0;
    document.getElementById('stats-total-contacts').textContent =
      stats.totalContacts || 0;
    document.getElementById('stats-effectiveness-rate').textContent =
      `${stats.effectivenessRate || 0}%`;
    document.getElementById('stats-conversion-rate').textContent =
      `${stats.conversionRate || 0}%`;

    // Função utilitária para aplicar cor e mensagem
    function setTrend(elementId, value, thresholds, messages) {
      const el = document.getElementById(elementId);
      if (!el) return;
      // Remove classes antigas
      el.parentElement.classList.remove(
        'trend-green',
        'trend-yellow',
        'trend-red'
      );
      let colorClass = 'trend-green';
      let msg = '';
      if (value >= thresholds.green) {
        colorClass = 'trend-green';
        msg = messages.green;
      } else if (value >= thresholds.yellow) {
        colorClass = 'trend-yellow';
        msg = messages.yellow;
      } else {
        colorClass = 'trend-red';
        msg = messages.red;
      }
      el.parentElement.classList.add(colorClass);
      el.textContent = msg;
    }

    // Total de Reservas (novas no mês)
    if (typeof stats.newReservationsLast30Days === 'number') {
      setTrend(
        'stats-trend-reservations',
        stats.newReservationsLast30Days,
        { green: 10, yellow: 1 },
        {
          green: `Crescimento (+${stats.newReservationsLast30Days} este mês)`,
          yellow: `Estável (+${stats.newReservationsLast30Days} este mês)`,
          red: 'Sem novas reservas',
        }
      );
    }

    // Total de Contatos (novos no mês)
    if (typeof stats.newContactsLast30Days === 'number') {
      setTrend(
        'stats-trend-contacts',
        stats.newContactsLast30Days,
        { green: 10, yellow: 1 },
        {
          green: `Ótima procura (+${stats.newContactsLast30Days} este mês)`,
          yellow: `Procura moderada (+${stats.newContactsLast30Days} este mês)`,
          red: 'Sem novos contatos',
        }
      );
    }

    // Taxa de Efetivação (%)
    if (typeof stats.effectivenessRate === 'number') {
      setTrend(
        'stats-trend-effectiveness',
        stats.effectivenessRate,
        { green: 70, yellow: 40 },
        {
          green: 'Alta efetivação',
          yellow: 'Pode melhorar',
          red: 'Baixa efetivação',
        }
      );
    }

    // Taxa de Conversão (%)
    if (typeof stats.conversionRate === 'number') {
      setTrend(
        'stats-trend-conversion',
        stats.conversionRate,
        { green: 30, yellow: 10 },
        {
          green: 'Ótima conversão',
          yellow: 'Conversão razoável',
          red: 'Conversão baixa',
        }
      );
    }

    // Gráfico de Destino (Barras Verticais)
    const destinationCtx = document.getElementById('destination-chart');
    if (destinationCtx && stats.destinationDistribution) {
      if (this.charts.destination) this.charts.destination.destroy();
      this.charts.destination = new Chart(destinationCtx, {
        type: 'bar',
        data: {
          labels: Object.keys(stats.destinationDistribution),
          datasets: [
            {
              label: 'Reservas',
              data: Object.values(stats.destinationDistribution),
              backgroundColor: 'rgba(59, 130, 246, 0.7)',
              borderRadius: 8,
              maxBarThickness: 32,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { enabled: true } },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#64748b', font: { size: 13 } },
            },
            y: {
              beginAtZero: true,
              grid: { color: '#f1f5f9' },
              ticks: { color: '#64748b', font: { size: 13 } },
            },
          },
        },
      });
    }

    // Lista de Destinos
    const destinationList = document.getElementById('destination-list');
    if (destinationList && stats.destinationDistribution) {
      const destinations = Object.entries(stats.destinationDistribution).sort(
        ([, a], [, b]) => b - a
      );
      destinationList.innerHTML =
        destinations.length > 0
          ? destinations
              .map(
                ([name, count]) => `
            <div class="data-list-item">
                <span class="label">${this.escapeHtml(name)}</span>
                <span class="value">${count}</span>
            </div>
        `
              )
              .join('')
          : '<p class="text-muted text-center">Nenhum dado de destino.</p>';
    }

    // Gráfico de linha: Evolução Mensal de Reservas
    const monthlyChart = document.getElementById('monthly-chart');
    if (
      monthlyChart &&
      stats.monthlyDistribution &&
      stats.monthlyDistribution.reservations
    ) {
      if (this.charts && this.charts.monthlyLine)
        this.charts.monthlyLine.destroy();
      this.charts = this.charts || {};
      const monthNames = [
        'Jan',
        'Fev',
        'Mar',
        'Abr',
        'Mai',
        'Jun',
        'Jul',
        'Ago',
        'Set',
        'Out',
        'Nov',
        'Dez',
      ];
      this.charts.monthlyLine = new Chart(monthlyChart.getContext('2d'), {
        type: 'line',
        data: {
          labels: monthNames,
          datasets: [
            {
              label: 'Reservas',
              data: stats.monthlyDistribution.reservations,
              borderColor: '#2563eb',
              backgroundColor: 'rgba(37, 99, 235, 0.13)',
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointBackgroundColor: '#2563eb',
              pointBorderColor: '#fff',
              pointHoverRadius: 6,
            },
          ],
        },
        options: {
          plugins: { legend: { display: false } },
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#64748b', font: { size: 13 } },
            },
            y: {
              beginAtZero: true,
              grid: { color: '#f1f5f9' },
              ticks: { color: '#64748b', font: { size: 13 } },
            },
          },
        },
      });
    }

    // Lista Mensal
    const monthlyList = document.getElementById('monthly-list');
    if (
      monthlyList &&
      stats.monthlyDistribution &&
      stats.monthlyDistribution.reservations
    ) {
      const monthNames = [
        'Janeiro',
        'Fevereiro',
        'Março',
        'Abril',
        'Maio',
        'Junho',
        'Julho',
        'Agosto',
        'Setembro',
        'Outubro',
        'Novembro',
        'Dezembro',
      ];
      const monthlyData = stats.monthlyDistribution.reservations
        .map((count, index) => ({ name: monthNames[index], count }))
        .filter(item => item.count > 0);

      monthlyList.innerHTML =
        monthlyData.length > 0
          ? monthlyData
              .map(
                ({ name, count }) => `
            <div class="data-list-item">
                <span class="label">${name}</span>
                <span class="value">${count}</span>
            </div>
        `
              )
              .join('')
          : '<p class="text-muted text-center">Nenhuma reserva este ano.</p>';
    }

    // Gráfico de pizza: Reservas por mês
    const monthlyPie = document.getElementById('monthly-pie-chart');
    if (
      monthlyPie &&
      stats.monthlyDistribution &&
      stats.monthlyDistribution.reservations
    ) {
      if (this.charts && this.charts.monthlyPie)
        this.charts.monthlyPie.destroy();
      this.charts = this.charts || {};
      const monthNames = [
        'Jan',
        'Fev',
        'Mar',
        'Abr',
        'Mai',
        'Jun',
        'Jul',
        'Ago',
        'Set',
        'Out',
        'Nov',
        'Dez',
      ];
      this.charts.monthlyPie = new Chart(monthlyPie.getContext('2d'), {
        type: 'pie',
        data: {
          labels: monthNames,
          datasets: [
            {
              data: stats.monthlyDistribution.reservations,
              backgroundColor: [
                '#2563eb',
                '#1d4ed8',
                '#3b82f6',
                '#60a5fa',
                '#93c5fd',
                '#38bdf8',
                '#0ea5e9',
                '#0284c7',
                '#0369a1',
                '#0e7490',
                '#14b8a6',
                '#22d3ee',
              ],
            },
          ],
        },
        options: {
          plugins: { legend: { display: true, position: 'bottom' } },
        },
      });
    }
    // Gráfico de pizza: Reservas por destino (3 cores principais)
    const destinationPie = document.getElementById('destination-pie-chart');
    if (destinationPie && stats.destinationDistribution) {
      if (this.charts && this.charts.destinationPie)
        this.charts.destinationPie.destroy();
      this.charts = this.charts || {};
      const labels = Object.keys(stats.destinationDistribution);
      const data = Object.values(stats.destinationDistribution);
      const pieColors = ['#2563eb', '#10b981', '#f59e0b'];
      const backgroundColor = labels.map((_, i) => pieColors[i % 3]);
      this.charts.destinationPie = new Chart(destinationPie.getContext('2d'), {
        type: 'pie',
        data: {
          labels,
          datasets: [
            {
              data,
              backgroundColor,
            },
          ],
        },
        options: {
          plugins: { legend: { display: true, position: 'bottom' } },
        },
      });
    }
    // Sazonalidade: Mês com mais reservas (corrigido)
    const seasonalityIndicator = document.getElementById(
      'seasonality-indicator'
    );
    if (
      seasonalityIndicator &&
      stats.monthlyDistribution &&
      stats.monthlyDistribution.reservations
    ) {
      const monthNamesFull = [
        'Janeiro',
        'Fevereiro',
        'Março',
        'Abril',
        'Maio',
        'Junho',
        'Julho',
        'Agosto',
        'Setembro',
        'Outubro',
        'Novembro',
        'Dezembro',
      ];
      const reservations = stats.monthlyDistribution.reservations;
      let max = 0;
      let maxIndex = -1;
      let total = 0;
      reservations.forEach((count, idx) => {
        total += count;
        if (count > max) {
          max = count;
          maxIndex = idx;
        }
      });
      // Tendência visual
      let trendHtml = '';
      if (maxIndex > 0) {
        const prev = reservations[maxIndex - 1];
        if (typeof prev === 'number') {
          const diff = max - prev;
          if (diff > 0) {
            trendHtml = `<span style='color: var(--success-color); font-weight:600; margin-left:0.5rem;'><i class='fas fa-arrow-up'></i> +${diff} vs ${monthNamesFull[maxIndex - 1]}</span>`;
          } else if (diff < 0) {
            trendHtml = `<span style='color: var(--danger-color); font-weight:600; margin-left:0.5rem;'><i class='fas fa-arrow-down'></i> ${diff} vs ${monthNamesFull[maxIndex - 1]}</span>`;
          }
        }
      }
      // Recorde histórico
      let isRecorde = false;
      if (stats.allYearsMonthlyDistribution) {
        let record = 0;
        for (const year in stats.allYearsMonthlyDistribution) {
          const arr = stats.allYearsMonthlyDistribution[year];
          arr.forEach(val => {
            if (val > record) record = val;
          });
        }
        if (max >= record && record > 0) {
          isRecorde = true;
        }
      }
      if (max > 0 && maxIndex >= 0) {
        const percent = total > 0 ? ((max / total) * 100).toFixed(1) : 0;
        seasonalityIndicator.innerHTML = `
          <style>
            @keyframes recordFadeIn {
              0% { opacity: 0; transform: scale(0.95); }
              100% { opacity: 1; transform: scale(1); }
            }
          </style>
          <div class="seasonality-highlight" style="display: flex; flex-direction: column; align-items: flex-start; justify-content: center; padding: 0.7rem 0 0.6rem 0; width: 100%;">
            <div style="display: flex; align-items: center; width: 100%; justify-content: space-between;">
              <div class="month-name" style="font-size: 1.13rem; font-weight: 700; color: var(--dark-color);">${monthNamesFull[maxIndex]}</div>
            </div>
            <div class="month-reservations" style="font-size: 0.98rem; color: #64748b; margin-top: 0.32rem; width: 100%; display: flex; align-items: center; gap: 0.6rem;">
              <span>${max} reservas${percent > 0 ? ` <span style='color: var(--success-color); font-weight: 600;'>(${percent}% do total)</span>` : ''}</span>
              ${trendHtml}
            </div>
            ${isRecorde ? `<div style='color: var(--primary-color); font-weight: 600; margin-top:0.38rem; width: 100%; animation: recordFadeIn 0.7s cubic-bezier(.4,1.4,.6,1) 1;'>Recorde histórico!</div>` : ''}
            <div style='margin-top: 0.5rem; color: #b0b8c9; font-size: 0.85rem; width: 100%;'>O percentual indica a proporção de reservas deste mês em relação ao total do ano.</div>
          </div>
        `;
        // Remove qualquer clique do card
        const card = seasonalityIndicator.closest('.content-card');
        if (card) {
          card.style.cursor = '';
          card.onclick = null;
        }
      } else {
        seasonalityIndicator.innerHTML = `<div class='empty-state'><i class='fas fa-calendar-times'></i><p>Nenhuma reserva este ano.</p></div>`;
      }
    }
    // Top 3 Destinos
    const topDestinationsIndicator = document.getElementById(
      'top-destinations-indicator'
    );
    if (topDestinationsIndicator && stats.destinationDistribution) {
      const destinations = Object.entries(stats.destinationDistribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      if (destinations.length > 0) {
        topDestinationsIndicator.innerHTML = destinations
          .map(
            ([dest, count], idx) => `
          <div class="data-list-item" style="display: flex; align-items: center; gap: 1rem;">
            <span style="font-size: 1.5rem; color: var(--primary-color);"><i class="fas fa-medal"></i> #${idx + 1}</span>
            <div>
              <div style="font-weight: 700; font-size: 1.05rem;">${dest}</div>
              <div style="color: #64748b; font-size: 0.95rem;">${count} reservas</div>
            </div>
          </div>
        `
          )
          .join('');
      } else {
        topDestinationsIndicator.innerHTML = `<div class='empty-state'><i class='fas fa-map-marked-alt'></i><p>Nenhum destino registrado.</p></div>`;
      }
    }
    // DEBUG: Teste de preenchimento do card Clientes Fiéis
    const loyalCustomersIndicator = document.getElementById(
      'loyal-customers-ranking'
    );
    if (loyalCustomersIndicator) {
      loyalCustomersIndicator.innerHTML =
        "<div style='color: red; font-weight: bold;'>DEBUG: O JS está rodando!</div>";
    }
    // Ranking de Clientes Fiéis (Top 3, mesmo que todos tenham só uma reserva)
    if (loyalCustomersIndicator && stats.loyalCustomers) {
      // Log para debug
      console.log('DEBUG loyalCustomers:', stats.loyalCustomers);
      const customers = stats.loyalCustomers;
      if (customers.length > 0) {
        loyalCustomersIndicator.innerHTML = `
          <table class="table table-borderless mb-0 loyal-ranking-table" style="font-size: 0.98rem;">
            <thead>
              <tr>
                <th style="text-align:left;">Cliente</th>
                <th style="text-align:center;">Reservas</th>
                <th style="text-align:center; min-width:7em; max-width:12em; white-space:nowrap;">
                  Última Reserva
                </th>
              </tr>
            </thead>
            <tbody>
              ${customers
                .sort(
                  (a, b) =>
                    b.count - a.count ||
                    (b.lastDate ? new Date(b.lastDate) : 0) -
                      (a.lastDate ? new Date(a.lastDate) : 0)
                )
                .slice(0, 3)
                .map(
                  (c, i) => `
                <tr>
                  <td style="display:flex; align-items:center; gap:0.5em;">
                    ${
                      i === 0
                        ? '<span class="ranking-badge ranking-gold"><i class="fas fa-trophy"></i></span>'
                        : i === 1
                          ? '<span class="ranking-badge ranking-silver"><i class="fas fa-medal"></i></span>'
                          : i === 2
                            ? '<span class="ranking-badge ranking-bronze"><i class="fas fa-medal"></i></span>'
                            : ''
                    }
                    <span class="loyal-customer-name" title="${c.name || c.email || '-'}">${c.name || c.email || '-'}</span>
                  </td>
                  <td style="text-align:center;">${c.count}</td>
                  <td style="text-align:center;"><span class="loyal-customer-date" title="${c.lastDate ? new Date(c.lastDate).toLocaleDateString('pt-BR') : '-'}">${c.lastDate ? new Date(c.lastDate).toLocaleDateString('pt-BR') : '-'}</span></td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        `;
      } else {
        loyalCustomersIndicator.innerHTML = `
          <div class='empty-state' style="text-align:center;">
            <i class='fas fa-users' style="font-size:2.2rem; color:var(--border-color);"></i>
            <p style="margin-top:0.5em; color:#64748b;">
              Ainda não há clientes recorrentes.<br>
              Assim que houver, eles aparecerão aqui!
            </p>
          </div>
        `;
      }
    }
  }

  async viewMessage(contactId) {
    try {
      const response = await fetch(`/api/contacts/${contactId}`, {
        headers: this.addAuthHeaders(),
      });
      const data = await response.json();

      if (data.success) {
        this.showMessageModal(data.contact);
      } else {
        this.showError('Erro ao carregar mensagem');
      }
    } catch (error) {
      console.error('Erro ao carregar mensagem:', error);
      this.showError('Erro ao carregar mensagem');
    }
  }

  async viewReservationDetails(reservationId) {
    try {
      const response = await fetch(`/api/reservations/${reservationId}`, {
        headers: this.addAuthHeaders(),
      });
      const data = await response.json();

      if (data.success) {
        this.showReservationModal(data.reservation);
      } else {
        this.showError('Erro ao carregar reserva');
      }
    } catch (error) {
      console.error('Erro ao carregar reserva:', error);
      this.showError('Erro ao carregar reserva');
    }
  }

  showMessageModal(contact) {
    if (contact && contact.id) {
      const modal = document.getElementById('messageModal');
      const modalBody = modal.querySelector('.modal-body');

      modal.querySelector('.modal-title').innerHTML =
        `<i class="fas fa-envelope-open-text" style="margin-right: 0.5em; color: #2563eb; font-size: 1.25em;"></i> Mensagem de ${this.escapeHtml(safeValue(contact.name))}`;

      // Modal de Contato
      modalBody.innerHTML = `
        <dl class="details-list">
          <div style="grid-column: 1;">
            <dt><i class="fas fa-user" style="color: #2563eb; margin-right: 0.4em;"></i>Nome</dt>
            <dd>${this.escapeHtml(safeValue(contact.name))}</dd>
          </div>
          <div style="grid-column: 2;">
            <dt><i class="fas fa-envelope" style="color: #2563eb; margin-right: 0.4em;"></i>Email</dt>
            <dd>${this.escapeHtml(safeValue(contact.email))}</dd>
          </div>
          <div style="grid-column: 1;">
            <dt><i class="fas fa-phone" style="color: #2563eb; margin-right: 0.4em;"></i>Telefone</dt>
            <dd>${this.escapeHtml(safeValue(contact.phone))}</dd>
          </div>
          <div style="grid-column: 2;">
            <dt><i class="fas fa-calendar-alt" style="color: #2563eb; margin-right: 0.4em;"></i>Data</dt>
            <dd>${contact.timestamp || contact.date ? new Date(contact.timestamp || contact.date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</dd>
          </div>
          <div class="message-row">
            <dt><i class="fas fa-comment" style="color: #2563eb; margin-right: 0.4em;"></i>Mensagem</dt>
            <dd class="message-content">${this.escapeHtml(safeValue(contact.message))}</dd>
          </div>
        </dl>
      `;

      this.showModal('messageModal');
    }
  }

  showReservationModal(reservation) {
    if (reservation && reservation.id) {
      const modal = document.getElementById('reservationModal');
      const modalBody = modal.querySelector('.modal-body');

      modal.querySelector('.modal-title').innerHTML =
        `<i class="fas fa-ship" style="margin-right: 0.5em; color: #2563eb; font-size: 1.25em;"></i> Reserva de ${this.escapeHtml(safeValue(reservation.name))}`;

      // Modal de Reserva
      const participantes = safeValue(
        reservation.participants || reservation.guests
      );
      const participantesLabel = `${participantes} ${participantes == 1 ? 'pessoa' : 'pessoas'}`;
      modalBody.innerHTML = `
        <dl class="details-list reserva-row-3">
          <div>
            <dt><i class="fas fa-map-marker-alt" style="color: #2563eb; margin-right: 0.4em;"></i>Destino</dt>
            <dd>${this.escapeHtml(safeValue(reservation.destination))}</dd>
          </div>
          <div>
            <dt><i class="fas fa-calendar-alt" style="color: #2563eb; margin-right: 0.4em;"></i>Data</dt>
            <dd>${reservation.date ? new Date(reservation.date).toLocaleDateString('pt-BR') : '-'}</dd>
          </div>
          <div>
            <dt><i class="fas fa-user-friends" style="color: #2563eb; margin-right: 0.4em;"></i>Participantes</dt>
            <dd>${participantesLabel}</dd>
          </div>
        </dl>
        <dl class="details-list reserva-row-2" style="margin-top:0.5rem;">
          <div>
            <dt><i class="fas fa-envelope" style="color: #2563eb; margin-right: 0.4em;"></i>Email</dt>
            <dd>${this.escapeHtml(safeValue(reservation.email))}</dd>
          </div>
          <div>
            <dt><i class="fas fa-info-circle" style="color: #2563eb; margin-right: 0.4em;"></i>Status</dt>
            <dd><span class="status-badge status-${this.escapeHtml(safeValue(reservation.status))}">${this.getStatusText(safeValue(reservation.status))}</span></dd>
          </div>
        </dl>
        <dl class="details-list" style="margin-top:0.5rem;">
          <div>
            <dt><i class="fas fa-phone" style="color: #2563eb; margin-right: 0.4em;"></i>Telefone</dt>
            <dd>${this.escapeHtml(safeValue(reservation.phone))}</dd>
          </div>
          <div>
            <dt><i class="fas fa-clock" style="color: #2563eb; margin-right: 0.4em;"></i>Solicitado em</dt>
            <dd>${reservation.timestamp ? new Date(reservation.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</dd>
          </div>
          ${
            (reservation.message && reservation.message.trim()) ||
            (reservation.mensagem && reservation.mensagem.trim())
              ? `
            <div class="message-row">
              <dt><i class="fas fa-comment-dots" style="color: #2563eb; margin-right: 0.4em;"></i>Mensagem</dt>
              <dd class="message-content">${this.escapeHtml(reservation.message || reservation.mensagem)}</dd>
            </div>
          `
              : ''
          }
        </dl>
      `;

      this.showModal('reservationModal');
    }
  }

  async deleteItem(id, type) {
    const modal = document.getElementById('confirmationModal');
    if (!modal) return;

    const safeId = id.toString();

    modal.dataset.id = safeId;
    modal.dataset.type = type;

    const modalTitle = modal.querySelector('.modal-title');
    const modalBody = modal.querySelector('.confirmation-message');

    if (!modalTitle || !modalBody) {
      console.error('Estrutura do modal de confirmação está incorreta.');
      return;
    }

    const itemText = type === 'reservation' ? 'a reserva' : 'o contato';

    // Apanha o nome do item da linha da tabela correspondente
    let itemName = '';
    const row = document.querySelector(`tr[data-id="${safeId}"]`);
    if (row) {
      itemName = row.querySelector('td:first-child')?.textContent;
    }

    modalTitle.textContent = 'Confirmar Exclusão';
    modalBody.innerHTML = `Você tem certeza que deseja excluir ${itemText} de <strong>${this.escapeHtml(itemName || `ID ${safeId}`)}</strong>? <br><br>Esta ação não poderá ser desfeita.`;

    this.showModal('confirmationModal');
  }

  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'flex'; // Usar flex para centralizar
      setTimeout(() => {
        modal.classList.add('show');
        const content = modal.querySelector('.modal-content');
        if (content) content.classList.add('show');
      }, 10);
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('show');
      const content = modal.querySelector('.modal-content');
      if (content) content.classList.remove('show');

      setTimeout(() => {
        modal.style.display = 'none';
      }, 300); // Aguarda a transição de fade-out
    }
  }

  async performDelete(id, type) {
    this.closeModal('confirmationModal');

    let result;
    if (type === 'reservation') {
      result = await this.deleteReservation(id);
      this.closeModal('reservationModal');
    } else if (type === 'contact') {
      result = await this.deleteContact(id);
    }

    if (result && result.success) {
      this.showSuccess('Item excluído com sucesso!');
      if (type === 'reservation') {
        setTimeout(async () => {
          await this.loadReservations();
          await this.loadDashboard();
        }, 200);
      } else if (type === 'contact') {
        setTimeout(async () => {
          await this.loadContacts();
        }, 200);
      }
    } else {
      this.showError(
        result && result.message ? result.message : 'Erro ao excluir item'
      );
    }
  }

  async deleteReservation(id) {
    if (!id) {
      this.showError('ID da reserva inválido.');
      return null;
    }
    try {
      const response = await fetch(`/api/reservations/${id}`, {
        method: 'DELETE',
        headers: this.addAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Erro ao deletar reserva ${id}:`, error);
      this.showError(`Falha ao deletar reserva: ${error.message}`);
      return null;
    }
  }

  async deleteContact(id) {
    if (!id) {
      this.showError('ID do contato inválido.');
      return null;
    }
    try {
      const response = await fetch(`/api/contacts/${id}`, {
        method: 'DELETE',
        headers: this.addAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Erro ao deletar contato ${id}:`, error);
      this.showError(`Falha ao deletar contato: ${error.message}`);
      return null;
    }
  }

  showSuccess(message) {
    window.showSuccessMessage('Sucesso', message);
  }

  showError(message) {
    window.showErrorMessage('Erro', message);
  }

  escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, match => {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[match];
    });
  }

  getStatusText(status) {
    const statusMap = {
      pendente: 'Pendente',
      confirmada: 'Confirmada',
      cancelada: 'Cancelada',
    };
    return statusMap[status] || status;
  }
}

// Função utilitária para exibir valores sem mostrar 'undefined' ou 'null'
function safeValue(val) {
  return val === undefined || val === null ? '-' : val;
}

// Função utilitária para garantir que toda reserva tenha o campo 'guests' preenchido corretamente
function normalizeGuests(reservation) {
  if (
    reservation.guests === undefined &&
    reservation.participants !== undefined
  ) {
    reservation.guests = reservation.participants;
  }
  return reservation;
}

document.addEventListener('DOMContentLoaded', () => {
  const adminPanel = new AdminPanel();
  adminPanel.initAuth();
  window.adminPanel = adminPanel;

  const sidebar = document.getElementById('adminSidebar');
  const navLinks = document.querySelectorAll('#adminNav .nav-link');
  navLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      if (window.innerWidth <= 1024 && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
      }
    });
  });
});
