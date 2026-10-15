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

import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import bcrypt
import jwt

# Configurações do algoritmo JWT
SECRET_KEY = os.getenv("SECRET_KEY", "taskcalc-secret-security-key-2026-auth-token")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 horas de validade


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


def criar_token_acesso(dados: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Gera um token JWT assinado digitalmente contendo as claims informadas.
    
    :param dados: Dicionário com payload (ex: sub=email, id, perfil).
    :param expires_delta: Tempo de vida do token (default: 24h).
    :return: String do JWT assinado.
    """
    payload = dados.copy()
    agora = datetime.now(timezone.utc)
    if expires_delta:
        expira_em = agora + expires_delta
    else:
        expira_em = agora + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    payload.update({
        "exp": expira_em,
        "iat": agora
    })
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decodificar_token_acesso(token: str) -> Optional[Dict[str, Any]]:
    """
    Decodifica e valida a assinatura criptográfica e a validade temporal do JWT.
    
    :param token: Token JWT em formato string.
    :return: Payload contendo as claims ou None se inválido/expirado.
    """
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None
