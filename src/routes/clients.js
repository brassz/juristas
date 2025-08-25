import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateClient } from '../middleware/validation.js';

const router = express.Router();

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Listar todos os clientes
router.get('/', async (req, res) => {
  try {
    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: clients,
      count: clients.length
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch clients'
    });
  }
});

// Buscar cliente por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Client not found',
          message: 'Cliente não encontrado'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data: client
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch client'
    });
  }
});

// Criar novo cliente
router.post('/', validateClient, async (req, res) => {
  try {
    const clientData = {
      ...req.body,
      user_id: req.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: client, error } = await supabase
      .from('clients')
      .insert([clientData])
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      success: true,
      message: 'Cliente criado com sucesso',
      data: client
    });
  } catch (error) {
    console.error('Error creating client:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({
        error: 'Duplicate entry',
        message: 'Já existe um cliente com este email ou CPF/CNPJ'
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create client'
    });
  }
});

// Atualizar cliente
router.put('/:id', validateClient, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString()
    };

    // Verifica se o cliente existe e pertence ao usuário
    const { data: existingClient, error: checkError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (checkError || !existingClient) {
      return res.status(404).json({
        error: 'Client not found',
        message: 'Cliente não encontrado'
      });
    }

    const { data: client, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Cliente atualizado com sucesso',
      data: client
    });
  } catch (error) {
    console.error('Error updating client:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({
        error: 'Duplicate entry',
        message: 'Já existe um cliente com este email ou CPF/CNPJ'
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update client'
    });
  }
});

// Deletar cliente
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verifica se o cliente existe e pertence ao usuário
    const { data: existingClient, error: checkError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (checkError || !existingClient) {
      return res.status(404).json({
        error: 'Client not found',
        message: 'Cliente não encontrado'
      });
    }

    // Verifica se há empréstimos ativos para este cliente
    const { data: activeLoans, error: loansError } = await supabase
      .from('loans')
      .select('id')
      .eq('client_id', id)
      .eq('status', 'active');

    if (loansError) {
      throw loansError;
    }

    if (activeLoans && activeLoans.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete client',
        message: 'Não é possível deletar um cliente com empréstimos ativos'
      });
    }

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Cliente deletado com sucesso'
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete client'
    });
  }
});

// Buscar clientes por nome ou documento
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;

    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', req.user.id)
      .or(`name.ilike.%${query}%,document.ilike.%${query}%,email.ilike.%${query}%`)
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: clients,
      count: clients.length
    });
  } catch (error) {
    console.error('Error searching clients:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to search clients'
    });
  }
});

export default router; 