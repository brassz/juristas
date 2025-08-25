# Sistema de Gestão Juristas

Uma plataforma completa para gestão de clientes e empréstimos, desenvolvida com tecnologias modernas e integração com Supabase.

## 🚀 Funcionalidades

### 📊 Dashboard
- Visão geral do valor em caixa
- Total a receber de empréstimos ativos
- Contagem total de clientes
- Últimos empréstimos realizados
- Resumo financeiro com estatísticas

### 👥 Gestão de Clientes
- Cadastro completo com CPF, nome, email, telefone e endereço
- Upload de documentos (CNH, RG, Carteira de Trabalho)
- Edição e exclusão de clientes
- Lista organizada com todas as informações

### 💰 Gestão de Empréstimos
- Criação de empréstimos vinculados a clientes
- Cálculo automático de juros
- Seleção de cliente para atrelar o empréstimo
- Controle de status (ativo/quitado)
- Histórico completo de transações

### 🏦 Controle de Caixa
- Valor disponível para empréstimos
- Movimentações de entrada e saída
- Histórico detalhado de transações
- Controle de saldo em tempo real

## 🛠️ Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3 (Tailwind CSS), JavaScript ES6+
- **Backend**: Supabase (PostgreSQL + APIs)
- **Ícones**: Font Awesome
- **Design**: Interface responsiva e moderna

## 📋 Pré-requisitos

- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Conexão com internet para integração com Supabase
- Conta no Supabase (já configurada)

## ⚙️ Configuração

### 1. Configuração do Supabase
O sistema já está configurado com suas credenciais do Supabase:
- **URL**: https://mhtxyxizfnxupwmilith.supabase.co
- **Chave**: Configurada no arquivo `app.js`

### 2. Estrutura do Banco de Dados
O sistema criará automaticamente as seguintes tabelas:

#### Tabela `clients`
```sql
CREATE TABLE clients (
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
```

#### Tabela `loans`
```sql
CREATE TABLE loans (
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
```

#### Tabela `cash_movements`
```sql
CREATE TABLE cash_movements (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    movement_date DATE NOT NULL,
    responsible VARCHAR(100) DEFAULT 'Sistema',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🚀 Como Usar

### 1. Primeiro Acesso
1. Abra o arquivo `index.html` em seu navegador
2. O sistema tentará conectar ao Supabase
3. As tabelas serão criadas automaticamente na primeira execução
4. Um saldo inicial de R$ 10.000,00 será adicionado ao caixa

### 2. Cadastrando Clientes
1. Navegue para a aba "Clientes"
2. Clique em "Novo Cliente"
3. Preencha todos os campos obrigatórios:
   - Nome completo
   - CPF (formato: 000.000.000-00)
   - Email
   - Telefone
   - Endereço completo
4. Anexe documentos se necessário (CNH, RG, Carteira de Trabalho)
5. Clique em "Salvar Cliente"

### 3. Criando Empréstimos
1. Navegue para a aba "Empréstimos"
2. Clique em "Novo Empréstimo"
3. Selecione o cliente
4. Informe o valor a ser emprestado
5. Defina a taxa de juros (%)
6. O valor final será calculado automaticamente
7. Adicione observações se necessário
8. Clique em "Criar Empréstimo"

### 4. Gerenciando o Caixa
1. Navegue para a aba "Caixa"
2. Visualize o saldo disponível
3. Para adicionar dinheiro: clique em "Adicionar ao Caixa"
4. Para retirar dinheiro: clique em "Retirar do Caixa"
5. Todas as movimentações ficam registradas no histórico

## 📱 Interface Responsiva

A plataforma é totalmente responsiva e funciona em:
- Desktop (Windows, Mac, Linux)
- Tablet
- Smartphone
- Qualquer dispositivo com navegador web

## 🔒 Segurança

- Validação de dados no frontend e backend
- Controle de acesso via Supabase
- Validação de CPF único
- Controle de saldo para empréstimos
- Histórico completo de todas as operações

## 📊 Relatórios e Estatísticas

O dashboard fornece:
- Saldo atual em caixa
- Total a receber de empréstimos
- Número total de clientes
- Estatísticas de empréstimos
- Histórico de movimentações
- Resumo financeiro mensal

## 🚨 Tratamento de Erros

O sistema inclui:
- Notificações visuais para sucesso e erro
- Validação de formulários
- Verificação de saldo antes de empréstimos
- Fallback para localStorage se Supabase não estiver disponível
- Logs de erro no console para debugging

## 🔧 Personalização

### Cores e Estilo
- Edite as classes Tailwind CSS no arquivo `index.html`
- Modifique as variáveis CSS no `<style>` do HTML
- Personalize os ícones Font Awesome

### Funcionalidades
- Adicione novos campos nas tabelas do Supabase
- Implemente novos tipos de movimentação
- Crie relatórios personalizados
- Adicione validações específicas

## 📞 Suporte

Para suporte técnico ou dúvidas:
- Verifique o console do navegador para logs de erro
- Confirme a conectividade com o Supabase
- Verifique se todas as tabelas foram criadas corretamente

## 🔄 Atualizações

Para atualizar o sistema:
1. Faça backup dos dados existentes
2. Substitua os arquivos HTML e JavaScript
3. Verifique se as novas funcionalidades estão funcionando
4. Teste com dados de exemplo

## 📝 Licença

Este projeto foi desenvolvido para uso interno da empresa Juristas.
Todos os direitos reservados.

---

**Desenvolvido com ❤️ para otimizar a gestão de clientes e empréstimos** 