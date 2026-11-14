from config import db


def test_mysql_schema_editor_uses_deferred_foreign_keys():
    """TiDB cannot add a column and its foreign key in one ALTER TABLE."""
    from django.db.backends.mysql.schema import DatabaseSchemaEditor

    db.enable_tidb_schema_compatibility()

    assert DatabaseSchemaEditor.sql_create_column_inline_fk is None
