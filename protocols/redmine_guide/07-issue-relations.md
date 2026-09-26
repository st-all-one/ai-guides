Issue Relations
Índice
Issue Relations
/issues/:issue_id/relations.:format
GET
POST
/relations/:id.:format
GET
DELETE
/issues/:issue_id/relations.:format
GET
Returns the relations for the issue of given id (:issue_id).

XML example:

GET /issues/8470/relations.xml
Response:

<?xml version="1.0" encoding="UTF-8"?>
<relations type="array">
  <relation>
    <id>1819</id>
    <issue_id>8470</issue_id>
    <issue_to_id>8469</issue_to_id>
    <relation_type>relates</relation_type>
    <delay/>
  </relation>
  <relation>
    <id>1820</id>
    <issue_id>8470</issue_id>
    <issue_to_id>8467</issue_to_id>
    <relation_type>relates</relation_type>
    <delay/>
  </relation>
</relations>
json example:

GET /issues/8470/relations.json
Response:

{
    "relations": [
        {
            "delay": null,
            "id": 1819,
            "issue_id": 8470,
            "issue_to_id": 8469,
            "relation_type": "relates" 
        },
        {
            "delay": null,
            "id": 1820,
            "issue_id": 8470,
            "issue_to_id": 8467,
            "relation_type": "relates" 
        }
    ]
}

Note: when getting an issue, relations can also be retrieved in a single request using /issues/:id.:format?include=relations.

Discover more
Language Resources
Online Communities
Visual Art & Design
POST
Creates a relation for the issue of given id (:issue_id).

Parameters:

relation (required): a hash of the relation attributes, including:
issue_to_id (required): the id of the related issue
relation_type (required to explicit : default "relates"): the type of relation (in: "relates", "duplicates", "duplicated", "blocks", "blocked", "precedes", "follows", "copied_to", "copied_from")
delay (optional): the delay for a "precedes" or "follows" relation
Response:

201 Created: relation was created
422 Unprocessable Entity: relation was not created due to validation failures (response body contains the error messages)
Examples:

POST /issues/83/relations.xml

<?xml version="1.0" encoding="UTF-8"?>
<relation>
  <issue_to_id>82</issue_to_id>
  <relation_type>relates</relation_type>
</relation>

POST /issues/83/relations.json

{
  "relation": {
    "issue_to_id": 82,
    "relation_type": "relates" 
  }
}
/relations/:id.:format
GET
Returns the relation of given id.

XML example:

GET /relations/1819.xml
Response:

<?xml version="1.0" encoding="UTF-8"?>
<relation>
  <id>1819</id>
  <issue_id>8470</issue_id>
  <issue_to_id>8469</issue_to_id>
  <relation_type>relates</relation_type>
  <delay/>
</relation>
json example:

GET /relations/1819.json
Response:

{
    "relation": {
        "delay": null,
        "id": 1819,
        "issue_id": 8470,
        "issue_to_id": 8469,
        "relation_type": "relates" 
    }
}
DELETE
Discover more
Standardized & Admissions Tests
Networking
Word Games
Deletes the relation of given id.

Response:

204 No Content: relation was deleted
422 Unprocessable Entity: relation was not deleted (response body contains the error messages)
