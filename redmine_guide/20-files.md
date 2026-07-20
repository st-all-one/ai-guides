Files
Índice
Files
/projects/:project_id/files.:format
GET
POST
/projects/:project_id/files.:format
GET
Returns the files available for the project of given id or identifier (:project_id).

Examples:

GET /projects/foo/files.xml
GET /projects/1/files.xml
Response:

<?xml version="1.0" encoding="UTF-8"?>
<files type="array">
  <file>
    <id>12</id>
    <filename>foo-1.0-setup.exe</filename>
    <filesize>74753799</filesize>
    <content_type>application/octet-stream</content_type>
    <description>Foo App for Windows</description>
    <content_url>http://localhost:3000/attachments/download/12/foo-1.0-setup.exe</content_url>
    <author id="1" name="Redmine Admin"/>
    <created_on>2017-01-04T09:12:32Z</created_on>
    <version id="2" name="1.0"/>
    <digest>1276481102f218c981e0324180bafd9f</digest>
    <downloads>12</downloads>
  </file>
  <file>
    <id>11</id>
    <filename>foo-1.0.dmg</filename>
    <filesize>6886287</filesize>
    <content_type>application/x-octet-stream</content_type>
    <description>Foo App for macOS</description>
    <content_url>http://localhost:3000/attachments/download/11/foo-1.0.dmg</content_url>
    <author id="1" name="Redmine Admin"/>
    <created_on>2017-01-04T09:12:07Z</created_on>
    <version id="2" name="1.0"/>
    <digest>14758f1afd44c09b7992073ccf00b43d</digest>
    <downloads>5</downloads>
  </file>
</files>
POST
Upload a file for the project of given id or identifier (:project_id).

Discover more
Data Formats & Protocols
Web Design & Development
Computer Science
Parameters:

file (required): a hash of the version attributes, including:
token (required): a token for your uploaded file. See Attaching files.
version_id
filename
description
Example:

POST /projects/1/files.xml
Response:

<?xml version="1.0"?>
<file>
  <token>21.01a1d7b1c2ffcbbc9ecf14debeec27d8</token>
  <version_id>2</version_id>
  <filename>foo-1.0-src.tar.tgz</filename>
  <description>Foo App source code</description>
</file>
