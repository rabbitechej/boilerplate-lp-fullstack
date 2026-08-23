#!/usr/bin/env bash
# Instala os agentes desta pasta nos lugares onde cada ferramenta procura por eles.
#
#   ./agentes/instalar.sh            # instala tudo que fizer sentido
#   ./agentes/instalar.sh claude     # só o Claude Code
#   ./agentes/instalar.sh cursor codex
#
# Copia (não move): esta pasta continua sendo a fonte da verdade. Mudou um
# agente aqui? Rode de novo.

set -euo pipefail

raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
origem="$raiz/agentes"
alvos=("$@")
[ ${#alvos[@]} -eq 0 ] && alvos=(claude cursor codex)

confirma_sobrescrita() {
  local arquivo="$1"
  [ -e "$arquivo" ] || return 0
  read -r -p "  $arquivo já existe. Sobrescrever? [s/N] " resposta
  [[ "$resposta" =~ ^[sS]$ ]]
}

for alvo in "${alvos[@]}"; do
  case "$alvo" in
    claude)
      mkdir -p "$raiz/.claude/agents"
      cp "$origem"/claude/*.md "$raiz/.claude/agents/"
      echo "✓ claude  → .claude/agents/ ($(ls -1 "$origem"/claude/*.md | wc -l) agentes)"
      echo "          use com: /agents  ou peça 'use o agente <nome>'"
      ;;
    cursor)
      mkdir -p "$raiz/.cursor/rules"
      cp "$origem"/cursor/*.mdc "$raiz/.cursor/rules/"
      echo "✓ cursor  → .cursor/rules/ ($(ls -1 "$origem"/cursor/*.mdc | wc -l) regras)"
      echo "          00-projeto aplica sempre; as demais, por pasta ou sob demanda"
      ;;
    codex)
      if confirma_sobrescrita "$raiz/AGENTS.md"; then
        cp "$origem/codex/AGENTS.md" "$raiz/AGENTS.md"
        echo "✓ codex   → AGENTS.md na raiz"
      else
        echo "· codex   pulado (AGENTS.md preservado)"
      fi
      ;;
    gemini)
      echo "· gemini  não instala: agentes/gemini/contexto-projeto.md é para colar no chat"
      ;;
    *)
      echo "✗ alvo desconhecido: $alvo (use claude, cursor, codex ou gemini)" >&2
      exit 1
      ;;
  esac
done
