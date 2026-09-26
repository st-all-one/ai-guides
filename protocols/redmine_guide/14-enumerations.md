Enumerations
Índice
Enumerations
/enumerations/issue_priorities.:format
GET
/enumerations/time_entry_activities.:format
GET
/enumerations/document_categories.:format
GET
/enumerations/issue_priorities.:format
GET
Returns the list of issue priorities.

Examples:

GET /enumerations/issue_priorities.xml
Response:

<?xml version="1.0" encoding="UTF-8"?>
<issue_priorities type="array">
  <issue_priority>
    <id>3</id>
    <name>Low</name>
    <is_default>false</is_default>
  </issue_priority>
  <issue_priority>
    <id>4</id>
    <name>Normal</name>
    <is_default>true</is_default>
  </issue_priority>
  ...
</issue_priorities>
/enumerations/time_entry_activities.:format
GET
Returns the list of time entry activities.

Examples:

GET /enumerations/time_entry_activities.xml
Response:

<time_entry_activities type="array">
  <time_entry_activity>
    <id>8</id>
    <name>Design</name>
    <is_default>false</is_default>
  </time_entry_activity>
  ...
</time_entry_activities>
/enumerations/document_categories.:format
Discover more
Networking
Software Utilities
Web Design & Development
GET
Returns the list of document categories.

Examples:

GET /enumerations/document_categories.xml
Response:

<document_categories type="array">
  <document_category>
    <id>1</id>
    <name>Uncategorized</name>
    <is_default>false</is_default>
  </document_category>
  <document_category>
    <id>2</id>
    <name>User documentation</name>
    <is_default>false</is_default>
  </document_category>
  <document_category>
    <id>3</id>
    <name>Technical documentation</name>
    <is_default>false</is_default>
  </document_category>
</document_categories>
