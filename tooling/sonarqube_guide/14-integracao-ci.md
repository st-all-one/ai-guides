# 14 — CI integration

## 1. Contract common to every pipeline

1. **Full checkout.** History feeds blame/new code: `fetch-depth: 0` (GitHub), `GIT_DEPTH: "0"` (GitLab), `clone: depth: full` (Bitbucket), `fetchDepth: 0` (Azure). `Missing blame information…` / `Could not find ref…` = shallow clone or submodules. (source: https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/ci-integration/github-actions.md, https://docs.sonarsource.com/sonarqube-community-build/devops-platform-integration/gitlab-integration/adding-analysis-to-gitlab-ci-cd.md, https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/ci-integration/bitbucket-pipelines.md)
2. **Build-specific scanner.** Maven → `sonar-maven-plugin`; Gradle → `org.sonarqube`; .NET → `dotnet-sonarscanner` (begin/build/end). CLI only without a build-system scanner; docs warn it degrades Maven/Gradle/.NET and misses C#/VB.NET. (source: https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/scanners/sonarscanner.md)
3. **Token in a secret, URL in a variable.** `SONAR_TOKEN` secret, `SONAR_HOST_URL` org/group variable. Prefer a project token (smaller blast radius); issuer needs *Execute Analysis*. (source: https://docs.sonarsource.com/sonarqube-community-build/user-guide/managing-tokens.md)
4. **QG capture.** Action/pipe (GitHub, Bitbucket), publish task (Azure), pause (Jenkins) or `sonar.qualitygate.wait=true`, polling and **failing the analysis on a red QG** even when analysis is correct; it lengthens the job. `sonar.qualitygate.timeout` default **300 s**. (source: https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/ci-integration/overview.md)

`[Community Build]` capture only **blocks the job**; no PR decoration or merge gate. Examples use `on.pull_request`/`merge_request_event`, yet only the main branch is analyzed (`21`). (source: https://docs.sonarsource.com/sonarqube-community-build/feature-comparison-table.md, adding-analysis-to-github-actions-workflow.md)

## 2. GitHub Actions

Real CB example (Maven):

```yaml
name: Build
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0
      - uses: actions/cache@v4
        with:
          path: ~/.sonar/cache
          key: ${{ runner.os }}-sonar
      - name: Build and analyze
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ vars.SONAR_HOST_URL }}
        run: mvn -B verify org.sonarsource.scanner.maven:sonar-maven-plugin:sonar
```

CLI: *SonarQube Scan* Action; gate: *SonarQube Quality Gate Check* Action or `-Dsonar.qualitygate.wait=true`. Self-hosted v8 runner: `unzip`, `wget`/`curl`, `gpg`, `dirmngr`; custom certs: `SONAR_ROOT_CERT`. (source: github-actions.md)

## 3. GitLab CI/CD

*Docker executor* runner. `SONAR_TOKEN`/`SONAR_HOST_URL` are CI/CD variables; `SONAR_USER_HOME` pins the cache. Real CLI example:

```yaml
sonarqube-check:
  image:
    name: sonarsource/sonar-scanner-cli:latest
    entrypoint: [""]
  variables:
    SONAR_USER_HOME: "${CI_PROJECT_DIR}/.sonar"
    GIT_DEPTH: "0"
  cache:
    key: "${CI_JOB_NAME}"
    paths: [.sonar/cache]
  script: [sonar-scanner -Dsonar.qualitygate.wait=true]
  allow_failure: false
  rules:
    - if: $CI_COMMIT_REF_NAME == 'main' || $CI_PIPELINE_SOURCE == 'merge_request_event'
```

`sonar.projectKey` in `sonar-project.properties` or on the CLI; `allow_failure: false` = real gate.

## 4. Jenkins

URL + token in the global connection; `withSonarQubeEnv` injects the variables. Optional: `installationName`, `credentialsId`, `envOnly`. Real Gradle example: (source: https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/ci-integration/jenkins-integration/add-analysis-to-job.md)

```groovy
node {
  stage('SonarQube analysis') {
    withSonarQubeEnv() {
      sh './gradlew sonar'
    }
  }
}
```

CLI: `def scannerHome = tool '<nome>'` + `sh "${scannerHome}/bin/sonar-scanner"`. Failing on the QG needs the documented pause. No *Multibranch Pipeline*. (source: pipeline-pause.md)

## 5. Azure Pipelines

Three tasks: *Prepare Analysis Configuration* pre-build, *Run Code Analysis* post-build, *Publish Quality Gate Result* last; suffix = extension version. (source: https://docs.sonarsource.com/sonarqube-community-build/devops-platform-integration/azure-devops-integration/adding-analysis-to-pipeline/js-ts-go-python-php-project.md)

```yaml
steps:
  - checkout: self
    fetchDepth: 0
  - task: SonarQubePrepare@8
    inputs:
      SonarQube: '<YourSonarqubeServerEndpoint>'
      scannerMode: 'cli'
      configMode: 'manual'
      cliProjectKey: '<YourProjectKey>'
  # ... build task(s) ...
  - task: SonarQubeAnalyze@8
    inputs:
      jdkversion: 'JAVA_HOME_17_X64'
  - task: SonarQubePublish@8
    inputs:
      pollingTimeoutSec: '300'
```

## 6. Bitbucket Pipelines

Real example with cache and full clone; *SonarQube Scan Bitbucket Pipe* is the simpler cacheless alternative.

```yaml
definitions:
  steps: &build-step
    - step:
        name: SonarQube analysis
        image: sonarsource/sonar-scanner-cli:latest
        caches: [sonar]
        script: [sonar-scanner]
  caches:
    sonar: /opt/sonar-scanner/.sonar
clone:
  depth: full
pipelines:
  branches:
    '{master,main,develop}': [{step: *build-step}]
  pull-requests:
    '**': [{step: *build-step}]
```

Variables: `SONAR_TOKEN`, `SONAR_HOST_URL`. Gate: *quality gate check Bitbucket Pipe* or `-Dsonar.qualitygate.wait=true`. `Container 'docker' exceeded memory limit` → raise `definitions.services.docker.memory`.

## 7. Pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `Missing blame information`, `Could not find ref` | shallow clone / submodules | full checkout (§1) |
| Red QG does not fail the job | no capture | action/pipe/task or `sonar.qualitygate.wait=true` + `allow_failure: false` |
| Long job | QG polling | tune `sonar.qualitygate.timeout` |
| Poor Maven/Gradle/.NET results | CLI instead of build scanner | use plugin/task |
| Leaked token hit many projects | global token | project token scoped to Execute Analysis |

## Sources

- repo ae3d6eb: `README.md:97` (Community Build/Server boundary)
- https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/ci-integration/overview.md
- https://docs.sonarsource.com/sonarqube-community-build/devops-platform-integration/github-integration/adding-analysis-to-github-actions-workflow.md
- https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/ci-integration/github-actions.md
- https://docs.sonarsource.com/sonarqube-community-build/devops-platform-integration/gitlab-integration/adding-analysis-to-gitlab-ci-cd.md
- https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/ci-integration/jenkins-integration/add-analysis-to-job.md
- https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/ci-integration/jenkins-integration/pipeline-pause.md
- https://docs.sonarsource.com/sonarqube-community-build/devops-platform-integration/azure-devops-integration/adding-analysis-to-pipeline/js-ts-go-python-php-project.md
- https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/ci-integration/bitbucket-pipelines.md
- https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/scanners/sonarscanner.md
- https://docs.sonarsource.com/sonarqube-community-build/user-guide/managing-tokens.md
- https://docs.sonarsource.com/sonarqube-community-build/feature-comparison-table.md
