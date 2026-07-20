MyAccount
/my/account.:format
GET
Returns the details of your account.

Examples:

GET /my/account.xml
GET /my/account.json
Response:

<?xml version="1.0" encoding="UTF-8"?>
<user>
  <id>3</id>
  <login>dlopper</login>
  <admin>false</admin>
  <firstname>Dave</firstname>
  <lastname>Lopper</lastname>
  <mail>dlopper@somenet.foo</mail>
  <created_on>2006-07-19T17:33:19Z</created_on>
  <last_login_on>2020-06-14T13:03:34Z</last_login_on>
  <api_key>c308a59c9dea95920b13522fb3e0fb7fae4f292d</api_key>
  <custom_fields type="array">
    <custom_field id="4" name="Phone number">
      <value/>
    </custom_field>
    <custom_field id="5" name="Money">
      <value/>
    </custom_field>
  </custom_fields>
</user>
PUT
Updates your account.

TODO
