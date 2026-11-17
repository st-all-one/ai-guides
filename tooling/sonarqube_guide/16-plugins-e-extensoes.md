# 16 — Plugins and extensions

## 1. API and versions

A plugin is a JAR implementing extension points (`@ExtensionPoint`) across the three stacks — scanner, Compute Engine and web — declared in the entry class implementing `org.sonar.api.Plugin`. (source: plugin-basics.md)

`sonar-plugin-api` is a separate component since 9.5, with its own releases; coordinates moved from `org.sonarsource.sonarqube` to `org.sonarsource.api.plugin:sonar-plugin-api:<version>`. Build prerequisites: Java 8 and Maven 3.1+ (Gradle via an unofficial third-party plugin). `mvn clean package` produces the JAR in `target/`. (source: plugin-basics.md)

In this checkout, `gradle.properties` records `version=26.12` (source: `gradle.properties:2`), `pluginApiVersion=14.1.0.5543` (source: `gradle.properties:14`) and `scannerEngineVersion=13.16.0.6705` (source: `gradle.properties:50`). These are **code** facts; the plugin documentation is unstable and must not be used to infer the runtime API version.

```xml
<dependency>
  <groupId>org.sonarsource.api.plugin</groupId>
  <artifactId>sonar-plugin-api</artifactId>
  <version>14.1.0.5543</version>
  <scope>provided</scope>
</dependency>
```

`pluginApiMinVersion` (pom) becomes `Sonar-Version` in `META-INF/MANIFEST.MF` and defines the **minimum runtime API**. It differs from the compilation version: compiling against a new API while declaring an old minimum does not guarantee it works. (source: plugin-basics.md)

## 2. Classloading and isolation

Each plugin runs in an isolated classloader inheriting only API classes; child plugins can share a `basePlugin` classloader. Code: `sonar-core/src/main/java/org/sonar/core/platform/PluginClassLoader.java:50` (comment: *"Plugins have their own isolated classloader, inheriting only from API classes"*, lines 45-46), definitions in `sonar-core/src/main/java/org/sonar/core/platform/PluginClassLoaderDef.java:36`, factory in `sonar-core/src/main/java/org/sonar/core/platform/PluginClassloaderFactory.java:49`.

The *child-first* strategy (`useChildFirstClassLoader`) is **deprecated**: the code warns `uses a child first classloader which is deprecated` (source: `sonar-core/src/main/java/org/sonar/core/platform/PluginClassLoader.java:100-101`). The compatibility mode for API < 5.2 is also discontinued and the plugin must bundle its own dependencies (source: `sonar-core/src/main/java/org/sonar/core/platform/PluginClassLoader.java:104-110`).

`PluginInfo.isCompatibleWith()` compares the declared minimum against the runtime API version (source: `sonar-core/src/main/java/org/sonar/core/platform/PluginInfo.java:332-341`), and the loader rejects the plugin (source: `server/sonar-webserver-api/src/main/java/org/sonar/server/plugins/PluginJarLoader.java:214-216`). The manifest is read at `sonar-core/src/main/java/org/sonar/core/platform/PluginInfo.java:441-443`.

`requiredPlugins` declares dependencies for compatibility only — it does **not** share a classloader; `basePlugin` does.

## 3. Installation

Canonical directory: `<sonarqubeHome>/extensions/plugins`, resolved by `new File(getHomeDir(), "extensions/plugins")` (source: `server/sonar-server-common/src/main/java/org/sonar/server/platform/ServerFileSystemImpl.java:83`). The loader reads `lib/extensions` and `extensions/plugins` (source: `server/sonar-webserver-api/src/main/java/org/sonar/server/plugins/PluginJarLoader.java:79`); the Compute Engine unpacks JARs equivalently (source: `server/sonar-ce/src/main/java/org/sonar/ce/container/CePluginJarExploder.java:30`).

| Mode | Manual installation |
|---|---|
| ZIP | copy the JAR into `<home>/extensions/plugins`, remove the previous version, restart |
| Docker | copy into the `sonarqube_extensions` volume mounted at `$SONARQUBE_HOME/extensions/plugins`; `docker exec sonarqube bash -c 'wget <URL> -P "$SONARQUBE_HOME"/extensions/plugins/'` and `docker restart sonarqube` |
| Kubernetes | `plugins.install` in `values.yaml` or `helm upgrade --set "plugins.install={URL}"` |

Verification: **Administration > Marketplace**; log `Deploy plugin <name> / <version>` in `logs/web.log`. Uninstall = remove the JAR + restart. (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/plugins/install-a-plugin.md)

## 4. Marketplace

**Administration > Marketplace** requires *Administer System*; allows install/update/uninstall, compatibility checks, edition discovery. It needs internet: it queries `https://downloads.sonarsource.com/?prefix=sonarqube/update` and downloads from `binaries.sonarsource.com`/GitHub. Without internet, install manually and set `sonar.updatecenter.activate` to silence fetch errors; behind a proxy, set `http.proxyHost`, `http.proxyPort`, `http.proxyUser`, `http.proxyPassword` (or `https.*` variants) in `sonar.properties`. (source: https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/update/marketplace.md)

`[Community Build]` the docs warn: plugins are **not** provided by Sonar and are installed at the administrator's own risk, who must accept the notice. The version matrix is published as an embedded component on the page (not as text); third-party `sonarplugins.com` is **not** the Marketplace. (source: https://docs.sonarsource.com/sonarqube-community-build/server-installation/plugins/plugin-version-matrix.md, marketplace.md)

## 5. Language extensions and debug

Typical extension points: `Sensor` (@ScannerSide), @ServerSide and @ComputeEngineSide components; language scanners require `requiredForLanguages`. Canonical example: `sonar-custom-plugin-example`. (source: plugin-basics.md)

Debug: `sonar.web.javaAdditionalOpts=-agentlib:jdwp=...` (web), `sonar.ce.javaAdditionalOpts=...` (CE) or `SONAR_SCANNER_OPTS` (scanner); the doc's example uses port 8000. (source: plugin-basics.md)

## 6. Pitfalls

- **Wrong API version.** A `pluginApiMinVersion` above the runtime prevents loading; check `gradle.properties:14` of the checkout and the matrix, not the UI version.
- **Two versions of the same JAR in `extensions/plugins`.** Remove the old one before restarting.
- **Unbundled dependencies.** Without `basePlugin`, the isolated classloader does not see another plugin's libraries.
- **Updating without restart.** A Marketplace install only takes effect after *Restart*.
- **Trusting a third-party site.** `sonarplugins.com` is not affiliated with Sonar.

## Sources

- repo ae3d6eb: `gradle.properties:2,14,50`, `sonar-core/src/main/java/org/sonar/core/platform/PluginClassLoader.java:45-50,100-110`, `sonar-core/src/main/java/org/sonar/core/platform/PluginClassLoaderDef.java:36`, `sonar-core/src/main/java/org/sonar/core/platform/PluginClassloaderFactory.java:49`, `sonar-core/src/main/java/org/sonar/core/platform/PluginInfo.java:332-341,441-443`, `server/sonar-webserver-api/src/main/java/org/sonar/server/plugins/PluginJarLoader.java:79,214-216`, `server/sonar-server-common/src/main/java/org/sonar/server/platform/ServerFileSystemImpl.java:83`, `server/sonar-ce/src/main/java/org/sonar/ce/container/CePluginJarExploder.java:30`
- https://docs.sonarsource.com/sonarqube-community-build/extension-guide/developing-a-plugin/plugin-basics.md
- https://docs.sonarsource.com/sonarqube-community-build/extension-guide/developing-a-plugin.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/plugins/install-a-plugin.md
- https://docs.sonarsource.com/sonarqube-community-build/server-installation/plugins/plugin-version-matrix.md
- https://docs.sonarsource.com/sonarqube-community-build/server-update-and-maintenance/update/marketplace.md
