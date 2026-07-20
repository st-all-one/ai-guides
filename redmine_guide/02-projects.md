Projects
Índice
Projects
Listing projects
Showing a project
Creating a project
Updating a project
Archiving a project
Unarchiving a project
Deleting a project
Limitations:
Listing projects
GET /projects.xml
Returns all projects (all public projects and private projects where user have access to)

Parameters:

include: fetch associated data (optional). Values should be separated by a comma ",". Possible values:
trackers
issue_categories
enabled_modules (since 2.6.0)
time_entry_activities (since 3.4.0)
issue_custom_fields (since 4.2.0)
Response:

<projects type="array">
  <project>
    <id>1</id>
    <name>Redmine</name>
    <identifier>redmine</identifier>
    <description>
      Redmine is a flexible project management web application written using Ruby on Rails framework.
    </description>
    <created_on>Sat Sep 29 12:03:04 +0200 2007</created_on>
    <updated_on>Sun Mar 15 12:35:11 +0100 2009</updated_on>
    <is_public>true</is_public>
  </project>
  <project>
    <id>2</id>
    ...
  </project>
Notes:
is_public is exposed since 2.6.0
Showing a project
GET /projects/[id].xml
Returns the project of given id or identifier.

Parameters:

include: fetch associated data (optional). Values should be separated by a comma ",". Possible values:
trackers
issue_categories
enabled_modules (since 2.6.0)
time_entry_activities (since 3.4.0)
issue_custom_fields (since 4.2.0)
Examples:

GET /projects/12.xml
GET /projects/12.xml?include=trackers
GET /projects/12.xml?include=trackers,issue_categories
GET /projects/12.xml?include=enabled_modules
GET /projects/redmine.xml
Response:

<?xml version="1.0" encoding="UTF-8"?>
<project id="1">
  <name>Redmine</name>
  <identifier>redmine</identifier>
  <description>
    Redmine is a flexible project management web application written using Ruby on Rails framework.
  </description>
  <homepage></homepage>
  <status>1</status>
  <parent id="123" name="foo"/>
  <default_version id="3" name="2.0"/>
  <default_assignee id="2" name="John Smith"/>
  <created_on>Sat Sep 29 12:03:04 +0200 2007</created_on>
  <updated_on>Sun Mar 15 12:35:11 +0100 2009</updated_on>
  <is_public>true</is_public>
</project>
Notes:
is_public is exposed since 2.6.0
Creating a project
POST /projects.xml
Creates a project.


Parameters:

project (required): a hash of the project attributes, including:
name (required): the project name
identifier (required): the project identifier
description
homepage
is_public: true or false
parent_id: the parent project number
inherit_members: true or false
default_assigned_to_id: ID of the default user. It works only when the new project is a subproject and it inherits the members.
default_version_id: ID of the default version. It works only with existing shared versions.
tracker_ids: an array of tracker IDs: 1 for Bug, etc.
enabled_module_names: an array of module names: boards, calendar, documents, files, gantt, issue_tracking, news, repository, time_tracking, wiki.
issue_custom_field_ids: an array of issue custom field IDs.
custom_field_values: array with id => value pairs
POST /projects.xml
<project>
  <name>test project</name>
  <identifier>test</identifier>
  <enabled_module_names>time_tracking</enabled_module_names>
  <enabled_module_names>issue_tracking</enabled_module_names>
</project>
POST /projects.json
{
   "project":{
      "name":"Example name",
      "identifier":"example_name",
      "description":"Description of exapmple project",
      "is_public":false,
      "parent_id":1,
      "inherit_members":false,
      "tracker_ids":[
         1,
         2,
         3,
         4,
         5
      ],
      "enabled_module_names":[
         "issue_tracking" 
      ],
      "custom_field_values":{
         "1":"VALUE" 
      }
   }
}
Response:

201 Created: project was created
422 Unprocessable Entity: project was not created due to validation failures (response body contains the error messages)
Updating a project
PUT /projects/[id].xml
Updates the project of given id or identifier.

Discover more
Primary & Secondary Schooling (K-12)
Software Utilities
Visual Art & Design
Archiving a project
PUT /projects/[id]/archive.xml
Archives the project of given id or identifier. Available since Redmine 5.0.

Unarchiving a project
PUT /projects/[id]/unarchive.xml
Unrchives the project of given id or identifier. Available since Redmine 5.0.

Deleting a project
DELETE /projects/[id].xml
Deletes the project of given id or identifier.

Limitations:
A POST request on Redmine 1.0.1-2 (Debian stable) does not work using the API key, but does work with a login/passwd authentication
#12104
