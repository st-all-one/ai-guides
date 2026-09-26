# WebMCP — Python (FastAPI como backend das ferramentas)

O WebMCP roda no navegador (JS). O Python (FastAPI) participa de duas formas:

1. **Servindo a página** (`GET /`) que contém o script que registra as ferramentas.
2. **Endpoint JSON** (`GET /api/products`) chamado pelo `execute()` da ferramenta — no mesmo origin, com a sessão do visitante.

## Como rodar

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

Acesse `http://localhost:8000` no Chrome 149+ (flag `enable-webmcp-testing`).

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `main.py` | App FastAPI: página + endpoint das ferramentas |
| `requirements.txt` | Dependências |
