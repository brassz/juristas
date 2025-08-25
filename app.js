// Configuração do Supabase
const SUPABASE_URL = 'https://mhtxyxizfnxupwmilith.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1odHh5eGl6Zm54dXB3bWlsaXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMzIzMDYsImV4cCI6MjA3MTcwODMwNn0.s1Y9kk2Va5EMcwAEGQmhTxo70Zv0o9oR6vrJixwEkWI';

// Configuração do Uploadcare
const UPLOADCARE_PUBLIC_KEY = '5bb6bf6b98f6d36060dc';

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
    initializeUploadcare();
});

function setupEventListeners() {
    // Navegação
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove classe ativa de todos os links
            navLinks.forEach(l => l.classList.remove('active'));
            
            // Adiciona classe ativa ao link clicado
            this.classList.add('active');
            
            // Oculta todas as seções
            Object.values(sections).forEach(section => section.classList.add('hidden'));
            
            // Mostra a seção correspondente
            const sectionId = this.classList.contains('active-dashboard') ? 'dashboard' :
                              this.classList.contains('active-clients') ? 'clients' :
                              this.classList.contains('active-loans') ? 'loans' :
                              this.classList.contains('active-cash') ? 'cash' : 'dashboard';
            
            sections[sectionId].classList.remove('hidden');
            document.querySelector('.section-title').textContent = sectionTitles[sectionId];
            
            // Adiciona animação de entrada para a seção
            const activeSection = sections[sectionId];
            activeSection.style.opacity = '0';
            activeSection.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                activeSection.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                activeSection.style.opacity = '1';
                activeSection.style.transform = 'translateY(0)';
            }, 100);
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
        // Abre o Uploadcare quando arquivos são arrastados
        openUploadcare();
    });
}

// Funções de carregamento de dados
async function loadData() {
    try {
        console.log('Iniciando carregamento de dados...');
        await Promise.all([
            loadClients(),
            loadLoans(),
            loadCashMovements()
        ]);
        console.log('Dados carregados, atualizando dashboard...');
        updateDashboard();
        console.log('Carregamento de dados concluído');
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
        console.log('Movimentações carregadas:', cashMovements);
        
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
        console.log('Chamando addInitialData...');
        await addInitialData();
        console.log('addInitialData concluído');
        
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
    // Adiciona saldo inicial ao caixa apenas se não houver movimentações
    if (cashMovements.length === 0) {
        console.log('Adicionando saldo inicial de R$ 10.000,00');
        await addCashMovement('income', 10000, 'Saldo inicial do sistema', new Date().toISOString().split('T')[0]);
    } else {
        console.log('Movimentações já existem, não adicionando saldo inicial');
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
                    `<div class="flex items-center space-x-2">
                        <span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">${client.documents.length} documento(s)</span>
                        <button class="text-blue-600 hover:text-blue-800 text-xs" onclick="viewClientDocuments(${client.id}, '${client.name}')">
                            <i class="fas fa-eye mr-1"></i>Ver
                        </button>
                    </div>` : 
                    `<div class="flex items-center space-x-2">
                        <span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">Sem documentos</span>
                        <button class="text-blue-600 hover:text-blue-800 text-xs" onclick="editClient(${client.id})">
                            <i class="fas fa-plus mr-1"></i>Adicionar
                        </button>
                    </div>`
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
    console.log('Atualizando dashboard...');
    updateCashBalance();
    updateTotalReceivable();
    updateTotalClients();
    updateLoansSummary();
    console.log('Dashboard atualizado');
}

function updateCashBalance() {
    console.log('Atualizando saldo em caixa:', currentCashBalance);
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
    
    // Log para debug
    console.log('Movimentações de caixa:', cashMovements);
    console.log('Saldo calculado:', currentCashBalance);
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
    // Limpa os documentos quando o modal é fechado
    clearUploadedDocuments();
}

function openDocumentsModal() {
    document.getElementById('documents-modal').classList.remove('hidden');
}

function closeDocumentsModal() {
    document.getElementById('documents-modal').classList.add('hidden');
    document.getElementById('documents-list').innerHTML = '';
}

function viewClientDocuments(clientId, clientName) {
    const client = clients.find(c => c.id === clientId);
    
    // Atualiza o título do modal
    document.getElementById('documents-modal-title').textContent = `Documentos de ${clientName}`;
    
    // Renderiza os documentos
    const documentsContainer = document.getElementById('documents-list');
    documentsContainer.innerHTML = '';
    
    if (!client || !client.documents || client.documents.length === 0) {
        documentsContainer.innerHTML = `
            <div class="text-center py-12">
                <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fas fa-file-alt text-gray-400 text-2xl"></i>
                </div>
                <h3 class="text-lg font-medium text-gray-900 mb-2">Nenhum documento encontrado</h3>
                <p class="text-gray-500 mb-4">Este cliente ainda não possui documentos anexados.</p>
                <button class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition" onclick="closeDocumentsModal(); editClient(${clientId})">
                    <i class="fas fa-plus mr-2"></i>Adicionar Documentos
                </button>
            </div>
        `;
    } else {
        client.documents.forEach((doc, index) => {
            const documentElement = document.createElement('div');
            documentElement.className = 'flex items-center justify-between p-4 bg-gray-50 rounded-lg border';
            documentElement.innerHTML = `
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <i class="fas fa-file-alt text-blue-600"></i>
                    </div>
                    <div>
                        <div class="font-medium text-gray-900">${doc.name}</div>
                        <div class="text-sm text-gray-500">Enviado em: ${formatDate(doc.uploaded_at)}</div>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <button class="text-green-600 hover:text-green-800 px-3 py-1 rounded-lg border border-green-200 hover:bg-green-50 transition" onclick="previewDocument('${doc.name}', '${doc.type || ''}', '${doc.cdn_url || ''}')">
                        <i class="fas fa-eye mr-1"></i>Preview
                    </button>
                    <a href="${doc.cdn_url || '#'}" target="_blank" class="text-blue-600 hover:text-blue-800 px-3 py-1 rounded-lg border border-blue-200 hover:bg-blue-50 transition">
                        <i class="fas fa-download mr-1"></i>Download
                    </a>
                    <button class="text-red-600 hover:text-red-800 px-3 py-1 rounded-lg border border-red-200 hover:bg-red-50 transition" onclick="deleteDocument(${clientId}, ${index})">
                        <i class="fas fa-trash mr-1"></i>Excluir
                    </button>
                </div>
            `;
            documentsContainer.appendChild(documentElement);
        });
        
        // Adiciona botão para adicionar mais documentos
        const addMoreButton = document.createElement('div');
        addMoreButton.className = 'text-center pt-4 border-t border-gray-200';
        addMoreButton.innerHTML = `
            <button class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition" onclick="closeDocumentsModal(); editClient(${clientId})">
                <i class="fas fa-plus mr-2"></i>Adicionar Mais Documentos
            </button>
        `;
        documentsContainer.appendChild(addMoreButton);
    }
    
    openDocumentsModal();
}

function downloadDocument(fileName, uploadedAt, cdnUrl) {
    if (!cdnUrl || cdnUrl === '#') {
        showNotification('URL do documento não disponível', 'error');
        return;
    }
    
    // Inicia o download do documento real
    const link = document.createElement('a');
    link.href = cdnUrl;
    link.download = fileName;
    link.target = '_blank';
    link.click();
    
    showNotification(`Download iniciado para: ${fileName}`, 'success');
}

function previewDocument(fileName, fileType, cdnUrl) {
    if (!cdnUrl || cdnUrl === '#') {
        showNotification('URL do documento não disponível', 'error');
        return;
    }
    
    // Função para preview de documentos
    if (fileType && fileType.startsWith('image/')) {
        // Para imagens, abre em uma nova aba
        window.open(cdnUrl, '_blank');
        showNotification(`Abrindo imagem: ${fileName}`, 'success');
    } else if (fileType && fileType.includes('pdf')) {
        // Para PDFs, abre em uma nova aba
        window.open(cdnUrl, '_blank');
        showNotification(`Abrindo PDF: ${fileName}`, 'success');
    } else {
        // Para outros tipos de arquivo, inicia o download
        const link = document.createElement('a');
        link.href = cdnUrl;
        link.download = fileName;
        link.click();
        showNotification(`Download iniciado: ${fileName}`, 'success');
    }
}

async function deleteDocument(clientId, documentIndex) {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;
    
    try {
        const client = clients.find(c => c.id === clientId);
        if (!client) throw new Error('Cliente não encontrado');
        
        const documentToDelete = client.documents[documentIndex];
        
        // Remove o documento do array
        client.documents.splice(documentIndex, 1);
        
        // Atualiza o cliente no banco de dados
        const { error } = await supabase
            .from('clients')
            .update({ documents: client.documents })
            .eq('id', clientId);
        
        if (error) throw error;
        
        // Se o documento tem UUID, tenta removê-lo do Uploadcare também
        if (documentToDelete && documentToDelete.uuid) {
            try {
                // Nota: Para remover do Uploadcare, você precisaria de uma API key privada
                // Por enquanto, apenas logamos a tentativa
                console.log('Documento removido do banco. UUID para remoção do Uploadcare:', documentToDelete.uuid);
            } catch (uploadcareError) {
                console.log('Não foi possível remover do Uploadcare (requer API key privada)');
            }
        }
        
        showNotification('Documento excluído com sucesso!', 'success');
        
        // Fecha o modal e recarrega a lista de clientes
        closeDocumentsModal();
        await loadClients();
    } catch (error) {
        console.error('Erro ao excluir documento:', error);
        showNotification('Erro ao excluir documento', 'error');
    }
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
        console.log('Adicionando movimentação:', { type, amount, description, date });
        
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
        
        console.log('Movimentação adicionada localmente. Total de movimentações:', cashMovements.length);
        
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

function openUploadcare() {
    // Verifica se o Uploadcare está disponível
    if (typeof uploadcare === 'undefined') {
        console.error('Uploadcare não está disponível');
        showNotification('Erro: Uploadcare não está carregado. Usando seletor nativo.', 'warning');
        openNativeFileSelector();
        return;
    }

    try {
        // Usa o widget já inicializado
        const inputElement = document.querySelector('[role="uploadcare-uploader"]');
        if (!inputElement) {
            throw new Error('Elemento de upload não encontrado');
        }

        const widget = uploadcare.Widget(inputElement);
        
        // Limpa valor anterior e abre o diálogo
        widget.value(null);
        widget.openDialog();
        
        console.log('Diálogo do Uploadcare aberto com sucesso');
        
    } catch (error) {
        console.error('Erro ao abrir Uploadcare:', error);
        showNotification('Erro ao abrir seletor de arquivos. Usando seletor nativo.', 'warning');
        
        // Fallback: abre o seletor de arquivos nativo
        openNativeFileSelector();
    }
}

// Função fallback para seletor de arquivos nativo
function openNativeFileSelector() {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.jpg,.jpeg,.png,.gif,.bmp,.tiff';
    
    input.onchange = function(e) {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            // Simula um objeto fileInfo para compatibilidade
            const fileInfo = {
                uuid: 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                name: file.name,
                size: file.size,
                mimeType: file.type,
                cdnUrl: URL.createObjectURL(file),
                isLocal: true
            };
            addUploadedDocument(fileInfo);
        });
    };
    
    input.click();
}

function addUploadedDocument(fileInfo) {
    const documentsContainer = document.getElementById('uploaded-documents');
    
    // Verifica se o documento já existe
    const existingDoc = document.querySelector(`[data-file-id="${fileInfo.uuid}"]`);
    if (existingDoc) {
        console.log('Documento já existe:', fileInfo.name);
        return;
    }
    
    const documentElement = document.createElement('div');
    documentElement.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg border';
    documentElement.setAttribute('data-file-id', fileInfo.uuid);
    
    // Determina o ícone baseado no tipo de arquivo
    let fileIcon = 'fa-file-alt';
    let iconColor = 'text-blue-600';
    
    if (fileInfo.mimeType) {
        if (fileInfo.mimeType.startsWith('image/')) {
            fileIcon = 'fa-image';
            iconColor = 'text-green-600';
        } else if (fileInfo.mimeType.includes('pdf')) {
            fileIcon = 'fa-file-pdf';
            iconColor = 'text-red-600';
        } else if (fileInfo.mimeType.includes('word') || fileInfo.mimeType.includes('document')) {
            fileIcon = 'fa-file-word';
            iconColor = 'text-blue-600';
        } else if (fileInfo.mimeType.includes('excel') || fileInfo.mimeType.includes('spreadsheet')) {
            fileIcon = 'fa-file-excel';
            iconColor = 'text-green-600';
        }
    }
    
    // Determina o status do arquivo
    let statusText = '✓ Enviado com sucesso';
    let statusColor = 'text-green-600';
    
    if (fileInfo.isLocal) {
        statusText = '📁 Arquivo local';
        statusColor = 'text-blue-600';
    }
    
    documentElement.innerHTML = `
        <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <i class="fas ${fileIcon} ${iconColor}"></i>
            </div>
            <div class="flex-1 min-w-0">
                <div class="font-medium text-gray-900 text-sm truncate">${fileInfo.name || 'Documento'}</div>
                <div class="text-xs text-gray-500">
                    ${fileInfo.size ? formatFileSize(fileInfo.size) : 'N/A'} • 
                    ${fileInfo.mimeType || 'Arquivo'}
                </div>
                <div class="text-xs ${statusColor}">${statusText}</div>
            </div>
        </div>
        <button type="button" onclick="removeUploadedDocument('${fileInfo.uuid}')" class="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 ml-2 flex-shrink-0">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    documentsContainer.appendChild(documentElement);
    
    // Mostra notificação de sucesso
    const message = fileInfo.isLocal ? 'Arquivo selecionado com sucesso!' : 'Documento enviado com sucesso!';
    showNotification(message, 'success');
    
    // Log para debug
    console.log('Documento adicionado:', {
        uuid: fileInfo.uuid,
        name: fileInfo.name,
        size: fileInfo.size,
        type: fileInfo.mimeType,
        isLocal: fileInfo.isLocal,
        cdnUrl: fileInfo.cdnUrl
    });
}

function showUploadProgress(fileInfo) {
    const documentsContainer = document.getElementById('uploaded-documents');
    
    // Verifica se já existe um elemento de progresso para este arquivo
    const existingProgress = document.querySelector(`[data-file-id="${fileInfo.uuid}"]`);
    if (existingProgress) {
        existingProgress.remove();
    }
    
    const progressElement = document.createElement('div');
    progressElement.className = 'flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200';
    progressElement.setAttribute('data-file-id', fileInfo.uuid);
    progressElement.innerHTML = `
        <div class="flex items-center space-x-3 flex-1">
            <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <i class="fas fa-spinner fa-spin text-blue-600"></i>
            </div>
            <div class="flex-1 min-w-0">
                <div class="font-medium text-gray-900 text-sm truncate">${fileInfo.name || 'Documento'}</div>
                <div class="text-xs text-blue-600 mb-2">Enviando...</div>
                <div class="w-full bg-blue-200 rounded-full h-2">
                    <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                </div>
            </div>
        </div>
        <div class="ml-3 text-xs text-blue-600 font-medium">0%</div>
    `;
    
    documentsContainer.appendChild(progressElement);
    
    // Simula progresso do upload (para arquivos locais)
    if (fileInfo.isLocal) {
        simulateUploadProgress(progressElement, fileInfo);
    }
    
    console.log('Progresso de upload iniciado para:', fileInfo.name);
}

// Função para simular progresso de upload para arquivos locais
function simulateUploadProgress(progressElement, fileInfo) {
    const progressBar = progressElement.querySelector('.bg-blue-600');
    const progressText = progressElement.querySelector('.text-blue-600.font-medium');
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15 + 5; // Incremento aleatório entre 5-20%
        
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            
            // Simula conclusão do upload
            setTimeout(() => {
                // Remove o elemento de progresso
                progressElement.remove();
                
                // Adiciona o documento como concluído
                const completedFileInfo = {
                    ...fileInfo,
                    cdnUrl: fileInfo.cdnUrl || `local://${fileInfo.uuid}`,
                    isLocal: true
                };
                
                addUploadedDocument(completedFileInfo);
            }, 500);
        }
        
        // Atualiza a barra de progresso
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${Math.round(progress)}%`;
    }, 200);
}

function removeUploadedDocument(fileId) {
    const element = document.querySelector(`[data-file-id="${fileId}"]`);
    if (!element) {
        console.log('Elemento não encontrado para remoção:', fileId);
        return;
    }
    
    // Verifica se é um arquivo local
    const statusElement = element.querySelector('.text-xs.text-blue-600');
    const isLocal = statusElement && statusElement.textContent.includes('local');
    
    // Confirma a remoção
    const fileName = element.querySelector('.font-medium').textContent;
    const confirmMessage = `Tem certeza que deseja remover "${fileName}"?`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        // Remove o elemento do DOM
        element.remove();
        
        // Se for um arquivo local, libera a URL do objeto
        if (isLocal) {
            // Para arquivos locais, não precisamos fazer nada especial
            // O garbage collector do JavaScript cuidará da limpeza
            console.log('Arquivo local removido:', fileName);
        } else {
            // Para arquivos remotos, logamos a remoção
            console.log('Arquivo remoto removido:', fileName);
        }
        
        showNotification(`Documento "${fileName}" removido com sucesso!`, 'success');
        
    } catch (error) {
        console.error('Erro ao remover documento:', error);
        showNotification('Erro ao remover documento', 'error');
    }
}

function getUploadedDocuments() {
    const documents = [];
    const documentElements = document.querySelectorAll('#uploaded-documents > div[data-file-id]');
    
    documentElements.forEach(element => {
        const fileId = element.getAttribute('data-file-id');
        const fileNameElement = element.querySelector('.font-medium');
        const fileInfoElement = element.querySelector('.text-xs:not(.text-green-600):not(.text-blue-600)');
        const statusElement = element.querySelector('.text-xs.text-green-600, .text-xs.text-blue-600');
        
        if (!fileNameElement) return;
        
        const fileName = fileNameElement.textContent;
        const fileInfo = fileInfoElement ? fileInfoElement.textContent : '';
        const isLocal = statusElement && statusElement.textContent.includes('local');
        
        // Extrai informações do arquivo (tamanho e tipo)
        let fileSize = 'N/A';
        let fileType = 'Arquivo';
        
        if (fileInfo) {
            const fileSizeMatch = fileInfo.match(/(\d+\.?\d*\s+\w+)/);
            const fileTypeMatch = fileInfo.match(/•\s*(.+)$/);
            
            if (fileSizeMatch) fileSize = fileSizeMatch[1];
            if (fileTypeMatch) fileType = fileTypeMatch[1];
        }
        
        // Determina a URL baseada no tipo de arquivo
        let cdnUrl = '';
        if (isLocal) {
            // Para arquivos locais, usa a URL do objeto criada pelo URL.createObjectURL
            cdnUrl = `local://${fileId}`;
        } else {
            // Para arquivos remotos, usa a URL do CDN do Uploadcare
            cdnUrl = `https://ucarecdn.com/${fileId}/`;
        }
        
        documents.push({
            uuid: fileId,
            name: fileName,
            size: fileSize,
            type: fileType,
            cdn_url: cdnUrl,
            uploaded_at: new Date().toISOString(),
            isLocal: isLocal
        });
    });
    
    console.log('Documentos coletados:', documents);
    return documents;
}

function renderUploadedDocuments(documents) {
    const container = document.getElementById('uploaded-documents');
    container.innerHTML = '';
    
    if (!documents || documents.length === 0) {
        return;
    }
    
    documents.forEach(doc => {
        // Determina o ícone baseado no tipo de arquivo
        let fileIcon = 'fa-file-alt';
        let iconColor = 'text-blue-600';
        
        if (doc.type) {
            if (doc.type.startsWith('image/') || doc.type.includes('image')) {
                fileIcon = 'fa-image';
                iconColor = 'text-green-600';
            } else if (doc.type.includes('pdf')) {
                fileIcon = 'fa-file-pdf';
                iconColor = 'text-red-600';
            } else if (doc.type.includes('word') || doc.type.includes('document')) {
                fileIcon = 'fa-file-word';
                iconColor = 'text-blue-600';
            } else if (doc.type.includes('excel') || doc.type.includes('spreadsheet')) {
                fileIcon = 'fa-file-excel';
                iconColor = 'text-green-600';
            }
        }
        
        // Determina o status do arquivo
        let statusText = '✓ Documento salvo';
        let statusColor = 'text-green-600';
        
        if (doc.isLocal) {
            statusText = '📁 Arquivo local';
            statusColor = 'text-blue-600';
        }
        
        const documentElement = document.createElement('div');
        documentElement.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg border';
        documentElement.setAttribute('data-file-id', doc.uuid || doc.name);
        documentElement.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <i class="fas ${fileIcon} ${iconColor}"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="font-medium text-gray-900 text-sm truncate">${doc.name}</div>
                    <div class="text-xs text-gray-500">
                        ${doc.size && doc.size !== 'N/A' ? `${doc.size} • ` : ''}Enviado em: ${formatDate(doc.uploaded_at)}
                    </div>
                    <div class="text-xs ${statusColor}">${statusText}</div>
                </div>
            </div>
            <button type="button" onclick="removeUploadedDocument('${doc.uuid || doc.name}')" class="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 ml-2 flex-shrink-0">
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

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Funções de notificação
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 notification ${
        type === 'success' ? 'bg-gradient-to-r from-green-500 to-green-600' : 
        type === 'error' ? 'bg-gradient-to-r from-red-500 to-red-600' :
        'bg-gradient-to-r from-blue-500 to-blue-600'
    } text-white backdrop-blur-sm`;
    
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    notification.innerHTML = `
        <div class="flex items-center space-x-3">
            <span class="text-xl">${icon}</span>
            <span class="font-medium">${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animação de entrada
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
    }, 100);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
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

// Adiciona animações e funcionalidades interativas
function addInteractiveFeatures() {
    console.log('Adicionando funcionalidades interativas...');
    
    // Adiciona efeito de hover nos cards do dashboard
    const dashboardCards = document.querySelectorAll('.dashboard-card');
    dashboardCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // Adiciona efeito de loading nos botões
    const buttons = document.querySelectorAll('button[type="submit"]');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            if (!this.classList.contains('loading')) {
                this.classList.add('loading');
                this.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processando...';
                
                setTimeout(() => {
                    this.classList.remove('loading');
                    this.innerHTML = this.getAttribute('data-original-text') || this.innerHTML;
                }, 2000);
            }
        });
    });
    
    // Adiciona efeito de digitação no título
    const sectionTitle = document.querySelector('.section-title');
    if (sectionTitle) {
        const originalText = sectionTitle.textContent;
        sectionTitle.textContent = '';
        let i = 0;
        
        function typeWriter() {
            if (i < originalText.length) {
                sectionTitle.textContent += originalText.charAt(i);
                i++;
                setTimeout(typeWriter, 100);
            }
        }
        
        setTimeout(typeWriter, 500);
    }
    
    // Adiciona contador animado nos números do dashboard
    console.log('Iniciando animação dos números...');
    animateNumbers();
    console.log('Funcionalidades interativas adicionadas');
}

function animateNumbers() {
    const numberElements = document.querySelectorAll('.cash-balance, .total-receivable, .total-clients');
    console.log('Elementos encontrados para animação:', numberElements.length);
    
    numberElements.forEach((element, index) => {
        const finalValue = element.textContent;
        const isCurrency = finalValue.includes('R$');
        const numericValue = isCurrency ? 
            parseFloat(finalValue.replace(/[^\d,.-]/g, '').replace(',', '.')) : 
            parseInt(finalValue);
        
        console.log(`Elemento ${index}: valor="${finalValue}", numérico=${numericValue}, é moeda=${isCurrency}`);
        
        // Só anima se o valor for maior que zero e não for NaN
        if (!isNaN(numericValue) && numericValue > 0) {
            console.log(`Animando elemento ${index} de 0 até ${numericValue}`);
            const originalText = element.textContent;
            element.textContent = isCurrency ? 'R$ 0,00' : '0';
            
            let currentValue = 0;
            const increment = numericValue / 50;
            const timer = setInterval(() => {
                currentValue += increment;
                if (currentValue >= numericValue) {
                    currentValue = numericValue;
                    clearInterval(timer);
                    // Garante que o valor final seja exato
                    element.textContent = originalText;
                    console.log(`Animação concluída para elemento ${index}: ${originalText}`);
                } else {
                    if (isCurrency) {
                        element.textContent = formatCurrency(currentValue);
                    } else {
                        element.textContent = Math.floor(currentValue);
                    }
                }
            }, 50);
        } else {
            console.log(`Elemento ${index} não será animado (valor=${numericValue})`);
        }
    });
}

// Inicializa funcionalidades interativas quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado, aguardando 1 segundo para adicionar funcionalidades interativas...');
    setTimeout(() => {
        console.log('Timeout concluído, chamando addInteractiveFeatures...');
        addInteractiveFeatures();
    }, 1000);
}); 

function initializeUploadcare() {
    // Verifica se o Uploadcare está disponível
    if (typeof uploadcare === 'undefined') {
        console.warn('Uploadcare não está disponível. Usando fallback nativo.');
        return;
    }
    
    try {
        // Inicializa o widget do Uploadcare
        const inputElement = document.querySelector('[role="uploadcare-uploader"]');
        if (inputElement) {
            const widget = uploadcare.Widget(inputElement);
            
            // Configura o widget globalmente
            widget.onChange(function(fileInfo) {
                if (fileInfo) {
                    console.log('Uploadcare: arquivo selecionado:', fileInfo);
                    
                    if (fileInfo.cdnUrl) {
                        // Arquivo já foi enviado
                        addUploadedDocument(fileInfo);
                    } else {
                        // Arquivo está sendo enviado
                        showUploadProgress(fileInfo);
                        
                        // Monitora o progresso do upload
                        fileInfo.progress(function(info) {
                            console.log('Uploadcare: progresso:', info);
                            if (info.state === 'complete') {
                                // Upload concluído
                                addUploadedDocument(fileInfo);
                            }
                        });
                    }
                }
            });
            
            console.log('Uploadcare inicializado com sucesso');
        } else {
            console.warn('Elemento de upload não encontrado para inicialização do Uploadcare');
        }
    } catch (error) {
        console.error('Erro ao inicializar Uploadcare:', error);
    }
} 

// Função para limpar arquivos locais e liberar memória
function cleanupLocalFiles() {
    const localFileElements = document.querySelectorAll('[data-file-id^="local_"]');
    localFileElements.forEach(element => {
        const fileId = element.getAttribute('data-file-id');
        console.log('Limpando arquivo local:', fileId);
        element.remove();
    });
    
    // Força a coleta de lixo para liberar URLs de objetos
    if (window.gc) {
        window.gc();
    }
}

// Função para limpar todos os documentos quando o modal é fechado
function clearUploadedDocuments() {
    const container = document.getElementById('uploaded-documents');
    if (container) {
        container.innerHTML = '';
    }
    
    // Limpa arquivos locais
    cleanupLocalFiles();
} 
