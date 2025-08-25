import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateTransaction } from '../middleware/validation.js';

const router = express.Router();

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Listar todas as transações
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, type, category, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('transactions')
      .select(`
        *,
        clients (
          id,
          name,
          email
        ),
        loans (
          id,
          amount,
          interest_rate
        )
      `)
      .eq('user_id', req.user.id)
      .order('date', { ascending: false });

    // Aplicar filtros
    if (type) {
      query = query.eq('type', type);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (start_date) {
      query = query.gte('date', start_date);
    }
    if (end_date) {
      query = query.lte('date', end_date);
    }

    const { data: transactions, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || transactions.length,
        pages: Math.ceil((count || transactions.length) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch transactions'
    });
  }
});

// Buscar transação por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: transaction, error } = await supabase
      .from('transactions')
      .select(`
        *,
        clients (
          id,
          name,
          email,
          phone
        ),
        loans (
          id,
          amount,
          interest_rate,
          start_date,
          due_date
        )
      `)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Transaction not found',
          message: 'Transação não encontrada'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch transaction'
    });
  }
});

// Criar nova transação
router.post('/', validateTransaction, async (req, res) => {
  try {
    const transactionData = {
      ...req.body,
      user_id: req.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Se houver client_id, verifica se o cliente existe
    if (req.body.client_id) {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('id', req.body.client_id)
        .eq('user_id', req.user.id)
        .single();

      if (clientError || !client) {
        return res.status(404).json({
          error: 'Client not found',
          message: 'Cliente não encontrado'
        });
      }
    }

    // Se houver loan_id, verifica se o empréstimo existe
    if (req.body.loan_id) {
      const { data: loan, error: loanError } = await supabase
        .from('loans')
        .select('id')
        .eq('id', req.body.loan_id)
        .eq('user_id', req.user.id)
        .single();

      if (loanError || !loan) {
        return res.status(404).json({
          error: 'Loan not found',
          message: 'Empréstimo não encontrado'
        });
      }
    }

    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert([transactionData])
      .select(`
        *,
        clients (
          id,
          name,
          email
        ),
        loans (
          id,
          amount,
          interest_rate
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      success: true,
      message: 'Transação criada com sucesso',
      data: transaction
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create transaction'
    });
  }
});

// Atualizar transação
router.put('/:id', validateTransaction, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString()
    };

    // Verifica se a transação existe e pertence ao usuário
    const { data: existingTransaction, error: checkError } = await supabase
      .from('transactions')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (checkError || !existingTransaction) {
      return res.status(404).json({
        error: 'Transaction not found',
        message: 'Transação não encontrada'
      });
    }

    const { data: transaction, error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select(`
        *,
        clients (
          id,
          name,
          email
        ),
        loans (
          id,
          amount,
          interest_rate
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Transação atualizada com sucesso',
      data: transaction
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update transaction'
    });
  }
});

// Deletar transação
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verifica se a transação existe e pertence ao usuário
    const { data: existingTransaction, error: checkError } = await supabase
      .from('transactions')
      .select('id, loan_id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (checkError || !existingTransaction) {
      return res.status(404).json({
        error: 'Transaction not found',
        message: 'Transação não encontrada'
      });
    }

    // Não permite deletar transações relacionadas a empréstimos
    if (existingTransaction.loan_id) {
      return res.status(400).json({
        error: 'Cannot delete transaction',
        message: 'Não é possível deletar transações relacionadas a empréstimos'
      });
    }

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Transação deletada com sucesso'
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete transaction'
    });
  }
});

// Resumo financeiro
router.get('/summary/overview', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let query = supabase
      .from('transactions')
      .select('type, amount, date')
      .eq('user_id', req.user.id);

    if (start_date) {
      query = query.gte('date', start_date);
    }
    if (end_date) {
      query = query.lte('date', end_date);
    }

    const { data: transactions, error } = await query;

    if (error) {
      throw error;
    }

    // Calcula resumo
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const netAmount = totalIncome - totalExpenses;

    // Resumo por categoria
    const categorySummary = {};
    transactions.forEach(transaction => {
      const category = transaction.category || 'Outros';
      if (!categorySummary[category]) {
        categorySummary[category] = { income: 0, expense: 0 };
      }
      if (transaction.type === 'income') {
        categorySummary[category].income += parseFloat(transaction.amount);
      } else {
        categorySummary[category].expense += parseFloat(transaction.amount);
      }
    });

    res.json({
      success: true,
      data: {
        total_income: totalIncome,
        total_expenses: totalExpenses,
        net_amount: netAmount,
        transaction_count: transactions.length,
        category_summary: categorySummary
      }
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch summary'
    });
  }
});

// Exportar transações
router.get('/export/csv', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let query = supabase
      .from('transactions')
      .select(`
        date,
        type,
        amount,
        description,
        category,
        clients (name),
        loans (amount)
      `)
      .eq('user_id', req.user.id)
      .order('date', { ascending: false });

    if (start_date) {
      query = query.gte('date', start_date);
    }
    if (end_date) {
      query = query.lte('date', end_date);
    }

    const { data: transactions, error } = await query;

    if (error) {
      throw error;
    }

    // Formata dados para CSV
    const csvData = transactions.map(t => ({
      Data: t.date,
      Tipo: t.type === 'income' ? 'Entrada' : 'Saída',
      Valor: t.amount,
      Descrição: t.description,
      Categoria: t.category,
      Cliente: t.clients?.name || '',
      Empréstimo: t.loans?.amount || ''
    }));

    // Converte para CSV
    const csvHeaders = Object.keys(csvData[0] || {}).join(',');
    const csvRows = csvData.map(row => Object.values(row).join(','));
    const csv = [csvHeaders, ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting transactions:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to export transactions'
    });
  }
});

export default router; 