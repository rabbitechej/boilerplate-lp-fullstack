# Agentes

Instruções prontas para assistentes de código trabalharem **neste site** sem precisar redescobrir os padrões do projeto a cada conversa.

Esta pasta é a **fonte da verdade**: cada ferramenta lê os agentes de um lugar diferente, e o `instalar.sh` copia para lá. Mudou um agente aqui, rode o script de novo.

```bash
./agentes/instalar.sh              # claude + cursor + codex
./agentes/instalar.sh claude       # só um
```

| Ferramenta | Fica em | Como usar |
|---|---|---|
| Claude Code | `.claude/agents/` | `/agents`, ou "use o agente `verificador`" |
| Cursor | `.cursor/rules/` | automático por pasta; as demais o agente puxa quando o assunto bate |
| Codex | `AGENTS.md` na raiz | lido sozinho a cada sessão |
| Gemini | não instala | cole `gemini/contexto-projeto.md` no início do chat |

## Os agentes

| Agente | Quando |
|---|---|
| **`setup-inicial`** | uma vez, logo depois de copiar o boilerplate: renomeia, aponta cada env a preencher, decide os módulos |
| **`estado-do-projeto`** | ao chegar num projeto (ou voltar depois de semanas): o que já é deste site, o que ainda é padrão de fábrica, o que falta |
| **`task-jira`** | do ticket ao PR: quebra em commits, cria a branch com a chave, entrega o texto para colar no Jira |
| **`novo-recurso`** | recurso CRUD novo (depoimentos, serviços, portfólio) do schema à tela |
| **`revisor-de-codigo`** | antes de commitar: confere contra a seção 4 do README |
| **`auditor-de-seguranca`** | antes de deploy, e sempre que mexer em auth, rota admin, upload ou validação |
| **`verificador`** | typecheck + testes + lint + integração + build, com veredito binário |

Um fluxo típico de task: `task-jira` para começar → `novo-recurso` para construir → `revisor-de-codigo` → `auditor-de-seguranca` (se tocou em algo sensível) → `verificador` → PR.

## Por que separado, e não tudo num arquivo só

Contexto que chega **sempre** compete com o problema em questão pela atenção do modelo. Um documento único com setup, segurança, testes e Jira faz o assistente ler sobre Jira enquanto tenta corrigir um teste.

Então: o que precisa valer sempre (contrato da API, camadas, idioma) fica no `00-projeto.mdc` do Cursor e no `AGENTS.md` do Codex. O que só vale num momento específico vira agente, carregado quando aquele momento chega.

## Escrevendo ou ajustando um agente

Os que estão aqui seguem quatro regras que valem a pena manter:

1. **Aponte para o README em vez de copiá-lo.** Ferramenta com acesso a arquivo lê a seção — e lê a versão atual. Duplicar significa duas verdades divergindo em silêncio. A exceção é o contexto do Gemini, que roda num chat sem acesso ao repositório e por isso carrega os moldes de código junto.
2. **Diga o que fazer, não só o que evitar.** "Não use `console.log`" resolve metade; "use `logger.error('mensagem', { err: error })`" resolve inteiro.
3. **Explique o porquê quando a regra parecer arbitrária.** "Slug só é gerado na criação" soa capricho até vir o motivo: não há redirect 301, então mudar o slug mata os links já compartilhados. Com o motivo, o assistente acerta também os casos que você não previu.
4. **Diga onde parar.** O `verificador` não corrige; o `revisor-de-codigo` não edita; o `task-jira` não mexe no status do ticket. Agente sem limite escrito inventa um.

Ao adicionar um agente, atualize as tabelas acima, crie a versão de Cursor (`.mdc`) se fizer sentido, e considere se o `AGENTS.md` do Codex e o contexto do Gemini precisam saber daquilo.

## Limites

Estes arquivos **orientam**, não garantem. Assistente ignora instrução, principalmente em conversa longa. Nada aqui substitui rodar:

```bash
npm run typecheck && npm test && npm run lint
```

O CI é o único que não esquece.
