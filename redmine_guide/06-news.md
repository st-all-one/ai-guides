News
Índice
News
Listing news
Showing a news item
Creating a news item
Updating a news item
Deleting a news item
Listing news
GET /news.[format]
GET /projects/[project_id]/news.[format]
Returns a paginated list of news items. When project_id is given, only news from the project with the given id or identifier is returned.

Parameters:

offset: skip this number of news items in response (optional)
limit: number of news items per page (optional)
Examples:

GET /news.xml
GET /news.json
GET /projects/foo/news.xml
GET /projects/foo/news.json

Paging example:
GET /news.xml?offset=0&limit=100
GET /news.xml?offset=100&limit=100
Response:

<?xml version="1.0" encoding="UTF-8"?>
<news type="array" limit="25" total_count="2" offset="0">
  <news>
    <id>54</id>
    <project name="Redmine" id="1"/>
    <author name="Jean-Philippe Lang" id="1"/>
    <title>Redmine 1.1.3 released</title>
    <summary/>
    <description>Redmine 1.1.3 has been released</description>
    <created_on>2011-04-29T14:00:25+02:00</created_on>
  </news>
  <news>
    <id>53</id>
    <project name="Redmine" id="1"/>
    <author name="Jean-Philippe Lang" id="1"/>
    <title>Redmine 1.1.2 bug/security fix released</title>
    <summary/>
    <description>Redmine 1.1.2 has been released</description>
    <created_on>2011-03-07T21:07:03+01:00</created_on>
  </news>
</news>
Showing a news item
GET /news/[id].[format]
Parameters:

include: fetch associated data (optional, use comma to fetch multiple associations). Possible values:
attachments
comments
Examples:

GET /news/2.xml
GET /news/2.json

GET /news/2.xml?include=attachments
GET /news/2.xml?include=comments
Response:

<?xml version="1.0" encoding="UTF-8"?>
<news>
  <id>54</id>
  <project name="Redmine" id="1"/>
  <author name="Jean-Philippe Lang" id="1"/>
  <title>Redmine 1.1.3 released</title>
  <summary/>
  <description>Redmine 1.1.3 has been released</description>
  <created_on>2011-04-29T14:00:25+02:00</created_on>
</news>
Creating a news item
POST /projects/[project_id]/news.[format]
Parameters:

news - A hash of the news attributes:
title
summary
description
Attachments can be added when you create a news item, see Attaching files.


Examples:

POST /projects/1/news.xml

<?xml version="1.0"?>
<news>
  <title>Example</title>
  <summary>News summary</summary>
  <description>News description</description>
</news>
POST /projects/1/news.json

{
  "news": {
    "title": "Example",
    "summary": "News summary",
    "description": "News description" 
  }
}
Updating a news item
PUT /news/[id].[format]
Parameters:

news - A hash of the news attributes:
title
summary
description
Attachments can be added when you update a news item, see Attaching files.

Examples:

PUT /news/[id].xml

<?xml version="1.0"?>
<news>
  <title>Title changed</title>
  <summary>Summary changed</summary>
  <description>Description changed</description>
</news>
PUT /news/[id].json

{
  "news": {
    "title": "Title changed",
    "summary": "Summary changed",
    "description": "Description changed" 
  }
}
Deleting a news item
DELETE /news/[id].[format]
