# 08 — Scanners and analysis

## 1. Scanner choice

[all] Per build: Maven → SonarScanner for Maven; Gradle → Gradle; MSBuild/.NET CLI → .NET; NPM/Python/Cargo → dedicated; else → CLI. CLI does **not** analyze C#/VB.NET, and degrades Maven/Gradle/.NET analysis. **SonarScanner CLI ≠ SonarQube CLI**: CI/CD scanner (`sonar-scanner`) vs project/issue/AI-agent management UI (source: https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/scanners/sonarscanner.md). No antivirus/EDR on the analysis host: unpredictable (source: https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/scanners/scanner-environment/general-requirements.md).

## 2. Versions: `latest` docs ≠ code commit

`latest` docs: CLI **8.3.1 (2026-11-02)**, Maven **5.8.0.7211**, Gradle **7.5.0.8588**. `ae3d6eb` (26.12) pins `scannerEngineVersion=13.16.0.6705` (source: `gradle.properties:50`) — **engine** version the server distributes, not the `sonar-scanner` binary. Cite sources; never assume equivalence.

## 3. SonarScanner CLI

Java 21+ (17 dropped in 26.8); Java 11+ on CLI ≥ 7.2 with auto-provisioning. OS: Linux x64/AArch64, Windows x64, macOS x64/AArch64; z/OS: generic "Any (Requires a pre-installed JVM)" package (source: https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/scanners/scanner-environment/general-requirements.md).

```bash
unzip sonar-scanner-cli-8.3.1.16491-linux-x64.zip -d /opt
export PATH=/opt/sonar-scanner-8.3.1.16491-linux-x64/bin:$PATH
sonar-scanner -h          # -D/--define, -h, -v, -X/--debug
export SONAR_HOST_URL=http://sonarqube:9000
export SONAR_TOKEN=...     # never commit to the repository
sonar-scanner -Dsonar.projectKey=my:project -X
```

Debug: `-X`, `--verbose`, `-Dsonar.verbose=true` (source: https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/scanners/sonarscanner.md); the last may expose server env-var secrets.

## 4. Authentication, host, hierarchy

| Property | Env var | Note |
|---|---|---|
| `sonar.token` | `SONAR_TOKEN` | mandatory; replaces deprecated `sonar.login`/`sonar.password`; not on .NET |
| `sonar.host.url` | `SONAR_HOST_URL` | `https://sonarcloud.io` on CLI ≥6/Maven ≥5/Gradle ≥6/.NET ≥7/NPM ≥4/Python; else `http://localhost:9000` |
| `sonar.projectKey` | — | mandatory, ≤400 chars; `-`, `_`, `.`, `:` allowed |

Precedence: global UI < project UI < scanner files < CLI args; args beat env vars. Only UI parameters persist; CLI values affect that analysis only (source: https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/analysis-parameters/configuration-overview.md).

```properties
sonar.projectKey=my:project
sonar.projectVersion=1.0
sonar.sources=src
sonar.tests=test
sonar.sourceEncoding=UTF-8
sonar.exclusions=**/generated/**,**/*.min.js
```

`sonar.sources`: comma-separated, relative to `sonar.projectBaseDir` or absolute, no wildcards; default `sonar.projectBaseDir`. `sonar.tests`: none (source: https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/analysis-parameters/parameters-not-settable-in-ui.md).

## 5. Coverage, duplication, gate

Reports from external tools are imported (source: https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/test-coverage/test-coverage-parameters.md):

```properties
sonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml
sonar.coverageReportPaths=target/coverage-generic.xml
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.python.coverage.reportPaths=coverage.xml
sonar.cs.opencover.reportsPaths=coverage.opencover.xml
```

`sonar.jacoco.reportPaths` deprecated. Non-Java duplication: `sonar.cpd.<language>.minimumTokens=100`, `sonar.cpd.<language>.minimumLines=10`; Java: 10 fixed statements. Fail pipeline: `sonar.qualitygate.wait=true` (default `false`) + `sonar.qualitygate.timeout=300`s. External issues: `sonar.externalIssuesReportPaths`, `sonar.sarifReportPaths`. `sonar.scanner.metadataFilePath` = `report-task.txt` location (with `ceTaskId`); `sonar.log.level`: `INFO|DEBUG|TRACE`. Timeouts: `connectTimeout=5`, `socketTimeout=60`, `responseTimeout=60`, `sonar.plugins.download.timeout=300` (same parameters URL).

## 6. JRE auto-provisioning

Scanner downloads the engine JRE from the server; default on: CLI ≥6.0, .NET ≥7.0, NPM ≥4.0, Maven ≥5.0, Gradle ≥6.0. Version tracks the server release, not selectable; pin a patch by disabling it and installing the JRE on the host. JS/TS/CSS also download Node.js (source: https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/scanners/scanner-environment/managing-jre-auto-provisioning.md).

```properties
sonar.scanner.os=linux            # SONAR_SCANNER_OS: windows|linux|macos|alpine
sonar.scanner.arch=x64            # SONAR_SCANNER_ARCH: x64|aarch64
sonar.scanner.skipJreProvisioning=false  # SONAR_SCANNER_SKIP_JRE_PROVISIONING
sonar.scanner.javaExePath=/usr/lib/jvm/jdk-21/bin/java
sonar.scanner.javaOpts=-Xmx2g     # SONAR_SCANNER_JAVA_OPTS (engine forked since 6.0)
```

Disable globally: **Administration > Configuration > General Settings > General** (*Disable Scanner JRE auto provisioning*, *Administer System*). "Bootstrapping" (CLI 6.0+, 10.6+/SonarCloud) = that engine+JRE fetch.

## 7. Maven, Gradle, .NET

```bash
mvn clean verify
mvn org.sonarsource.scanner.maven:sonar-maven-plugin:5.8.0.7211:sonar -Dsonar.token=$SONAR_TOKEN
# defaults: sonar.sources=src/main/java, sonar.tests=src/test/java,
# sonar.working.directory=${project.build.directory}/sonar; sonar.maven.scanAll=true includes non-JVM
```
```properties
# ~/.gradle/gradle.properties — mandatory systemProp prefix
systemProp.sonar.host.url=http://localhost:9000
```
```kotlin
plugins { id("org.sonarqube") version "7.5.0.8588" }
sonar { properties { property("sonar.projectKey", "myProjectKey") } }
```
```bash
./gradlew sonar -Dsonar.token=$SONAR_TOKEN
```

Maven 3.2.5+ infers key/name/version/encoding from `pom.xml` (source: https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/scanners/sonarscanner-for-maven.md); Gradle 7.3+ except 8.1/8.2, needs `javac` bytecode (source: https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/scanners/sonarscanner-for-gradle.md). .NET: begin → build → end; `sonar.sources`/`sonar.tests` unsupported; prefix depends on invocation (source: https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/scanners/dotnet/using.md).

## 8. Pitfalls

- Shallow checkout breaks SCM backdating; clone full depth.
- `sonar.verbose=true` leaks secrets; prefer `SONAR_TOKEN`.
- `sonar.projectVersion` with a build number overloads housekeeping, breaking the per-version new code definition.
- `sonar.working.directory` is wiped each analysis; keep it unique.

## Sources

`repo ae3d6eb`: `gradle.properties:50`

URLs `.md`:
- https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/scanners/sonarscanner.md
- https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/scanners/scanner-environment/general-requirements.md
- https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/scanners/scanner-environment/managing-jre-auto-provisioning.md
- https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/scanners/sonarscanner-for-maven.md
- https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/scanners/sonarscanner-for-gradle.md
- https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/scanners/dotnet/using.md
- https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/analysis-parameters/configuration-overview.md
- https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/analysis-parameters/parameters-not-settable-in-ui.md
- https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/test-coverage/test-coverage-parameters.md
