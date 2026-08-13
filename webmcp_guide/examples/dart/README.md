# WebMCP — Dart (Flutter web via `dart:js_interop`)

Flutter web compila para **JavaScript e roda no navegador**, então consegue acessar `document.modelContext` diretamente via interop com JS.

Este exemplo mostra:

- **Registro** de uma ferramenta WebMCP a partir do Dart (`registerTool`).
- **Callback `execute`** que chama um endpoint `fetch` do backend e retorna uma `Promise`.
- **Descoberta** (`getTools`) e **execução manual** (`executeTool`) a partir de um botão Flutter.

## Como rodar

```bash
flutter create . --platforms web   # se ainda não houver as pastas web/
flutter pub get
flutter run -d chrome
```

Use o Chrome 149+ (flag `enable-webmcp-testing`) e abra o console.

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `pubspec.yaml` | Dependências (`web`, Flutter) |
| `lib/main.dart` | Ponte `dart:js_interop` + UI de demonstração |
