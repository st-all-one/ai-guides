# How-To: Localizar o Manifest do PWA

## Quando Usar

Quando seu PWA precisa mostrar nomes, descrições e ícones diferentes conforme o idioma do navegador do usuário. O browser seleciona automaticamente a variante que melhor se encaixa.

## Membros Localizáveis

| Membro | Sufixo `_localized` | Tipo do valor |
|---|---|---|
| `name` | `name_localized` | String ou objeto |
| `short_name` | `short_name_localized` | String ou objeto |
| `description` | `description_localized` | String ou objeto |
| `icons` | `icons_localized` | Array de objetos de ícone |
| `shortcuts[].name` | `name_localized` dentro do shortcut | String ou objeto |
| `shortcuts[].short_name` | `short_name_localized` dentro do shortcut | String ou objeto |
| `shortcuts[].description` | `description_localized` dentro do shortcut | String ou objeto |
| `shortcuts[].icons` | `icons_localized` dentro do shortcut | Array de objetos de ícone |

## Formato do Valor

### String simples (mais comum)

```json
{
  "name": "SuperSausage",
  "name_localized": {
    "fr": "SuperSaucisse",
    "de": "SuperWurst",
    "ja": "スーパーソーセージ"
  }
}
```

### Objeto com direção de texto

Use quando o texto traduzido precisa de direção diferente do idioma do browser:

```json
{
  "short_name_localized": {
    "fr": {
      "lang": "en-US",
      "value": "Sausage Super"
    },
    "de": "SuperWurst"
  }
}
```

Propriedades do objeto:
- `value` (obrigatório): texto localizado
- `dir` (opcional): `"ltr"`, `"rtl"`, ou `"auto"`
- `lang` (opcional): BCP 47 tag — útil quando o texto localizado está em idioma diferente da chave

## Exemplo Completo

```json
{
  "name": "The SuperSausage sausage app",
  "short_name": "SuperSausage",
  "description": "Find information on all your favorite sausages!",
  "start_url": "./",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ab510d",

  "name_localized": {
    "fr": "L'application de saucisse SuperSausage",
    "de": "Die SuperWurst-App",
    "ur": "سپر ساسیج ساسیج ایپ",
    "ja": "スーパーソーセージのソーセージアプリ"
  },

  "short_name_localized": {
    "fr": { "lang": "en-US", "value": "Sausage Super" },
    "de": "SuperWurst",
    "ur": "سپر ساسیج",
    "ja": "スーパーソーセージ"
  },

  "description_localized": {
    "fr": "Trouvez des informations sur toutes vos saucisses préférées !",
    "de": "Finden Sie Informationen zu all Ihren Lieblingswürstchen!",
    "ur": "اپنی تمام پسندیدہ ساسیجز کے بارے میں معلومات حاصل کریں!",
    "ja": "お気に入りのソーセージの情報を全部見つけましょう!"
  },

  "icons": [
    { "src": "./icons/saus-128.png", "sizes": "128x128", "type": "image/png" },
    { "src": "./icons/saus-256.png", "sizes": "256x256", "type": "image/png" }
  ],

  "icons_localized": {
    "fr": [
      { "src": "./icons/l10n/fr/saus-128.png", "sizes": "128x128", "type": "image/png" },
      { "src": "./icons/l10n/fr/saus-256.png", "sizes": "256x256", "type": "image/png" }
    ],
    "de": [
      { "src": "./icons/l10n/de/saus-128.png", "sizes": "128x128", "type": "image/png" },
      { "src": "./icons/l10n/de/saus-256.png", "sizes": "256x256", "type": "image/png" }
    ],
    "ja": [
      { "src": "./icons/l10n/ja/saus-128.png", "sizes": "128x128", "type": "image/png" },
      { "src": "./icons/l10n/ja/saus-256.png", "sizes": "256x256", "type": "image/png" }
    ]
  },

  "shortcuts": [
    {
      "name": "Open menu",
      "short_name": "Menu",
      "description": "Go to the menu.",
      "url": "./menu",
      "icons": [
        { "src": "./icons/menu-128.png", "sizes": "128x128", "type": "image/png", "purpose": "any" }
      ],
      "name_localized": {
        "fr": "Menu ouvert",
        "de": "Menü öffnen",
        "ja": "メニューを開く"
      },
      "short_name_localized": {
        "fr": "Menu",
        "de": "Speisekarte",
        "ja": "メニュー"
      },
      "description_localized": {
        "fr": "Allez au menu.",
        "de": "Geh zur Speisekarte.",
        "ja": "メニューに行け。"
      },
      "icons_localized": {
        "fr": [
          { "src": "./icons/l10n/fr/menu-128.png", "sizes": "128x128", "type": "image/png", "purpose": "any" }
        ],
        "de": [
          { "src": "./icons/l10n/de/menu-128.png", "sizes": "128x128", "type": "image/png", "purpose": "any" }
        ],
        "ja": [
          { "src": "./icons/l10n/ja/menu-128.png", "sizes": "128x128", "type": "image/png", "purpose": "any" }
        ]
      }
    }
  ]
}
```

## Regras de Resolução

O browser segue esta ordem de precedência:

1. Match exato (`fr-CA`) → Usa variante `fr-CA`
2. Fallback para tag mais genérica (`fr`) → Usa variante `fr`
3. Fallback para o valor não-localizado → Usa `name`, `icons`, etc.

**Importante:** Se o ícone localizado existe mas tem um único tamanho, o browser **não** busca no `icons` global para completar. A array de ícones localizada é autocontida.

## Demo

[https://microsoftedge.github.io/Demos/pwa-manifest-localization/](https://microsoftedge.github.io/Demos/pwa-manifest-localization/)
