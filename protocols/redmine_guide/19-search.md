Search
Índice
Search
/search.:format
GET
/search.:format
GET
Returns the search results by the specified condition parameters.

Parameters:

offset: skip this number of results in response (optional)
limit: number of results in response (optional)
q: query strings. enable to specify multiple values separated by a space " ".
Optional filters:

scope: search scope condition
'all': search all projects
'my_project': search assigned projects
'subprojects': include subproject when project spacified
all_words: matched all query strings or not
titles_only: matched only title or not
issues: include Issues or not
news: include News or not
documents: include Documents or not
changesets: include Changesets or not
wiki_pages: include Wiki Pages or not
messages: include Messages or not
projects: include Projects or not
open_issues: filterd by open issues.
attachments: filterd by description and attachment
'0': seach only in description
'1': search by description and attachment
'only': search only in attachment
Examples:

GET /search.xml?q=query_string

Paging example:
GET /search.xml?q=query_string&offset=0&limit=100

Filtering issues and wikis example:
GET /search.xml?q=issue_keyword wiki_keyword&issues=1&wiki_pages=1
Response:

<results total_count="2" offset="0" limit="25" type="array">
  <result>
    <id>5</id>
    <title>Wiki: Wiki_Page_Name</title>
    <type>wiki-page</type>
    <url>
    http://www.redmine.org/projects/new_crm_dev/wiki/Wiki_Page_Name
    </url>
    <description>h1. Wiki Page Name wiki_keyword</description>
    <datetime>2016-03-25T05:23:35Z</datetime>
  </result>
  <result>
    <id>10</id>
    <title>Issue #10 (Closed): Issue_Title</title>
    <type>issue closed</type>
    <url>http://www.redmin.org/issues/10</url>
    <description>issue_keyword</description>
    <datetime>2016-03-24T05:18:59Z</datetime>
  </result>
</results>
