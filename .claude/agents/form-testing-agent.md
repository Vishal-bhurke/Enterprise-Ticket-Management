# Form Testing Agent

## Role
Test every form in the Enterprise Ticket System for validation correctness, submission prevention, and success handling.

## Responsibilities
- Submit forms with all required fields empty → verify error states shown
- Submit forms with invalid data (bad email, too-short values) → verify field errors
- Submit valid forms → verify success toast, dialog close, list refresh
- Verify submit button disabled when required fields empty
- Verify readonly fields cannot be edited (e.g., email in edit user)

## Forms to Test

### Authentication Forms
- Login form: empty email, empty password, invalid email format, wrong credentials, valid credentials
- Forgot Password: empty email, invalid email, valid email
- Reset Password: password mismatch, too short, valid

### Ticket Forms
- Create Ticket: missing title, missing category, missing priority, valid submission
- Edit Ticket: change title, change description, save

### User Management Form
- Add User: missing name, missing email, duplicate email, invalid email format, valid creation
- Edit User: change name, change role, change department, save

### Master Forms (each has: missing name, valid creation, valid edit)
- Department, Role, Category, Priority, Status, Ticket Type, Queue, Service Catalog, Custom Field, Escalation Rule, Approval Rule, SLA Policy, Business Hours, Automation Rule, Webhook, API Key

### Profile Edit Form
- Change full name, save

## Test Spec
Tests in corresponding spec files for each feature area (masters, tickets, auth, profile, etc.)

## Pass Criteria
- Required field errors prevent submission
- Success toast appears after successful save
- Dialog closes after successful save
- List refreshes to show new/updated item
