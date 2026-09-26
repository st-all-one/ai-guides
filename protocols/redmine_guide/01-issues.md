Issues
Índice
Issues
Listing issues
Showing an issue
Creating an issue
Updating an issue
Deleting an issue
Adding a watcher
Removing a watcher
Listing issues
GET /issues.[format]
Returns a paginated list of issues. By default, it returns open issues only.

Parameters:

offset: skip this number of issues in response (optional)
limit: number of issues per page (optional)
sort: column to sort with. Append :desc to invert the order.
include: fetch associated data (optional, use comma to fetch multiple associations). Possible values:
attachments - Since 3.4.0
relations
Optional filters:

issue_id: get issue with the given id or multiple issues by id using ',' to separate id.
project_id: get issues from the project with the given id (a numeric value, not a project identifier).
subproject_id: get issues from the subproject with the given id. You can use project_id=XXX&subproject_id=!* to get only the issues of a given project and none of its subprojects.
tracker_id: get issues from the tracker with the given id
status_id: get issues with the given status id only. Possible values: open, closed, * to get open and closed issues, status id
assigned_to_id: get issues which are assigned to the given user id. me can be used instead an ID to fetch all issues from the logged in user (via API key or HTTP auth)
parent_id: get issues whose parent issue is given id.
cf_x: get issues with the given value for custom field with an ID of x. (Custom field must have 'used as a filter' checked.)
...
NB: operators containing ">", "<" or "=" should be hex-encoded so they're parsed correctly. Most evolved API clients will do that for you by default, but for the sake of clarity the following examples have been written with no such magic feature in mind.

Examples:

GET /issues.xml
GET /issues.xml?issue_id=1
GET /issues.xml?issue_id=1,2
GET /issues.xml?project_id=2
GET /issues.xml?project_id=2&tracker_id=1
GET /issues.xml?assigned_to_id=6
GET /issues.xml?assigned_to_id=me
GET /issues.xml?status_id=closed
GET /issues.xml?status_id=*
GET /issues.xml?cf_1=abcdef
GET /issues.xml?sort=category:desc,updated_on

Paging example:
GET /issues.xml?offset=0&limit=100
GET /issues.xml?offset=100&limit=100

To fetch issues for a date range (uncrypted filter is "><2012-03-01|2012-03-07") :
GET /issues.xml?created_on=%3E%3C2012-03-01|2012-03-07

To fetch issues created after a certain date (uncrypted filter is ">=2012-03-01") :
GET /issues.xml?created_on=%3E%3D2012-03-01

Or before a certain date (uncrypted filter is "<= 2012-03-07") :
GET /issues.xml?created_on=%3C%3D2012-03-07

To fetch issues created after a certain timestamp (uncrypted filter is ">=2014-01-02T08:12:32Z") :
GET /issues.xml?created_on=%3E%3D2014-01-02T08:12:32Z

To fetch issues updated after a certain timestamp (uncrypted filter is ">=2014-01-02T08:12:32Z") :
GET /issues.xml?updated_on=%3E%3D2014-01-02T08:12:32Z

To fetch issues for which custom field 4 contains the substring "foo" :
GET /issues.xml?cf_4=~foo
Response:

<?xml version="1.0" encoding="UTF-8"?>
<issues type="array" count="1640">
  <issue>
    <id>4326</id>
    <project name="Redmine" id="1"/>
    <tracker name="Feature" id="2"/>
    <status name="New" id="1"/>
    <priority name="Normal" id="4"/>
    <author name="John Smith" id="10106"/>
    <category name="Email notifications" id="9"/>
    <subject>
      Aggregate Multiple Issue Changes for Email Notifications
    </subject>
    <description>
      This is not to be confused with another useful proposed feature that
      would do digest emails for notifications.
    </description>
    <start_date>2009-12-03</start_date>
    <due_date></due_date>
    <done_ratio>0</done_ratio>
    <estimated_hours></estimated_hours>
    <custom_fields>
      <custom_field name="Resolution" id="2">Duplicate</custom_field>
      <custom_field name="Texte" id="5">Test</custom_field>
      <custom_field name="Boolean" id="6">1</custom_field>
      <custom_field name="Date" id="7">2010-01-12</custom_field>
    </custom_fields>
    <created_on>Thu Dec 03 15:02:12 +0100 2009</created_on>
    <updated_on>Sun Jan 03 12:08:41 +0100 2010</updated_on>
  </issue>
  <issue>
    <id>4325</id>
    ...
  </issue>
</issues>
Showing an issue
GET /issues/[id].[format]
Parameters:

include: fetch associated data (optional, use comma to fetch multiple associations). Possible values:
children
attachments
relations
changesets
journals - See Issue journals for more information.
watchers - Since 2.3.0
allowed_statuses - Since 5.0.x, Returns the available allowed statuses (the same values as provided in the issue edit form) based on:
the issue's current tracker, the issue's current status, and the member's role (the defined workflow);
the existence of any open subtask(s);
the existence of any open blocking issue(s);
the existence of a closed parent issue.
Examples:

GET /issues/2.xml
GET /issues/2.json

GET /issues/2.xml
GET /issues/2.xml?include=attachments
GET /issues/2.xml?include=attachments,journals
Creating an issue
POST /issues.[format]
Parameters:

issue - A hash of the issue attributes:
project_id
tracker_id
status_id
priority_id
subject
description
category_id
fixed_version_id - ID of the Target Versions (previously called 'Fixed Version' and still referred to as such in the API)
assigned_to_id - ID of the user to assign the issue to (currently no mechanism to assign by name)
parent_issue_id - ID of the parent issue
custom_fields - See Custom fields
watcher_user_ids - Array of user ids to add as watchers (since 2.3.0)
is_private - Use true or false to indicate whether the issue is private or not
estimated_hours - Number of hours estimated for issue
Attachments can be added when you create an issue, see Attaching files.


Examples:

POST /issues.xml

<?xml version="1.0"?>
<issue>
  <project_id>1</project_id>
  <subject>Example</subject>
  <priority_id>4</priority_id>
</issue>

POST /issues.json

{
  "issue": {
    "project_id": 1,
    "subject": "Example",
    "priority_id": 4
  }
}
Updating an issue
PUT /issues/[id].[format]
Parameters:

issue - A hash of the issue attributes
project_id
tracker_id
status_id
subject
...
notes - Comments about the update
private_notes - true if notes are private
Attachments can be added when you update an issue, see Attaching files.

Examples:

PUT /issues/[id].xml
<?xml version="1.0"?>
<issue>
  <subject>Subject changed</subject>
  <notes>The subject was changed</notes>
</issue>
PUT /issues/[id].json
{
  "issue": {
    "subject": "Subject changed",
    "notes": "The subject was changed" 
  }
}
Deleting an issue
DELETE /issues/[id].[format]
Adding a watcher
Discover more
Crafts
Freeware & Shareware
Data Management
Added in 2.3.0

POST /issues/[id]/watchers.[format]
Parameters:

user_id (required): id of the user to add as a watcher
Removing a watcher
Added in 2.3.0

DELETE /issues/[id]/watchers/[user_id].[format]
