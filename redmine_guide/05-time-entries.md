Time Entries
Índice
Time Entries
Listing time entries
project_id filter
spent_on filter
Showing a time entry
Creating a time entry
Updating a time entry
Deleting a time entry
Listing time entries
GET /time_entries.xml
Returns time entries.

Parameters:

offset
limit
user_id
project_id
spent_on
...
project_id filter
When filtering by project id, you can use either project numeric ID or its string identifier, e.g.

...&project_id=123
...&project_id=my-custom-project
spent_on filter
When filtering by date, you can require a min / max date with a custom syntax:

/time_entries.json?project_id=338&from=2019-01-01&to=2019-01-03&limit=100 
Showing a time entry
GET /time_entries/[id].xml
Returns the time entry of given id.

Creating a time entry
POST /time_entries.xml
Creates a time entry.

Discover more
Computer Science
Primary & Secondary Schooling (K-12)
Content Management
Parameters:

time_entry (required): a hash of the time entry attributes, including:
issue_id or project_id (only one is required): the issue id or project id to log time on (both are integers); note that project ids can only be found using the API (e.g. at /projects.json)
spent_on: the date the time was spent (default to the current date); format is e.g. 2020-12-24
hours (required): the number of spent hours
activity_id: the id of the time activity. This parameter is required unless a default activity is defined in Redmine.
comments: short description for the entry (255 characters max)
user_id: user id to be specified in need of posting time on behalf of another user
Response:

201 Created: time entry was created
422 Unprocessable Entity: time entry was not created due to validation failures (response body contains the error messages)
Updating a time entry
PUT /time_entries/[id].xml
Updates the time entry of given id.

Parameters:

time_entry (required): a hash of the time entry attributes (same as above)
Response:

204 No Content: time entry was updated
422 Unprocessable Entity: time entry was not updated due to validation failures (response body contains the error messages)
Deleting a time entry
DELETE /time_entries/[id].xml
Deletes the time entry of given id.
