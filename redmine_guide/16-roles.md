Roles
Índice
Roles
/roles.:format
GET
/roles/[id].:format
GET
/roles.:format
GET
Returns the list of roles.

Examples:

GET /roles.xml
Response:

<?xml version="1.0" encoding="UTF-8"?>
<roles type="array">
  <role>
    <id>1</id>
    <name>Manager</name>
  </role>
  <role>
    <id>2</id>
    <name>Developer</name>
  </role>
</roles>
/roles/[id].:format
GET
Returns the list of permissions for a given role (2.2.0).

Examples:

GET /roles/5.xml
Response:

<role>
  <id>5</id>
  <name>Reporter</name>
  <assignable>true</assignable>
  <issues_visibility>default</issues_visibility>
  <time_entries_visibility>all</time_entries_visibility>
  <users_visibility>all</users_visibility>
  <permissions type="array">
    <permission>view_issues</permission>
    <permission>add_issues</permission>
    <permission>add_issue_notes</permission>
    ...
  </permissions>
</role>
