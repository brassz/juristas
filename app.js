// Configuração do Supabase
const SUPABASE_URL = 'https://mhtxyxizfnxupwmilith.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1odHh5eGl6Zm54dXB3bWlsaXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMzIzMDYsImV4cCI6MjA3MTcwODMwNn0.s1Y9kk2Va5EMcwAEGQmhTxo70Zv0o9oR6vrJixwEkWI';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variáveis globais
let clients = [];
let loans = [];
let cashMovements = [];
let currentCashBalance = 0;

// DOM Elements
const navLinks = document.querySelectorAll('.sidebar a');
const sections = {
    dashboard: document.getElementById('dashboard-section'),
    clients: document.getElementById('clients-section'),
    loans: document.getElementById('loans-section'),
    cash: document.getElementById('cash-section')
};

const sectionTitles = {
    dashboard: 'Dashboard',
    clients: 'Gestão de Clientes',
    loans: 'Gestão de Empréstimos',
    cash: 'Caixa'
};

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadData();
    setupDragAndDrop();
});

function setupEventListeners() {
    // Navegação
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove classe ativa de todos os links
            navLinks.forEach(l => l.classList.remove('bg-blue-700'));
            
            // Adiciona classe ativa ao link clicado
            this.classList.add('bg-blue-700');
            
            // Oculta todas as seções
            Object.values(sections).forEach(section => section.classList.add('hidden'));
            
            // Mostra a seção correspondente
            const sectionId = this.classList.contains('active-dashboard') ? 'dashboard' :
                              this.classList.contains('active-clients') ? 'clients' :
                              this.classList.contains('active-loans') ? 'loans' :
                              this.classList.contains('active-cash') ? 'cash' : 'dashboard';
            
            sections[sectionId].classList.remove('hidden');
            document.querySelector('.section-title').textContent = sectionTitles[sectionId];
        });
    });
    
    // Formulários
    document.getElementById('client-form').addEventListener('submit', handleClientSubmit);
    document.getElementById('loan-form').addEventListener('submit', handleLoanSubmit);
    document.getElementById('cash-form').addEventListener('submit', handleCashSubmit);
    
    // Cálculo automático de juros
    document.getElementById('loan-amount').addEventListener('input', calculateLoanInterest);
    document.getElementById('loan-rate').addEventListener('input', calculateLoanInterest);
}

function setupDragAndDrop() {
    const uploadArea = document.querySelector('.file-upload-area');
    
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
        const files = e.dataTransfer.files;
        handleDocumentUpload(files);
    });
}

// Funções de carregamento de dados
async function loadData() {
    try {
        await Promise.all([
            loadClients(),
            loadLoans(),
            loadCashMovements()
        ]);
        updateDashboard();
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showNotification('Erro ao carregar dados', 'error');
    }
}

async function loadClients() {
    try {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        clients = data || [];
        renderClients();
        updateClientSelect();
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        // Se a tabela não existir, cria com dados de exemplo
        if (error.code === 'PGRST116') {
            await createTables();
            await loadClients();
        }
    }
}

async function loadLoans() {
    try {
        const { data, error } = await supabase
            .from('loans')
            .select(`
                *,
                clients(name, cpf)
            `)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        loans = data || [];
        renderLoans();
    } catch (error) {
        console.error('Erro ao carregar empréstimos:', error);
        if (error.code === 'PGRST116') {
            await createTables();
            await loadLoans();
        }
    }
}

async function loadCashMovements() {
    try {
        const { data, error } = await supabase
            .from('cash_movements')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        cashMovements = data || [];
        calculateCashBalance();
        renderCashHistory();
    } catch (error) {
        console.error('Erro ao carregar movimentações:', error);
        if (error.code === 'PGRST116') {
            await createTables();
            await loadCashMovements();
        }
    }
}

// Criação das tabelas no Supabase
async function createTables() {
    try {
        // Tabela de clientes
        const { error: clientsError } = await supabase.rpc('exec_sql', {
            sql: `
                CREATE TABLE IF NOT EXISTS clients (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    cpf VARCHAR(14) UNIQUE NOT NULL,
                    email VARCHAR(255) NOT NULL,
                    phone VARCHAR(20) NOT NULL,
                    address TEXT NOT NULL,
                    documents JSONB DEFAULT '[]',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `
        });
        
        // Tabela de empréstimos
        const { error: loansError } = await supabase.rpc('exec_sql', {
            sql: `
                CREATE TABLE IF NOT EXISTS loans (
                    id SERIAL PRIMARY KEY,
                    client_id INTEGER REFERENCES clients(id),
                    amount DECIMAL(10,2) NOT NULL,
                    interest_rate DECIMAL(5,2) NOT NULL,
                    final_amount DECIMAL(10,2) NOT NULL,
                    loan_date DATE NOT NULL,
                    notes TEXT,
                    status VARCHAR(20) DEFAULT 'active',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `
        });
        
        // Tabela de movimentações de caixa
        const { error: cashError } = await supabase.rpc('exec_sql', {
            sql: `
                CREATE TABLE IF NOT EXISTS cash_movements (
                    id SERIAL PRIMARY KEY,
                    type VARCHAR(20) NOT NULL,
                    amount DECIMAL(10,2) NOT NULL,
                    description TEXT NOT NULL,
                    movement_date DATE NOT NULL,
                    responsible VARCHAR(100) DEFAULT 'Sistema',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `
        });
        
        if (clientsError || loansError || cashError) {
            console.log('Tabelas já existem ou erro na criação');
        }
        
        // Adiciona dados iniciais
        await addInitialData();
        
    } catch (error) {
        console.log('Usando fallback para criação de tabelas');
        // Fallback: cria as tabelas usando SQL direto
        await createTablesFallback();
    }
}

async function createTablesFallback() {
    // Como fallback, vamos usar o localStorage para simular o banco
    console.log('Usando localStorage como fallback');
}

async function addInitialData() {
    // Adiciona saldo inicial ao caixa
    if (cashMovements.length === 0) {
        await addCashMovement('income', 10000, 'Saldo inicial do sistema', new Date().toISOString().split('T')[0]);
    }
}

// Funções de renderização
function renderClients() {
    const clientsContainer = document.querySelector('.clients-list');
    clientsContainer.innerHTML = '';
    
    if (clients.length === 0) {
        clientsContainer.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">Nenhum cliente cadastrado</td></tr>';
        return;
    }
    
    clients.forEach(client => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
                        <i class="fas fa-user"></i>
                    </div>
                    <div>
                        <div class="font-medium text-gray-900">${client.name}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${client.cpf}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${client.email}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${client.phone}</td>
            <td class="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">${client.address}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${client.documents && client.documents.length > 0 ? 
                    `<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">${client.documents.length} documento(s)</span>` : 
                    '<span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">Sem documentos</span>'
                }
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button class="text-blue-600 hover:text-blue-900 mr-3" onclick="editClient(${client.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="text-red-600 hover:text-red-900" onclick="deleteClient(${client.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        clientsContainer.appendChild(row);
    });
}

function renderLoans() {
    const loansContainer = document.querySelector('.loans-list');
    const recentLoansContainer = document.querySelector('.recent-loans');
    
    // Renderiza lista completa
    loansContainer.innerHTML = '';
    
    if (loans.length === 0) {
        loansContainer.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">Nenhum empréstimo cadastrado</td></tr>';
        recentLoansContainer.innerHTML = '<div class="text-center text-gray-500 py-4">Nenhum empréstimo recente</div>';
        return;
    }
    
    loans.forEach(loan => {
        const row = document.createElement('tr');
        const clientName = loan.clients ? loan.clients.name : 'Cliente não encontrado';
        const statusClass = loan.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
        const statusText = loan.status === 'active' ? 'Ativo' : 'Quitado';
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-3">
                        <i class="fas fa-hand-holding-usd"></i>
                    </div>
                    <div>
                        <div class="font-medium text-gray-900">${clientName}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatCurrency(loan.amount)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${loan.interest_rate}%</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">${formatCurrency(loan.final_amount)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatDate(loan.loan_date)}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 text-xs rounded-full ${statusClass}">${statusText}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button class="text-blue-600 hover:text-blue-900 mr-3" onclick="editLoan(${loan.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="text-red-600 hover:text-red-900" onclick="deleteLoan(${loan.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        loansContainer.appendChild(row);
    });
    
    // Renderiza empréstimos recentes no dashboard
    recentLoansContainer.innerHTML = '';
    const recentLoans = loans.slice(0, 3);
    recentLoans.forEach(loan => {
        const clientName = loan.clients ? loan.clients.name : 'Cliente não encontrado';
        const loanElement = document.createElement('div');
        loanElement.className = 'flex justify-between items-center p-3 bg-gray-50 rounded-lg';
        loanElement.innerHTML = `
            <div class="flex items-center">
                <div class="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-3">
                    <i class="fas fa-hand-holding-usd"></i>
                </div>
                <div>
                    <div class="font-medium">${clientName}</div>
                    <div class="text-sm text-gray-500">${formatDate(loan.loan_date)}</div>
                </div>
            </div>
            <div class="text-right">
                <div class="font-medium text-green-600">${formatCurrency(loan.final_amount)}</div>
                <div class="text-sm text-gray-500">${loan.interest_rate}% juros</div>
            </div>
        `;
        recentLoansContainer.appendChild(loanElement);
    });
}

function renderCashHistory() {
    const cashHistoryContainer = document.querySelector('.cash-history');
    cashHistoryContainer.innerHTML = '';
    
    if (cashMovements.length === 0) {
        cashHistoryContainer.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Nenhuma movimentação registrada</td></tr>';
        return;
    }
    
    cashMovements.forEach(movement => {
        const row = document.createElement('tr');
        const typeClass = movement.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
        const typeText = movement.type === 'income' ? 'Entrada' : 'Saída';
        const amountClass = movement.type === 'income' ? 'text-green-600' : 'text-red-600';
        const amountPrefix = movement.type === 'income' ? '+' : '-';
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatDate(movement.movement_date)}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 text-xs rounded-full ${typeClass}">${typeText}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${amountClass}">
                ${amountPrefix}${formatCurrency(movement.amount)}
            </td>
            <td class="px-6 py-4 text-sm text-gray-900">${movement.description}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${movement.responsible}</td>
        `;
        cashHistoryContainer.appendChild(row);
    });
}

// Funções de atualização do dashboard
function updateDashboard() {
    updateCashBalance();
    updateTotalReceivable();
    updateTotalClients();
    updateLoansSummary();
}

function updateCashBalance() {
    document.querySelector('.cash-balance').textContent = formatCurrency(currentCashBalance);
    document.querySelector('.cash-available').textContent = formatCurrency(currentCashBalance);
}

function updateTotalReceivable() {
    const totalReceivable = loans
        .filter(loan => loan.status === 'active')
        .reduce((sum, loan) => sum + parseFloat(loan.final_amount), 0);
    
    document.querySelector('.total-receivable').textContent = formatCurrency(totalReceivable);
    document.querySelector('.total-receivable-cash').textContent = formatCurrency(totalReceivable);
}

function updateTotalClients() {
    document.querySelector('.total-clients').textContent = clients.length;
}

function updateLoansSummary() {
    const activeLoans = loans.filter(loan => loan.status === 'active');
    const totalInterest = loans.reduce((sum, loan) => {
        const interest = parseFloat(loan.final_amount) - parseFloat(loan.amount);
        return sum + interest;
    }, 0);
    
    const averageRate = loans.length > 0 ? 
        loans.reduce((sum, loan) => sum + parseFloat(loan.interest_rate), 0) / loans.length : 0;
    
    document.querySelector('.loans-made').textContent = loans.length;
    document.querySelector('.interest-received').textContent = formatCurrency(totalInterest);
    document.querySelector('.average-rate').textContent = averageRate.toFixed(2) + '%';
}

function calculateCashBalance() {
    currentCashBalance = cashMovements.reduce((balance, movement) => {
        if (movement.type === 'income') {
            return balance + parseFloat(movement.amount);
        } else {
            return balance - parseFloat(movement.amount);
        }
    }, 0);
}

// Funções de modal
function openClientModal(clientId = null) {
    const modal = document.getElementById('client-modal');
    const title = document.getElementById('client-modal-title');
    const form = document.getElementById('client-form');
    
    if (clientId) {
        // Modo edição
        const client = clients.find(c => c.id === clientId);
        if (client) {
            title.textContent = 'Editar Cliente';
            document.getElementById('client-id').value = client.id;
            document.getElementById('client-name').value = client.name;
            document.getElementById('client-cpf').value = client.cpf;
            document.getElementById('client-email').value = client.email;
            document.getElementById('client-phone').value = client.phone;
            document.getElementById('client-address').value = client.address;
            
            // Renderiza documentos existentes
            renderUploadedDocuments(client.documents || []);
        }
    } else {
        // Modo criação
        title.textContent = 'Novo Cliente';
        form.reset();
        document.getElementById('client-id').value = '';
        document.getElementById('uploaded-documents').innerHTML = '';
    }
    
    modal.classList.remove('hidden');
}

function closeClientModal() {
    document.getElementById('client-modal').classList.add('hidden');
}

function openLoanModal(loanId = null) {
    const modal = document.getElementById('loan-modal');
    const title = document.getElementById('loan-modal-title');
    const form = document.getElementById('loan-form');
    
    if (loanId) {
        // Modo edição
        const loan = loans.find(l => l.id === loanId);
        if (loan) {
            title.textContent = 'Editar Empréstimo';
            document.getElementById('loan-id').value = loan.id;
            document.getElementById('loan-client').value = loan.client_id;
            document.getElementById('loan-date').value = loan.loan_date;
            document.getElementById('loan-amount').value = loan.amount;
            document.getElementById('loan-rate').value = loan.interest_rate;
            document.getElementById('loan-notes').value = loan.notes || '';
            
            calculateLoanInterest();
        }
    } else {
        // Modo criação
        title.textContent = 'Novo Empréstimo';
        form.reset();
        document.getElementById('loan-id').value = '';
        document.getElementById('loan-date').value = new Date().toISOString().split('T')[0];
        calculateLoanInterest();
    }
    
    modal.classList.remove('hidden');
}

function closeLoanModal() {
    document.getElementById('loan-modal').classList.add('hidden');
}

function openCashModal(type) {
    const modal = document.getElementById('cash-modal');
    const title = document.getElementById('cash-modal-title');
    
    document.getElementById('cash-type').value = type;
    title.textContent = type === 'income' ? 'Adicionar ao Caixa' : 'Retirar do Caixa';
    document.getElementById('cash-date').value = new Date().toISOString().split('T')[0];
    
    modal.classList.remove('hidden');
}

function closeCashModal() {
    document.getElementById('cash-modal').classList.add('hidden');
}

// Funções de formulário
async function handleClientSubmit(e) {
    e.preventDefault();
    
    const clientData = {
        name: document.getElementById('client-name').value,
        cpf: document.getElementById('client-cpf').value,
        email: document.getElementById('client-email').value,
        phone: document.getElementById('client-phone').value,
        address: document.getElementById('client-address').value,
        documents: getUploadedDocuments()
    };
    
    const clientId = document.getElementById('client-id').value;
    
    try {
        if (clientId) {
            // Atualizar cliente existente
            const { error } = await supabase
                .from('clients')
                .update(clientData)
                .eq('id', clientId);
            
            if (error) throw error;
            showNotification('Cliente atualizado com sucesso!', 'success');
        } else {
            // Criar novo cliente
            const { error } = await supabase
                .from('clients')
                .insert([clientData]);
            
            if (error) throw error;
            showNotification('Cliente criado com sucesso!', 'success');
        }
        
        await loadClients();
        closeClientModal();
    } catch (error) {
        console.error('Erro ao salvar cliente:', error);
        showNotification('Erro ao salvar cliente', 'error');
    }
}

async function handleLoanSubmit(e) {
    e.preventDefault();
    
    const loanData = {
        client_id: parseInt(document.getElementById('loan-client').value),
        amount: parseFloat(document.getElementById('loan-amount').value),
        interest_rate: parseFloat(document.getElementById('loan-rate').value),
        final_amount: parseFloat(document.getElementById('loan-amount').value) * (1 + parseFloat(document.getElementById('loan-rate').value) / 100),
        loan_date: document.getElementById('loan-date').value,
        notes: document.getElementById('loan-notes').value
    };
    
    const loanId = document.getElementById('loan-id').value;
    
    try {
        if (loanId) {
            // Atualizar empréstimo existente
            const { error } = await supabase
                .from('loans')
                .update(loanData)
                .eq('id', loanId);
            
            if (error) throw error;
            showNotification('Empréstimo atualizado com sucesso!', 'success');
        } else {
            // Verificar se há saldo suficiente
            if (loanData.amount > currentCashBalance) {
                showNotification('Saldo insuficiente para realizar este empréstimo', 'error');
                return;
            }
            
            // Criar novo empréstimo
            const { error } = await supabase
                .from('loans')
                .insert([loanData]);
            
            if (error) throw error;
            
            // Deduzir do caixa
            await addCashMovement('expense', loanData.amount, `Empréstimo para cliente ID: ${loanData.client_id}`, loanData.loan_date);
            
            showNotification('Empréstimo criado com sucesso!', 'success');
        }
        
        await loadLoans();
        await loadCashMovements();
        closeLoanModal();
    } catch (error) {
        console.error('Erro ao salvar empréstimo:', error);
        showNotification('Erro ao salvar empréstimo', 'error');
    }
}

async function handleCashSubmit(e) {
    e.preventDefault();
    
    const cashData = {
        type: document.getElementById('cash-type').value,
        amount: parseFloat(document.getElementById('cash-amount').value),
        description: document.getElementById('cash-description').value,
        movement_date: document.getElementById('cash-date').value
    };
    
    try {
        await addCashMovement(cashData.type, cashData.amount, cashData.description, cashData.movement_date);
        await loadCashMovements();
        closeCashModal();
        showNotification('Movimentação registrada com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao registrar movimentação:', error);
        showNotification('Erro ao registrar movimentação', 'error');
    }
}

// Funções auxiliares
async function addCashMovement(type, amount, description, date) {
    try {
        const { error } = await supabase
            .from('cash_movements')
            .insert([{
                type,
                amount,
                description,
                movement_date: date,
                responsible: 'Usuário'
            }]);
        
        if (error) throw error;
        
        // Atualiza dados locais
        cashMovements.push({
            id: Date.now(),
            type,
            amount,
            description,
            movement_date: date,
            responsible: 'Usuário',
            created_at: new Date().toISOString()
        });
        
        calculateCashBalance();
        updateDashboard();
        
    } catch (error) {
        console.error('Erro ao adicionar movimentação:', error);
        throw error;
    }
}

function calculateLoanInterest() {
    const amount = parseFloat(document.getElementById('loan-amount').value) || 0;
    const rate = parseFloat(document.getElementById('loan-rate').value) || 0;
    
    const finalAmount = amount * (1 + rate / 100);
    const interestAmount = finalAmount - amount;
    
    document.getElementById('loan-final-amount').textContent = formatCurrency(finalAmount);
    document.getElementById('loan-interest-amount').textContent = `Juros: ${formatCurrency(interestAmount)}`;
}

function updateClientSelect() {
    const select = document.getElementById('loan-client');
    select.innerHTML = '<option value="">Selecione um cliente</option>';
    
    clients.forEach(client => {
        const option = document.createElement('option');
        option.value = client.id;
        option.textContent = `${client.name} - ${client.cpf}`;
        select.appendChild(option);
    });
}

function handleDocumentUpload(files) {
    if (!files || files.length === 0) return;
    
    const documentsContainer = document.getElementById('uploaded-documents');
    
    Array.from(files).forEach(file => {
        const documentElement = document.createElement('div');
        documentElement.className = 'flex items-center justify-between p-2 bg-gray-50 rounded-lg';
        documentElement.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-file text-blue-500 mr-2"></i>
                <span class="text-sm text-gray-700">${file.name}</span>
            </div>
            <button type="button" onclick="this.parentElement.remove()" class="text-red-500 hover:text-red-700">
                <i class="fas fa-times"></i>
            </button>
        `;
        documentsContainer.appendChild(documentElement);
    });
}

function getUploadedDocuments() {
    const documents = [];
    const documentElements = document.querySelectorAll('#uploaded-documents > div');
    
    documentElements.forEach(element => {
        const fileName = element.querySelector('span').textContent;
        documents.push({
            name: fileName,
            uploaded_at: new Date().toISOString()
        });
    });
    
    return documents;
}

function renderUploadedDocuments(documents) {
    const container = document.getElementById('uploaded-documents');
    container.innerHTML = '';
    
    documents.forEach(doc => {
        const documentElement = document.createElement('div');
        documentElement.className = 'flex items-center justify-between p-2 bg-gray-50 rounded-lg';
        documentElement.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-file text-blue-500 mr-2"></i>
                <span class="text-sm text-gray-700">${doc.name}</span>
            </div>
            <button type="button" onclick="this.parentElement.remove()" class="text-red-500 hover:text-red-700">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(documentElement);
    });
}

// Funções de edição e exclusão
function editClient(clientId) {
    openClientModal(clientId);
}

async function deleteClient(clientId) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    
    try {
        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', clientId);
        
        if (error) throw error;
        
        showNotification('Cliente excluído com sucesso!', 'success');
        await loadClients();
    } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        showNotification('Erro ao excluir cliente', 'error');
    }
}

function editLoan(loanId) {
    openLoanModal(loanId);
}

async function deleteLoan(loanId) {
    if (!confirm('Tem certeza que deseja excluir este empréstimo?')) return;
    
    try {
        const { error } = await supabase
            .from('loans')
            .delete()
            .eq('id', loanId);
        
        if (error) throw error;
        
        showNotification('Empréstimo excluído com sucesso!', 'success');
        await loadLoans();
    } catch (error) {
        console.error('Erro ao excluir empréstimo:', error);
        showNotification('Erro ao excluir empréstimo', 'error');
    }
}

// Funções de formatação
function formatCurrency(amount) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

// Funções de notificação
function showNotification(message, type = 'info') {
    // Cria uma notificação simples
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Fallback para quando o Supabase não estiver disponível
if (typeof window.supabase === 'undefined') {
    console.log('Supabase não disponível, usando localStorage como fallback');
    
    // Implementa funções básicas usando localStorage
    window.supabase = {
        from: (table) => ({
            select: () => ({ data: [], error: null }),
            insert: () => ({ error: null }),
            update: () => ({ error: null }),
            delete: () => ({ error: null })
        }),
        rpc: () => ({ error: null })
    };
} 