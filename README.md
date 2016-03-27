# BBBFund @ Azure
Web app for viewing and managing BBBFund, hosted on Azure https://bbbfund.azurewebsites.net

# Azure services
1. Azure App Service
2. Azure SQL Database
3. Azure WebJob

# Development, with Hot Reloading
#### One time Environment Variable Setup:
For the website:
* db_writer_login
* db_writer_password
* jwt_secret
* user_admin_password
* user_investor_password

For the WebJobs script:
* SQLAZURECONNSTR_db_writer

```bash
git clone https://github.com/qhung49/bbbfund.azure.git
npm install
npm run dev
node server.js
```
Website is at [http://localhost:8080](http://localhost:8080)

# Production
```bash
npm run start-production
```
Website is at [http://localhost:1337](http://localhost:1337)
