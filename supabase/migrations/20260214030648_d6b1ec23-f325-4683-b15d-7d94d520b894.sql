
ALTER TABLE edit_requests ADD CONSTRAINT fk_edit_requests_client
  FOREIGN KEY (client_id) REFERENCES clients(id);

ALTER TABLE project_requests ADD CONSTRAINT fk_project_requests_client
  FOREIGN KEY (client_id) REFERENCES clients(id);
