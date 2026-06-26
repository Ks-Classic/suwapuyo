update display_characters
set display_scale = 0.2
where source_type = 'sample'
  and id like 'sample-%'
  and display_scale = 0.6;
