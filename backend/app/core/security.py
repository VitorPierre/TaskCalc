"""
=============================================================================
CORE: Módulo de Segurança e Criptografia (Security)
=============================================================================
Papel na Arquitetura:
- Centraliza operações de hashing e verificação de senhas de usuários.
- Utiliza a biblioteca 'bcrypt' com algoritmo de derivação de chaves adaptativo
  e salting automático contra ataques de força bruta e rainbow tables.
- Garante que senhas em texto plano NUNCA sejam salvas no banco de dados nem
  trafeguem em logs.
=============================================================================
"""

import bcrypt


def gerar_hash_senha(senha: str) -> str:
    """
    Gera um hash seguro da senha em texto plano utilizando bcrypt com salt aleatório.
    
    :param senha: Senha informada pelo usuário em texto claro.
    :return: String contendo o hash criptográfico seguro para armazenamento no banco.
    """
    senha_bytes = senha.encode("utf-8")
    salt = bcrypt.gensalt()
    hash_bytes = bcrypt.hashpw(senha_bytes, salt)
    return hash_bytes.decode("utf-8")


def verificar_senha(senha: str, senha_hash: str) -> bool:
    """
    Valida se a senha em texto plano coincide com o hash gravado no banco de dados.
    
    :param senha: Senha digitada na tentativa de login.
    :param senha_hash: Hash salvo no banco de dados.
    :return: True se a senha estiver correta, False caso contrário.
    """
    try:
        senha_bytes = senha.encode("utf-8")
        hash_bytes = senha_hash.encode("utf-8")
        return bcrypt.checkpw(senha_bytes, hash_bytes)
    except Exception:
        return False
