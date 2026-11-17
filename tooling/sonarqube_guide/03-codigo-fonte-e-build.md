# 03 — Source code and build

## 1. Prerequisites and pinned versions

- **Java 21 required** to build: the README states "Java 21 - Required to build the project"
  (source: `README.md:133`); the build throws `GradleException` if the JVM is not compatible
  with `VERSION_21` (source: `build.gradle:5,20-22`) and applies the toolchain
  `JavaLanguageVersion.of(21)` to subprojects (source: `build.gradle:267-271`).
- **Native git** on the `PATH` (source: `README.md:134`).
- Wrapper: `gradle-8.14.3-all.zip` (source: `gradle/wrapper/gradle-wrapper.properties:3`),
  with `distributionType = ALL` (source: `build.gradle:244-246`).
- Gradle memory: `org.gradle.jvmargs=-Xmx4096m`, with cache and VFS watch enabled (source:
  `gradle.properties:28-30`).
- [CB] product versions: `version=26.12`, JRE `jdk-21.0.13+9`, Elasticsearch `9.4.7`, webapp
  `2026.6.0.82538`, scanner engine `13.16.0.6705`, Plugin API `14.1.0.5543` (source:
  `gradle.properties:2,14,31,38-39,50`).

## 2. Build commands

```bash
./gradlew build                 # build + unit tests (README.md:141)
./gradlew build -x test         # skip tests when only the binary matters (README.md:135)
./gradlew ide                   # prepare the project for IntelliJ/Eclipse (README.md:156)
./gradlew dependencies          # list dependencies (README.md:162-166)
./gradlew spotlessApply         # apply HEADER.spotless to sources (README.md:165)
./gradlew wrapper --gradle-version <version>  # update the wrapper (README.md:166)
```

The distribution zip is produced in `sonar-application/build/distributions/` and, once
extracted, the [CB] server starts with `bin/linux-x86-64/sonar.sh start`,
`bin/macosx-universal-64/sonar.sh start` or `bin\windows-x86-64\StartSonar.bat` (source:
`README.md:143-150`). Open `build.gradle` as the IDE project after `./gradlew ide` (source:
`README.md:158`).

## 3. Gradle structure

| File/dir | Verified function |
|---|---|
| `settings.gradle` | `rootProject.name = 'sonarqube'` (`:27`) and includes: `server:*` modules (`:32-63`), `sonar-application`/`sonar-core`/`sonar-plugin-api-impl`/`sonar-ws`/`sonar-ws-generator` (`:65-75`); Develocity and common-custom-user-data plugins (`:22-25`); local composite-build substitutions via `useLocalUnificationModule` (`:77-217`) |
| `build.gradle` | plugins (Spotless `8.10.3`, Shadow `9.2.2`, artifactory `6.0.4`, Spring dependency-management `1.1.7`, SonarQube `7.5.0.8588`) (`:7-18`); Maven Central/Repox/Ivy repositories for Elastic tarballs (`:111-182`); common subproject configuration (`:248-292`) |
| `gradle.properties` | versions, `projectType=application`, `isLta=false`, `versionEOL=2027-02-01` (`:2-11,36`) |
| `buildSrc/src/main/groovy/org.sonar.build/` | build logic in Groovy: `BlackBoxTest.groovy`, `ElasticsearchInstancesPlugin.groovy`, `DbAwareTest.groovy`, `WriteDependencyLicensesTask.groovy` (imported in `build.gradle:2-3`) |

Without a build number the version becomes `<version>-SNAPSHOT`; with `-DbuildNumber` the
number is appended (source: `build.gradle:56-65`). CycloneDX BOM tasks are off by default and
enabled in CI on the main branch, with `-Dbom` or by explicit call (source:
`build.gradle:28-41,103-109`).

## 4. Plugin API and Web Service generation

- `sonar-plugin-api-impl` implements the server side of the plugin API: `SonarRuntimeImpl`,
  `PluginContextImpl`, `MetadataLoader`, `org.sonar.api.impl.ws.*` utilities and version
  resources (`sq-version.txt`, `sq-version-eol.txt`, `sq-is-lta-version.txt`) (source:
  `sonar-plugin-api-impl/src/main/java/org/sonar/api/internal/SonarRuntimeImpl.java`;
  directory `sonar-plugin-api-impl/src/main/resources/`).
- `sonar-ws-generator` generates clients/definitions from Velocity templates
  (`webService.vm`, `wsClient.vm`, `request.vm`, `responseClasses.config`) and an API snapshot
  (`snapshot-of-api.json`), with `Generator.java`, `CodeFormatter.java` and
  `ApiDefinitionDownloader.java` (source: directory `sonar-ws-generator/src/main/`). The
  `sonar-ws` module completes the client side (source: `settings.gradle:74-75`).

## 5. Separate webapp [CB]

The UI lives in `sonarqube-webapp` and by default is downloaded from Maven Central as the
dependency `org.sonarsource.sonarqube:webapp-assets:$webappVersion` (source:
`README.md:170-172`; `build.gradle:413`; `sonar-application/build.gradle:87`). To contribute
UI changes:

```bash
cd /path/to/sonarqube-webapp/server/sonar-web
yarn                 # install deps (first time only)
yarn build
cd /path/to/sonarqube
WEBAPP_BUILD_PATH=/path/to/sonarqube-webapp/server/sonar-web/build/webapp ./gradlew build
```

If `WEBAPP_BUILD_PATH` is unset, the assembly uses the dependency zip; if set, it uses
`rootProject.fileTree(webappBuildPath)` and validates existence (source:
`sonar-application/build.gradle:457-465`). Alternatively change `webappVersion` in
`gradle.properties` (source: `README.md:195`).

Translations: the former `sonar-core/src/main/resources/org/sonar/l10n/core.properties` is
**deprecated and not updated**; the default English source is
`libs/sq-server-shared/src/l10n/default.ts` in the webapp repo, with
`yarn generate-translation-keys` producing a backward-compatible `.properties` (source:
`README.md:197-215`). Translation extensions for other languages keep working as before
(source: `README.md:215`).

## 6. Contributing and license

The [CB] README states that SonarSource **does not actively seek external feature
contributions** and usually accepts only cosmetic changes/small fixes; bugs and ideas should
start in the forum, and PRs must explain the motivation, follow the code style and pass tests
(GitHub Actions runs on every PR) (source: `README.md:115-125`). Code under LGPL-3.0,
Copyright SonarSource Sàrl (source: `README.md:217-221`; `LICENSE.txt`).

## Sources

**repo ae3d6eb800dacf528b752a51b6b6bda0ec3f4971:** `README.md:115-166`, `README.md:168-221`; `build.gradle:2-3,5,7-22,28-41,56-65,103-109,111-182,244-271,292`; `settings.gradle:22-27,32-75,77-217`; `gradle.properties:2-11,14,28-31,36,38-39,50`; `gradle/wrapper/gradle-wrapper.properties:3`; `sonar-application/build.gradle:87,457-465`; `sonar-plugin-api-impl/src/main/java/org/sonar/api/internal/SonarRuntimeImpl.java`; `sonar-ws-generator/src/main/java/org/sonarqube/wsgenerator/Generator.java`; `LICENSE.txt`.

**URLs .md:** none used; every claim comes from the checkout code.
