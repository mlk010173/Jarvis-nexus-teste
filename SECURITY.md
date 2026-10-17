# Política de Segurança do JARVIS NEXUS

## Princípios de Proteção de Agentes
1. **Privilégios Mínimos:** Ferramentas operam sob políticas restritivas declaradas.
2. **Defesa Contra Injeção:** Bloqueio ativo de comandos destrutivos do sistema operacional (`rm -rf`, `fork bombs`, scripts remotos não confiáveis).
3. **Prevenção de Prompt Injection:** Separação entre dados recuperados de páginas/repositórios externos e instruções do sistema.
4. **Isolamento de Chaves:** Nenhuma chave secreta de API é exposta no frontend. Chamadas externas ocorrem via rotas proxy no backend.
5. **Autonomia com Human-in-the-Loop:** Ações com efeitos colaterais relevantes (deleção de arquivos, commits externos ou deploys) exigem aprovação explícita do usuário na interface.
