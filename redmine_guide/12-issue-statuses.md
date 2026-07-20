Issue Statuses
Índice
Issue Statuses
/issue_statuses.:format
GET
/issue_statuses.:format
GET
Returns the list of all issue statuses.

Examples:

GET /issue_statuses.xml
Response:

<?xml version="1.0" encoding="UTF-8"?>
<issue_statuses type="array">
  <issue_status>
    <id>1</id>
    <name>New</name>
    <is_closed>false</is_closed>
  </issue_status>
  <issue_status>
    <id>2</id>
    <name>Closed</name>
    <is_closed>true</is_closed>
  </issue_status>
</issue_statuses>
