-- Script SQL para criar as tabelas do sistema Synapse Finance
-- Execute este script no SQL Editor do Supabase

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de usuários (gerenciada pelo Supabase Auth)
-- Esta tabela é criada automaticamente pelo Supabase

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS clients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    document VARCHAR(18) UNIQUE NOT NULL,
    address TEXT,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de empréstimos
CREATE TABLE IF NOT EXISTS loans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE RESTRICT NOT NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    interest_rate DECIMAL(5,2) NOT NULL CHECK (interest_rate >= 0 AND interest_rate <= 100),
    start_date DATE NOT NULL,
    due_date DATE NOT NULL,
    payment_date DATE,
    payment_amount DECIMAL(15,2),
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paid', 'overdue', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_dates CHECK (due_date > start_date)
);

-- Tabela de transações
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    description VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    loan_id UUID REFERENCES loans(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_document ON clients(document);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);

CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_client_id ON loans(client_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_due_date ON loans(due_date);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_client_id ON transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_loan_id ON transactions(loan_id);

-- Políticas de segurança RLS (Row Level Security)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Política para clientes: usuário só pode ver seus próprios clientes
CREATE POLICY "Users can only access their own clients" ON clients
    FOR ALL USING (auth.uid() = user_id);

-- Política para empréstimos: usuário só pode ver seus próprios empréstimos
CREATE POLICY "Users can only access their own loans" ON loans
    FOR ALL USING (auth.uid() = user_id);

-- Política para transações: usuário só pode ver suas próprias transações
CREATE POLICY "Users can only access their own transactions" ON transactions
    FOR ALL USING (auth.uid() = user_id);

-- Função para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at automaticamente
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON loans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para calcular valor total de empréstimo com juros
CREATE OR REPLACE FUNCTION calculate_loan_total(
    loan_amount DECIMAL,
    interest_rate DECIMAL,
    start_date DATE,
    end_date DATE
)
RETURNS DECIMAL AS $$
DECLARE
    months_diff INTEGER;
    total_amount DECIMAL;
BEGIN
    months_diff := EXTRACT(YEAR FROM end_date) * 12 + EXTRACT(MONTH FROM end_date) - 
                   EXTRACT(YEAR FROM start_date) * 12 - EXTRACT(MONTH FROM start_date);
    
    total_amount := loan_amount * (1 + (interest_rate / 100) * months_diff);
    
    RETURN ROUND(total_amount, 2);
END;
$$ LANGUAGE plpgsql;

-- View para resumo financeiro
CREATE OR REPLACE VIEW financial_summary AS
SELECT 
    t.user_id,
    DATE_TRUNC('month', t.date) as month,
    SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as total_income,
    SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as total_expenses,
    SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END) as net_amount,
    COUNT(*) as transaction_count
FROM transactions t
GROUP BY t.user_id, DATE_TRUNC('month', t.date)
ORDER BY t.user_id, month DESC;

-- View para empréstimos vencidos
CREATE OR REPLACE VIEW overdue_loans AS
SELECT 
    l.*,
    c.name as client_name,
    c.email as client_email,
    c.phone as client_phone,
    calculate_loan_total(l.amount, l.interest_rate, l.start_date, l.due_date) as total_amount
FROM loans l
JOIN clients c ON l.client_id = c.id
WHERE l.status = 'active' 
AND l.due_date < CURRENT_DATE
ORDER BY l.due_date ASC;

-- Comentários das tabelas
COMMENT ON TABLE clients IS 'Tabela de clientes do sistema financeiro';
COMMENT ON TABLE loans IS 'Tabela de empréstimos concedidos';
COMMENT ON TABLE transactions IS 'Tabela de transações financeiras';
COMMENT ON TABLE financial_summary IS 'View para resumo financeiro mensal';
COMMENT ON TABLE overdue_loans IS 'View para empréstimos vencidos';

-- Inserir dados de exemplo (opcional)
-- INSERT INTO clients (user_id, name, email, phone, document) VALUES 
-- ('seu-user-id-aqui', 'Cliente Exemplo', 'cliente@exemplo.com', '(11) 99999-9999', '123.456.789-00'); 