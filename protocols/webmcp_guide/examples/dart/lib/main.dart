// Example Shoppe — WebMCP a partir do Flutter web.
//
// Flutter web compila para JavaScript e roda no navegador, então podemos
// acessar document.modelContext diretamente com dart:js_interop + package:web.
//
// Rode com: flutter run -d chrome  (Chrome 149+, flag enable-webmcp-testing)

import 'dart:convert';
import 'dart:js_interop';

import 'package:flutter/material.dart';
import 'package:web/web.dart' as web;

/// Ponte tipada para a superfície WebMCP exposta pelo navegador.
extension type ModelContext._(JSObject _) implements JSObject {
  external JSPromise<JSAny?> registerTool(JSObject tool, [JSObject options]);
  external JSPromise<JSArray<JSObject>> getTools([JSObject options]);
  external JSPromise<JSAny?> executeTool(
    JSObject tool,
    JSString argsJson, [
    JSObject options,
  ]);
}

/// Retorna `document.modelContext`, ou null se o navegador não suportar.
ModelContext? get modelContext {
  final ctx = web.window.document['modelContext'];
  if (ctx == null) return null;
  return ModelContext._(ctx as JSObject);
}

/// Monta o objeto `ModelContextTool` como um JSObject.
JSObject _buildTool({
  required String name,
  required String description,
  required Map<String, Object?> inputSchema,
  required JSFunction execute,
  bool readOnlyHint = false,
  bool untrustedContentHint = false,
}) {
  final tool = JSObject();
  tool['name'] = name.toJS;
  tool['description'] = description.toJS;
  tool['inputSchema'] = inputSchema.jsify();
  tool['execute'] = execute;
  tool['annotations'] = <String, bool>{
    'readOnlyHint': readOnlyHint,
    'untrustedContentHint': untrustedContentHint,
  }.jsify();
  return tool;
}

/// Converte o argumento (objeto JS) recebido pelo callback em Map Dart.
Map<String, Object?> _dartifyArgs(JSAny? args) {
  if (args == null) return {};
  final decoded = args.dartify();
  return (decoded as Map).cast<String, Object?>();
}

/// Backend simulado: o callback das ferramentas chama /api/products.
Future<JSString> _searchProducts(Map<String, Object?> input) async {
  final query = (input['query'] ?? '') as String;
  final url = '/api/products?q=${Uri.encodeQueryComponent(query)}';

  final res = await web.window
      .fetch(web.Request(url, web.RequestInit(credentials: 'same-origin')))
      .toDart;
  if (res.status != 200) {
    throw Exception('Search failed: ${res.status}');
  }
  final text = await res.text().toDart;
  return text.toJS;
}

/// Registra as ferramentas da loja. `execute` retorna uma Promise (Future.toJS).
Future<void> registerStoreTools() async {
  final ctx = modelContext;
  if (ctx == null) {
    debugPrint('WebMCP indisponível neste navegador.');
    return;
  }

  final execute = ((JSAny? args) => _searchProducts(_dartifyArgs(args)).toJS)
      .toJS;

  await ctx.registerTool(_buildTool(
    name: 'search_products',
    description: 'Search the product catalog and return id, name and price.',
    inputSchema: {
      'type': 'object',
      'properties': {
        'query': {
          'type': 'string',
          'description': 'Free text search term.',
        },
      },
      'required': ['query'],
    },
    execute: execute,
    readOnlyHint: false,
    untrustedContentHint: false,
  ));

  debugPrint('[WebMCP] search_products registrada.');
}

Future<List<String>> listToolNames() async {
  final ctx = modelContext;
  if (ctx == null) return const [];
  final tools = await ctx.getTools().toDart;
  return tools
      .map((t) => (t as JSObject)['name']?.toDart?.toString() ?? '?')
      .toList();
}

Future<String?> executeToolByName(String name, String argsJson) async {
  final ctx = modelContext;
  if (ctx == null) return null;

  final tools = await ctx.getTools().toDart;
  JSObject? tool;
  for (final t in tools.cast<JSObject>()) {
    if (t['name']?.toDart == name) {
      tool = t;
      break;
    }
  }
  if (tool == null) return null;

  final result = await ctx.executeTool(tool, argsJson.toJS).toDart;
  return result?.toDart?.toString();
}

void main() {
  runApp(const WebMCPDemoApp());
}

class WebMCPDemoApp extends StatelessWidget {
  const WebMCPDemoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'WebMCP — Dart/Flutter',
      theme: ThemeData(colorSchemeSeed: Colors.teal, useMaterial3: true),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  String _log = 'Pronto. Clique em "Registrar ferramentas".';

  void _append(String line) => setState(() => _log = '$line\n$_log');

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Example Shoppe — WebMCP')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            FilledButton(
              onPressed: () async {
                await registerStoreTools();
                _append('[OK] Ferramentas registradas');
              },
              child: const Text('Registrar ferramentas'),
            ),
            OutlinedButton(
              onPressed: () async {
                final names = await listToolNames();
                _append('getTools() → ${names.join(', ')}');
              },
              child: const Text('Listar ferramentas (getTools)'),
            ),
            OutlinedButton(
              onPressed: () async {
                final result = await executeToolByName(
                  'search_products',
                  jsonEncode({'query': 'jaqueta'}),
                );
                _append('executeTool() → $result');
              },
              child: const Text('Executar search_products'),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: SingleChildScrollView(
                child: SelectableText(
                  _log,
                  style: const TextStyle(fontFamily: 'monospace'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
