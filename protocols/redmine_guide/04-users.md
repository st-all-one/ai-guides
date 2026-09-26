Users
Índice
Users
/users.:format
GET
POST
/users/:id.:format
GET
PUT
DELETE
See also
/users.:format
GET
Returns a list of users.

This endpoint requires admin privileges.

Example:

GET /users.xml
Optional filters:

status: get only users with the given status. See app/models/principal.rb for a list of available statuses. Supply an empty value to match all users regardless of their status. Default is 1 (active users). Possible values are:
1: Active (User can login and use their account)
2: Registered (User has registered but not yet confirmed their email address or was not yet activated by an administrator. User can not login)
3: Locked (User was once active and is now locked, User can not login)
name: filter users on their login, firstname, lastname and mail ; if the pattern contains a space, it will also return users whose firstname match the first word or lastname match the second word.
group_id: get only users who are members of the given group
POST
Creates a user.

This endpoint requires admin privileges.

Parameters:

user (required): a hash of the user attributes, including:
login (required): the user login
password: the user password
firstname (required)
lastname (required)
mail (required)
auth_source_id: authentication mode id
mail_notification: only_my_events, none, etc.
must_change_passwd: true or false
generate_password: true or false
custom_fields - See Custom fields
send_information: true or false : Send account information to the user
Example:

POST /users.xml
<?xml version="1.0" encoding="ISO-8859-1" ?>
<user>
  <login>jplang</login>
  <firstname>Jean-Philippe</firstname>
  <lastname>Lang</lastname>
  <password>secret</password>
  <mail>jp_lang@yahoo.fr</mail>
  <auth_source_id>2</auth_source_id>
</user>
JSON

{
    "user": {
        "login": "jplang",
        "firstname": "Jean-Philippe",
        "lastname": "Lang",
        "mail": "jp_lang@yahoo.fr",
        "password": "secret" 
    }
}
Response:

201 Created: user was created
422 Unprocessable Entity: user was not created due to validation failures (response body contains the error messages)
/users/:id.:format

GET
Returns the user details. You can use /users/current.:format for retrieving the user whose credentials are used to access the API.

This endpoint can be used by admin or non admin but the returned fields will depend on the privileges of the requesting user (see Response below).

Parameters:

include (optional): a comma separated list of associations to include in the response:
memberships : adds extra information about user's memberships and roles on the projects
groups (added in 2.1) : adds extra information about user's groups
Examples:

GET /users/current.xml
Returns the details about the current user.

GET /users/3.xml?include=memberships,groups
Returns the details about user ID 3, and additional detail about the user's project memberships.

Response:

<user>
  <id>3</id>
  <login>jplang</login>
  <firstname>Jean-Philippe</firstname>
  <lastname>Lang</lastname>
  <mail>jp_lang@yahoo.fr</mail>
  <created_on>2007-09-28T00:16:04+02:00</created_on>
  <updated_on>2010-08-01T18:05:45+02:00</updated_on>
  <last_login_on>2011-08-01T18:05:45+02:00</last_login_on>
  <passwd_changed_on>2011-08-01T18:05:45+02:00</passwd_changed_on>
  <api_key>ebc3f6b781a6fb3f2b0a83ce0ebb80e0d585189d</api_key>
  <avatar_url></avatar_url>
  <status>1</status>
  <custom_fields type="array" />
  <memberships type="array">
    <membership>
      <project name="Redmine" id="1"/>
      <roles type="array">
        <role name="Administrator" id="3"/>
        <role name="Contributor" id="4"/>
      </roles>
    </membership>
  </memberships>
  <groups type="array">
    <group id="20" name="Developers"/>
  </groups>
</user>
If the user doing the request is not admin, it depends on the requested user:

if the user is not locked and is not admin, the endpoint returns a user object with the fields firstname, lastname, mail, created_on
if the user is not locked and is admin, the endpoint returns a user object with the fields firstname, lastname, created_on, last_login_on
if the user is locked, the endpoint returns 404 status code
if the user is the requesting user, you will also have the fields login, api_key
If the user doing the request is admin, a user object is always returned (blocked or not). It will have some more details:
api_key : the API key of the user, visible for admins and for yourself (added in 2.3.0)
status : a numeric id representing the status of the user, visible for admins only (added in 2.4.0). See app/models/principal.rb for a list of available statuses.
PUT
Discover more
Linux & Unix
Email & Messaging
Dictionaries & Encyclopedias
Updates a user.

This endpoint requires admin privileges.

Example:

PUT /users/20.xml
Parameters:

user (required): a hash of the user attributes (same as for user creation)
admin (optional): possible values are true or false, gives user admin rights in the instance
custom_fields - See Custom fields
DELETE
This endpoint requires admin privileges.

Deletes a user.

Example:

DELETE /users/20.xml
Response:

204 No Content: user was deleted
See also
The Memberships API for adding or removing a user from a project.
The Groups API for adding or removing a user from a group.
