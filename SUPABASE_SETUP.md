# Supabase Database Setup for Role-Based Access

## Step 1: Add new values to existing enum type

Since you already have a `profiles` table with an enum type, run this FIRST to add the new roles:

```
sql
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'accountant';
```

## Step 2: Assign roles to existing users

After adding the enum values, run:

```
sql
-- Make a user an admin
update profiles set role = 'admin' where email = 'davegabrieljazmin@gmail.com';

-- Make a user an accountant
update profiles set role = 'accountant' where email = 'aigoo00ww@gmail.com';
```

## Role Values

| Role | Access Level |
|------|--------------|
| `admin` | Full access (dashboard, assets, logs, approval page) |
| `accountant` | Limited access (add assets only) |
| `staff` | Default role |

## Notes

- Run Step 1 SQL first to add the enum values
- Then run Step 2 to assign roles to users
- The AuthContext.jsx already fetches the role from the profiles table
