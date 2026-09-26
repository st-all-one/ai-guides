Attachments
To attach files through the API, please see Attaching files in general topics.

/attachments/:id.:format
GET
Returns the description of the attachment of given id.
The file can actually be downloaded at the URL given by the content_url attribute in the response.

Example:

GET /attachments/13.xml
Response:

<attachment>
  <id>6243</id>
  <filename>test.txt</filename>
  <filesize>124</filesize>
  <content_type>text/plain</content_type>
  <description>This is an attachment</description>
  <content_url>http://localhost:3000/attachments/download/6243/test.txt</content_url>
  <author name="Jean-Philippe Lang" id="1"/>
  <created_on>2011-07-18T22:58:40+02:00</created_on>
</attachment>
Note: when getting an issue through the API, its attachments can also be retrieved in a single request using GET /issues/:id.:format?include=attachments.

PATCH
Updates attachments.

(Not documented yet. See #22356 for details)

DELETE
Delete an attachment.

Example:

DELETE /attachments/6243.json
