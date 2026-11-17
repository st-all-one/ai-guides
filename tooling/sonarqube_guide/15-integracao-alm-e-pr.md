# 15 — ALM integration and PR analysis

## 1. What ALM binding does

Binding links a project to a repository (GitHub, GitLab, Bitbucket Cloud/Data Center, Azure DevOps): authenticate, import, associate. Code: `server/sonar-auth-github`, `-gitlab`, `-bitbucket`, `-alm-client` (source: `settings.gradle:33-37,61`); the link persists in `ProjectAlmSettingDao`/`AlmSettingDao` (source: `server/sonar-db-dao/src/main/java/org/sonar/db/alm/setting/ProjectAlmSettingDao.java:40`, `server/sonar-db-dao/src/main/java/org/sonar/db/alm/setting/AlmSettingDao.java:32`).

OAuth2 auth: `GitHubIdentityProvider` (source: `server/sonar-auth-github/src/main/java/org/sonar/auth/github/GitHubIdentityProvider.java:44`), GitLab (source: `server/sonar-auth-gitlab/src/main/java/org/sonar/auth/gitlab/GitLabIdentityProvider.java:51`), Bitbucket (source: `server/sonar-auth-bitbucket/src/main/java/org/sonar/auth/bitbucket/BitbucketIdentityProvider.java:52`). ALM client: `GithubAppSecurityImpl` (source: `server/sonar-alm-client/src/main/java/org/sonar/alm/client/github/security/GithubAppSecurityImpl.java:45`), `GitlabProjectAccessToken` (source: `server/sonar-alm-client/src/main/java/org/sonar/alm/client/gitlab/GitlabProjectAccessToken.java:35`), `AzureDevOpsHttpClient` (source: `server/sonar-alm-client/src/main/java/org/sonar/alm/client/azure/AzureDevOpsHttpClient.java:47`).

## 2. Global configuration and onboarding

`[Community Build]` **one configuration per platform**; Bitbucket DC and Cloud are the same platform. Location: **Administration > Configuration > General Settings > DevOps Platform Integrations**. Permissions: *Administer System* to view/create it and use **Project coverage**; *Create Projects* to import repos and configure projects. A repository-selection error means missing access **on the platform**, not in SonarQube. (source: https://docs.sonarsource.com/sonarqube-community-build/project-coverage.md)

Onboarding:

1. Create the platform configuration (GitHub App, application token, etc.); the GitHub doc points to *Setting up a GitHub App* and *Setting parameters for GitHub Actions*. (source: https://docs.sonarsource.com/sonarqube-community-build/devops-platform-integration/github-integration/setting-up-at-global-level.md)
2. **Administration > Project coverage** → import the repository; this creates the project.
3. Pick the analysis method on the project page and configure CI (`14-integracao-ci.md`).
4. Generate an analysis token, store it as a CI secret. At scale: `api/user_tokens/generate` per project, injected as a platform secret via API; or one global token.

`[Community Build]` **no** multi-instance support for the same platform, no monorepo (source: https://docs.sonarsource.com/sonarqube-community-build/feature-comparison-table.md).

## 3. PR analysis vs branch analysis

`[Server: Developer/Enterprise/Data Center]` **Pull request analysis**: on PR opening and every push; reports only PR-introduced issues; the PR QG uses new-code conditions only, new code = diff against the target branch. Hence no file-level issues, and issues on old lines do not appear in the PR (backdating); they can surface in the target branch's first analysis after merge. (source: https://docs.sonarsource.com/sonarqube-server/discovering/code-analysis/pull-request-analysis.md)

`[Server]` **Branch analysis**: on pushes to any branch, no PR needed: old-version, develop/production or PR-less feature branches. The QG is the project one (no per-branch QG), but new code can be defined per branch. (source: https://docs.sonarsource.com/sonarqube-server/discovering/code-analysis/branch-analysis.md)

`[Community Build]` the comparison table is explicit: **Branch analysis = "Main branch only"**, **Pull request analysis = "Not available"**, **Quality gate status report on pull requests / preventing merge = "Not available"**. Binding serves authentication/import only: no decoration, no merge blocking by QG. (source: feature-comparison-table.md, above)

## 4. PR decoration

`[Server]` result + QG status reach the platform UI, issues inline. `[Community Build]` leaves only the CI job status (`14-integracao-ci.md`): QG Check Action (GitHub), QG Check Pipe (Bitbucket), `SonarQubePublish` (Azure) or pause (Jenkins). `sonar.qualitygate.wait=true` is not decoration: it only blocks the step. (source: pull-request-analysis.md, above, https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/ci-integration/overview.md)

## 5. Tokens and permissions

| Token | Use | Rule |
|---|---|---|
| User (`User`) | any UI action of that user; mandatory for IDE *connected mode* | inherits **all** issuer permissions — beware admins |
| Project analysis | CI of one project | issuer needs *Execute Analysis* on it; recommended |
| Global analysis | any project | requires *Global Execute Analysis* |

Losing the permission invalidates the token; tokens can expire and `SonarQube-Authentication-Token-Expiration` aids rotation. (source: https://docs.sonarsource.com/sonarqube-community-build/user-guide/managing-tokens.md)

`[Community Build]` no token lifetime limit, no SCIM (source: feature-comparison-table.md, above).

## 6. Community Build limits

| Feature | Community Build | Server/Cloud |
|---|---|---|
| DevOps platforms (GitHub, Bitbucket Cloud, GitLab, Azure) | Included | Included |
| User authentication | Included | Included |
| Bitbucket Data Center | Included | Included (Cloud: no) |
| Branch analysis / PR analysis / PR decoration | Main branch only / no / no | Included |
| Monorepo / multiple ALM instances | no | Enterprise/DC |

(source: feature-comparison-table.md, above)

## 7. Pitfalls

- **Admin token for CI.** A leaked global token exposes every instance and project; use a project token.
- **Expecting a PR comment on Community Build.** It does not exist; block the job instead.
- **Two Bitbucket accounts (Cloud + DC).** One platform: a single configuration.
- **Importing without configuring analysis.** Project coverage reports "repositories imported" and "projects analyzed" separately; importing is not enough.

## Sources

- repo ae3d6eb: `settings.gradle:33-37,61`, `server/sonar-auth-github/src/main/java/org/sonar/auth/github/GitHubIdentityProvider.java:44`, `server/sonar-auth-gitlab/src/main/java/org/sonar/auth/gitlab/GitLabIdentityProvider.java:51`, `server/sonar-auth-bitbucket/src/main/java/org/sonar/auth/bitbucket/BitbucketIdentityProvider.java:52`, `server/sonar-db-dao/src/main/java/org/sonar/db/alm/setting/ProjectAlmSettingDao.java:40`, `server/sonar-db-dao/src/main/java/org/sonar/db/alm/setting/AlmSettingDao.java:32`, `server/sonar-alm-client/src/main/java/org/sonar/alm/client/github/security/GithubAppSecurityImpl.java:45`, `server/sonar-alm-client/src/main/java/org/sonar/alm/client/gitlab/GitlabProjectAccessToken.java:35`, `server/sonar-alm-client/src/main/java/org/sonar/alm/client/azure/AzureDevOpsHttpClient.java:47`
- https://docs.sonarsource.com/sonarqube-community-build/feature-comparison-table.md
- https://docs.sonarsource.com/sonarqube-community-build/project-coverage.md
- https://docs.sonarsource.com/sonarqube-community-build/devops-platform-integration/github-integration/setting-up-at-global-level.md
- https://docs.sonarsource.com/sonarqube-server/discovering/code-analysis/pull-request-analysis.md
- https://docs.sonarsource.com/sonarqube-server/discovering/code-analysis/branch-analysis.md
- https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/ci-integration/overview.md
- https://docs.sonarsource.com/sonarqube-community-build/user-guide/managing-tokens.md
