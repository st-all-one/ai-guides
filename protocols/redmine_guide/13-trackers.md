Rest Trackers
Índice
Rest Trackers
/trackers.:format
GET
/trackers.:format
GET
Returns the list of all trackers.

Examples:

GET /trackers.xml
Response:

<?xml version="1.0" encoding="UTF-8"?>
<trackers type="array">
  <tracker>
    <id>1</id>
    <name>Defect</name>
    <default_status id="1" name="New"/>
    <description>Description for Bug tracker</description>
    <enabled_standard_fields type="array">
      <field>assigned_to_id</field>
      <field>category_id</field>
      <field>fixed_version_id</field>
      <field>parent_issue_id</field>
      <field>start_date</field>
      <field>due_date</field>
      <field>estimated_hours</field>
      <field>done_ratio</field>
      <field>description</field>
    </enabled_standard_fields>
  </tracker>
  <tracker>
    <id>2</id>
    <name>Feature</name>
    <default_status id="1" name="New"/>
    <description>Description for Feature request tracker</description>
    <enabled_standard_fields type="array">
      <field>assigned_to_id</field>
      <field>category_id</field>
      <field>fixed_version_id</field>
      <field>parent_issue_id</field>
      <field>start_date</field>
      <field>due_date</field>
      <field>estimated_hours</field>
      <field>done_ratio</field>
      <field>description</field>
    </enabled_standard_fields>
  </tracker>
</trackers>
description: available since Redmine 4.2.0
enabled_standard_fields: available since Redmine 5.0.0
