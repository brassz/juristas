import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateLoan } from '../middleware/validation.js';

const router = express.Router();

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Listar todos os empréstimos
router.get('/', async (req, res) => {
  try {
    const { data: loans, error } = await supabase
      .from('loans')
      .select(`
        *,
        clients (
          id,
          name,
          email,
          phone
        )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: loans,
      count: loans.length
    });
  } catch (error) {
    console.error('Error fetching loans:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch loans'
    });
  }
});

// Buscar empréstimo por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: loan, error } = await supabase
      .from('loans')
      .select(`
        *,
        clients (
          id,
          name,
          email,
          phone,
          document
        )
      `)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Loan not found',
          message: 'Empréstimo não encontrado'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data: loan
    });
  } catch (error) {
    console.error('Error fetching loan:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch loan'
    });
  }
});

// Criar novo empréstimo
router.post('/', validateLoan, async (req, res) => {
  try {
    const loanData = {
      ...req.body,
      user_id: req.user.id,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Verifica se o cliente existe e pertence ao usuário
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

    const { data: loan, error } = await supabase
      .from('loans')
      .insert([loanData])
      .select(`
        *,
        clients (
          id,
          name,
          email,
          phone
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    // Cria transação de entrada para o empréstimo
    const transactionData = {
      user_id: req.user.id,
      type: 'income',
      amount: loan.amount,
      description: `Empréstimo para ${loan.clients.name}`,
      category: 'Empréstimos',
      date: loan.start_date,
      loan_id: loan.id,
      client_id: loan.client_id,
      created_at: new Date().toISOString()
    };

    await supabase
      .from('transactions')
      .insert([transactionData]);

    res.status(201).json({
      success: true,
      message: 'Empréstimo criado com sucesso',
      data: loan
    });
  } catch (error) {
    console.error('Error creating loan:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create loan'
    });
  }
});

// Atualizar empréstimo
router.put('/:id', validateLoan, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString()
    };

    // Verifica se o empréstimo existe e pertence ao usuário
    const { data: existingLoan, error: checkError } = await supabase
      .from('loans')
      .select('id, amount, client_id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (checkError || !existingLoan) {
      return res.status(404).json({
        error: 'Loan not found',
        message: 'Empréstimo não encontrado'
      });
    }

    const { data: loan, error } = await supabase
      .from('loans')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select(`
        *,
        clients (
          id,
          name,
          email,
          phone
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    // Atualiza a transação relacionada se o valor mudou
    if (existingLoan.amount !== loan.amount) {
      await supabase
        .from('transactions')
        .update({
          amount: loan.amount,
          updated_at: new Date().toISOString()
        })
        .eq('loan_id', id)
        .eq('user_id', req.user.id);
    }

    res.json({
      success: true,
      message: 'Empréstimo atualizado com sucesso',
      data: loan
    });
  } catch (error) {
    console.error('Error updating loan:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update loan'
    });
  }
});

// Deletar empréstimo
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verifica se o empréstimo existe e pertence ao usuário
    const { data: existingLoan, error: checkError } = await supabase
      .from('loans')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (checkError || !existingLoan) {
      return res.status(404).json({
        error: 'Loan not found',
        message: 'Empréstimo não encontrado'
      });
    }

    if (existingLoan.status === 'active') {
      return res.status(400).json({
        error: 'Cannot delete loan',
        message: 'Não é possível deletar um empréstimo ativo'
      });
    }

    // Deleta a transação relacionada
    await supabase
      .from('transactions')
      .delete()
      .eq('loan_id', id)
      .eq('user_id', req.user.id);

    const { error } = await supabase
      .from('loans')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Empréstimo deletado com sucesso'
    });
  } catch (error) {
    console.error('Error deleting loan:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete loan'
    });
  }
});

// Marcar empréstimo como pago
router.patch('/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_amount, payment_date } = req.body;

    // Verifica se o empréstimo existe e pertence ao usuário
    const { data: existingLoan, error: checkError } = await supabase
      .from('loans')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (checkError || !existingLoan) {
      return res.status(404).json({
        error: 'Loan not found',
        message: 'Empréstimo não encontrado'
      });
    }

    if (existingLoan.status !== 'active') {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'Apenas empréstimos ativos podem ser marcados como pagos'
      });
    }

    // Calcula o valor total com juros
    const startDate = new Date(existingLoan.start_date);
    const endDate = new Date(payment_date || new Date());
    const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                      (endDate.getMonth() - startDate.getMonth());
    const totalAmount = existingLoan.amount * (1 + (existingLoan.interest_rate / 100) * monthsDiff);

    const updateData = {
      status: 'paid',
      payment_amount: payment_amount || totalAmount,
      payment_date: payment_date || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: loan, error } = await supabase
      .from('loans')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select(`
        *,
        clients (
          id,
          name,
          email,
          phone
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    // Cria transação de saída para o pagamento
    const transactionData = {
      user_id: req.user.id,
      type: 'expense',
      amount: payment_amount || totalAmount,
      description: `Pagamento do empréstimo - ${loan.clients.name}`,
      category: 'Pagamentos',
      date: payment_date || new Date().toISOString(),
      loan_id: loan.id,
      client_id: loan.client_id,
      created_at: new Date().toISOString()
    };

    await supabase
      .from('transactions')
      .insert([transactionData]);

    res.json({
      success: true,
      message: 'Empréstimo marcado como pago com sucesso',
      data: loan
    });
  } catch (error) {
    console.error('Error paying loan:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to mark loan as paid'
    });
  }
});

// Listar empréstimos por status
router.get('/status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    const validStatuses = ['active', 'paid', 'overdue', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'Status inválido'
      });
    }

    const { data: loans, error } = await supabase
      .from('loans')
      .select(`
        *,
        clients (
          id,
          name,
          email,
          phone
        )
      `)
      .eq('user_id', req.user.id)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: loans,
      count: loans.length
    });
  } catch (error) {
    console.error('Error fetching loans by status:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch loans by status'
    });
  }
});

export default router; 