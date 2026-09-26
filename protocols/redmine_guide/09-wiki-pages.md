Wiki Pages
Índice
Wiki Pages
Getting the pages list of a wiki
Getting a wiki page
Getting an old version of a wiki page
Creating or updating a wiki page
Attaching files
Deleting a wiki page
Getting the pages list of a wiki
GET /projects/foo/wiki/index.xml
Returns the list of all pages in a project wiki.

Response:

<?xml version="1.0"?>
<wiki_pages type="array">
  <wiki_page>
    <title>UsersGuide</title>
    <version>2</version>
    <created_on>2008-03-09T12:07:08Z</created_on>
    <updated_on>2008-03-09T23:41:33+01:00</updated_on>
  </wiki_page>
  <wiki_page>
    <title>GettingStarted</title>
    <parent title="UsersGuide"/>
    <version>1</version>
    <created_on>2026-06-10T23:18:07Z</created_on>
    <updated_on>2026-06-10T23:18:07Z</updated_on>
  </wiki_page>
  ...
</wiki_pages>
Getting a wiki page
GET /projects/foo/wiki/UsersGuide.xml
Returns the details of a wiki page.

Includable:
attachments
Response:

<?xml version="1.0"?>
<wiki_page>
  <title>UsersGuide</title>
  <parent title="Installation_Guide"/>
  <text>h1. Users Guide
  ...
  ...</text>
  <version>22</version>
  <author id="11" name="John Smith"/>
  <comments>Typo</comments>
  <created_on>2009-05-18T20:11:52Z</created_on>
  <updated_on>2012-10-02T11:38:18Z</updated_on>
</wiki_page>
Getting an old version of a wiki page
GET /projects/foo/wiki/UsersGuide/23.xml
Returns the details of an old version of a wiki page.

Includable:
attachments
Response:


Same as above.

Creating or updating a wiki page
PUT /projects/foo/wiki/UsersGuide.xml
<?xml version="1.0"?>
<wiki_page>
  <text>Example</text>
  <comments>Typo</comments>
  <parent_title>Manuals</parent_title>
</wiki_page>
Creates or updates a wiki page.

You can include a parent_title attribute to create or update the page as a child of an existing wiki page. To make the page a root page, omit parent_title or leave it blank.

When updating an existing page, you can include a version attribute to make sure that the page is a specific version when you try to update it (eg. you don't want to overwrite an update that would have been done after you retrieved the page). Example:

PUT /projects/foo/wiki/UsersGuide.xml
<?xml version="1.0"?>
<wiki_page>
  <text>Example</text>
  <comments>Typo</comments>
  <version>18</version>
</wiki_page>
This would update the page if its current version is 18, otherwise a 409 Conflict error is returned.

Attaching files
JSON example

First, upload your file(s):

POST /uploads.json
Content-Type: application/octet-stream
...
(request body is the file content)

# 201 response
{"upload":{"token":"7167.ed1ccdb093229ca1bd0b043618d88743"}}
If you want to attach more than one file, upload them one by one, and save all the tokens.
Then create/update the wiki page using the attachments token (with one or more files provided as an array of objects):

PUT /projects/project_name/wiki/wiki_name.json
{
    "wiki_page": {
        "text": "This is a wiki page with images (like this: !img.png!), and other files.",
        "uploads": [
            {"token": "7167.ed1ccdb093229ca1bd0b043618d88743", "filename": "img.bmp", "content-type": "image/png"},
            {"token": "7168.d595398bbb104ed3bba0eed666785cc6", "filename": "document.pdf", "content-type": "application/pdf"}
        ]
    }
}
Note:

Discover more
Networking
Computer Drives & Storage
Data Formats & Protocols
When creating or updating wiki pages, the text field must be provided, otherwise you will get a 422 Unprocessable Entity error saying: "Text field can't be blank".
If you do not wish to change the text, you can keep it by first getting the wiki page as described above, and provide the current text in the update.

Response:
204 No Content: page was updated
201 Created: page was created
409 Conflict: occurs when trying to update a stale page (see above)
422 Unprocessable Entity: page was not saved due to validation failures (response body contains the error messages)
Deleting a wiki page
DELETE /projects/foo/wiki/UsersGuide.xml
Deletes a wiki page, its attachments and its history. If the deleted page is a parent page, its child pages are not deleted but changed as root pages.

Response:
204 No Content: page was deleted
Arquivos (0)
