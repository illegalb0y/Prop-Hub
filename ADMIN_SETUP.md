# How to Log In as an Administrator

To test the admin console at `/secret_admin`, you need to promote your user account to have the `admin` role. 

### Step 1: Log in to the application
1. Open the application in your browser.
2. Click on the "Login" button to authenticate with Replit Auth.
3. Once logged in, your user record will be created in the database.

### Step 2: Promote your user to Admin
Since you are the first user and there is no UI to promote yourself yet, you can do this directly via the database:

1. Open the **PostgreSQL** tool in Replit.
2. Run the following SQL command to see your user ID:
   ```sql
   SELECT id, email, role FROM users;
   ```
3. Identify your account (usually the only one if you just started) and run:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
   ```
   *(Replace `your-email@example.com` with the email you used to log in.)*

### Step 3: Access the Admin Console
1. Refresh the application in your browser.
2. Navigate to the path: `/secret_admin`
3. You should now see the Admin Console dashboard with User Activity Logs, Project Management, and Security settings.

### Troubleshooting
- **Access Denied**: Ensure you refreshed the page after updating the database.
- **Login Required**: Make sure you are authenticated before visiting `/secret_admin`.
