Queries
Índice
Queries
/queries.:format
GET
/queries.:format
GET
Returns the list of all custom queries visible by the user (public and private queries) for all projects.

Examples:

GET /queries.xml
Response:

<?xml version="1.0" encoding="UTF-8"?>
<queries type="array" total_count="5" limit="25" offset="0">
  <query>
    <id>84</id>
    <name>Documentation issues</name>
    <is_public>true</is_public>
    <project_id>1</project_id>
  </query>
  <query>
    <id>1</id>
    <name>Open defects</name>
    <is_public>true</is_public>
    <project_id>1</project_id>
  </query>
</queries>
Armed with a query id, you can get the corresponding issue list using:

GET /issues.xml?query_id=:id
GET /issues.xml?query_id=:id&project_id=foo
Arquivos (0)
