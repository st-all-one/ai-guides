Versions
Índice
Versions
/projects/:project_id/versions.:format
GET
POST
/versions/:id.:format
GET
PUT
DELETE
/projects/:project_id/versions.:format
GET
Returns the versions available for the project of given id or identifier (:project_id). The response may include shared versions from other projects.

Examples:

GET /projects/foo/versions.xml
GET /projects/1/versions.xml
Response:

<?xml version="1.0" encoding="UTF-8"?>
<versions type="array" total_count="34">
  <version>
    <id>1</id>
    <project name="Redmine" id="1"/>
    <name>0.7</name>
    <description/>
    <status>closed</status>
    <due_date>2008-04-28</due_date>
    <sharing>none</sharing>
    <created_on>2008-03-09T12:52:06+01:00</created_on>
    <updated_on>2009-11-15T12:22:12+01:00</updated_on>
    <wiki_page_title>FooBarWikiPage</version_wiki_page_title>
  </version>
  <version>
    <id>2</id>
    <project name="Redmine" id="1"/>
    <name>0.8</name>
    <description/>
    <status>closed</status>
    <due_date>2008-12-30</due_date>
    <sharing>none</sharing>
    <wiki_page_title>FooBarWikiPage</version_wiki_page_title>
    <created_on>2008-03-09T12:52:12+01:00</created_on>
    <updated_on>2009-11-15T12:22:12+01:00</updated_on>
  </version>
</versions>
POST
Discover more
Online Communities
Primary & Secondary Schooling (K-12)
Visual Art & Design
Creates a version for the project of given id or identifier (:project_id).

Parameters:

version (required): a hash of the version attributes, including:
name (required)
status: the status of the version in: open (default), locked, closed
sharing: the version sharing in: none (default), descendants, hierarchy, tree, system
due_date
description
wiki_page_title
Response:

201 Created: version was created
422 Unprocessable Entity: version was not created due to validation failures (response body contains the error messages)
/versions/:id.:format
GET
Returns the version of given id.

Example:

GET /versions/2.xml
Response:

<?xml version="1.0" encoding="UTF-8"?>
<version>
  <id>2</id>
  <project name="Redmine" id="1"/>
  <name>0.8</name>
  <description/>
  <status>closed</status>
  <due_date>2008-12-30</due_date>
  <estimated_hours>0.0</estimated_hours>
  <spent_hours>0.0</spent_hours>
  <created_on>2008-03-09T12:52:12+01:00</created_on>
  <updated_on>2009-11-15T12:22:12+01:00</updated_on>
</version>
PUT
Updates the version of given id

Parameters:

Discover more
Internet & Telecom
Creates
Software Utilities
Same as version creation

Response:

204 No Content: version was updated
422 Unprocessable Entity: version was not updated due to validation failures (response body contains the error messages)
DELETE
Deletes the version of given id.

Response:

204 No Content: version was deleted
422 Unprocessable Entity: version was not deleted (response body contains the error messages)
