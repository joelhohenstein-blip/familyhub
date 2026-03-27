import json

with open('/workspace/drizzle/meta/0010_snapshot.json', 'r') as f:
    snapshot = json.load(f)

# Add the new tables
list_event_links = {
    "name": "list_event_links",
    "schema": "public",
    "columns": {
        "id": {
            "name": "id",
            "type": "uuid",
            "typeSchema": "public",
            "isArray": False,
            "columnType": "UUID",
            "isAutoincrement": False,
            "dimensionConfig": {},
            "notNull": True,
            "default": "gen_random_uuid()"
        },
        "list_id": {
            "name": "list_id",
            "type": "uuid",
            "typeSchema": "public",
            "isArray": False,
            "columnType": "UUID",
            "isAutoincrement": False,
            "dimensionConfig": {},
            "notNull": True
        },
        "event_id": {
            "name": "event_id",
            "type": "uuid",
            "typeSchema": "public",
            "isArray": False,
            "columnType": "UUID",
            "isAutoincrement": False,
            "dimensionConfig": {},
            "notNull": True
        },
        "linked_by": {
            "name": "linked_by",
            "type": "uuid",
            "typeSchema": "public",
            "isArray": False,
            "columnType": "UUID",
            "isAutoincrement": False,
            "dimensionConfig": {},
            "notNull": True
        },
        "created_at": {
            "name": "created_at",
            "type": "timestamp",
            "typeSchema": "public",
            "isArray": False,
            "columnType": "TIMESTAMP",
            "isAutoincrement": False,
            "dimensionConfig": {},
            "notNull": True,
            "default": "now()"
        },
        "updated_at": {
            "name": "updated_at",
            "type": "timestamp",
            "typeSchema": "public",
            "isArray": False,
            "columnType": "TIMESTAMP",
            "isAutoincrement": False,
            "dimensionConfig": {},
            "notNull": True,
            "default": "now()"
        }
    },
    "indexes": {},
    "primaryKeys": [
        {
            "name": "",
            "columns": ["id"]
        }
    ],
    "foreignKeys": {
        "list_event_links_list_id_task_lists_id_fk": {
            "name": "list_event_links_list_id_task_lists_id_fk",
            "tableFrom": "list_event_links",
            "tableTo": "task_lists",
            "columnsFrom": ["list_id"],
            "columnsTo": ["id"],
            "onDelete": "cascade",
            "onUpdate": "no action"
        },
        "list_event_links_linked_by_users_id_fk": {
            "name": "list_event_links_linked_by_users_id_fk",
            "tableFrom": "list_event_links",
            "tableTo": "users",
            "columnsFrom": ["linked_by"],
            "columnsTo": ["id"],
            "onDelete": "set null",
            "onUpdate": "no action"
        }
    },
    "uniqueConstraints": {},
    "checkConstraints": {},
    "isExisting": False,
    "created": False
}

list_announcements = {
    "name": "list_announcements",
    "schema": "public",
    "columns": {
        "id": {
            "name": "id",
            "type": "uuid",
            "typeSchema": "public",
            "isArray": False,
            "columnType": "UUID",
            "isAutoincrement": False,
            "dimensionConfig": {},
            "notNull": True,
            "default": "gen_random_uuid()"
        },
        "list_id": {
            "name": "list_id",
            "type": "uuid",
            "typeSchema": "public",
            "isArray": False,
            "columnType": "UUID",
            "isAutoincrement": False,
            "dimensionConfig": {},
            "notNull": True
        },
        "event_link_id": {
            "name": "event_link_id",
            "type": "uuid",
            "typeSchema": "public",
            "isArray": False,
            "columnType": "UUID",
            "isAutoincrement": False,
            "dimensionConfig": {},
            "notNull": False
        },
        "title": {
            "name": "title",
            "type": "varchar",
            "typeSchema": "public",
            "isArray": False,
            "columnType": "VARCHAR(255)",
            "isAutoincrement": False,
            "dimensionConfig": {"length": 255},
            "notNull": True
        },
        "content": {
            "name": "content",
            "type": "text",
            "typeSchema": "public",
            "isArray": False,
            "columnType": "TEXT",
            "isAutoincrement": False,
            "dimensionConfig": {},
            "notNull": False
        },
        "created_by": {
            "name": "created_by",
            "type": "uuid",
            "typeSchema": "public",
            "isArray": False,
            "columnType": "UUID",
            "isAutoincrement": False,
            "dimensionConfig": {},
            "notNull": True
        },
        "sent_at": {
            "name": "sent_at",
            "type": "timestamp",
            "typeSchema": "public",
            "isArray": False,
            "columnType": "TIMESTAMP",
            "isAutoincrement": False,
            "dimensionConfig": {},
            "notNull": False
        },
        "created_at": {
            "name": "created_at",
            "type": "timestamp",
            "typeSchema": "public",
            "isArray": False,
            "columnType": "TIMESTAMP",
            "isAutoincrement": False,
            "dimensionConfig": {},
            "notNull": True,
            "default": "now()"
        },
        "updated_at": {
            "name": "updated_at",
            "type": "timestamp",
            "typeSchema": "public",
            "isArray": False,
            "columnType": "TIMESTAMP",
            "isAutoincrement": False,
            "dimensionConfig": {},
            "notNull": True,
            "default": "now()"
        }
    },
    "indexes": {},
    "primaryKeys": [
        {
            "name": "",
            "columns": ["id"]
        }
    ],
    "foreignKeys": {
        "list_announcements_list_id_task_lists_id_fk": {
            "name": "list_announcements_list_id_task_lists_id_fk",
            "tableFrom": "list_announcements",
            "tableTo": "task_lists",
            "columnsFrom": ["list_id"],
            "columnsTo": ["id"],
            "onDelete": "cascade",
            "onUpdate": "no action"
        },
        "list_announcements_event_link_id_list_event_links_id_fk": {
            "name": "list_announcements_event_link_id_list_event_links_id_fk",
            "tableFrom": "list_announcements",
            "tableTo": "list_event_links",
            "columnsFrom": ["event_link_id"],
            "columnsTo": ["id"],
            "onDelete": "cascade",
            "onUpdate": "no action"
        },
        "list_announcements_created_by_users_id_fk": {
            "name": "list_announcements_created_by_users_id_fk",
            "tableFrom": "list_announcements",
            "tableTo": "users",
            "columnsFrom": ["created_by"],
            "columnsTo": ["id"],
            "onDelete": "set null",
            "onUpdate": "no action"
        }
    },
    "uniqueConstraints": {},
    "checkConstraints": {},
    "isExisting": False,
    "created": False
}

snapshot['tables']['list_event_links'] = list_event_links
snapshot['tables']['list_announcements'] = list_announcements

with open('/workspace/drizzle/meta/0010_snapshot.json', 'w') as f:
    json.dump(snapshot, f, indent=2)

print("Updated snapshot with new tables")
