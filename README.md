# 🚀 Finance - Sistema de Gestão Financeira

Sistema completo de gestão financeira com backend Node.js + Supabase e frontend moderno.

## ✨ **Funcionalidades**

### **Dashboard**
- 📊 **Visão Geral Financeira**: Total em caixa, faturamento, valores a receber
- 📈 **Estatísticas em Tempo Real**: Gráficos e métricas atualizadas
- 🔄 **Últimas Transações**: Histórico das operações recentes
- 💰 **Empréstimos Ativos**: Acompanhamento de empréstimos vigentes

### **Gestão de Clientes**
- 👥 **CRUD Completo**: Criar, editar, visualizar e deletar clientes
- 🔍 **Busca Avançada**: Pesquisar por nome, email ou documento
- 📱 **Dados Completos**: Nome, email, telefone, CPF/CNPJ, endereço
- 🚫 **Validações**: Verificações de integridade e duplicatas

### **Gestão de Empréstimos**
- 💸 **Criação de Empréstimos**: Associar a clientes específicos
- 📅 **Controle de Datas**: Data de início, vencimento e pagamento
- 🎯 **Cálculo de Juros**: Taxas personalizáveis e cálculos automáticos
- 📊 **Status de Acompanhamento**: Ativo, pago, vencido, cancelado

### **Transações Financeiras**
- 💰 **Entradas e Saídas**: Controle completo do fluxo de caixa
- 🏷️ **Categorização**: Organização por tipos e categorias
- 🔗 **Relacionamentos**: Vinculação com clientes e empréstimos
- 📊 **Relatórios**: Exportação CSV e resumos detalhados

## 🛠️ **Tecnologias**

### **Backend**
- **Node.js** + **Express.js** - API REST robusta
- **Supabase** - Banco de dados PostgreSQL + Autenticação
- **Joi** - Validação de dados
- **JWT** - Autenticação segura
- **CORS** + **Helmet** - Segurança e middleware

### **Frontend**
- **HTML5** + **CSS3** - Interface responsiva
- **Tailwind CSS** - Framework de estilos moderno
- **JavaScript ES6+** - Lógica de aplicação
- **Font Awesome** - Ícones profissionais

## 📋 **Pré-requisitos**

- **Node.js** 18+ instalado
- **Conta no Supabase** (gratuita)
- **Git** para clonar o repositório

## 🚀 **Instalação**

### **1. Clone o repositório**
```bash
git clone <url-do-repositorio>
cd synapse-finance
```

### **2. Instale as dependências**
```bash
npm install
```

### **3. Configure o Supabase**

#### **3.1 Crie um projeto no Supabase**
- Acesse [supabase.com](https://supabase.com)
- Crie uma nova conta ou faça login
- Crie um novo projeto

#### **3.2 Execute o script SQL**
- No painel do Supabase, vá para **SQL Editor**
- Execute o conteúdo do arquivo `database/schema.sql`
- Isso criará todas as tabelas e configurações necessárias

#### **3.3 Configure as variáveis de ambiente**
Crie um arquivo `.env` na raiz do projeto:
```env
# Supabase Configuration
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anonima

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Secret
JWT_SECRET=sua-chave-secreta-aqui
```

### **4. Inicie o servidor**
```bash
# Desenvolvimento (com auto-reload)
npm run dev

# Produção
npm start
```

### **5. Acesse a aplicação**
- **Backend API**: `http://localhost:3000`
- **Frontend**: Abra `synapse fluxso.html` no navegador
- **Health Check**: `http://localhost:3000/health`

## 📚 **Estrutura do Projeto**

```
synapse-finance/
├── src/
│   ├── config/
│   │   └── supabase.js          # Configuração do Supabase
│   ├── middleware/
│   │   ├── auth.js              # Autenticação JWT
│   │   └── validation.js        # Validação de dados
│   ├── routes/
│   │   ├── auth.js              # Rotas de autenticação
│   │   ├── clients.js           # Rotas de clientes
│   │   ├── loans.js             # Rotas de empréstimos
│   │   └── transactions.js      # Rotas de transações
│   └── server.js                # Servidor principal
├── database/
│   └── schema.sql               # Script de criação das tabelas
├── synapse fluxso.html          # Frontend da aplicação
├── package.json                 # Dependências e scripts
└── README.md                    # Este arquivo
```

## 🔐 **Autenticação**

### **Registro de Usuário**
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "usuario@exemplo.com",
  "password": "senha123",
  "name": "Nome do Usuário",
  "phone": "(11) 99999-9999"
}
```

### **Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "usuario@exemplo.com",
  "password": "senha123"
}
```

### **Uso do Token**
```http
GET /api/clients
Authorization: Bearer <seu-token-jwt>
```

## 📊 **Endpoints da API**

### **Autenticação**
- `POST /api/auth/register` - Registro de usuário
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Dados do usuário atual
- `POST /api/auth/refresh` - Renovar token

### **Clientes**
- `GET /api/clients` - Listar clientes
- `GET /api/clients/:id` - Buscar cliente por ID
- `POST /api/clients` - Criar cliente
- `PUT /api/clients/:id` - Atualizar cliente
- `DELETE /api/clients/:id` - Deletar cliente
- `GET /api/clients/search/:query` - Buscar clientes

### **Empréstimos**
- `GET /api/loans` - Listar empréstimos
- `GET /api/loans/:id` - Buscar empréstimo por ID
- `POST /api/loans` - Criar empréstimo
- `PUT /api/loans/:id` - Atualizar empréstimo
- `DELETE /api/loans/:id` - Deletar empréstimo
- `PATCH /api/loans/:id/pay` - Marcar como pago
- `GET /api/loans/status/:status` - Filtrar por status

### **Transações**
- `GET /api/transactions` - Listar transações
- `GET /api/transactions/:id` - Buscar transação por ID
- `POST /api/transactions` - Criar transação
- `PUT /api/transactions/:id` - Atualizar transação
- `DELETE /api/transactions/:id` - Deletar transação
- `GET /api/transactions/summary/overview` - Resumo financeiro
- `GET /api/transactions/export/csv` - Exportar para CSV

## 🔒 **Segurança**

- **Row Level Security (RLS)** no Supabase
- **Autenticação JWT** para todas as rotas
- **Validação de dados** com Joi
- **Rate limiting** para prevenir abuso
- **CORS** configurado adequadamente
- **Helmet** para headers de segurança

## 📱 **Uso do Frontend**

1. **Abra o arquivo HTML** no navegador
2. **Faça login** com suas credenciais
3. **Navegue pelas abas**:
   - **Dashboard**: Visão geral financeira
   - **Clientes**: Gestão de clientes
   - **Empréstimos**: Gestão de empréstimos
   - **Transações**: Histórico financeiro
   - **Relatórios**: Estatísticas e exportações

## 🚀 **Deploy**

### **Backend (Vercel, Heroku, Railway)**
```bash
# Build para produção
npm run build

# Variáveis de ambiente necessárias:
# SUPABASE_URL, SUPABASE_ANON_KEY, JWT_SECRET
```

### **Frontend (Netlify, Vercel, GitHub Pages)**
- Faça upload do arquivo HTML
- Configure as variáveis do Supabase
- Aponte para a URL do backend

## 🐛 **Troubleshooting**

### **Erro de conexão com Supabase**
- Verifique as credenciais no arquivo `.env`
- Confirme se o projeto está ativo no Supabase
- Teste a conexão no painel do Supabase

### **Erro de CORS**
- Verifique se a origem está configurada corretamente
- Confirme se o frontend está rodando na porta correta

### **Erro de autenticação**
- Verifique se o token JWT está sendo enviado
- Confirme se o usuário está logado
- Teste o endpoint `/api/auth/me`

## 📞 **Suporte**

- **Desenvolvedor**: Bruno Assoni
- **Empresa**: Synapse Software e Tecnologia
- **Email**: [seu-email@exemplo.com]

## 📄 **Licença**

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🤝 **Contribuição**

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

**⭐ Se este projeto foi útil, deixe uma estrela!** 
