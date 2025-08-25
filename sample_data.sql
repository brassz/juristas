-- Dados de exemplo para o Sistema de Gestão Juristas
-- Execute este script após criar as tabelas para testar o sistema

-- 1. Inserir clientes de exemplo
INSERT INTO clients (name, cpf, email, phone, address, documents) VALUES
('João Silva Santos', '123.456.789-01', 'joao.silva@email.com', '(11) 99999-1111', 'Rua das Flores, 123 - Centro - São Paulo/SP', '[{"name": "RG.pdf", "uploaded_at": "2025-01-27T10:00:00Z"}]'),
('Maria Oliveira Costa', '987.654.321-00', 'maria.oliveira@email.com', '(11) 88888-2222', 'Av. Paulista, 456 - Bela Vista - São Paulo/SP', '[{"name": "CNH.pdf", "uploaded_at": "2025-01-27T10:30:00Z"}, {"name": "RG.pdf", "uploaded_at": "2025-01-27T10:31:00Z"}]'),
('Pedro Almeida Lima', '456.789.123-45', 'pedro.almeida@email.com', '(11) 77777-3333', 'Rua Augusta, 789 - Consolação - São Paulo/SP', '[{"name": "Carteira_Trabalho.pdf", "uploaded_at": "2025-01-27T11:00:00Z"}]'),
('Ana Paula Ferreira', '789.123.456-78', 'ana.ferreira@email.com', '(11) 66666-4444', 'Rua Oscar Freire, 321 - Jardins - São Paulo/SP', '[{"name": "RG.pdf", "uploaded_at": "2025-01-27T11:30:00Z"}, {"name": "CNH.pdf", "uploaded_at": "2025-01-27T11:31:00Z"}]'),
('Carlos Eduardo Rocha', '321.654.987-65', 'carlos.rocha@email.com', '(11) 55555-5555', 'Av. Brigadeiro Faria Lima, 654 - Itaim Bibi - São Paulo/SP', '[{"name": "RG.pdf", "uploaded_at": "2025-01-27T12:00:00Z"}]');

-- 2. Inserir movimentações de caixa de exemplo
INSERT INTO cash_movements (type, amount, description, movement_date, responsible) VALUES
('income', 10000.00, 'Saldo inicial do sistema', '2025-01-27', 'Sistema'),
('income', 5000.00, 'Depósito adicional', '2025-01-27', 'Administrador'),
('income', 3000.00, 'Capital para empréstimos', '2025-01-27', 'Administrador');

-- 3. Inserir empréstimos de exemplo
INSERT INTO loans (client_id, amount, interest_rate, final_amount, loan_date, notes, status) VALUES
(1, 2000.00, 5.00, 2100.00, '2025-01-27', 'Empréstimo pessoal para emergência médica', 'active'),
(2, 3500.00, 7.50, 3762.50, '2025-01-27', 'Empréstimo para reforma da casa', 'active'),
(3, 1500.00, 6.00, 1590.00, '2025-01-27', 'Empréstimo para compra de equipamentos', 'active'),
(4, 4000.00, 8.00, 4320.00, '2025-01-27', 'Empréstimo para investimento no negócio', 'active'),
(5, 2500.00, 5.50, 2637.50, '2025-01-27', 'Empréstimo para pagamento de dívidas', 'active');

-- 4. Atualizar o saldo do caixa após os empréstimos
INSERT INTO cash_movements (type, amount, description, movement_date, responsible) VALUES
('expense', 2000.00, 'Empréstimo para João Silva Santos (ID: 1)', '2025-01-27', 'Sistema'),
('expense', 3500.00, 'Empréstimo para Maria Oliveira Costa (ID: 2)', '2025-01-27', 'Sistema'),
('expense', 1500.00, 'Empréstimo para Pedro Almeida Lima (ID: 3)', '2025-01-27', 'Sistema'),
('expense', 4000.00, 'Empréstimo para Ana Paula Ferreira (ID: 4)', '2025-01-27', 'Sistema'),
('expense', 2500.00, 'Empréstimo para Carlos Eduardo Rocha (ID: 5)', '2025-01-27', 'Sistema');

-- 5. Verificar os dados inseridos
SELECT 'Clientes inseridos:' as info, COUNT(*) as total FROM clients;

SELECT 'Empréstimos criados:' as info, COUNT(*) as total FROM loans;

SELECT 'Movimentações de caixa:' as info, COUNT(*) as total FROM cash_movements;

-- 6. Verificar o saldo atual do caixa
SELECT 
    'Saldo atual do caixa:' as info,
    COALESCE(SUM(
        CASE 
            WHEN type = 'income' THEN amount 
            ELSE -amount 
        END
    ), 0) as saldo
FROM cash_movements;

-- 7. Verificar o total a receber
SELECT 
    'Total a receber:' as info,
    COALESCE(SUM(final_amount), 0) as total_receber
FROM loans 
WHERE status = 'active';

-- 8. Verificar estatísticas dos empréstimos
SELECT 
    'Estatísticas dos empréstimos:' as info,
    COUNT(*) as total_emprestimos,
    COALESCE(AVG(interest_rate), 0) as taxa_media,
    COALESCE(SUM(final_amount - amount), 0) as total_juros
FROM loans;

-- 9. Listar todos os clientes com seus empréstimos
SELECT 
    c.name as cliente,
    c.cpf,
    c.phone,
    COALESCE(l.amount, 0) as valor_emprestado,
    COALESCE(l.interest_rate, 0) as taxa_juros,
    COALESCE(l.final_amount, 0) as valor_final,
    l.status as status_emprestimo
FROM clients c
LEFT JOIN loans l ON c.id = l.client_id
ORDER BY c.name;

-- 10. Histórico de movimentações do caixa
SELECT 
    movement_date as data,
    type as tipo,
    amount as valor,
    description as descricao,
    responsible as responsavel
FROM cash_movements
ORDER BY movement_date DESC, created_at DESC; 