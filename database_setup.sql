-- Script de configuração do banco de dados para o Sistema de Gestão Juristas
-- Execute este script no SQL Editor do Supabase

-- 1. Criar tabela de clientes
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

-- 2. Criar tabela de empréstimos
CREATE TABLE IF NOT EXISTS loans (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    interest_rate DECIMAL(5,2) NOT NULL CHECK (interest_rate >= 0),
    final_amount DECIMAL(10,2) NOT NULL CHECK (final_amount > 0),
    loan_date DATE NOT NULL,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paid', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar tabela de movimentações de caixa
CREATE TABLE IF NOT EXISTS cash_movements (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    movement_date DATE NOT NULL,
    responsible VARCHAR(100) DEFAULT 'Sistema',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_clients_cpf ON clients(cpf);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_loans_client_id ON loans(client_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_date ON loans(loan_date);
CREATE INDEX IF NOT EXISTS idx_cash_movements_type ON cash_movements(type);
CREATE INDEX IF NOT EXISTS idx_cash_movements_date ON cash_movements(movement_date);

-- 5. Criar função para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Criar triggers para atualizar automaticamente o campo updated_at
CREATE TRIGGER update_clients_updated_at 
    BEFORE UPDATE ON clients 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loans_updated_at 
    BEFORE UPDATE ON loans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Criar função para calcular o valor final do empréstimo
CREATE OR REPLACE FUNCTION calculate_final_amount()
RETURNS TRIGGER AS $$
BEGIN
    NEW.final_amount = NEW.amount * (1 + NEW.interest_rate / 100);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Criar trigger para calcular automaticamente o valor final
CREATE TRIGGER calculate_loan_final_amount
    BEFORE INSERT OR UPDATE ON loans
    FOR EACH ROW EXECUTE FUNCTION calculate_final_amount();

-- 9. Criar função para verificar saldo disponível antes de criar empréstimo
CREATE OR REPLACE FUNCTION check_cash_balance()
RETURNS TRIGGER AS $$
DECLARE
    current_balance DECIMAL(10,2);
BEGIN
    -- Calcula o saldo atual
    SELECT COALESCE(SUM(
        CASE 
            WHEN type = 'income' THEN amount 
            ELSE -amount 
        END
    ), 0) INTO current_balance
    FROM cash_movements;
    
    -- Verifica se há saldo suficiente
    IF NEW.amount > current_balance THEN
        RAISE EXCEPTION 'Saldo insuficiente para realizar este empréstimo. Saldo atual: %', current_balance;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Criar trigger para verificar saldo antes de criar empréstimo
CREATE TRIGGER check_cash_balance_before_loan
    BEFORE INSERT ON loans
    FOR EACH ROW EXECUTE FUNCTION check_cash_final_amount();

-- 11. Inserir dados iniciais
INSERT INTO cash_movements (type, amount, description, movement_date, responsible) 
VALUES ('income', 10000.00, 'Saldo inicial do sistema', CURRENT_DATE, 'Sistema')
ON CONFLICT DO NOTHING;

-- 12. Criar view para dashboard
CREATE OR REPLACE VIEW dashboard_summary AS
SELECT 
    -- Saldo em caixa
    COALESCE(SUM(
        CASE 
            WHEN type = 'income' THEN amount 
            ELSE -amount 
        END
    ), 0) as cash_balance,
    
    -- Total a receber (empréstimos ativos)
    COALESCE(SUM(
        CASE 
            WHEN status = 'active' THEN final_amount 
            ELSE 0 
        END
    ), 0) as total_receivable,
    
    -- Total de clientes
    COUNT(DISTINCT c.id) as total_clients,
    
    -- Total de empréstimos
    COUNT(l.id) as total_loans,
    
    -- Total de juros
    COALESCE(SUM(final_amount - amount), 0) as total_interest,
    
    -- Taxa média de juros
    COALESCE(AVG(interest_rate), 0) as average_interest_rate
    
FROM clients c
LEFT JOIN loans l ON c.id = l.client_id
CROSS JOIN (
    SELECT COALESCE(SUM(
        CASE 
            WHEN type = 'income' THEN amount 
            ELSE -amount 
        END
    ), 0) as cash_balance
    FROM cash_movements
) cm;

-- 13. Criar view para relatório de empréstimos
CREATE OR REPLACE VIEW loans_report AS
SELECT 
    l.id,
    c.name as client_name,
    c.cpf as client_cpf,
    l.amount,
    l.interest_rate,
    l.final_amount,
    l.loan_date,
    l.status,
    l.notes,
    l.created_at
FROM loans l
JOIN clients c ON l.client_id = c.id
ORDER BY l.created_at DESC;

-- 14. Configurar Row Level Security (RLS) se necessário
-- ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

-- 15. Criar políticas de acesso (descomente se usar RLS)
-- CREATE POLICY "Allow all operations for authenticated users" ON clients FOR ALL USING (true);
-- CREATE POLICY "Allow all operations for authenticated users" ON loans FOR ALL USING (true);
-- CREATE POLICY "Allow all operations for authenticated users" ON cash_movements FOR ALL USING (true);

-- Comentários das tabelas
COMMENT ON TABLE clients IS 'Tabela para armazenar informações dos clientes';
COMMENT ON TABLE loans IS 'Tabela para armazenar informações dos empréstimos';
COMMENT ON TABLE cash_movements IS 'Tabela para armazenar movimentações de caixa';

-- Comentários das colunas importantes
COMMENT ON COLUMN clients.cpf IS 'CPF único do cliente';
COMMENT ON COLUMN clients.documents IS 'Array JSON com informações dos documentos anexados';
COMMENT ON COLUMN loans.amount IS 'Valor principal do empréstimo';
COMMENT ON COLUMN loans.interest_rate IS 'Taxa de juros em porcentagem';
COMMENT ON COLUMN loans.final_amount IS 'Valor final com juros calculado automaticamente';
COMMENT ON COLUMN cash_movements.type IS 'Tipo de movimentação: income (entrada) ou expense (saída)';

-- Verificar se as tabelas foram criadas corretamente
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('clients', 'loans', 'cash_movements')
ORDER BY table_name, ordinal_position; 