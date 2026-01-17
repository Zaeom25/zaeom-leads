
export const translateError = (error: any): string => {
    if (!error) return 'Erro desconhecido.';

    // If it's a string, use it directly
    const message = typeof error === 'string' ? error : error.message || JSON.stringify(error);
    const lowerMsg = message.toLowerCase();

    // Password Issues
    if (lowerMsg.includes('password should be different')) {
        return 'A nova senha deve ser diferente da senha anterior.';
    }
    if (lowerMsg.includes('password') && lowerMsg.includes('short')) {
        return 'A senha é muito curta. Use pelo menos 6 caracteres.';
    }
    if (lowerMsg.includes('weak password')) {
        return 'Senha muito fraca. Tente uma combinação mais complexa.';
    }

    // Auth / Login Issues
    if (lowerMsg.includes('invalid login credentials')) {
        return 'Email ou senha incorretos.';
    }
    if (lowerMsg.includes('user not found')) {
        return 'Usuário não encontrado.';
    }
    if (lowerMsg.includes('email not confirmed')) {
        return 'Email não confirmado. Verifique sua caixa de entrada.';
    }
    if (lowerMsg.includes('too many requests') || lowerMsg.includes('rate limit') || lowerMsg.includes('quota exceeded') || lowerMsg.includes('resource_exhausted')) {
        return 'Limite de uso da IA atingido. Aguarde alguns segundos e tente novamente.';
    }

    // Invite / Sign Up Issues
    if (lowerMsg.includes('already registered') || lowerMsg.includes('already exists')) {
        return 'Este usuário já está cadastrado.';
    }

    // Generic Database/RLS
    if (lowerMsg.includes('row-level security')) {
        return 'Você não tem permissão para realizar esta ação.';
    }
    if (lowerMsg.includes('violates foreign key constraint')) {
        return 'Operação inválida. Verifique se os dados estão corretos.';
    }

    // If no match, return the original (or a generic fallback if prefered, but original might help debugging)
    // Returning original for now, but formatted nicely if it was an object.
    return message;
};
