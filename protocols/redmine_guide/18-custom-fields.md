Custom Fields
Índice
Custom Fields
/custom_fields.:format
GET
/custom_fields.:format
GET
Returns all the custom fields definitions.

This endpoint requires admin privileges.

Examples:

GET /custom_fields.xml
Response:

<?xml version="1.0" encoding="UTF-8"?>
<custom_fields type="array">
  <custom_field>
    <id>1</id>
    <name>Affected version</name>
    <customized_type>issue</customized_type>
    <field_format>list</field_format>
    <regexp/>
    <min_length/>
    <max_length/>
    <is_required>true</is_required>
    <is_filter>true</is_filter>
    <searchable>true</searchable>
    <multiple>true</multiple>
    <default_value/>
    <visible>false</visible>
    <possible_values type="array">
      <possible_value>
        <value>0.5.x</value>
      </possible_value>
      <possible_value>
        <value>0.6.x</value>
      </possible_value>
  <custom_field>
  <custom_field>
    ...
  </custom_field>
</custom_fields>
The customized_type attribute indicates which type of object the custom field applies to (eg. issue, project, time_entry...).

Arquivos (0)
