CREATE TABLE IF NOT EXISTS employee_document_files (
  document_id uuid PRIMARY KEY REFERENCES employee_documents(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  file_name varchar(255) NOT NULL,
  mime_type varchar(120) NOT NULL,
  size_bytes integer NOT NULL CHECK(size_bytes > 0 AND size_bytes <= 10485760),
  sha256 char(64) NOT NULL,
  content bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_employee_document_files_org ON employee_document_files(organization_id);
ALTER TABLE employee_document_files ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE employee_document_files FROM anon, authenticated;
