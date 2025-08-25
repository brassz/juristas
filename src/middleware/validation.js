import Joi from 'joi';

// Esquemas de validação
const userRegistrationSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email deve ser válido',
    'any.required': 'Email é obrigatório'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Senha deve ter pelo menos 6 caracteres',
    'any.required': 'Senha é obrigatória'
  }),
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Nome deve ter pelo menos 2 caracteres',
    'string.max': 'Nome deve ter no máximo 100 caracteres',
    'any.required': 'Nome é obrigatório'
  }),
  phone: Joi.string().pattern(/^[\d\s\-\+\(\)]+$/).min(10).max(20).required().messages({
    'string.pattern.base': 'Telefone deve conter apenas números, espaços, hífens e parênteses',
    'string.min': 'Telefone deve ter pelo menos 10 caracteres',
    'string.max': 'Telefone deve ter no máximo 20 caracteres',
    'any.required': 'Telefone é obrigatório'
  })
});

const userLoginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email deve ser válido',
    'any.required': 'Email é obrigatório'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Senha é obrigatória'
  })
});

const clientSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Nome deve ter pelo menos 2 caracteres',
    'string.max': 'Nome deve ter no máximo 100 caracteres',
    'any.required': 'Nome é obrigatório'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Email deve ser válido',
    'any.required': 'Email é obrigatório'
  }),
  phone: Joi.string().pattern(/^[\d\s\-\+\(\)]+$/).min(10).max(20).required().messages({
    'string.pattern.base': 'Telefone deve conter apenas números, espaços, hífens e parênteses',
    'string.min': 'Telefone deve ter pelo menos 10 caracteres',
    'string.max': 'Telefone deve ter no máximo 20 caracteres',
    'any.required': 'Telefone é obrigatório'
  }),
  document: Joi.string().min(11).max(18).required().messages({
    'string.min': 'CPF/CNPJ deve ter pelo menos 11 caracteres',
    'string.max': 'CPF/CNPJ deve ter no máximo 18 caracteres',
    'any.required': 'CPF/CNPJ é obrigatório'
  }),
  address: Joi.string().max(200).optional().messages({
    'string.max': 'Endereço deve ter no máximo 200 caracteres'
  }),
  notes: Joi.string().max(500).optional().messages({
    'string.max': 'Observações devem ter no máximo 500 caracteres'
  })
});

const loanSchema = Joi.object({
  client_id: Joi.string().uuid().required().messages({
    'string.guid': 'ID do cliente deve ser um UUID válido',
    'any.required': 'ID do cliente é obrigatório'
  }),
  amount: Joi.number().positive().required().messages({
    'number.base': 'Valor deve ser um número',
    'number.positive': 'Valor deve ser positivo',
    'any.required': 'Valor é obrigatório'
  }),
  interest_rate: Joi.number().min(0).max(100).required().messages({
    'number.base': 'Taxa de juros deve ser um número',
    'number.min': 'Taxa de juros deve ser maior ou igual a 0',
    'number.max': 'Taxa de juros deve ser menor ou igual a 100',
    'any.required': 'Taxa de juros é obrigatória'
  }),
  start_date: Joi.date().iso().required().messages({
    'date.base': 'Data de início deve ser uma data válida',
    'date.format': 'Data de início deve estar no formato ISO',
    'any.required': 'Data de início é obrigatória'
  }),
  due_date: Joi.date().iso().greater(Joi.ref('start_date')).required().messages({
    'date.base': 'Data de vencimento deve ser uma data válida',
    'date.format': 'Data de vencimento deve estar no formato ISO',
    'date.greater': 'Data de vencimento deve ser posterior à data de início',
    'any.required': 'Data de vencimento é obrigatória'
  }),
  description: Joi.string().max(200).optional().messages({
    'string.max': 'Descrição deve ter no máximo 200 caracteres'
  })
});

const transactionSchema = Joi.object({
  type: Joi.string().valid('income', 'expense').required().messages({
    'any.only': 'Tipo deve ser "income" ou "expense"',
    'any.required': 'Tipo é obrigatório'
  }),
  amount: Joi.number().positive().required().messages({
    'number.base': 'Valor deve ser um número',
    'number.positive': 'Valor deve ser positivo',
    'any.required': 'Valor é obrigatório'
  }),
  description: Joi.string().min(3).max(200).required().messages({
    'string.min': 'Descrição deve ter pelo menos 3 caracteres',
    'string.max': 'Descrição deve ter no máximo 200 caracteres',
    'any.required': 'Descrição é obrigatória'
  }),
  category: Joi.string().max(50).required().messages({
    'string.max': 'Categoria deve ter no máximo 50 caracteres',
    'any.required': 'Categoria é obrigatória'
  }),
  date: Joi.date().iso().required().messages({
    'date.base': 'Data deve ser uma data válida',
    'date.format': 'Data deve estar no formato ISO',
    'any.required': 'Data é obrigatória'
  }),
  client_id: Joi.string().uuid().optional().messages({
    'string.guid': 'ID do cliente deve ser um UUID válido'
  }),
  loan_id: Joi.string().uuid().optional().messages({
    'string.guid': 'ID do empréstimo deve ser um UUID válido'
  })
});

// Middlewares de validação
export const validateUserRegistration = (req, res, next) => {
  const { error } = userRegistrationSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      message: error.details[0].message
    });
  }
  
  next();
};

export const validateUserLogin = (req, res, next) => {
  const { error } = userLoginSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      message: error.details[0].message
    });
  }
  
  next();
};

export const validateClient = (req, res, next) => {
  const { error } = clientSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      message: error.details[0].message
    });
  }
  
  next();
};

export const validateLoan = (req, res, next) => {
  const { error } = loanSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      message: error.details[0].message
    });
  }
  
  next();
};

export const validateTransaction = (req, res, next) => {
  const { error } = transactionSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      message: error.details[0].message
    });
  }
  
  next();
}; 